"""Text ingestion helpers for Edge RAG Mini."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from . import embeddings, storage


def ingest_text(
    *,
    thread_id: str,
    text: str,
    model: Optional["embeddings.SentenceTransformer"] = None,
    db_path: Path = storage.DB_PATH,
) -> storage.Document:
    """Embed and persist user-provided text.

    Parameters
    ----------
    thread_id:
        Identifier that groups related texts for future conversational threads.
    text:
        Raw user text to embed and store. Must not be empty or whitespace.
    model:
        Optional sentence-transformer instance; when omitted the cached global
        model is used.
    db_path:
        Location of the SQLite database, primarily for testing overrides.

    Returns
    -------
    storage.Document
        Persisted document record including embedding metadata and latency.
    """
    storage.log_event(
        component="ingestion.ingest_text",
        process="ingestion",
        event_type="info",
        detail="Ingestion requested",
        context={"thread_id": thread_id, "text_length": len(text)},
        db_path=db_path,
    )
    if not text or not text.strip():
        storage.log_event(
            component="ingestion.ingest_text",
            process="ingestion",
            event_type="error",
            detail="Text is empty",
            context={"thread_id": thread_id},
            db_path=db_path,
        )
        raise ValueError("Text must be a non-empty string")
    return embeddings.embed_and_store(
        thread_id=thread_id,
        text=text,
        model=model,
        db_path=db_path,
    )
