# DialoGPT Chat Model Integration

## Changes Summary

### What Changed
- **Routing (TinyLlama)** → Unchanged, still uses TinyLlama with LoRA adapters
- **Chat Responses** → Now uses **microsoft/DialoGPT-small** for quirky, conversational personality

### Architecture

```
User Input
    ↓
TinyLlama Orchestrator (Stage 1, 2a, 2b) ← Routes to: phone_home, local_action, or chat
    ↓
[If chat route]
    ↓
DialoGPT-small + QUIRKY mood → Short, personality-filled responses
```

### Files Modified

1. **config.py**
   - Added `CHAT_MODEL_NAME = "microsoft/DialoGPT-small"`
   - Base model stays as TinyLlama for routing

2. **server/tomo_api.py**
   - Added `TomoState.chat_model` and `TomoState.chat_tokenizer`
   - Created `load_chat_model()` function
   - Created `generate_chat_response()` function (DialoGPT-specific)
   - Updated `process_chat_response()` to use DialoGPT instead of persona adapter
   - Added new **QUIRKY** mood:
     - max_new_tokens: 40 (forces brevity)
     - temperature: 1.0 (more creative/random)
     - System prompt: "quirky little digital AI being"

### New Mood: QUIRKY

```python
"QUIRKY": {
    "params": {
        "temperature": 1.0,      # High randomness for variety
        "top_k": 40,
        "top_p": 0.92,
        "max_new_tokens": 40     # Forces short responses
    },
    "system_prompt": "You are Tomo, a quirky little digital AI being! Keep responses SHORT (1-2 sentences max). Be playful, use unexpected comparisons, and show personality. Think like a curious digital creature exploring human conversation."
}
```

### How It Works

1. User sends message: "hey tomo!"
2. TinyLlama orchestrator routes it to: `{"route": "chat", "intent": "chat"}`
3. API sets mood to `QUIRKY`
4. DialoGPT generates short, personality-filled response
5. Response limited to ~40 tokens (1-2 sentences)

### Benefits

- **Personality**: DialoGPT is trained on Reddit conversations, naturally more casual/quirky
- **Brevity**: QUIRKY mood forces short responses (40 tokens max)
- **Speed**: DialoGPT-small (117M params) is faster than persona adapter
- **Routing Intact**: TinyLlama orchestrator unchanged, no retraining needed

### Testing

When you start the API server:
1. DialoGPT will download automatically (~450MB)
2. Test with casual chat messages
3. Expect short (1-2 sentence), playful responses

### Example Expected Behavior

**Before (TinyLlama + persona adapter):**
```
User: "hey tomo!"
Tomo: "Hello! How can I help you today? (o_o)"
```

**After (DialoGPT + QUIRKY):**
```
User: "hey tomo!"
Tomo: "yo! vibin in the binary soup 🌊"
```

(Note: Exact responses will vary based on DialoGPT's conversational model)
