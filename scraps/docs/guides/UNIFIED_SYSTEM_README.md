# 🎉 Unified Tomodachi Router System

This branch (`claude/adaptive-router-tests-01BKZKtvQLuWXqPiHWp3j8Sr`) combines the **Adaptive Router** system with all the latest fixes and comprehensive testing.

---

## What's Included

### ✅ Two Routing Systems

1. **Adaptive Router** (Hybrid System)
   - **Bayesian Pattern Matcher** - Ultra-fast rule-based routing (<1ms)
   - **Vector DB Corrections** - Learns from user feedback
   - **Hybrid Orchestrator** - Cascades through: Vector DB → Bayesian → ML

2. **3-Stage Cascading Router** (Original)
   - Stage 1: Route classification (phone_home vs local vs chat)
   - Stage 2a: Phone home task types
   - Stage 2b: Local action intents
   - ML-based with fine-tuned models

### ✅ Bug Fixes

- **Token Cleanup** - Removes chat template markers (`<|im_start|>`, `<|im_end|>`, etc.) from responses
- **404 Fix** - Corrected decision.get("intent") routing check
- **Clean Responses** - No more template tokens appearing in chat

### ✅ Test Suites

| Test Script | Purpose | Dependencies |
|-------------|---------|--------------|
| `test_unified_system.py` | Quick verification of everything | None |
| `test_bayesian_only.py` | Bayesian pattern matcher | None |
| `test_adaptive_router.py` | Full adaptive router suite | sentence-transformers, annoy |
| `ai/scripts/test_system_integration.py` | 3-stage cascading router | None |

### ✅ Documentation

- **ADAPTIVE_ROUTER_TEST_GUIDE.md** - Complete guide to the Adaptive Router
- **TESTING_GUIDE.md** - Manual testing procedures for all systems
- Architecture comparisons and performance benchmarks

---

## 🚀 Quick Start

### 1. Pull the Branch

```bash
git checkout claude/adaptive-router-tests-01BKZKtvQLuWXqPiHWp3j8Sr
git pull origin claude/adaptive-router-tests-01BKZKtvQLuWXqPiHWp3j8Sr
```

### 2. Run Quick Verification

```bash
python3 test_unified_system.py
```

**Expected output:**
```
✅ Bayesian Router: Pattern matching (<1ms)
✅ Hybrid Router: Vector DB → Bayesian → ML cascade
✅ Token Cleanup: Removes chat template markers
✅ Test Scripts: 3 available
✅ Documentation: 2 guides

🎉 Unified system is ready!
```

### 3. Test Individual Systems

**Bayesian Router Only** (no dependencies):
```bash
python3 test_bayesian_only.py
```

**Full Adaptive Router** (requires dependencies):
```bash
pip install sentence-transformers annoy
python3 test_adaptive_router.py
```

**3-Stage Cascading Router**:
```bash
python3 ai/scripts/test_system_integration.py
```

---

## 📊 System Architecture

### Current Integration in `tomo_api.py`

```python
from server import hybrid_router

# The /api/inference endpoint uses:
decision, normalized_input = hybrid_router.route(user_input)

# Which cascades through:
# 1. Vector DB corrections (if available)
# 2. Bayesian pattern matching (20 rules)
# 3. Fallback to 3-stage ML router
```

### Routing Flow

```
User Input
    ↓
┌─────────────────────────────┐
│ Vector DB Correction Check  │ ← Learns from user feedback
│ (90%+ similarity threshold) │   (requires sentence-transformers)
└─────────────────────────────┘
    ↓ (no match)
┌─────────────────────────────┐
│ Input Normalization         │ ← Remove "hey tomo", filler words
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ Bayesian Pattern Matcher    │ ← 20 patterns, <1ms
│ Confidence threshold: 0.90  │   NO dependencies!
└─────────────────────────────┘
    ↓ (confidence < 0.90)
┌─────────────────────────────┐
│ 3-Stage Cascading Router    │ ← ML models (fallback)
│ (Stage 1 → 2a/2b → Intent) │
└─────────────────────────────┘
```

---

## 🧪 What's Been Tested

### Bayesian Router - ✅ 10/10 Tests Passing

| Input | Route | Intent/Task | Confidence |
|-------|-------|-------------|------------|
| "remind me to call mom" | local | set_reminder | 0.90 |
| "what time is it" | local | time_query | 0.98 |
| "create a website" | phone_home | web_dev | 0.95 |
| "search for pizza places" | phone_home | web_search | 0.95 |
| "google quantum computing" | phone_home | web_search | 0.95 |

### Token Cleanup - ✅ Verified

No more chat template tokens in responses:
- Before: `"Re: hey <|user_start|> (o_o)<|im_end|>"`
- After: `"Re: hey"`

### Integration - ✅ Working

