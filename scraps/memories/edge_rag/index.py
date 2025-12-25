"""Annoy index management for Edge RAG Mini."""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import List, Optional, Sequence, Tuple

import numpy as np
from annoy import AnnoyIndex

from . import storage

# Default file location for the persisted Annoy index.
INDEX_PATH = Path("data") / "edge_rag.ann"
INDEX_METADATA_NAME = "primary_annoy"


@dataclass(frozen=True)
class IndexConfig:
    vector_dim: int = 384
    metric: str = "euclidean"
    num_trees: int = 10
    search_k: Optional[int] = None


DEFAULT_CONFIG = IndexConfig()


@dataclass
class IndexMetadata:
    vector_dim: int
    metric: str
    num_trees: int
    search_k: Optional[int]
    doc_count: int
    doc_ids_digest: str
    build_time_ms: float
    index_path: str
    updated_at: Optional[str]


@dataclass
class QueryResult:
    annoy_id: int
    distance: float
    similarity: float


class IndexOutOfDateError(RuntimeError):
    """Raised when the on-disk index is absent or incompatible."""


def ensure_index(
    config: IndexConfig = DEFAULT_CONFIG,
    *,
    db_path: Path = storage.DB_PATH,
    index_path: Path = INDEX_PATH,
) -> Tuple[AnnoyIndex, IndexMetadata]:
    """Load an Annoy index, rebuilding it if metadata or files are stale."""
    documents = list(storage.list_documents(db_path=db_path))
    metadata_dict = storage.get_index_metadata(INDEX_METADATA_NAME, db_path=db_path)
    storage.log_event(
        component="index.ensure_index",
        process="index",
        event_type="info",
        detail="Ensuring Annoy index",
        context={"doc_count": len(documents)},
        db_path=db_path,
    )
    rebuild_required, reason = _rebuild_required(
        metadata_dict=metadata_dict,
        documents=documents,
        config=config,
        index_path=index_path,
    )
    if rebuild_required:
        storage.log_event(
            component="index.ensure_index",
            process="index",
            event_type="lifecycle",
            detail="Rebuilding Annoy index",
            context={"reason": reason, "doc_count": len(documents)},
            db_path=db_path,
        )
        metadata_dict = build_index(
            config=config,
            documents=documents,
            db_path=db_path,
            index_path=index_path,
        )
        metadata_dict = storage.get_index_metadata(INDEX_METADATA_NAME, db_path=db_path)
    if metadata_dict is None:
        storage.log_event(
            component="index.ensure_index",
            process="index",
            event_type="error",
            detail="Index metadata missing after rebuild",
            context={"reason": reason},
            db_path=db_path,
        )
        raise IndexOutOfDateError("Annoy index metadata missing after rebuild attempt")
    if not rebuild_required:
        storage.log_event(
            component="index.ensure_index",
            process="index",
            event_type="info",
            detail="Reusing existing Annoy index",
            context={"doc_count": len(documents)},
            db_path=db_path,
        )
    index = load_index(config=config, index_path=index_path)
    metadata = _deserialize_metadata(metadata_dict)
    return index, metadata


def build_index(
    *,
    config: IndexConfig,
    documents: Optional[Sequence[storage.Document]] = None,
    db_path: Path = storage.DB_PATH,
    index_path: Path = INDEX_PATH,
) -> dict:
    """Rebuild the Annoy index from persisted documents and store metadata."""
    if documents is None:
        documents = list(storage.list_documents(db_path=db_path))
    if any(doc.embedding_dim != config.vector_dim for doc in documents):
        storage.log_event(
            component="index.build_index",
            process="index",
            event_type="error",
            detail="Embedding dimension mismatch",
            context={
                "expected_dim": config.vector_dim,
                "doc_ids": [doc.doc_id for doc in documents],
            },
            db_path=db_path,
        )
        raise ValueError("Document embedding dimensions do not match Annoy configuration")

    index_path.parent.mkdir(parents=True, exist_ok=True)
    annoy_index = AnnoyIndex(config.vector_dim, config.metric)

    storage.log_event(
        component="index.build_index",
        process="index",
        event_type="lifecycle",
        detail="Building Annoy index",
        context={
            "doc_count": len(documents),
            "vector_dim": config.vector_dim,
            "metric": config.metric,
            "num_trees": config.num_trees,
        },
        db_path=db_path,
    )

    for idx, doc in enumerate(documents):
        if doc.annoy_id != idx:
            storage.override_annoy_id(
                doc_id=doc.doc_id,
                annoy_id=idx,
                db_path=db_path,
                component="storage.override_annoy_id",
                process="index",
            )
        annoy_index.add_item(idx, doc.embedding.tolist())

    start = perf_counter()
    annoy_index.build(config.num_trees)
    build_time_ms = (perf_counter() - start) * 1000.0

    tmp_path = index_path.with_suffix(index_path.suffix + ".tmp")
    annoy_index.save(str(tmp_path))
    os.replace(tmp_path, index_path)

    metadata = {
        "vector_dim": config.vector_dim,
        "metric": config.metric,
        "num_trees": config.num_trees,
        "search_k": config.search_k,
        "doc_count": len(documents),
        "doc_ids_digest": _doc_ids_digest(documents),
        "build_time_ms": build_time_ms,
        "index_path": str(index_path),
    }
    storage.set_index_metadata(INDEX_METADATA_NAME, metadata, db_path=db_path)
    storage.log_event(
        component="index.build_index",
        process="index",
        event_type="telemetry",
        detail="Annoy index built",
        context={
            "doc_count": len(documents),
            "build_time_ms": build_time_ms,
            "index_path": str(index_path),
        },
        db_path=db_path,
    )
    return metadata


