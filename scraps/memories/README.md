# Edge RAG Mini

Edge RAG Mini is a self-contained Retrieval-Augmented Generation (RAG) prototype tuned for edge hardware. It ingests text, embeds content locally, stores everything in SQLite, and answers similarity queries through an Annoy-based vector index—no external services required. Use it to benchmark offline RAG behaviour, experiment with lightweight pipelines, or validate integrations before shipping to constrained devices.

## Quick Start

1. **Prerequisites**
   - Python **3.11.x** installed (`/opt/homebrew/bin/python3.11` via Homebrew on macOS, or an equivalent build from pyenv/system packages).
   - Command-line build tools (Xcode CLT on macOS or `build-essential` on Linux) for packages that may need compilation.
2. **Create the virtual environment** from the repo root:
   ```bash
   ./scripts/setup_venv.sh           # defaults to /opt/homebrew/bin/python3.11
   # or override the interpreter:
   PYTHON_BIN=/path/to/python3.11 ./scripts/setup_venv.sh
   source .venv/bin/activate
   ```
   The script upgrades `pip`, `setuptools`, and `wheel` before installing dependencies from `requirements.txt`. Manual alternative: `python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`.
3. **Verify the install** (ensures Annoy and numeric deps are ready):
   ```bash
   python -c "import annoy, torch, numpy, sklearn"
   ```
4. **Run the pipeline tests** (optional smoke check):
   ```bash
   python -m unittest discover -s tests
   ```
5. **Deactivate when finished**: `deactivate` (Reactivate later with `source .venv/bin/activate`).

_Troubleshooting_:
- If PyPI cannot provide a pre-built wheel (common on fresh Apple Silicon setups), install Xcode Command Line Tools (`xcode-select --install`) or use the PyTorch CPU wheel from the official index: `pip install torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu` inside the activated environment, then re-run `pip install -r requirements.txt`.
- If the script reports `python: command not found` after "Reusing" an existing `.venv`, remove it (`rm -rf .venv`) and rerun with an explicit interpreter: `PYTHON_BIN=/opt/homebrew/bin/python3.11 ./scripts/setup_venv.sh`.
- Use `command -v /opt/homebrew/bin/python3.11` (or your chosen path) to confirm the interpreter exists before running the setup script.

## Directory Map

- `.venv/` – Project-local environment (ignored by git).
- `data/` – SQLite database (`edge_rag.db`) and Annoy index (`edge_rag.ann`).
- `docs/` – Additional documentation (e.g., LLM integration guide).
- `edge_rag/` – Source package: storage, embeddings, ingestion, index, retrieval, and Flask UI.
- `requirements.txt` – Python package versions for the pipeline.
- `scripts/` – Utility scripts (`setup_venv.sh`).
- `tests/` – Unit tests for each backend component.

## Capabilities & Constraints

**Core functions**
- Text ingestion with per-document telemetry.
- Local embedding via `all-MiniLM-L6-v2`.
- Annoy cosine index for top-K retrieval.
- Storage/telemetry in SQLite for repeatable experiments.

**Constraints**
- Dense retrieval only (no hybrid/scoring).
- No online learning or incremental indexing.
- Prototype scope; not tuned for large corpora or multi-node deployments.

## Terminology

- **Document** – A stored text record (usually a chat turn or knowledge snippet) plus its embedding and latency metadata. Documents live in the `documents` table and are what retrieval returns.
- **Thread / `thread_id`** – A string label that groups related documents (for example, all turns in a chat conversation). Supply the same `thread_id` at ingestion time to keep a conversation’s history together.
- **Thread filters (`thread_filters`)** – An optional list of `thread_id` values passed to `retrieval.retrieve` to limit searches to specific conversations. If omitted, retrieval searches the entire corpus.
- **Query request** – A call to `retrieval.retrieve` that embeds the user’s input, ensures the Annoy index is ready, and returns the top‑K nearest documents (respecting any similarity or thread filters you set).
- **Session (Flask)** – The UI uses Flask’s `session` object only to cache the “last query” payload between page loads. There is no persistent “session id” separate from `thread_id`, and the backend does not rely on the string `"session"` for any logic.

## Pipeline Overview

### 1. Data Storage Layer (`edge_rag/storage.py`)
- SQLite schema tracks documents, embeddings, query logs, index metadata, and system-wide events (`system_logs`).
- CRUD helpers persist embeddings as float32 blobs, maintain stable Annoy IDs, and update per-document latency metrics.
- Query telemetry (`log_query`) records top-K, matched IDs, and timing for every request.

### 2. Embedding Pipeline (`edge_rag/embeddings.py`)
- Lazily loads `all-MiniLM-L6-v2` via sentence-transformers with a cached singleton.
- `embed_text` captures embedding latency and dimension; errors on empty text.
- `embed_and_store` bridges the embedder with the storage layer, attaching telemetry to each document row.

### 3. Index Management (`edge_rag/index.py`)
- `ensure_index` rebuilds the Annoy index when documents or configuration change, guided by digests stored in SQLite.
- `build_index` writes the index atomically and persists metadata (trees, dimensions, build time) via `set_index_metadata`.
- `query_with_documents` uses Euclidean distance (default metric) and pairs Annoy hits with stored metadata.

