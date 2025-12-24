# 🧠 Adaptive Router Testing Guide

## What is the Adaptive Router?

The **Adaptive Router** (on `growing-tomos-brain` branch) is a self-improving routing system that learns from corrections. It's different from the current 3-stage cascading router.

### Architecture Comparison

| Feature | 3-Stage Cascading Router (main) | Adaptive Router (growing-tomos-brain) |
|---------|--------------------------------|--------------------------------------|
| **Approach** | ML-based (3 fine-tuned models) | Hybrid (Rules → Vector → ML) |
| **Speed** | ~300-500ms per request | Bayesian: <1ms, Vector: ~50ms, ML: 300ms |
| **Learning** | Static (requires retraining) | Dynamic (learns from corrections) |
| **Accuracy** | ~85-90% on test cases | Bayesian: 70-80% coverage, Vector improves over time |
| **Memory** | ~1.5GB (3 models loaded) | ~200MB (Bayesian rules + small embedding model) |

### Routing Pipeline

```
User Input
    ↓
┌───────────────────────────────┐
│ 1. Vector DB Correction Check │ ← Learns from user feedback
│    (90%+ similarity required) │
└───────────────────────────────┘
    ↓ (if no match)
┌───────────────────────────────┐
│ 2. Input Normalization        │
│    (remove filler words, etc) │
└───────────────────────────────┘
    ↓
┌───────────────────────────────┐
│ 3. Bayesian Pattern Matcher   │ ← Fast rule-based routing
│    (20 patterns, <1ms)        │
└───────────────────────────────┘
    ↓ (if confidence < 90%)
┌───────────────────────────────┐
│ 4. ML Router (future)         │ ← Fallback to trained model
└───────────────────────────────┘
```

---

## 📁 File Structure

```
server/
├── hybrid_router.py         # Main orchestrator
├── bayesian_router.py       # Pattern matching (20 rules)
└── tomo_api.py             # Integration point

memories/
├── router_corrections.py    # Vector DB for learning
└── data/
    ├── corrections.ann      # Annoy index (created on first use)
    └── corrections_metadata.json  # Correction records
```

---

## 🚀 Quick Start

### 1. Install Dependencies

The Adaptive Router requires two additional packages:

```bash
pip install sentence-transformers annoy
```

**What they do:**
- `sentence-transformers`: Creates embeddings for semantic similarity
- `annoy`: Fast approximate nearest neighbor search (used by Spotify)

### 2. Checkout the Branch

```bash
cd /home/user/tomodachi
git checkout growing-tomos-brain
```

### 3. Run the Test Script

```bash
python3 test_adaptive_router.py
```

---

## 🧪 Manual Testing

### Test 1: Bayesian Router Only

Test the fast pattern matcher without dependencies:

```bash
cd /home/user/tomodachi
python3 -c "
from server import bayesian_router

test_cases = [
    'remind me to call mom',
    'make me a slide deck',
    'what time is it',
    'hey tomo how are you',
]

for case in test_cases:
    result = bayesian_router.bayesian_route(case)
    print(f'{case}')
    print(f'  → {result}')
    print()
"
```

**Expected Output:**
```
remind me to call mom
  → {'confidence': 0.9, 'route': 'local', 'intent': 'set_reminder', 'source': 'bayesian_router'}

make me a slide deck
  → None  # (passes to next stage)

what time is it
  → {'confidence': 0.98, 'route': 'local', 'intent': 'time_query', 'source': 'bayesian_router'}

hey tomo how are you
  → None  # (pattern match not confident enough)
```

### Test 2: Vector DB Corrections

*Requires: sentence-transformers, annoy*

```bash
python3 -c "
from memories import router_corrections

# Initialize the system (creates test corrections)
router_corrections.add_correction(
    text='hey tomo what is up',
    correct_route='local',
    correct_intent='chat',
    wrong_route='phone_home'
)

# Query with similar text
matches = router_corrections.query_corrections(
    'hey tomo whats up',
    top_k=1,
    threshold=0.90
)

if matches:
    print(f'Similarity: {matches[0][\"similarity\"]:.3f}')
    print(f'Correction: {matches[0][\"correct_route\"]}/{matches[0][\"correct_intent\"]}')
else:
    print('No match found')
"
```

**Expected Output:**
```
Loading sentence transformer model...
Model loaded.
Adding correction for: 'hey tomo what is up'
Rebuilding and saving Annoy index...
Correction saved. Index now has 1 items.
Building Annoy index from metadata...
Index built with 1 items.
Found similar correction (sim: 0.965): 'hey tomo what is up'
Similarity: 0.965
Correction: local/chat
```

### Test 3: Full Hybrid Router

*Requires: sentence-transformers, annoy*

```bash
python3 -c "
from server import hybrid_router

test_inputs = [
    'hey tomo what is up',      # Should hit Vector DB
    'remind me to call john',    # Should hit Bayesian
    'tell me about philosophy',  # Should fall to ML placeholder
]

for user_input in test_inputs:
    decision, normalized = hybrid_router.route(user_input)
    print(f'Input: {user_input}')
    print(f'  Normalized: {normalized}')
    print(f'  Source: {decision[\"source\"]}')
    print(f'  Decision: {decision}')
    print()
"
```

---

## 📊 Test Results

### Bayesian Router Coverage

The Bayesian router has **20 patterns** covering common intents:

| Pattern | Route | Intent/Task | Weight |
|---------|-------|-------------|--------|
| `remind me` | local | set_reminder | 0.90 |
| `slide` | phone_home | slides | 0.85 |
| `create.*website` | phone_home | web_dev | 0.95 |
| `what time is it` | local | time_query | 0.98 |
| `todo` | local | todo_query | 0.90 |
| `weather` | phone_home | weather_query | 0.95 |
| `hey tomo` | local | chat | 0.75 |
| ... | ... | ... | ... |

