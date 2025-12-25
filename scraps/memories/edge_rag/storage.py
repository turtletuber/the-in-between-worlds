"""SQLite-backed storage layer for Edge RAG Mini."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional, Sequence
import sqlite3

import json

import numpy as np

# Default location for the SQLite database used across the application.
DATA_DIR = Path("data")
DB_PATH = DATA_DIR / "edge_rag.db"

# SQL statements for initializing the database schema.
CREATE_DOCUMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS documents (
    doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL,
    annoy_id INTEGER UNIQUE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    embedding_dim INTEGER NOT NULL,
    embedding_blob BLOB NOT NULL,
    embedding_time_ms REAL,
    retrieval_time_ms REAL,
    generation_time_ms REAL
);
"""

CREATE_QUERY_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS query_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL,
    query_text TEXT NOT NULL,
    queried_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    top_k INTEGER NOT NULL,
    embedding_time_ms REAL,
    retrieval_time_ms REAL,
    generation_time_ms REAL,
    matched_doc_id INTEGER,
    FOREIGN KEY (matched_doc_id) REFERENCES documents(doc_id)
);
"""

CREATE_INDEX_METADATA_TABLE = """
CREATE TABLE IF NOT EXISTS index_metadata (
    name TEXT PRIMARY KEY,
    metadata_json TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_SYSTEM_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS system_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    component TEXT NOT NULL,
    process TEXT NOT NULL,
    event_type TEXT NOT NULL,
    detail TEXT NOT NULL,
    context_json TEXT
);
"""

SCHEMA_STATEMENTS = (
    CREATE_DOCUMENTS_TABLE,
    CREATE_QUERY_LOGS_TABLE,
    CREATE_INDEX_METADATA_TABLE,
    CREATE_SYSTEM_LOGS_TABLE,
)


@dataclass
class Document:
    doc_id: int
    thread_id: str
    annoy_id: Optional[int]
    text: str
    created_at: datetime
    embedding_dim: int
    embedding: np.ndarray
    embedding_time_ms: Optional[float]
    retrieval_time_ms: Optional[float]
    generation_time_ms: Optional[float]


@dataclass
class QueryLog:
    log_id: int
    thread_id: str
    query_text: str
    queried_at: datetime
    top_k: int
    embedding_time_ms: Optional[float]
    retrieval_time_ms: Optional[float]
    generation_time_ms: Optional[float]
    matched_doc_id: Optional[int]


@dataclass
class SystemLog:
    log_id: int
    created_at: datetime
    component: str
    process: str
    event_type: str
    detail: str
    context: Optional[dict]


def ensure_database(db_path: Path = DB_PATH) -> None:
    """Create the data directory and required tables if they do not exist."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        for statement in SCHEMA_STATEMENTS:
            conn.execute(statement)
        conn.commit()


