# Integrating Edge RAG Mini into an LLM Chat Workflow

Edge RAG Mini is designed to sit between your chat UI and the LLM runtime. It gives your assistant a fast, offline way to recall relevant context before handing control to the language model. This document explains the integration at a high level and then walks through the concrete API calls you’ll make from the repo.

## High-Level Flow

1. **User sends a message.**
2. **Edge RAG Mini stores the message** (and any authoritative knowledge you want to keep) in SQLite with its embedding and metadata.
3. **Right before calling the LLM**, the UI asks Edge RAG Mini for the top-K similar records (optionally scoped to the ongoing conversation thread).
4. **The UI appends the retrieved snippets** to the user’s message (e.g., as system/context messages) and forwards the enriched prompt to the LLM.
5. **LLM responds**, and you can optionally persist the model output back through Edge RAG Mini to maintain the full conversation history.

By keeping ingestion and retrieval local, you avoid round-trips to external vector services and can ship this pipeline to resource-constrained hardware.

## Detailed Integration Steps

### 1. Ingest text

Use `edge_rag.ingestion.ingest_text` (or the REST `/api/ingest`) whenever you want a message or document to become searchable. You provide:

```python
from edge_rag import ingestion

ingestion.ingest_text(
    thread_id="chat-123",     # logical conversation identifier
    text=user_message,         # raw string to store
    # db_path=...             # optional: point at a different SQLite file
)
```

This call embeds the text with `all-MiniLM-L6-v2`, stores the vector + metadata in SQLite, and logs the operation in `system_logs`. Use the same `thread_id` for all messages in one chat so you can filter later.

### 2. Retrieve context

Right before you send the next prompt to the LLM, call `edge_rag.retrieval.retrieve` to fetch the most relevant snippets:

```python
from edge_rag import retrieval

response = retrieval.retrieve(
    thread_id="chat-123-request",      # ID for telemetry, not filtering
    query_text=user_message,            # the incoming message
    top_k=5,                            # how many context items you want
    min_similarity=0.2,                 # optional floor for cosine similarity
    thread_filters=["chat-123"],        # optional limit to this conversation’s history
    # db_path=...                       # optional custom SQLite path
)

context_snippets = [result.document.text for result in response.results]
```

> ℹ️ **Annoy tip**: Retrieval always asks Annoy for `top_k + 1` neighbours and then falls back to a brute-force scan if self-exclusion or filtering drops the count. If you set a higher `min_similarity`, remember the brute-force path returns ≈0.35 similarity for distant matches under euclidean distance—use thresholds ≥0.5 when you explicitly want “no results”.

`thread_filters` scopes the search to the active conversation, while the rest of the corpus stays available for global lookups if you omit the filter. The `response` object includes timing metrics and the `IndexMetadata` used for the call.

### 3. Enrich the LLM prompt

Combine the retrieved snippets with the user’s new message and pass the augmented prompt to your LLM. A simple pattern is to prepend the snippets as system notes:

```python
enriched_prompt = "\n\n".join([
    "Relevant context:",
    *context_snippets,
    "User: " + user_message,
])

llm_reply = call_your_llm(enriched_prompt)
```

Store the LLM reply via `ingestion.ingest_text` (with the same `thread_id`) if you want full conversational memory, or skip it if you only keep human messages.

> 🔎 **UI note**: the built-in Flask dashboard uses `default` for both ingest and query inputs. Change both fields together (or keep the default) so retrieval stays in the same conversation thread.

### 4. Persist and audit

Every ingestion and retrieval is logged automatically in:

- `query_logs` (per-call latencies and matched IDs).
- `system_logs` (structured events via `storage.log_event`).

You can inspect both tables either directly or through the helper functions (`storage.list_query_logs`, `storage.list_system_logs`). The Flask UI (`edge_rag/web.py`) can also be extended to display them.

## Conceptual Fit

Think of Edge RAG Mini as the persistence and recall engine for your assistant. It stores conversation state, lets you tag sessions with `thread_id`, and provides low-latency retrieval so your LLM always sees the right context. Because everything runs locally (SQLite + Annoy), it’s ideal for constrained environments or offline deployments.

In future phases, the same `thread_id` concept will drive analytics, rebuilding, or archival flows—so it’s worth adopting that discipline now when you ingest both user and model turns.
