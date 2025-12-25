"""Retrieval engine for Edge RAG Mini."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Iterable, List, Optional

import numpy as np

from . import embeddings, index, storage


@dataclass
class RetrievalResult:
    document: storage.Document
    similarity: float


@dataclass
class RetrievalResponse:
    query_text: str
    results: List[RetrievalResult]
    embedding_time_ms: float
    retrieval_time_ms: float
    total_time_ms: float
    index_metadata: index.IndexMetadata


class RetrievalError(RuntimeError):
    """Raised when retrieval cannot proceed due to missing prerequisites."""


def retrieve(
    *,
    thread_id: str,
    query_text: str,
    top_k: int = 5,
    search_k: Optional[int] = None,
    min_similarity: Optional[float] = None,
    thread_filters: Optional[Iterable[str]] = None,
    db_path: Path = storage.DB_PATH,
    index_path: Path = index.INDEX_PATH,
    config: index.IndexConfig = index.DEFAULT_CONFIG,
    model: Optional["embeddings.SentenceTransformer"] = None,
) -> RetrievalResponse:
    """Run a retrieval query and record telemetry in the database."""
    if not query_text or not query_text.strip():
        storage.log_event(
            component="retrieval.retrieve",
            process="retrieval",
            event_type="error",
            detail="Query text empty",
            context={"thread_id": thread_id},
            db_path=db_path,
        )
        raise ValueError("Query text must be a non-empty string")
    if isinstance(thread_filters, str):
        filter_iterable: Iterable[str] = [thread_filters]
    else:
        filter_iterable = thread_filters or []

    filter_set = {
        value.strip()
        for value in filter_iterable
        if isinstance(value, str) and value.strip()
    }

    storage.log_event(
        component="retrieval.retrieve",
        process="retrieval",
        event_type="info",
        detail="Retrieval invoked",
        context={
            "thread_id": thread_id,
            "top_k": top_k,
            "min_similarity": min_similarity,
            "thread_filters": sorted(filter_set) if filter_set else None,
        },
        db_path=db_path,
    )
    if not storage.has_documents(db_path=db_path):
        storage.log_query(
            thread_id=thread_id,
            query_text=query_text,
            top_k=top_k,
            embedding_time_ms=0.0,
            retrieval_time_ms=0.0,
            generation_time_ms=None,
            matched_doc_id=None,
            db_path=db_path,
        )
        storage.log_event(
            component="retrieval.retrieve",
            process="retrieval",
            event_type="error",
            detail="Retrieval aborted: no documents",
            context={"thread_id": thread_id},
            db_path=db_path,
        )
        raise RetrievalError("No documents available for retrieval")

    embed_start = perf_counter()
    embed_result = embeddings.embed_text(query_text, model=model, db_path=db_path)
    embedding_time_ms = (perf_counter() - embed_start) * 1000.0
    storage.log_event(
        component="retrieval.retrieve",
        process="retrieval",
        event_type="telemetry",
        detail="Query embedded",
        context={"embedding_time_ms": embedding_time_ms},
        db_path=db_path,
    )

    annoy_index, metadata = index.ensure_index(
        config=config,
        db_path=db_path,
        index_path=index_path,
    )

    effective_top_k = min(top_k + 1, metadata.doc_count)
    if filter_set:
        candidate_limit = max(metadata.doc_count, top_k)
        effective_top_k = min(max(top_k * 3, top_k + 1), candidate_limit)
        if effective_top_k < top_k:
            effective_top_k = top_k

    effective_search_k = search_k if search_k is not None else config.search_k
    if filter_set:
        effective_search_k = -1 if effective_search_k is None else max(effective_search_k, metadata.doc_count)

    results_with_docs, retrieval_time_ms = index.query_with_documents(
        index=annoy_index,
        embedding=embed_result.embedding,
        db_path=db_path,
        top_k=effective_top_k,
        search_k=effective_search_k,
        metric=config.metric,
    )

    candidates: List[RetrievalResult] = []
    seen_doc_ids: set[int] = set()
    for document, result in results_with_docs:
        if filter_set and document.thread_id not in filter_set:
            continue
        if min_similarity is not None and result.similarity < min_similarity:
            continue
        candidates.append(
            RetrievalResult(document=document, similarity=result.similarity)
        )
        seen_doc_ids.add(document.doc_id)

    if filter_set and len(candidates) < top_k:
        expanded_results, expanded_time_ms = index.query_with_documents(
            index=annoy_index,
            embedding=embed_result.embedding,
            db_path=db_path,
            top_k=metadata.doc_count,
            search_k=-1,
            metric=config.metric,
        )
        retrieval_time_ms += expanded_time_ms
        for document, result in expanded_results:
            if document.doc_id in seen_doc_ids:
                continue
            if document.thread_id not in filter_set:
                continue
            if min_similarity is not None and result.similarity < min_similarity:
                continue
            candidates.append(
                RetrievalResult(document=document, similarity=result.similarity)
            )
            seen_doc_ids.add(document.doc_id)
            if len(candidates) >= top_k:
                break

    fallback_added = 0
    if len(candidates) < top_k:
        pre_fallback_count = len(candidates)
        for document in storage.list_documents(db_path=db_path):
            if document.doc_id in seen_doc_ids:
                continue
            if filter_set and document.thread_id not in filter_set:
                continue
            similarity = _metric_similarity(
                config.metric,
                document.embedding,
                embed_result.embedding,
            )
            if min_similarity is not None and similarity < min_similarity:
                continue
            candidates.append(
                RetrievalResult(document=document, similarity=similarity)
            )
            seen_doc_ids.add(document.doc_id)
        fallback_added = len(candidates) - pre_fallback_count

    if fallback_added > 0:
        storage.log_event(
            component="retrieval.retrieve",
            process="retrieval",
            event_type="telemetry",
            detail="Brute-force fallback added candidates",
            context={
                "fallback": "bruteforce",
                "candidates_added": fallback_added,
            },
            db_path=db_path,
        )

    retrieval_results: List[RetrievalResult] = sorted(
        candidates,
        key=lambda result: (-result.similarity, result.document.doc_id),
    )[:top_k]

    for result in retrieval_results:
        try:
            storage.update_document_latencies(
                result.document.doc_id,
                retrieval_time_ms=retrieval_time_ms,
                db_path=db_path,
            )
            result.document.retrieval_time_ms = retrieval_time_ms
        except Exception as exc:  # pragma: no cover - log only
            storage.log_event(
                component="retrieval.retrieve",
                process="retrieval",
                event_type="error",
                detail="Failed to update document retrieval latency",
                context={"doc_id": result.document.doc_id, "error": str(exc)},
                db_path=db_path,
            )

    total_time_ms = embedding_time_ms + retrieval_time_ms
    storage.log_event(
        component="retrieval.retrieve",
        process="retrieval",
        event_type="telemetry",
        detail="Results prepared",
        context={
            "results_count": len(retrieval_results),
            "retrieval_time_ms": retrieval_time_ms,
            "total_time_ms": total_time_ms,
            "thread_filters": sorted(filter_set) if filter_set else None,
        },
        db_path=db_path,
    )

    if retrieval_results:
        top_match = retrieval_results[0]
        storage.log_query(
            thread_id=thread_id,
            query_text=query_text,
            top_k=top_k,
            embedding_time_ms=embedding_time_ms,
            retrieval_time_ms=retrieval_time_ms,
            generation_time_ms=None,
            matched_doc_id=top_match.document.doc_id,
            db_path=db_path,
        )
        storage.log_event(
            component="retrieval.retrieve",
            process="retrieval",
            event_type="info",
            detail="Retrieval succeeded",
            context={
                "top_doc_id": top_match.document.doc_id,
                "similarity": top_match.similarity,
                "thread_filters": sorted(filter_set) if filter_set else None,
            },
            db_path=db_path,
        )
    else:
        storage.log_query(
            thread_id=thread_id,
            query_text=query_text,
            top_k=top_k,
            embedding_time_ms=embedding_time_ms,
            retrieval_time_ms=retrieval_time_ms,
            generation_time_ms=None,
            matched_doc_id=None,
            db_path=db_path,
        )
        storage.log_event(
            component="retrieval.retrieve",
            process="retrieval",
            event_type="info",
            detail="Retrieval returned no results",
            context={
                "thread_id": thread_id,
                "results_count": 0,
                "thread_filters": sorted(filter_set) if filter_set else None,
            },
            db_path=db_path,
        )

    return RetrievalResponse(
        query_text=query_text,
        results=retrieval_results,
        embedding_time_ms=embedding_time_ms,
        retrieval_time_ms=retrieval_time_ms,
        total_time_ms=total_time_ms,
        index_metadata=metadata,
    )


def _metric_similarity(metric: str, a: np.ndarray, b: np.ndarray) -> float:
    """Compute similarity scores aligned with Annoy metric conventions."""
    vector_a = np.asarray(a, dtype=np.float32)
    vector_b = np.asarray(b, dtype=np.float32)
    if metric == "angular":
        norm_a = np.linalg.norm(vector_a)
        norm_b = np.linalg.norm(vector_b)
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        cosine = float(np.dot(vector_a, vector_b) / (norm_a * norm_b))
        return float(np.clip(cosine, -1.0, 1.0))
    distance = float(np.linalg.norm(vector_a - vector_b))
    if metric == "euclidean":
        similarity = 1.0 / (1.0 + distance)
        return float(np.clip(similarity, -1.0, 1.0))
    similarity = -distance
    return float(np.clip(similarity, -1.0, 1.0))