def get_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    """Return a SQLite connection with row access enabled."""
    ensure_database(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _embedding_to_blob(embedding: np.ndarray) -> bytes:
    if embedding.ndim != 1:
        raise ValueError("Embedding array must be one-dimensional")
    return np.asarray(embedding, dtype=np.float32).tobytes()


def _blob_to_embedding(blob: bytes, embedding_dim: int) -> np.ndarray:
    array = np.frombuffer(blob, dtype=np.float32)
    if array.size != embedding_dim:
        raise ValueError("Embedding dimension mismatch")
    return array


def insert_document(
    *,
    thread_id: str,
    text: str,
    embedding: np.ndarray,
    embedding_dim: Optional[int] = None,
    annoy_id: Optional[int] = None,
    embedding_time_ms: Optional[float] = None,
    retrieval_time_ms: Optional[float] = None,
    generation_time_ms: Optional[float] = None,
    db_path: Path = DB_PATH,
) -> Document:
    """Persist a document and return the stored representation."""
    dim = int(embedding_dim or embedding.size)
    blob = _embedding_to_blob(embedding)

    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            """
            INSERT INTO documents (
                thread_id, annoy_id, text, embedding_dim, embedding_blob,
                embedding_time_ms, retrieval_time_ms, generation_time_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                thread_id,
                annoy_id,
                text,
                dim,
                blob,
                embedding_time_ms,
                retrieval_time_ms,
                generation_time_ms,
            ),
        )
        doc_id = cursor.lastrowid
        if annoy_id is None:
            conn.execute(
                "UPDATE documents SET annoy_id = ? WHERE doc_id = ?",
                (doc_id, doc_id),
            )
            annoy_id = doc_id
        conn.commit()

    document = get_document_by_id(doc_id, db_path=db_path)
    log_event(
        component="storage.insert_document",
        process="ingestion",
        event_type="info",
        detail="Document stored",
        context={
            "doc_id": document.doc_id,
            "thread_id": document.thread_id,
            "annoy_id": document.annoy_id,
            "embedding_dim": document.embedding_dim,
            "embedding_time_ms": document.embedding_time_ms,
        },
        db_path=db_path,
    )
    return document


def update_document_latencies(
    doc_id: int,
    *,
    embedding_time_ms: Optional[float] = None,
    retrieval_time_ms: Optional[float] = None,
    generation_time_ms: Optional[float] = None,
    db_path: Path = DB_PATH,
) -> None:
    """Update latency metrics for a stored document."""
    ensure_database(db_path)
    fields: list[str] = []
    values: list[float] = []
    if embedding_time_ms is not None:
        fields.append("embedding_time_ms = ?")
        values.append(embedding_time_ms)
    if retrieval_time_ms is not None:
        fields.append("retrieval_time_ms = ?")
        values.append(retrieval_time_ms)
    if generation_time_ms is not None:
        fields.append("generation_time_ms = ?")
        values.append(generation_time_ms)
    if not fields:
        return
    values.append(doc_id)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            f"UPDATE documents SET {', '.join(fields)} WHERE doc_id = ?",
            values,
        )
        conn.commit()
    context = {}
    if embedding_time_ms is not None:
        context["embedding_time_ms"] = embedding_time_ms
    if retrieval_time_ms is not None:
        context["retrieval_time_ms"] = retrieval_time_ms
    if generation_time_ms is not None:
        context["generation_time_ms"] = generation_time_ms
    context["doc_id"] = doc_id
    log_event(
        component="storage.update_document_latencies",
        process="telemetry",
        event_type="info",
        detail="Document latencies updated",
        context=context,
        db_path=db_path,
    )


def delete_document(doc_id: int, *, db_path: Path = DB_PATH) -> None:
    """Remove a document and any associated query log references."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.execute("DELETE FROM query_logs WHERE matched_doc_id = ?", (doc_id,))
        conn.execute("DELETE FROM documents WHERE doc_id = ?", (doc_id,))
        conn.commit()
    log_event(
        component="storage.delete_document",
        process="ingestion",
        event_type="info",
        detail="Document deleted",
        context={"doc_id": doc_id},
        db_path=db_path,
    )


def get_document_by_id(doc_id: int, *, db_path: Path = DB_PATH) -> Document:
    """Fetch a document by primary key."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM documents WHERE doc_id = ?",
            (doc_id,),
        ).fetchone()
    if row is None:
        raise KeyError(f"Document {doc_id} not found")
    return _row_to_document(row)


def get_document_by_annoy_id(annoy_id: int, *, db_path: Path = DB_PATH) -> Document:
    """Fetch a document by its Annoy index identifier."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM documents WHERE annoy_id = ?",
            (annoy_id,),
        ).fetchone()
    if row is None:
        raise KeyError(f"Document with annoy_id {annoy_id} not found")
    return _row_to_document(row)


def list_documents(
    *,
    limit: Optional[int] = None,
    offset: int = 0,
    db_path: Path = DB_PATH,
) -> Sequence[Document]:
    """Return a slice of stored documents ordered by doc_id."""
    ensure_database(db_path)
    query = "SELECT * FROM documents ORDER BY doc_id LIMIT ? OFFSET ?"
    params: Iterable[int] = (limit or -1, offset)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params).fetchall()
    return [_row_to_document(row) for row in rows]


