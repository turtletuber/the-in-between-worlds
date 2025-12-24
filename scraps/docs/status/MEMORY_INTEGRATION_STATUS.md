# Tomodachi Memory System - Current Status & Integration

## Current Architecture

### 1. **Tomo API** (`server/tomo_api.py`)
**What it does:**
- Main Flask backend for chat interface
- Two-stage inference:
  1. **Orchestrator** (decides: chat vs command)
  2. **Persona** (generates conversational response)
- Manages conversation history (in-memory list)
- Has mood system (9 personalities)

**Memory Integration:**
- ✅ **Code exists** to call memory service
- ⚠️ **Currently DISABLED** - Line 430: `use_memory=False`
- Stores every chat turn: `store_memory(user_input, response)`
- Does NOT retrieve memories for context (retrieval code exists but unused)

### 2. **Memory Service** (`memories/edge_rag/`)
**What it does:**
- Separate Flask service (runs on port 5003)
- Vector database using:
  - **Annoy** (Spotify's approximate nearest neighbors)
  - **SQLite** (metadata storage)
- Embeds text into 384-dimensional vectors
- Thread-based organization (can filter by thread_id)

**API Endpoints:**
```python
POST /api/ingest       # Store new memory
POST /api/query        # Search for similar memories
GET  /api/documents    # List all memories
DELETE /api/documents/<id>
```

## Integration Status

### ✅ What Works
1. Memory service runs independently
2. Tomo API **can** store memories (sends HTTP requests)
3. Vector search works
4. Thread filtering works

### ❌ What's Missing
1. **Memory retrieval is disabled** - Tomo doesn't look up past memories
2. **No selective storage** - Every message stored, not just "notable" ones
3. **No fine-tuned adapter** for deciding what's notable
4. **No metrics tracking** - computational power not measured

## Your Vision vs Current State

| Feature | Your Vision | Current State |
|---------|-------------|---------------|
| Single thread | ✅ One continuous conversation | ✅ Uses `thread_id="default"` |
| Selective memory | ⚠️ Tomo decides what's notable | ❌ Stores everything blindly |
| Notable detection | 🎯 Fine-tuned adapter | ❌ No adapter for this yet |
| Metrics | 📊 Track computational power | ❌ Only tracks latency |

## Next Steps (Recommended Order)

### Phase 1: Enable Basic Memory (Easy)
1. **Turn on memory retrieval** - Change `use_memory=False` to `True`
2. **Test the flow** - See how context affects responses
3. **Adjust top_k** - How many memories to retrieve (default: 3)

### Phase 2: Selective Storage (Medium)
1. **Add "notability" filter** - Simple heuristic first:
   - Questions with "how", "what", "why"
   - Important facts/preferences
   - Corrections/feedback
2. **Test and refine** criteria

### Phase 3: Metrics (Easy)
1. **Add resource tracking**:
   ```python
   import psutil  # CPU, memory usage
   import torch    # GPU usage if available
   ```
2. **Track per-inference**:
   - Tokens generated
   - Memory used
   - Time per stage
3. **Store in metrics endpoint**

### Phase 4: Fine-tune Adapter (Hard)
1. **Collect training data**:
   - Label conversations: "notable" vs "not notable"
   - ~100-500 examples needed
2. **Train LoRA adapter**:
   - Input: conversation turn
   - Output: [STORE] or [SKIP]
3. **Integrate into inference pipeline**

## Quick Start: Enable Memory Now

**File:** `server/tomo_api.py`, line 430

**Change:**
```python
# OLD:
response, persona_latency, memories = process_chat_response(user_input, thread_id="default", use_memory=False)

# NEW:
response, persona_latency, memories = process_chat_response(user_input, thread_id="default", use_memory=True)
```

**Test:**
1. Start services: `./start.sh`
2. Chat with Tomo
3. Reference something from earlier - Tomo should remember!

## Metrics - What's Available Now

**Already Tracked:**
- `orchestrator_latency` - Time for routing decision
- `persona_latency` - Time for response generation
- `total_latency` - Combined time
- `memories_retrieved` - Count of memories used

**Easy to Add:**
- Model parameter count
- Token count per response
- Memory service response time
- RAM usage per request

**Need PyTorch/psutil:**
- GPU memory usage
- CPU utilization
- Model size in memory

## Memory Storage Format

**Current:**
```python
memory_text = f"User: {user_input}\nTomo: {response}"
# Stores full turn
```

**For Selective (proposed):**
```python
if is_notable(user_input, response):
    memory_text = format_notable_memory(user_input, response, context)
    store_memory(memory_text, thread_id="default")
```

## Questions to Decide

1. **Memory retrieval**: Enable now or wait for selective storage?
2. **Metrics priority**: What measurements matter most to you?
3. **Notability criteria**: Manual rules first, or collect data for adapter?
4. **Adapter training**: Do you have labeled examples, or should we collect them?

---

**TL;DR:** Memory system works but is turned off. Turn it on (one line change), then decide if you want selective storage before training an adapter to decide what's notable.