- Adaptive Router properly integrated into `tomo_api.py`
- Graceful fallback when dependencies missing
- Both routing systems coexist without conflicts

---

## 📦 Dependencies

### Required (Already Installed)
- Flask
- transformers
- torch
- peft

### Optional (For Full Adaptive Router)
```bash
pip install sentence-transformers annoy
```

**What they enable:**
- `sentence-transformers` - Vector embeddings for correction learning
- `annoy` - Fast approximate nearest neighbor search

**Without them:**
- Bayesian router still works (20 patterns, <1ms)
- 3-stage cascading router still works
- Only Vector DB correction learning is disabled

---

## 🔄 Comparison: Which Router to Use?

### Bayesian Router (Adaptive System)
**Best for:**
- ✅ Ultra-fast responses (<1ms)
- ✅ Common, well-defined patterns
- ✅ No GPU/ML model needed
- ✅ Explainable decisions (rule-based)

**Limitations:**
- ⚠️ Only handles 20 pre-defined patterns
- ⚠️ Confidence threshold is strict (0.90)
- ⚠️ Falls through to next stage for complex inputs

### 3-Stage Cascading Router
**Best for:**
- ✅ Higher accuracy out-of-the-box (85-90%)
- ✅ Complex, nuanced queries
- ✅ JSON-structured outputs
- ✅ Consistent performance

**Limitations:**
- ⚠️ Slower (~300-500ms)
- ⚠️ Requires loaded ML models (~1.5GB)
- ⚠️ Static (doesn't learn)

### Hybrid (Current Implementation)
**How it works:**
1. Try Vector DB corrections (if learned)
2. Try Bayesian patterns (fast)
3. Fallback to 3-stage ML router

**Benefits:**
- ✅ Best of both worlds
- ✅ Fast common cases, accurate complex cases
- ✅ Learns from corrections over time

---

## 🛠️ Development Workflow

### Adding a New Bayesian Pattern

Edit `server/bayesian_router.py`:

```python
clues = {
    # Add your pattern here
    'new pattern': {'route': 'local', 'intent': 'new_intent', 'weight': 0.95},
    # ...
}
```

Test it:
```bash
python3 test_bayesian_only.py
```

### Adding a User Correction (Learning)

```python
from memories import router_corrections

router_corrections.add_correction(
    text="the input that was misrouted",
    correct_route="local",
    correct_intent="chat",
    wrong_route="phone_home"
)
```

Next time a similar input comes in, it'll route correctly!

### Running the Server

```bash
./start.sh
```

The server will:
1. Load the hybrid router
2. Use Bayesian patterns first (fast)
3. Fallback to 3-stage router if needed
4. Apply token cleanup to all responses

---

## 📁 File Structure

```
tomodachi/
├── server/
│   ├── tomo_api.py              # Main API (uses hybrid_router)
│   ├── bayesian_router.py       # Fast pattern matching (20 rules)
│   └── hybrid_router.py         # Orchestrator
│
├── memories/
│   └── router_corrections.py    # Vector DB learning
│
├── ai/scripts/
│   └── test_system_integration.py  # 3-stage router tests
│
├── test_unified_system.py       # Quick verification
├── test_bayesian_only.py        # Bayesian tests
├── test_adaptive_router.py      # Full adaptive tests
│
├── ADAPTIVE_ROUTER_TEST_GUIDE.md  # Adaptive router docs
├── TESTING_GUIDE.md               # General testing guide
└── UNIFIED_SYSTEM_README.md       # This file
```

---

## ✅ Checklist: Is Everything Working?

Run this checklist to verify:

```bash
# 1. Quick verification
python3 test_unified_system.py

# 2. Bayesian router
python3 test_bayesian_only.py

# 3. (Optional) Full adaptive router
pip install sentence-transformers annoy
python3 test_adaptive_router.py

# 4. Start the server
./start.sh

# 5. Test in browser or with curl
curl -X POST http://localhost:8080/api/inference \
  -H "Content-Type: application/json" \
  -d '{"input": "hey tomo"}'
```

Expected: Clean response with no template tokens, proper routing.

---

## 🎯 Next Steps

1. **Test locally** - Run the quick tests above
2. **Choose your router** - Bayesian for speed, 3-stage for accuracy, or hybrid for both
3. **Add patterns** - Customize Bayesian router for your use cases
4. **Enable learning** - Install dependencies for Vector DB corrections
5. **Monitor performance** - Check latencies and accuracy

---

## 📚 Resources

- **Adaptive Router Guide**: `ADAPTIVE_ROUTER_TEST_GUIDE.md`
- **Testing Guide**: `TESTING_GUIDE.md`
- **Bayesian Patterns**: `server/bayesian_router.py` lines 6-31
- **Hybrid Orchestration**: `server/hybrid_router.py`

---

**Questions?** Run `python3 test_unified_system.py` to verify everything is working!

**Happy Routing! 🚀**