def has_documents(*, db_path: Path = DB_PATH) -> bool:
    """Return True when at least one document exists."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        cursor = conn.execute("SELECT 1 FROM documents LIMIT 1")
        return cursor.fetchone() is not None


def log_query(
    *,
    thread_id: str,
    query_text: str,
    top_k: int,
    embedding_time_ms: Optional[float] = None,
    retrieval_time_ms: Optional[float] = None,
    generation_time_ms: Optional[float] = None,
    matched_doc_id: Optional[int] = None,
    db_path: Path = DB_PATH,
) -> QueryLog:
    """Store telemetry for a retrieval request."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            """
            INSERT INTO query_logs (
                thread_id, query_text, top_k,
                embedding_time_ms, retrieval_time_ms, generation_time_ms,
                matched_doc_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                thread_id,
                query_text,
                top_k,
                embedding_time_ms,
                retrieval_time_ms,
                generation_time_ms,
                matched_doc_id,
            ),
        )
        log_id = cursor.lastrowid
        conn.commit()

    entry = get_query_log(log_id, db_path=db_path)
    log_event(
        component="storage.log_query",
        process="retrieval",
        event_type="telemetry",
        detail="Query telemetry recorded",
        context={
            "log_id": entry.log_id,
            "thread_id": entry.thread_id,
            "matched_doc_id": entry.matched_doc_id,
            "embedding_time_ms": entry.embedding_time_ms,
            "retrieval_time_ms": entry.retrieval_time_ms,
            "top_k": entry.top_k,
        },
        db_path=db_path,
    )
    return entry


def get_query_log(log_id: int, *, db_path: Path = DB_PATH) -> QueryLog:
    """Retrieve a query log entry by identifier."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM query_logs WHERE log_id = ?",
            (log_id,),
        ).fetchone()
    if row is None:
        raise KeyError(f"Query log {log_id} not found")
    return _row_to_query_log(row)


def list_query_logs(
    *,
    limit: Optional[int] = None,
    offset: int = 0,
    db_path: Path = DB_PATH,
) -> Sequence[QueryLog]:
    """Return logged queries ordered by newest first."""
    ensure_database(db_path)
    query = "SELECT * FROM query_logs ORDER BY log_id DESC LIMIT ? OFFSET ?"
    params: Iterable[int] = (limit or -1, offset)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params).fetchall()
    return [_row_to_query_log(row) for row in rows]


def log_event(
    *,
    component: str,
    process: str,
    event_type: str,
    detail: str,
    context: Optional[dict] = None,
    db_path: Path = DB_PATH,
) -> SystemLog:
    """Record a structured log entry for observability."""
    ensure_database(db_path)
    payload = json.dumps(context, sort_keys=True) if context else None
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            """
            INSERT INTO system_logs (
                component, process, event_type, detail, context_json
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (component, process, event_type, detail, payload),
        )
        log_id = cursor.lastrowid
        row = conn.execute(
            "SELECT * FROM system_logs WHERE log_id = ?",
            (log_id,),
        ).fetchone()
        conn.commit()
    if row is None:  # pragma: no cover - defensive
        raise RuntimeError("Failed to persist system log entry")
    return _row_to_system_log(row)


def list_system_logs(
    *,
    limit: Optional[int] = None,
    offset: int = 0,
    db_path: Path = DB_PATH,
) -> Sequence[SystemLog]:
    """Return system log entries ordered by newest first."""
    ensure_database(db_path)
    query = "SELECT * FROM system_logs ORDER BY log_id DESC LIMIT ? OFFSET ?"
    params: Iterable[int] = (limit or -1, offset)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params).fetchall()
    return [_row_to_system_log(row) for row in rows]


def override_annoy_id(
    doc_id: int,
    *,
    annoy_id: int,
    db_path: Path = DB_PATH,
    component: str = "storage",
    process: str = "index",
) -> None:
    """Update a document's Annoy ID and log the change."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "UPDATE documents SET annoy_id = ? WHERE doc_id = ?",
            (annoy_id, doc_id),
        )
        conn.commit()
    log_event(
        component=component,
        process=process,
        event_type="info",
        detail="Annoy ID overridden",
        context={"doc_id": doc_id, "annoy_id": annoy_id},
        db_path=db_path,
    )


def list_tables(*, db_path: Path = DB_PATH) -> Sequence[str]:
    """Return user-facing SQLite table names (excluding sqlite_*)."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
    return [row[0] for row in rows if not row[0].startswith("sqlite_")]


