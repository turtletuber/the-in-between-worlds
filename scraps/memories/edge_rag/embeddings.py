"""Embedding pipeline utilities for Edge RAG Mini."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Optional

import numpy as np

try:
    from sentence_transformers import SentenceTransformer
except ImportError as exc:  # pragma: no cover - handled in runtime paths
    SentenceTransformer = None  # type: ignore[assignment]
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None

from . import storage

MODEL_NAME = "all-MiniLM-L6-v2"

_model_cache: Optional["SentenceTransformer"] = None


@dataclass
class EmbeddingResult:
    embedding: np.ndarray
    embedding_time_ms: float
    embedding_dim: int


def load_model(
    model_name: str = MODEL_NAME,
    *,
    db_path: Path = storage.DB_PATH,
) -> "SentenceTransformer":
    """Load and cache the sentence transformer model."""
    global _model_cache
    if _model_cache is not None:
        storage.log_event(
            component="embeddings.load_model",
            process="embedding",
            event_type="info",
            detail="Reusing cached embedding model",
            context={"model_name": model_name},
            db_path=db_path,
        )
        return _model_cache
    if SentenceTransformer is None:
        storage.log_event(
            component="embeddings.load_model",
            process="embedding",
            event_type="error",
            detail="sentence-transformers package unavailable",
            context={"model_name": model_name},
            db_path=db_path,
        )
        raise ImportError("sentence-transformers is required") from _IMPORT_ERROR
    storage.log_event(
        component="embeddings.load_model",
        process="embedding",
        event_type="lifecycle",
        detail="Loading embedding model",
        context={"model_name": model_name},
        db_path=db_path,
    )
    _model_cache = SentenceTransformer(model_name)
    storage.log_event(
        component="embeddings.load_model",
        process="embedding",
        event_type="info",
        detail="Embedding model loaded",
        context={"model_name": model_name},
        db_path=db_path,
    )
    return _model_cache


def embed_text(
    text: str,
    *,
    model: Optional["SentenceTransformer"] = None,
    db_path: Path = storage.DB_PATH,
) -> EmbeddingResult:
    """Embed text into a vector and capture latency metrics."""
    if not text or not text.strip():
        storage.log_event(
            component="embeddings.embed_text",
            process="embedding",
            event_type="error",
            detail="Empty text provided for embedding",
            context=None,
            db_path=db_path,
        )
        raise ValueError("Text must be a non-empty string")
    model = model or load_model(db_path=db_path)
    start = perf_counter()
    vector = model.encode(text, convert_to_numpy=True)
    duration_ms = (perf_counter() - start) * 1000.0
    embedding = np.asarray(vector, dtype=np.float32)
    storage.log_event(
        component="embeddings.embed_text",
        process="embedding",
        event_type="telemetry",
        detail="Text embedded",
        context={
            "embedding_dim": embedding.size,
            "embedding_time_ms": duration_ms,
        },
        db_path=db_path,
    )
    return EmbeddingResult(embedding=embedding, embedding_time_ms=duration_ms, embedding_dim=embedding.size)


def embed_and_store(
    *,
    thread_id: str,
    text: str,
    model: Optional["SentenceTransformer"] = None,
    db_path: Path = storage.DB_PATH,
    ) -> storage.Document:
    """Embed text and persist it via the storage layer."""
    result = embed_text(text, model=model, db_path=db_path)
    document = storage.insert_document(
        thread_id=thread_id,
        text=text,
        embedding=result.embedding,
        embedding_dim=result.embedding_dim,
        embedding_time_ms=result.embedding_time_ms,
        db_path=db_path,
    )
    storage.log_event(
        component="embeddings.embed_and_store",
        process="ingestion",
        event_type="telemetry",
        detail="Document embedded and stored",
        context={
            "doc_id": document.doc_id,
            "thread_id": document.thread_id,
            "embedding_dim": document.embedding_dim,
            "embedding_time_ms": result.embedding_time_ms,
        },
        db_path=db_path,
    )
    return document