def load_index(
    *,
    config: IndexConfig,
    index_path: Path = INDEX_PATH,
) -> AnnoyIndex:
    """Load the Annoy index from disk using the provided configuration."""
    if not index_path.exists():
        storage.log_event(
            component="index.load_index",
            process="index",
            event_type="error",
            detail="Annoy index file missing",
            context={"index_path": str(index_path)},
        )
        raise FileNotFoundError(f"Annoy index file missing at {index_path}")
    annoy_index = AnnoyIndex(config.vector_dim, config.metric)
    if not annoy_index.load(str(index_path)):
        storage.log_event(
            component="index.load_index",
            process="index",
            event_type="error",
            detail="Failed to load Annoy index",
            context={"index_path": str(index_path)},
        )
        raise IndexOutOfDateError(f"Failed to load Annoy index at {index_path}")
    storage.log_event(
        component="index.load_index",
        process="index",
        event_type="info",
        detail="Annoy index loaded",
        context={"index_path": str(index_path)},
    )
    return annoy_index


def query_index(
    index: AnnoyIndex,
    embedding: np.ndarray,
    *,
    top_k: int,
    metric: str,
    search_k: Optional[int] = None,
) -> List[QueryResult]:
    """Query the Annoy index and return similarity-ranked results."""
    vector = np.asarray(embedding, dtype=np.float32)
    ann_search_k = search_k if search_k is not None else -1
    ids, distances = index.get_nns_by_vector(
        vector.tolist(),
        top_k,
        search_k=ann_search_k,
        include_distances=True,
    )
    results: List[QueryResult] = []
    for annoy_id, distance in zip(ids, distances):
        similarity = _distance_to_similarity(metric, distance)
        results.append(QueryResult(annoy_id=annoy_id, distance=distance, similarity=similarity))
    # Annoy returns neighbours in approximate order; enforce deterministic
    # sorting so callers always receive closest matches first.
    results.sort(key=lambda result: result.distance)
    storage.log_event(
        component="index.query_index",
        process="retrieval",
        event_type="telemetry",
        detail="Annoy query executed",
        context={
            "top_k": top_k,
            "search_k": ann_search_k,
            "returned": len(results),
        },
    )
    return results


def query_with_documents(
    *,
    index: AnnoyIndex,
    embedding: np.ndarray,
    db_path: Path = storage.DB_PATH,
    top_k: int = 5,
    search_k: Optional[int] = None,
    metric: str = DEFAULT_CONFIG.metric,
) -> Tuple[List[Tuple[storage.Document, QueryResult]], float]:
    """Query the Annoy index and fetch corresponding documents.

    Returns a tuple containing the ordered (document, result) pairs and the
    measured retrieval latency in milliseconds.
    """
    start = perf_counter()
    results = query_index(
        index,
        embedding,
        top_k=top_k,
        metric=metric,
        search_k=search_k,
    )
    retrieval_time_ms = (perf_counter() - start) * 1000.0
    documents_with_results: List[Tuple[storage.Document, QueryResult]] = []
    for result in results:
        try:
            document = storage.get_document_by_annoy_id(result.annoy_id, db_path=db_path)
        except KeyError:
            continue
        documents_with_results.append((document, result))
    storage.log_event(
        component="index.query_with_documents",
        process="retrieval",
        event_type="telemetry",
        detail="Documents joined with Annoy results",
        context={
            "returned": len(documents_with_results),
            "retrieval_time_ms": retrieval_time_ms,
        },
        db_path=db_path,
    )
    return documents_with_results, retrieval_time_ms


def _doc_ids_digest(documents: Sequence[storage.Document]) -> str:
    ids = sorted(doc.annoy_id for doc in documents if doc.annoy_id is not None)
    payload = ",".join(str(identifier) for identifier in ids)
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def _rebuild_required(
    *,
    metadata_dict: Optional[dict],
    documents: Sequence[storage.Document],
    config: IndexConfig,
    index_path: Path,
) -> Tuple[bool, Optional[str]]:
    if not index_path.exists():
        return True, "index_file_missing"
    if metadata_dict is None:
        return True, "metadata_missing"
    expected_digest = _doc_ids_digest(documents)
    if metadata_dict.get("doc_ids_digest") != expected_digest:
        return True, "digest_mismatch"
    if metadata_dict.get("doc_count") != len(documents):
        return True, "doc_count_mismatch"
    if metadata_dict.get("vector_dim") != config.vector_dim:
        return True, "vector_dim_changed"
    if metadata_dict.get("metric") != config.metric:
        return True, "metric_changed"
    if metadata_dict.get("num_trees") != config.num_trees:
        return True, "num_trees_changed"
    if metadata_dict.get("search_k") != config.search_k:
        return True, "search_k_changed"
    return False, None


def _deserialize_metadata(payload: dict) -> IndexMetadata:
    return IndexMetadata(
        vector_dim=payload.get("vector_dim"),
        metric=payload.get("metric"),
        num_trees=payload.get("num_trees"),
        search_k=payload.get("search_k"),
        doc_count=payload.get("doc_count", 0),
        doc_ids_digest=payload.get("doc_ids_digest", ""),
        build_time_ms=payload.get("build_time_ms", 0.0),
        index_path=payload.get("index_path", str(INDEX_PATH)),
        updated_at=payload.get("updated_at"),
    )


def _distance_to_similarity(metric: str, distance: float) -> float:
    if metric == "angular":
        similarity = 1.0 - (distance ** 2) / 2.0
    elif metric == "euclidean":
        similarity = 1.0 / (1.0 + distance)
    else:
        similarity = -distance
    return max(min(similarity, 1.0), -1.0)