### 4. Retrieval Engine (`edge_rag/retrieval.py`)
- Validates input, embeds queries, ensures the Annoy index is fresh, and executes top-K retrieval while requesting `top_k + 1` neighbours from Annoy. The slight over-fetch absorbs Annoy’s self-exclusion of the query vector so normal post-filtering cannot drain the result set.
- Supports dials for `top_k`, `search_k`, optional `min_similarity` thresholds, and optional `thread_filters` to scope matches to specific conversation/data threads. When filters shrink the pool, retrieval automatically expands the Annoy request (up to 3×) before falling back to brute force.
- Falls back to a brute-force scan when Annoy cannot supply enough neighbours. The fallback mirrors Annoy’s distance-to-similarity mapping (euclidean or angular) and emits a single telemetry log (`detail="Brute-force fallback added candidates"`) so operators can see when it activates.
- Logs telemetry, including empty-result cases, through both `query_logs` and `system_logs` for complete traceability.

#### Annoy behaviour & tuning guidance
- Annoy omits the item at the queried vector’s own index. Threads with a single document therefore rely on the brute-force fallback (or a relaxed `min_similarity`) to surface that document. Keep `min_similarity` below ≈0.4 if you expect the fallback to return the lone entry.
- Identical embeddings may still yield a single Annoy neighbour even when multiple documents share the vector. Over-fetching plus the fallback keeps responses non-empty, but downstream ranking will reflect whichever neighbour Annoy returned unless you deduplicate by `doc_id`.
- Tweak `num_trees` and `search_k` in `index.IndexConfig` when you need higher recall. Larger search windows reduce reliance on fallback at the cost of latency.

## Centralized Logging Standard

- All modules call `storage.log_event`, writing to `system_logs` (`log_id`, `created_at`, `component`, `process`, `event_type`, `detail`, `context_json`).
- **Processes**: `ingestion`, `embedding`, `index`, `retrieval`, `telemetry`, `fallback`, `ui`.
- **Event types**: `info`, `telemetry`, `lifecycle`, `error`, `fallback` (reserved for UI fallbacks once hooked up).
- Storage logs every mutation; embeddings record model lifecycle and timing; index and retrieval capture rebuild reasons, latency, and outcomes.
- UI routes currently flash outcomes; when Phase 5 work resumes, they should emit matching `log_event` entries (especially for fallback paths).

## Web UI Usage

The Flask UI is a thin shell over the pipeline. Launch it with:

```bash
FLASK_APP=edge_rag.web:create_app FLASK_RUN_PORT=5003 python3 -m flask run --reload
```

All UI interactions write to `system_logs` via `storage.log_event` (`process="ui"`), including fallbacks and validation errors. Tail recent entries with:

```bash
sqlite3 data/edge_rag.db 'SELECT * FROM system_logs WHERE process="ui" ORDER BY log_id DESC LIMIT 20;'
```

AJAX endpoints:
- `POST /api/ingest` – wraps `ingestion.ingest_text` and returns the stored document.
- `POST /api/query` – wraps `retrieval.retrieve`, returning top-k hits plus Annoy metadata.
- `GET /api/table/<table>` – uses storage helpers (`list_tables`, `dump_table`) to snapshot tables (documents, query_logs, system_logs, etc.).

**Thread IDs**
- Both ingest and query forms default to the same thread ID (`default`). If you change it, use the same value for query and retrieval; the UI forwards the thread as `thread_filters` so results stay scoped to that conversation.

**Log Sidebar**
- Toggle “Show Logs” to pin a right-hand panel that streams the latest `system_logs` entries (newest first, plain text).
- The panel polls `/api/table/system_logs?limit=50`; closing it pauses polling.
- Because each fetch is logged, you can correlate UI activity with backend events immediately.

Fallback behaviour (hash embeddings/retrieval) is logged with `event_type="fallback"`. Use the raw viewer (bottom pane) to inspect tables in real time without reloading.

## Future Work


### Phase 5 – Web User Interface
- Complete the Flask UI wiring to the new logging system.
- Display live ingestion/query telemetry and expose controls for rebuilding/exporting state.

### Phase 6 – Performance Testing & Tuning
- Benchmark embedding/retrieval latency at different corpus sizes.
- Explore Annoy tree/search parameters to balance quality vs. speed on edge devices.

### Phase 7 – API Layer & Integration Hooks
- Provide thin `ingest(text)` / `retrieve(query, k)` wrappers with consistent payloads.
- Keep responses lightweight for downstream LLM pipelines.

### Phase 8 – Final QA & Packaging
- Verify cold-start recovery of the database and Annoy index.
- Document deployment steps, hardware requirements, and operational guidelines for new devices.
- Produce ready-to-clone packaging (requirements file, optional Docker image).
- **Top Results Pane** – after each search the Run Query section renders the requested top-K matches (same ordering as the backend) with similarity and latency metrics.