def dump_table(
    table_name: str,
    *,
    db_path: Path = DB_PATH,
    limit: Optional[int] = None,
    offset: int = 0,
    order_by: Optional[str] = None,
    descending: bool = False,
) -> Sequence[dict]:
    """Return raw rows from the requested table."""
    ensure_database(db_path)
    query = f"SELECT * FROM {table_name}"
    params: Iterable[int] = ()
    if order_by:
        direction = "DESC" if descending else "ASC"
        query += f" ORDER BY {order_by} {direction}"
    if limit is not None:
        query += " LIMIT ? OFFSET ?"
        params = (limit, offset)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params).fetchall()
    payload = [dict(row) for row in rows]
    return payload


def set_index_metadata(
    name: str,
    metadata: dict,
    *,
    db_path: Path = DB_PATH,
) -> None:
    """Persist JSON metadata for an Annoy index instance."""
    ensure_database(db_path)
    payload = json.dumps(metadata, sort_keys=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO index_metadata (name, metadata_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
                metadata_json = excluded.metadata_json,
                updated_at = CURRENT_TIMESTAMP
            """,
            (name, payload),
        )
        conn.commit()
    context = dict(metadata)
    context["name"] = name
    log_event(
        component="storage.set_index_metadata",
        process="index",
        event_type="info",
        detail="Index metadata updated",
        context=context,
        db_path=db_path,
    )


def get_index_metadata(
    name: str,
    *,
    db_path: Path = DB_PATH,
) -> Optional[dict]:
    """Fetch stored JSON metadata for an Annoy index."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT metadata_json, updated_at FROM index_metadata WHERE name = ?",
            (name,),
        ).fetchone()
    if row is None:
        return None
    data = json.loads(row["metadata_json"])
    data["updated_at"] = row["updated_at"]
    return data


def list_index_metadata(*, db_path: Path = DB_PATH) -> Sequence[dict]:
    """Return all Annoy index metadata entries."""
    ensure_database(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT name, metadata_json, updated_at FROM index_metadata ORDER BY name",
        ).fetchall()
    entries: list[dict] = []
    for row in rows:
        data = json.loads(row["metadata_json"])
        data["name"] = row["name"]
        data["updated_at"] = row["updated_at"]
        entries.append(data)
    return entries


def _row_to_document(row: sqlite3.Row) -> Document:
    created_at = _parse_timestamp(row["created_at"]) if row["created_at"] else None
    embedding = _blob_to_embedding(row["embedding_blob"], row["embedding_dim"])
    return Document(
        doc_id=row["doc_id"],
        thread_id=row["thread_id"],
        annoy_id=row["annoy_id"],
        text=row["text"],
        created_at=created_at or datetime.utcnow(),
        embedding_dim=row["embedding_dim"],
        embedding=embedding,
        embedding_time_ms=row["embedding_time_ms"],
        retrieval_time_ms=row["retrieval_time_ms"],
        generation_time_ms=row["generation_time_ms"],
    )


def _row_to_query_log(row: sqlite3.Row) -> QueryLog:
    queried_at = _parse_timestamp(row["queried_at"]) if row["queried_at"] else None
    return QueryLog(
        log_id=row["log_id"],
        thread_id=row["thread_id"],
        query_text=row["query_text"],
        queried_at=queried_at or datetime.utcnow(),
        top_k=row["top_k"],
        embedding_time_ms=row["embedding_time_ms"],
        retrieval_time_ms=row["retrieval_time_ms"],
        generation_time_ms=row["generation_time_ms"],
        matched_doc_id=row["matched_doc_id"],
    )


def _row_to_system_log(row: sqlite3.Row) -> SystemLog:
    created_at = _parse_timestamp(row["created_at"]) if row["created_at"] else datetime.utcnow()
    context = json.loads(row["context_json"]) if row["context_json"] else None
    return SystemLog(
        log_id=row["log_id"],
        created_at=created_at,
        component=row["component"],
        process=row["process"],
        event_type=row["event_type"],
        detail=row["detail"],
        context=context,
    )


def _parse_timestamp(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