**Confidence Threshold:** 0.90 (90%)

### Known Limitations

1. **Bayesian Router:**
   - "make me a slide deck" → No match (pattern is just `slide`)
   - "what was I working on" → No match (pattern is `what was i`, case-sensitive)
   - "hey tomo how are you" → Low confidence (0.75 < 0.90 threshold)

2. **Vector DB:**
   - Requires similar past corrections to work
   - Empty on first run (needs user feedback)
   - Threshold of 0.90 is strict (prevents false positives)

3. **ML Router:**
   - Currently a placeholder (returns `route: None`)
   - Future: Should integrate the cascading router or a unified model

---

## 🔧 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'sentence_transformers'"

**Solution:**
```bash
pip install sentence-transformers annoy
```

If that fails, try:
```bash
pip install --user sentence-transformers annoy
```

### Issue: Bayesian patterns not matching

**Check:**
1. Input is normalized (lowercase, filler words removed)
2. Pattern is regex-compatible (e.g., `create.*website` matches "create a website")
3. Weight is ≥ 0.90 (confidence threshold)

**Fix:**
Edit `server/bayesian_router.py` and adjust patterns:

```python
clues = {
    'slide': {'route': 'phone_home', 'task_type': 'slides', 'weight': 0.85},
    # Change to:
    'slide.*deck': {'route': 'phone_home', 'task_type': 'slides', 'weight': 0.95},
}
```

### Issue: Vector DB not finding matches

**Possible causes:**
1. No corrections added yet (empty database)
2. Query text too different from stored corrections
3. Threshold too strict (try 0.80 instead of 0.90)

**Debug:**
```python
from memories import router_corrections

# Check what's stored
print(f"Total corrections: {len(router_corrections.metadata)}")
for correction in router_corrections.metadata:
    print(f"  - '{correction['text']}' → {correction['correct_intent']}")
```

### Issue: Hybrid router always falls to ML placeholder

**This means:**
- Vector DB found no match (no past corrections)
- Bayesian router found no confident pattern match

**Fix:**
Add more patterns to Bayesian router or add corrections to Vector DB.

---

## 🎯 Testing Scenarios

### Scenario 1: First-Time User (No Vector DB)

**What happens:**
1. User: "hey tomo what's up"
2. Vector DB: No corrections → Skip
3. Bayesian: `hey tomo` pattern → Match (confidence 0.75 < 0.90) → Skip
4. ML Router: Placeholder → Returns `route: None`

**Expected behavior:** Falls through to ML router (placeholder)

### Scenario 2: After User Correction

**User corrects:**
```python
router_corrections.add_correction(
    text="hey tomo what's up",
    correct_route="local",
    correct_intent="chat",
    wrong_route="phone_home"
)
```

**What happens:**
1. User: "hey tomo whats up" (similar query)
2. Vector DB: Finds match (similarity: 0.96) → Returns `local/chat` ✅
3. Bayesian: Never reached
4. ML Router: Never reached

**Expected behavior:** Vector DB catches it immediately

### Scenario 3: High-Confidence Bayesian Match

**Input:** "what time is it"

**What happens:**
1. Vector DB: No match → Skip
2. Bayesian: `what time is it` pattern → Match (confidence 0.98) → Returns `local/time_query` ✅
3. ML Router: Never reached

**Expected behavior:** Bayesian router handles it in <1ms

---

## 📈 Performance Metrics

Based on the design:

| Stage | Latency | Coverage | Accuracy |
|-------|---------|----------|----------|
| Vector DB | ~50ms | Grows over time | Very high (>95%) |
| Bayesian | <1ms | ~70-80% | Good (~85%) |
| ML Router | ~300ms | 100% | Good (~85%) |

**Combined:** Most requests should be <50ms after the system learns.

---

## 🆚 Comparison: Which Router Should I Use?

### Use **3-Stage Cascading Router** if:
- ✅ You want better accuracy out-of-the-box
- ✅ You have consistent input patterns
- ✅ You don't mind 300-500ms latency
- ✅ You want JSON-structured outputs from the ML model

### Use **Adaptive Router** if:
- ✅ You want <50ms latency for common patterns
- ✅ You want the system to learn from corrections
- ✅ You want to save memory (200MB vs 1.5GB)
- ✅ You're okay with lower initial accuracy that improves over time

### Future: Merge Both?

Ideal architecture:
```
Vector DB Corrections (learned)
    ↓
Bayesian Patterns (fast rules)
    ↓
3-Stage Cascading Router (ML fallback)
```

This would give:
- **Speed** from Bayesian (<1ms)
- **Learning** from Vector DB
- **Accuracy** from cascading ML routers

---

## 📝 Next Steps

1. **Test locally:**
   ```bash
   pip install sentence-transformers annoy
   python3 test_adaptive_router.py
   ```

2. **Compare with current system:**
   ```bash
   git checkout claude/fix-inference-404-01BKZKtvQLuWXqPiHWp3j8Sr
   python3 ai/scripts/test_system_integration.py
   ```

3. **Decide on merge strategy:**
   - Merge Adaptive Router features into main?
   - Keep as separate branch?
   - Refactor into `adaptive_router/` module?

---

**Questions?** Check the code:
- `server/hybrid_router.py` - Main orchestration logic
- `server/bayesian_router.py` - Pattern definitions
- `memories/router_corrections.py` - Vector DB implementation

**Happy Testing!** 🚀
