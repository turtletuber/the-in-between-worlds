"""Flask application setup for the Edge RAG Mini user interface."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from time import monotonic
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
from flask import Flask, flash, jsonify, redirect, render_template, request, session, Response, url_for

from . import ingestion, index, retrieval, storage


DEFAULT_EMBED_DIM = 384
DEFAULT_RAW_HEIGHT = 48  # viewport height percentage when not overridden
UI_COMPONENT = "ui.flask"


class EmbeddingProvider:
    """Callable interface responsible for turning free text into vectors."""

    def __call__(self, text: str) -> np.ndarray:  # pragma: no cover - protocol only
        raise NotImplementedError


class HashEmbeddingProvider(EmbeddingProvider):
    """Deterministic, lightweight fallback embedding provider.

    This intentionally simple implementation offers deterministic vectors so the
    UI remains usable before the full embedding pipeline is integrated. Each token
    contributes to a hashed bucket; vectors are L2-normalised for cosine usage.
    """

    def __init__(self, dim: int = DEFAULT_EMBED_DIM) -> None:
        self.dim = dim

    def __call__(self, text: str) -> np.ndarray:
        vector = np.zeros(self.dim, dtype=np.float32)
        if not text:
            return vector
        for token in text.split():
            digest = hashlib.sha1(token.encode("utf-8")).digest()
            bucket = int.from_bytes(digest[:4], "big") % self.dim
            vector[bucket] += 1.0
        norm = np.linalg.norm(vector)
        if norm:
            vector /= norm
        return vector


@dataclass
class QueryResult:
    """Structured representation of a retrieval result for the template."""

    document: storage.Document
    similarity: float


@dataclass
class QueryPayload:
    """Captured query context for rendering after PRG redirection."""

    query_text: str
    top_k: int
    embedding_time_ms: float
    retrieval_time_ms: float
    results: List[QueryResult]


@dataclass
class DocumentFilters:
    thread_contains: Optional[str] = None
    text_contains: Optional[str] = None


@dataclass
class QueryLogFilters:
    thread_contains: Optional[str] = None
    matched_doc_id: Optional[int] = None


def create_app(
    *,
    db_path: Optional[str] = None,
    embedding_provider: Optional[EmbeddingProvider] = None,
    secret_key: Optional[str] = None,
    model: Optional[Any] = None,
    index_config: Optional[index.IndexConfig] = None,
    index_path: Optional[Path] = None,
) -> Flask:
    """Create and configure the Flask app used for the UI layer."""

    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.secret_key = secret_key or "edge-rag-mini"
    app.config.setdefault("EDGE_RAG_DB_PATH", db_path)
    app.config.setdefault("EDGE_RAG_EMBED_PROVIDER", embedding_provider or HashEmbeddingProvider())
    app.config.setdefault("EDGE_RAG_MODEL", model)
    app.config.setdefault("EDGE_RAG_INDEX_CONFIG", index_config or index.DEFAULT_CONFIG)
    app.config.setdefault("EDGE_RAG_INDEX_PATH", index_path or index.INDEX_PATH)

    @app.route("/")
    def dashboard() -> str:
        doc_filters = _document_filters_from_query(request.args)
        log_filters = _query_log_filters_from_query(request.args)

        documents = storage.list_documents(db_path=_db_path(app))
        documents = _apply_document_filters(documents, doc_filters)
        document_views = [_document_to_view(doc) for doc in documents]

        query_logs = storage.list_query_logs(db_path=_db_path(app))
        query_logs = _apply_query_log_filters(query_logs, log_filters)

        last_query = _consume_last_query(db_path=_db_path(app))

        raw_tables = storage.list_tables(db_path=_db_path(app))
        default_table = raw_tables[0] if raw_tables else "documents"
        raw_table_choice = request.args.get("raw_table", default_table)
        if raw_table_choice not in raw_tables:
            raw_table_choice = default_table

        raw_pinned = request.args.get("raw_pin", "0") == "1"
        if "raw_pin_toggle" in request.args:
            raw_pinned = not raw_pinned

        raw_height = _coerce_height(request.args.get("raw_height"), DEFAULT_RAW_HEIGHT)
        if "raw_height_adjust" in request.args:
            raw_height = _coerce_height(request.args.get("raw_height_adjust"), raw_height)

        raw_columns, raw_rows = _load_raw_table(
            raw_table_choice,
            db_path=_db_path(app),
        )

        return render_template(
            "index.html",
            documents=document_views,
            doc_filters=doc_filters,
            query_logs=query_logs,
            log_filters=log_filters,
            last_query=last_query,
            raw_table_choice=raw_table_choice,
            raw_table_options=raw_tables,
            raw_columns=raw_columns,
            raw_rows=raw_rows,
            raw_pinned=raw_pinned,
            raw_height=raw_height,
        )

    @app.post("/ingest")
    def ingest_document() -> Any:
        text = request.form.get("text", "").strip()
        thread_id = request.form.get("thread_id", "default").strip() or "default"
        annoy_id = request.form.get("annoy_id")

        if not text:
            flash("Text is required for ingestion.", "error")
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="Ingestion rejected: empty text",
                context={"thread_id": thread_id},
            )
            return redirect(url_for("dashboard"))

        annoy_id_int = int(annoy_id) if annoy_id else None

        try:
            stored = ingestion.ingest_text(
                thread_id=thread_id,
                text=text,
                model=_embedding_model(app),
                db_path=_db_path(app),
            )
            if annoy_id_int is not None and stored.annoy_id != annoy_id_int:
                storage.override_annoy_id(
                    stored.doc_id,
                    annoy_id=annoy_id_int,
                    db_path=_db_path(app),
                    component=UI_COMPONENT,
                    process="ui",
                )
                stored = storage.get_document_by_id(stored.doc_id, db_path=_db_path(app))
            flash(f"Stored document {stored.doc_id} (thread {stored.thread_id}).", "success")
            _log_ui_event(
                app,
                process="ui",
                event_type="info",
                detail="Document stored via UI",
                context={"doc_id": stored.doc_id, "thread_id": stored.thread_id, "fallback": False},
            )
        except ImportError:
            stored = _fallback_ingest(
                thread_id=thread_id,
                text=text,
                annoy_id=annoy_id_int,
                db_path=_db_path(app),
                embedding_provider=_embedding_provider(app),
            )
            flash(
                "Sentence-transformers unavailable; stored document with hash embedding fallback.",
                "warning",
            )
        except Exception as exc:  # pragma: no cover - defensive catch for UI feedback
            flash(f"Failed to ingest document: {exc}", "error")
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="Ingestion failure",
                context={"thread_id": thread_id, "error": str(exc)},
            )
            return redirect(url_for("dashboard"))

        _log_ui_event(
            app,
            process="ui",
            event_type="telemetry",
            detail="Ingestion completed",
            context={"doc_id": stored.doc_id, "thread_id": stored.thread_id},
        )
        return redirect(url_for("dashboard"))

    @app.post("/query")
    def run_query() -> Any:
        query_text = request.form.get("query_text", "").strip()
        top_k_raw = request.form.get("top_k", "5")
        thread_id_raw = request.form.get("query_thread_id", "default")
        thread_id = (thread_id_raw or "default").strip()

        try:
            top_k = max(1, int(top_k_raw))
        except ValueError:
            top_k = 5

        if not query_text:
            flash("Query text is required.", "error")
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="Query rejected: empty text",
                context={"thread_id": thread_id},
            )
            return redirect(url_for("dashboard"))

        response_metadata: Optional[index.IndexMetadata] = None

        try:
            response = retrieval.retrieve(
                thread_id=thread_id,
                query_text=query_text,
                top_k=top_k,
                db_path=_db_path(app),
                index_path=_index_path(app),
                config=_index_config(app),
                model=_embedding_model(app),
                thread_filters=[thread_id] if thread_id else None,
            )
            payload = QueryPayload(
                query_text=query_text,
                top_k=top_k,
                embedding_time_ms=response.embedding_time_ms,
                retrieval_time_ms=response.retrieval_time_ms,
                results=[
                    QueryResult(document=result.document, similarity=result.similarity)
                    for result in response.results
                ],
            )
            _store_last_query(payload)
            _log_ui_event(
                app,
                process="ui",
                event_type="info",
                detail="Query completed",
                context={
                    "thread_id": thread_id,
                    "top_k": top_k,
                    "fallback": False,
                    "index": {
                        "doc_count": response.index_metadata.doc_count,
                        "updated_at": response.index_metadata.updated_at,
                    },
                },
            )
        except retrieval.RetrievalError as exc:
            flash(str(exc), "warning")
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="Query failed",
                context={"thread_id": thread_id, "error": str(exc)},
            )
        except ImportError:
            documents = storage.list_documents(db_path=_db_path(app))
            filtered_docs = (
                [doc for doc in documents if doc.thread_id == thread_id]
                if thread_id
                else documents
            )
            fallback_payload = _fallback_retrieval(
                thread_id=thread_id,
                query_text=query_text,
                top_k=top_k,
                documents=filtered_docs,
                db_path=_db_path(app),
                embedding_provider=_embedding_provider(app),
            )
            _store_last_query(fallback_payload)
            _log_ui_event(
                app,
                process="ui",
                event_type="telemetry",
                detail="Query completed with fallback",
                context={"thread_id": thread_id, "top_k": top_k, "fallback": True},
            )
        except Exception as exc:  # pragma: no cover - defensive catch for UI feedback
            flash(f"Failed to run query: {exc}", "error")
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="Query unexpected failure",
                context={"thread_id": thread_id, "error": str(exc)},
            )
        return redirect(url_for("dashboard"))

    @app.post("/api/ingest")
    def api_ingest_document() -> Response:
        payload = request.get_json(silent=True) or {}
        text = str(payload.get("text", "")).strip()
        thread_id = str(payload.get("thread_id", "default")).strip() or "default"
        annoy_id_value = payload.get("annoy_id")
        annoy_id_int = int(annoy_id_value) if isinstance(annoy_id_value, int) or (isinstance(annoy_id_value, str) and annoy_id_value.isdigit()) else None

        if not text:
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="API ingestion rejected: empty text",
                context={"thread_id": thread_id},
            )
            return jsonify({"error": "Text is required for ingestion."}), 400

        try:
            stored = ingestion.ingest_text(
                thread_id=thread_id,
                text=text,
                model=_embedding_model(app),
                db_path=_db_path(app),
            )
            if annoy_id_int is not None and stored.annoy_id != annoy_id_int:
                storage.override_annoy_id(
                    stored.doc_id,
                    annoy_id=annoy_id_int,
                    db_path=_db_path(app),
                    component=UI_COMPONENT,
                    process="ui",
                )
                stored = storage.get_document_by_id(stored.doc_id, db_path=_db_path(app))
        except ImportError:
            stored = _fallback_ingest(
                thread_id=thread_id,
                text=text,
                annoy_id=annoy_id_int,
                db_path=_db_path(app),
                embedding_provider=_embedding_provider(app),
            )
            fallback = True
        except Exception as exc:  # pragma: no cover
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="API ingestion failure",
                context={"thread_id": thread_id, "error": str(exc)},
            )
            return jsonify({"error": str(exc)}), 500
        else:
            fallback = False
            _log_ui_event(
                app,
                process="ui",
                event_type="info",
                detail="API document stored",
                context={"doc_id": stored.doc_id, "thread_id": stored.thread_id, "fallback": False},
            )

        response_payload = {
            "document": _document_to_view(stored),
            "fallback": fallback,
        }
        return jsonify(response_payload)

    @app.post("/api/query")
    def api_run_query() -> Response:
        payload = request.get_json(silent=True) or {}
        query_text = str(payload.get("query_text", "")).strip()
        top_k = payload.get("top_k", 5)
        thread_id_raw = payload.get("thread_id", "default")
        thread_id = (str(thread_id_raw) if thread_id_raw is not None else "default").strip()

        try:
            top_k = max(1, int(top_k))
        except (TypeError, ValueError):
            top_k = 5

        if not query_text:
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="API query rejected: empty text",
                context={"thread_id": thread_id},
            )
            return jsonify({"error": "Query text is required."}), 400

        try:
            response = retrieval.retrieve(
                thread_id=thread_id,
                query_text=query_text,
                top_k=top_k,
                db_path=_db_path(app),
                index_path=_index_path(app),
                config=_index_config(app),
                model=_embedding_model(app),
                thread_filters=[thread_id] if thread_id else None,
            )
            payload = QueryPayload(
                query_text=query_text,
                top_k=top_k,
                embedding_time_ms=response.embedding_time_ms,
                retrieval_time_ms=response.retrieval_time_ms,
                results=[
                    QueryResult(document=result.document, similarity=result.similarity)
                    for result in response.results
                ],
            )
            fallback = False
            response_metadata = response.index_metadata
            _log_ui_event(
                app,
                process="ui",
                event_type="info",
                detail="API query completed",
                context={
                    "thread_id": thread_id,
                    "top_k": top_k,
                    "fallback": False,
                    "index": {
                        "doc_count": response.index_metadata.doc_count,
                        "updated_at": response.index_metadata.updated_at,
                        "build_time_ms": response.index_metadata.build_time_ms,
                    },
                },
            )
        except retrieval.RetrievalError as exc:
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="API query failed",
                context={"thread_id": thread_id, "error": str(exc)},
            )
            return jsonify({"error": str(exc)}), 400
        except ImportError:
            documents = storage.list_documents(db_path=_db_path(app))
            filtered_docs = (
                [doc for doc in documents if doc.thread_id == thread_id]
                if thread_id
                else documents
            )
            payload = _fallback_retrieval(
                thread_id=thread_id,
                query_text=query_text,
                top_k=top_k,
                documents=filtered_docs,
                db_path=_db_path(app),
                embedding_provider=_embedding_provider(app),
            )
            fallback = True
            _log_ui_event(
                app,
                process="ui",
                event_type="telemetry",
                detail="API query completed with fallback",
                context={"thread_id": thread_id, "top_k": top_k, "fallback": True},
            )
        except Exception as exc:  # pragma: no cover
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="API query unexpected failure",
                context={"thread_id": thread_id, "error": str(exc)},
            )
            return jsonify({"error": str(exc)}), 500

        results = [
            {
                "document": _document_to_view(result.document),
                "similarity": result.similarity,
            }
            for result in payload.results
        ]

        metadata_payload = None
        if not fallback and response_metadata is not None:
            metadata_payload = {
                "doc_count": response_metadata.doc_count,
                "updated_at": response_metadata.updated_at,
                "build_time_ms": response_metadata.build_time_ms,
            }

        return jsonify(
            {
                "query_text": payload.query_text,
                "top_k": payload.top_k,
                "embedding_time_ms": payload.embedding_time_ms,
                "retrieval_time_ms": payload.retrieval_time_ms,
                "results": results,
                "fallback": fallback,
                "metadata": metadata_payload,
            }
        )

    @app.get("/api/table/<table_name>")
    def api_table_snapshot(table_name: str) -> Response:
        tables = storage.list_tables(db_path=_db_path(app))
        if table_name not in tables:
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="Unknown table requested",
                context={"table": table_name},
            )
            return jsonify({"error": f"Unknown table '{table_name}'"}), 404
        limit_param = request.args.get("limit")
        offset_param = request.args.get("offset")
        try:
            limit = int(limit_param) if limit_param is not None else None
        except ValueError:
            limit = None
        try:
            offset = int(offset_param) if offset_param is not None else 0
        except ValueError:
            offset = 0

        if limit is None and table_name == "system_logs":
            limit = 200

        columns, rows = _load_raw_table(
            table_name,
            db_path=_db_path(app),
            limit=limit,
            offset=offset,
        )
        return jsonify({"columns": columns, "rows": rows})

    @app.post("/api/logs/open")
    def api_logs_open() -> Response:
        _log_ui_event(
            app,
            process="ui",
            event_type="info",
            detail="Log panel opened",
            context={},
        )
        return jsonify({"status": "listening"})

    @app.post("/api/logs/close")
    def api_logs_close() -> Response:
        _log_ui_event(
            app,
            process="ui",
            event_type="info",
            detail="Log panel closed",
            context={},
        )
        return jsonify({"status": "closed"})

    @app.post("/index/rebuild")
    def rebuild_index() -> Any:
        try:
            metadata = index.build_index(
                config=_index_config(app),
                db_path=_db_path(app),
                index_path=_index_path(app),
            )
            flash(
                "Rebuilt index: {doc_count} docs, {build_time_ms:.2f} ms".format(
                    doc_count=metadata.get("doc_count", 0),
                    build_time_ms=metadata.get("build_time_ms", 0.0),
                ),
                "success",
            )
            _log_ui_event(
                app,
                process="ui",
                event_type="info",
                detail="Annoy index rebuilt via UI",
                context={
                    "doc_count": metadata.get("doc_count", 0),
                    "build_time_ms": metadata.get("build_time_ms", 0.0),
                },
            )
        except ImportError:
            flash("Annoy library unavailable; cannot rebuild index.", "error")
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="Annoy rebuild unavailable",
                context={"reason": "annoy missing"},
            )
        except Exception as exc:  # pragma: no cover
            flash(f"Failed to rebuild index: {exc}", "error")
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="Annoy rebuild failed",
                context={"error": str(exc)},
            )
        return redirect(url_for("dashboard"))

    @app.post("/export")
    def export_data() -> Any:
        try:
            export_payload = _build_export_payload(db_path=_db_path(app))
            _log_ui_event(
                app,
                process="ui",
                event_type="info",
                detail="Export generated",
                context={"bytes": len(export_payload)},
            )
        except Exception as exc:  # pragma: no cover
            flash(f"Failed to export data: {exc}", "error")
            _log_ui_event(
                app,
                process="ui",
                event_type="error",
                detail="Export failed",
                context={"error": str(exc)},
            )
            return redirect(url_for("dashboard"))

        return Response(
            export_payload,
            mimetype="application/json",
            headers={"Content-Disposition": "attachment; filename=edge_rag_export.json"},
        )

    @app.route("/api/metrics", methods=["GET"])
    def api_metrics() -> Response:
        """Get storage and usage metrics."""
        try:
            db_path = _db_path(app)
            metrics = _get_storage_metrics(db_path=db_path)

            return jsonify({
                "total_documents": metrics.total_documents,
                "total_vectors": metrics.total_vectors,
                "database_size_bytes": metrics.database_size_bytes,
                "index_size_bytes": metrics.index_size_bytes,
                "total_size_mb": metrics.total_size_mb,
                "documents_by_thread": metrics.documents_by_thread,
                "oldest_document": metrics.oldest_document,
                "newest_document": metrics.newest_document
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return app


def _db_path(app: Flask) -> Path:
    configured = app.config.get("EDGE_RAG_DB_PATH")
    if configured:
        return Path(configured)
    return Path(storage.DB_PATH)


def _log_ui_event(
    app: Flask,
    *,
    process: str,
    event_type: str,
    detail: str,
    context: Optional[Dict[str, Any]] = None,
) -> None:
    storage.log_event(
        component=UI_COMPONENT,
        process=process,
        event_type=event_type,
        detail=detail,
        context=context,
        db_path=_db_path(app),
    )


def _embedding_provider(app: Flask) -> EmbeddingProvider:
    provider = app.config.get("EDGE_RAG_EMBED_PROVIDER")
    if isinstance(provider, EmbeddingProvider):  # pragma: no mutate - runtime check
        return provider
    if callable(provider):
        return provider  # type: ignore[return-value]
    return HashEmbeddingProvider()


def _embedding_model(app: Flask) -> Optional[Any]:
    return app.config.get("EDGE_RAG_MODEL")


def _document_to_view(doc: storage.Document) -> Dict[str, Any]:
    return {
        "doc_id": doc.doc_id,
        "thread_id": doc.thread_id,
        "annoy_id": doc.annoy_id,
        "text": doc.text,
        "created_at": doc.created_at.strftime("%Y-%m-%d %H:%M:%S") if doc.created_at else None,
        "embedding_dim": doc.embedding_dim,
        "embedding_time_ms": doc.embedding_time_ms,
        "retrieval_time_ms": doc.retrieval_time_ms,
        "generation_time_ms": doc.generation_time_ms,
    }


def _rank_documents(query_vec: np.ndarray, documents: Sequence[storage.Document]) -> List[QueryResult]:
    scored: List[QueryResult] = []
    for doc in documents:
        similarity = _cosine_similarity(query_vec, doc.embedding)
        scored.append(QueryResult(document=doc, similarity=similarity))
    scored.sort(key=lambda result: result.similarity, reverse=True)
    return scored


def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    denom = np.linalg.norm(vec_a) * np.linalg.norm(vec_b)
    if denom == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / denom)


def _store_last_query(payload: QueryPayload) -> None:
    session["last_query"] = {
        "query_text": payload.query_text,
        "top_k": payload.top_k,
        "embedding_time_ms": payload.embedding_time_ms,
        "retrieval_time_ms": payload.retrieval_time_ms,
        "results": [
            {
                "doc_id": result.document.doc_id,
                "similarity": result.similarity,
            }
            for result in payload.results
        ],
    }


def _consume_last_query(*, db_path: Path) -> Optional[Dict[str, Any]]:
    payload = session.pop("last_query", None)
    if not payload:
        return None

    results = []
    for result in payload.get("results", []):
        doc_id = result.get("doc_id")
        if not isinstance(doc_id, int):
            continue
        try:
            doc = storage.get_document_by_id(doc_id, db_path=db_path)
        except KeyError:
            continue
        results.append(
            {
                "doc_id": doc.doc_id,
                "similarity": result.get("similarity", 0.0),
                "preview": doc.text if len(doc.text) <= 400 else doc.text[:397] + "...",
                "thread": doc.thread_id,
                "latency": {
                    "embedding": doc.embedding_time_ms,
                    "retrieval": doc.retrieval_time_ms,
                    "generation": doc.generation_time_ms,
                },
                "text": doc.text,
            }
        )
    payload["results"] = results
    return payload


def _document_filters_from_query(args: Dict[str, Any]) -> DocumentFilters:
    return DocumentFilters(
        thread_contains=_clean_optional(args.get("doc_thread")),
        text_contains=_clean_optional(args.get("doc_text")),
    )


def _query_log_filters_from_query(args: Dict[str, Any]) -> QueryLogFilters:
    matched_raw = _clean_optional(args.get("log_doc_id"))
    matched_doc_id = int(matched_raw) if matched_raw and matched_raw.isdigit() else None
    return QueryLogFilters(
        thread_contains=_clean_optional(args.get("log_thread")),
        matched_doc_id=matched_doc_id,
    )


def _apply_document_filters(
    documents: Sequence[storage.Document], filters: DocumentFilters
) -> List[storage.Document]:
    filtered: Iterable[storage.Document] = documents
    if filters.thread_contains:
        needle = filters.thread_contains.lower()
        filtered = [doc for doc in filtered if needle in doc.thread_id.lower()]
    if filters.text_contains:
        needle = filters.text_contains.lower()
        filtered = [doc for doc in filtered if needle in doc.text.lower()]
    return list(filtered)


def _apply_query_log_filters(
    logs: Sequence[storage.QueryLog], filters: QueryLogFilters
) -> List[storage.QueryLog]:
    filtered: Iterable[storage.QueryLog] = logs
    if filters.thread_contains:
        needle = filters.thread_contains.lower()
        filtered = [log for log in filtered if needle in log.thread_id.lower()]
    if filters.matched_doc_id is not None:
        filtered = [log for log in filtered if log.matched_doc_id == filters.matched_doc_id]
    return list(filtered)


def _clean_optional(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    value = raw.strip()
    return value or None


def _index_config(app: Flask) -> index.IndexConfig:
    config = app.config.get("EDGE_RAG_INDEX_CONFIG")
    if isinstance(config, index.IndexConfig):
        return config
    if isinstance(config, dict):  # pragma: no cover - config override safety
        return index.IndexConfig(**config)
    return index.DEFAULT_CONFIG


def _index_path(app: Flask) -> Path:
    raw_path = app.config.get("EDGE_RAG_INDEX_PATH")
    if isinstance(raw_path, Path):
        return raw_path
    if raw_path is None:
        return index.INDEX_PATH
    return Path(raw_path)


def _fallback_ingest(
    *,
    thread_id: str,
    text: str,
    annoy_id: Optional[int],
    db_path: Path,
    embedding_provider: EmbeddingProvider,
) -> storage.Document:
    start = monotonic()
    embedding = embedding_provider(text)
    embedding_time_ms = (monotonic() - start) * 1000
    document = storage.insert_document(
        thread_id=thread_id,
        text=text,
        embedding=embedding,
        embedding_time_ms=embedding_time_ms,
        annoy_id=annoy_id,
        db_path=db_path,
    )
    storage.log_event(
        component=UI_COMPONENT,
        process="ui",
        event_type="fallback",
        detail="Hash embedding fallback used",
        context={"doc_id": document.doc_id, "thread_id": document.thread_id, "embedding_time_ms": embedding_time_ms},
        db_path=db_path,
    )
    return document


def _fallback_retrieval(
    *,
    thread_id: str,
    query_text: str,
    top_k: int,
    documents: Sequence[storage.Document],
    db_path: Path,
    embedding_provider: EmbeddingProvider,
) -> QueryPayload:
    embed_start = monotonic()
    query_vec = embedding_provider(query_text)
    embed_time_ms = (monotonic() - embed_start) * 1000

    retrieval_start = monotonic()
    ranked = _rank_documents(query_vec, documents)
    retrieval_time_ms = (monotonic() - retrieval_start) * 1000
    top_results = ranked[:top_k]

    matched_doc_id = top_results[0].document.doc_id if top_results else None

    storage.log_query(
        thread_id=thread_id,
        query_text=query_text,
        top_k=top_k,
        embedding_time_ms=embed_time_ms,
        retrieval_time_ms=retrieval_time_ms,
        matched_doc_id=matched_doc_id,
        db_path=db_path,
    )

    storage.log_event(
        component=UI_COMPONENT,
        process="ui",
        event_type="fallback",
        detail="Hash cosine fallback retrieval used",
        context={
            "thread_id": thread_id,
            "top_k": top_k,
            "matched_doc_id": matched_doc_id,
            "embedding_time_ms": embed_time_ms,
            "retrieval_time_ms": retrieval_time_ms,
        },
        db_path=db_path,
    )

    for result in top_results:
        try:
            storage.update_document_latencies(
                result.document.doc_id,
                retrieval_time_ms=retrieval_time_ms,
                db_path=db_path,
            )
            result.document.retrieval_time_ms = retrieval_time_ms
        except Exception as exc:  # pragma: no cover - log only
            storage.log_event(
                component=UI_COMPONENT,
                process="ui",
                event_type="error",
                detail="Failed to update fallback document latency",
                context={"doc_id": result.document.doc_id, "error": str(exc)},
                db_path=db_path,
            )

    return QueryPayload(
        query_text=query_text,
        top_k=top_k,
        embedding_time_ms=embed_time_ms,
        retrieval_time_ms=retrieval_time_ms,
        results=top_results,
    )


def _build_export_payload(*, db_path: Path) -> str:
    documents = storage.list_documents(db_path=db_path)
    query_logs = storage.list_query_logs(db_path=db_path)

    doc_entries = [
        {
            "doc_id": doc.doc_id,
            "thread_id": doc.thread_id,
            "annoy_id": doc.annoy_id,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "embedding_dim": doc.embedding_dim,
            "embedding_time_ms": doc.embedding_time_ms,
            "retrieval_time_ms": doc.retrieval_time_ms,
            "generation_time_ms": doc.generation_time_ms,
            "text": doc.text,
        }
        for doc in documents
    ]

    log_entries = [
        {
            "log_id": log.log_id,
            "thread_id": log.thread_id,
            "query_text": log.query_text,
            "top_k": log.top_k,
            "embedding_time_ms": log.embedding_time_ms,
            "retrieval_time_ms": log.retrieval_time_ms,
            "generation_time_ms": log.generation_time_ms,
            "matched_doc_id": log.matched_doc_id,
            "queried_at": log.queried_at.isoformat() if log.queried_at else None,
        }
        for log in query_logs
    ]

    payload = {
        "documents": doc_entries,
        "query_logs": log_entries,
    }
    return json.dumps(payload, indent=2)


def _load_raw_table(
    table: str,
    *,
    db_path: Path,
    limit: Optional[int] = None,
    offset: int = 0,
) -> Tuple[List[str], List[Dict[str, Any]]]:
    if table == "documents":
        records = storage.list_documents(db_path=db_path, limit=limit, offset=offset)
        rows = [_normalize_dict({
            "doc_id": doc.doc_id,
            "thread_id": doc.thread_id,
            "annoy_id": doc.annoy_id,
            "text": doc.text,
            "created_at": doc.created_at,
            "embedding_dim": doc.embedding_dim,
            "embedding": doc.embedding,
            "embedding_time_ms": doc.embedding_time_ms,
            "retrieval_time_ms": doc.retrieval_time_ms,
            "generation_time_ms": doc.generation_time_ms,
        }) for doc in records]
    elif table == "query_logs":
        records = storage.list_query_logs(db_path=db_path, limit=limit, offset=offset)
        rows = [_normalize_dict({
            "log_id": log.log_id,
            "thread_id": log.thread_id,
            "query_text": log.query_text,
            "queried_at": log.queried_at,
            "top_k": log.top_k,
            "embedding_time_ms": log.embedding_time_ms,
            "retrieval_time_ms": log.retrieval_time_ms,
            "generation_time_ms": log.generation_time_ms,
            "matched_doc_id": log.matched_doc_id,
        }) for log in records]
    elif table == "index_metadata":
        records = storage.list_index_metadata(db_path=db_path)
        rows = [_normalize_dict(record) for record in records]
    elif table == "system_logs":
        dump = storage.dump_table(
            table,
            db_path=db_path,
            limit=limit,
            offset=offset,
            order_by="log_id",
            descending=True,
        )
        rows = [_normalize_dict(row) for row in dump]
    else:
        dump = storage.dump_table(table, db_path=db_path, limit=limit, offset=offset)
        rows = [_normalize_dict(row) for row in dump]

    columns: List[str] = list(rows[0].keys()) if rows else []
    return columns, rows


def _list_tables(*, db_path: Path) -> List[str]:
    tables = storage.list_tables(db_path=db_path)
    return list(tables)


def _coerce_height(value: Optional[str], default: int) -> int:
    try:
        height = int(value) if value is not None else default
    except ValueError:
        return default
    return max(20, min(height, 80))


def _normalize_dict(payload: Dict[str, Any]) -> Dict[str, Any]:
    return {key: _serialize_value(value) for key, value in payload.items()}


def _serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value


# ============================================================================
# STORAGE METRICS HELPERS
# ============================================================================

@dataclass
class StorageMetrics:
    """Storage usage statistics for the memory system."""
    total_documents: int
    total_vectors: int
    database_size_bytes: int
    index_size_bytes: int
    total_size_mb: float
    documents_by_thread: Dict[str, int]
    oldest_document: Optional[str]
    newest_document: Optional[str]


def _get_storage_metrics(*, db_path: Path) -> StorageMetrics:
    """Calculate storage usage metrics."""
    documents = storage.list_documents(db_path=db_path)

    # Get file sizes
    db_size = db_path.stat().st_size if db_path.exists() else 0

    # Check for Annoy index file
    index_path = db_path.parent / "edge_rag.ann"
    index_size = index_path.stat().st_size if index_path.exists() else 0

    # Count documents by thread
    thread_counts: Dict[str, int] = {}
    oldest_ts = None
    newest_ts = None

    for doc in documents:
        thread_counts[doc.thread_id] = thread_counts.get(doc.thread_id, 0) + 1

        if oldest_ts is None or doc.created_at < oldest_ts:
            oldest_ts = doc.created_at
        if newest_ts is None or doc.created_at > newest_ts:
            newest_ts = doc.created_at

    total_size_mb = (db_size + index_size) / (1024 * 1024)

    return StorageMetrics(
        total_documents=len(documents),
        total_vectors=len(documents),  # One vector per document
        database_size_bytes=db_size,
        index_size_bytes=index_size,
        total_size_mb=round(total_size_mb, 2),
        documents_by_thread=thread_counts,
        oldest_document=oldest_ts.strftime("%Y-%m-%d %H:%M:%S") if oldest_ts else None,
        newest_document=newest_ts.strftime("%Y-%m-%d %H:%M:%S") if newest_ts else None
    )
