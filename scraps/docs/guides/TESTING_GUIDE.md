# 🧪 Tomodachi System Testing Guide

This guide provides comprehensive manual tests you can run to verify your Tomodachi system is working correctly, including the 3-stage cascading router, memory/VDB integration, and chat functionality.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [System Health Check](#system-health-check)
3. [Cascading Router Tests](#cascading-router-tests)
4. [Memory & VDB Tests](#memory--vdb-tests)
5. [Chat Quality Tests](#chat-quality-tests)
6. [Performance Tests](#performance-tests)
7. [Automated Test Scripts](#automated-test-scripts)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Tomodachi server running (`./start.sh`)
- Memory service running (if testing VDB features)
- Browser or `curl` for testing

### Run Automated Tests
```bash
# Navigate to scripts directory
cd /home/user/tomodachi/ai/scripts

# Make test script executable
chmod +x test_system_integration.py

# Run comprehensive integration tests
python3 test_system_integration.py
```

---

## ❤️ System Health Check

### Test 1: API Server Status
**Endpoint:** `GET /api/status`

**Using curl:**
```bash
curl http://localhost:8080/api/status
```

**Expected Response:**
```json
{
  "model_loaded": true,
  "current_adapter": "ai/persona_tomo_v3",
  "conversation_count": 0,
  "current_mood": "NEUTRAL",
  "inference_params": {...},
  "model_config": {...}
}
```

**Success Criteria:**
- ✅ Response status 200
- ✅ `model_loaded` is `true`
- ✅ Valid adapter path shown

### Test 2: Memory Service Status (if applicable)
**Endpoint:** `GET http://localhost:8090/api/status`

**Using curl:**
```bash
curl http://localhost:8090/api/status
```

**Success Criteria:**
- ✅ Response status 200
- ✅ Service responds within 1 second

---

## 🔀 Cascading Router Tests

The 3-stage cascading router determines whether to route requests to:
- **phone_home**: Complex tasks requiring Claude API
- **local**: Simple commands or chat
- **chat**: Conversational responses

### Test 3: Chat Route Detection

**Test Cases:**

| Input | Expected Route | Expected Intent |
|-------|---------------|----------------|
| `"hey tomo"` | `local` | `chat` |
| `"how are you?"` | `local` | `chat` |
| `"what's up tomo?"` | `local` | `chat` |

**Using the UI:**
1. Open `http://localhost:8080` in your browser
2. Type `"hey tomo"` and press Send
3. Check the response shows route info

**Using curl:**
```bash
curl -X POST http://localhost:8080/api/inference \
  -H "Content-Type: application/json" \
  -d '{"input": "hey tomo"}'
```

**Expected Response:**
```json
{
  "input": "hey tomo",
  "route": "chat",
  "response": "Re: hey",
  "orchestrator_latency": 0.25,
  "persona_latency": 0.50,
  "total_latency": 0.75,
  "mood": "HELPFUL"
}
```

**Success Criteria:**
- ✅ `route` is `"chat"`
- ✅ Response doesn't contain template tokens like `<|im_end|>` or `<|user_start|>`
- ✅ Response is coherent
- ✅ Total latency < 5 seconds

### Test 4: Local Action Route Detection

**Test Cases:**

| Input | Expected Route | Expected Intent |
|-------|---------------|----------------|
| `"remind me to call mom"` | `local` | `set_reminder` |
| `"add coffee to my shopping list"` | `local` | `add_to_list` |
| `"what's on my todo list"` | `local` | `get_todos` |

**Using curl:**
```bash
curl -X POST http://localhost:8080/api/inference \
  -H "Content-Type: application/json" \
  -d '{"input": "remind me to call mom at 3pm"}'
```

**Expected Response:**
```json
{
  "input": "remind me to call mom at 3pm",
  "route": "command",
  "intent": "set_reminder",
  "response": "Command recognized: set_reminder",
  "orchestrator_latency": 0.30,
  "total_latency": 0.30
}
```

**Success Criteria:**
- ✅ `route` is `"command"`
- ✅ `intent` matches expected value
- ✅ Routing latency < 1 second

### Test 5: Phone Home Route Detection

**Test Cases:**

| Input | Expected Route | Expected Task Type |
|-------|---------------|-------------------|
| `"make me a slide deck about AI"` | `phone_home` | `slides` |
| `"write me a blog post about quantum computing"` | `phone_home` | `content_generation` |
| `"create a website for my business"` | `phone_home` | `web_dev` |

**Using curl:**
```bash
curl -X POST http://localhost:8080/api/inference \
  -H "Content-Type: application/json" \
  -d '{"input": "make me a slide deck about photosynthesis"}'
```

**Expected Response:**
```json
{
  "input": "make me a slide deck about photosynthesis",
  "route": "phone_home",
  "task_type": "slides",
  "orchestrator_latency": 0.35,
  "total_latency": 0.35
}
```

**Success Criteria:**
- ✅ `route` is `"phone_home"`
- ✅ `task_type` matches expected value

### Test 6: Edge Cases & Ambiguity

**Test Cases:**

| Input | Notes | Acceptable Routes |
|-------|-------|------------------|
| `"let's build something"` | Vague request | `phone_home` or `local` |
| `"I have some tasks to do"` | Implicit statement | `local/take_note` or `local/get_todos` |
| `"are you good at budgets"` | Question format | `phone_home/analysis` or `chat` |

**Testing:**
Run these inputs and verify the router makes a reasonable decision (doesn't crash or return errors).

---

## 🧠 Memory & VDB Tests

### Test 7: Store a Memory

**Endpoint:** `POST /api/inference` (automatic storage on chat)

**Test Procedure:**
1. Send a message with personal information:
   ```bash
   curl -X POST http://localhost:8080/api/inference \
     -H "Content-Type: application/json" \
     -d '{"input": "I love hiking in the mountains on weekends"}'
   ```

2. Verify the response includes memory storage confirmation

**Success Criteria:**
- ✅ Message processed successfully
- ✅ No errors in server logs

### Test 8: Retrieve a Memory

**Test Procedure:**
1. Store a memory (see Test 7)
2. Wait 2 seconds for indexing
3. Query related information:
   ```bash
   curl -X POST http://localhost:8080/api/inference \
     -H "Content-Type: application/json" \
     -d '{"input": "what do I like to do on weekends?"}'
   ```

**Expected Behavior:**
- The response should reference hiking/mountains if memory retrieval is working

**Success Criteria:**
- ✅ `memories_retrieved` > 0 in response JSON
- ✅ Response shows contextual awareness

### Test 9: Memory Service Direct Query

**Endpoint:** `POST http://localhost:8090/api/query`

**Using curl:**
```bash
curl -X POST http://localhost:8090/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query_text": "what do I like to do on weekends",
    "top_k": 3,
    "thread_id": "default"
  }'
```

**Expected Response:**
```json
{
  "results": [
    {
      "document": {
        "text": "User: I love hiking in the mountains on weekends\nAssistant: That sounds wonderful!",
        "thread_id": "default"
      },
      "similarity": 0.85
    }
  ],
  "query_time_ms": 45.2
}
```

**Success Criteria:**
- ✅ Returns results with similarity > 0.3
- ✅ Query time < 500ms
- ✅ Results ranked by similarity

### Test 10: Thread Isolation

**Test Procedure:**
1. Store memory in thread A:
   ```bash
   curl -X POST http://localhost:8090/api/store \
     -H "Content-Type: application/json" \
     -d '{
       "thread_id": "thread_a",
       "user_input": "I prefer coffee in the morning",
       "assistant_response": "Got it!"
     }'
   ```

2. Store memory in thread B:
   ```bash
   curl -X POST http://localhost:8090/api/store \
     -H "Content-Type: application/json" \
     -d '{
       "thread_id": "thread_b",
       "user_input": "I prefer tea in the morning",
       "assistant_response": "Noted!"
     }'
   ```

3. Query thread A:
   ```bash
   curl -X POST http://localhost:8090/api/query \
     -H "Content-Type: application/json" \
     -d '{
       "query_text": "what do I drink in the morning",
       "top_k": 1,
       "thread_id": "thread_a"
     }'
   ```

**Success Criteria:**
- ✅ Thread A returns "coffee" memory only
- ✅ Thread B returns "tea" memory only
- ✅ No cross-contamination

---

## 💬 Chat Quality Tests

### Test 11: Template Token Cleanup

**Test Procedure:**
Send multiple chat messages and verify no template tokens appear:

```bash
curl -X POST http://localhost:8080/api/inference \
  -H "Content-Type: application/json" \
  -d '{"input": "hey tomo"}'
```

**Success Criteria:**
- ✅ Response does NOT contain: `<|im_start|>`, `<|im_end|>`, `<|user_start|>`, `<|user_end|>`
- ✅ Response is clean text only
- ✅ No emoticons like `(o_o)` unless intentionally part of persona

### Test 12: Response Coherence

**Test Cases:**

| Input | Expected Quality |
|-------|-----------------|
| `"tell me a joke"` | Returns joke-like content |
| `"how are you?"` | Returns greeting response |
| `"what's your name?"` | Returns "Tomo" or similar |

**Success Criteria:**
- ✅ Responses are on-topic
- ✅ No gibberish or repeated tokens
- ✅ Appropriate length (not too short, not too long)

### Test 13: Conversation History

**Test Procedure:**
1. Send first message: `"My name is Alice"`
2. Send second message: `"What's my name?"`

**Expected Behavior:**
- Second response should reference "Alice"

**Success Criteria:**
- ✅ System maintains conversation context
- ✅ Can reference previous messages

---

## ⚡ Performance Tests

### Test 14: Latency Benchmarks

**Test Procedure:**
Run the same input 5 times and measure average latency:

```bash
for i in {1..5}; do
  curl -X POST http://localhost:8080/api/inference \
    -H "Content-Type: application/json" \
    -d '{"input": "hey tomo"}' \
    -w "\nTime: %{time_total}s\n"
done
```

**Success Criteria:**
- ✅ Router latency: < 1 second
- ✅ Chat latency: < 3 seconds
- ✅ Total latency: < 5 seconds (combined)
- ✅ Consistent performance (low variance)

### Test 15: Concurrent Requests

**Test Procedure:**
Send 3 requests simultaneously:

```bash
curl -X POST http://localhost:8080/api/inference \
  -H "Content-Type: application/json" \
  -d '{"input": "test 1"}' &

curl -X POST http://localhost:8080/api/inference \
  -H "Content-Type: application/json" \
  -d '{"input": "test 2"}' &

curl -X POST http://localhost:8080/api/inference \
  -H "Content-Type: application/json" \
  -d '{"input": "test 3"}' &

wait
```

**Success Criteria:**
- ✅ All requests complete successfully
- ✅ No race conditions or errors
- ✅ Reasonable performance degradation (< 2x slower)

---

## 🤖 Automated Test Scripts

### Integration Test Suite
**Location:** `/home/user/tomodachi/ai/scripts/test_system_integration.py`

**Run:**
```bash
cd /home/user/tomodachi/ai/scripts
python3 test_system_integration.py
```

**Coverage:**
- ✅ Cascading router accuracy
- ✅ Memory storage & retrieval
- ✅ Chat quality
- ✅ Latency benchmarks
- ✅ Token cleanup verification

### Router Stress Test
**Location:** `/home/user/tomodachi/ai/scripts/test_cascading_router.py`

**Run:**
```bash
cd /home/user/tomodachi/ai/scripts
python3 test_cascading_router.py
```

**Coverage:**
- Tests all 25+ edge cases from `stress_test_cases.json`
- Validates 3-stage cascade logic
- Reports accuracy metrics

### Router API Test
**Location:** `/home/user/tomodachi/ai/scripts/test_router_api.py`

**Run:**
```bash
cd /home/user/tomodachi/ai/scripts
python3 test_router_api.py
```

**Coverage:**
- Quick API endpoint validation
- Sample routing decisions
- Latency reporting

---

## 🔧 Troubleshooting

### Issue: "HTTP 404: Not Found" when sending messages

**Solution:**
- Fixed in commit `16b6e61` - Update decision key from 'action' to 'intent'
- Ensure you're running the latest code
- Restart server: `./start.sh`

### Issue: Template tokens appearing in responses

**Solution:**
- Fixed in this session - Added token cleanup in `generate_response()`
- Restart server to apply fix
- Verify with Test 11

### Issue: Memory service not running

**Check:**
```bash
curl http://localhost:8090/api/status
```

**Solution:**
```bash
# Start memory service
cd /home/user/tomodachi/memories
python3 -m edge_rag.api
```

### Issue: Slow inference (> 5 seconds)

**Possible Causes:**
1. Model not loaded on MPS/GPU
2. Cold start (first request is always slower)
3. Large conversation history

**Solutions:**
- Check device: Should show `device_map="mps"` in logs
- Warm up with a test request
- Clear history: `curl -X DELETE http://localhost:8080/api/history`

### Issue: Wrong routing decisions

**Debugging:**
1. Check which stage failed:
   - Stage 1: phone_home vs local vs chat
   - Stage 2a: task_type classification
   - Stage 2b: intent classification

2. Review training data:
   - `/home/user/tomodachi/ai/training_data/orchestrator_stage1_training.jsonl`
   - `/home/user/tomodachi/ai/training_data/orchestrator_stage2a_training.jsonl`
   - `/home/user/tomodachi/ai/training_data/orchestrator_stage2b_training.jsonl`

3. Retrain if needed:
   ```bash
   cd /home/user/tomodachi/ai/scripts
   ./train_orchestrator.sh
   ```

---

## 📊 Test Results Tracking

All automated test runs save detailed results to:
```
/home/user/tomodachi/ai/scripts/test_results_YYYYMMDD_HHMMSS.json
```

**Example:**
```json
{
  "timestamp": "20241117_143052",
  "summary": {
    "passed": 18,
    "failed": 2,
    "warnings": 3,
    "skipped": 1
  },
  "details": [...]
}
```

Track these over time to monitor system health and regression.

---

## ✅ Quick Test Checklist

Use this checklist for quick validation:

- [ ] Server starts without errors
- [ ] `/api/status` returns 200
- [ ] Chat message gets response (no 404)
- [ ] Response has no template tokens
- [ ] Router correctly identifies chat vs command
- [ ] Memory stores and retrieves (if enabled)
- [ ] Latency < 5 seconds for chat
- [ ] No errors in console logs

---

## 📚 Additional Resources

- **Architecture Docs:** `/home/user/tomodachi/.tomodachi/`
- **Training Data:** `/home/user/tomodachi/ai/training_data/`
- **Server Logs:** Check terminal where `./start.sh` is running
- **Memory Service:** `/home/user/tomodachi/memories/`

---

**Happy Testing! 🎉**

For issues or questions, check the troubleshooting section or review server logs.
