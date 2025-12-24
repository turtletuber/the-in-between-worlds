# Emotion Adapter System

## Overview

The emotion adapter adds **ASCII emoticon generation** to Tomo's chat responses, giving each message a quirky emotional vibe.

## Architecture

```
User: "hey tomo!"
    ↓
TinyLlama Orchestrator → routes to "chat"
    ↓
┌─────────────────────────────────────┐
│ Emotion Generation (TinyLlama LoRA)│
│ Input: "hey tomo!"                  │
│ Output: "(^_^)"                     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Chat Response (DialoGPT)            │
│ Context: emotion = "(^_^)"          │
│ Input: "hey tomo!"                  │
│ Output: "yo! vibing"                │
└─────────────────────────────────────┘
    ↓
Final Response: "yo! vibing (^_^)"
```

## How It Works

1. **Emotion Generation**: TinyLlama + LoRA adapter generates an emoticon based on user input
2. **Emotion Context**: Emoticon is passed to DialoGPT as "current vibe"
3. **Chat Response**: DialoGPT generates response influenced by the emotion
4. **Final Output**: Emoticon is appended to the end of the response

## Training Data

Located at: `/ai/training_data/emotion_training.jsonl`

30 examples mapping user input → ASCII emoticons:
- Greetings → Happy faces: `(^_^)`, `(o_o)`
- Excitement → Energetic: `(ﾉ◕ヮ◕)ﾉ`, `(★_★)`
- Surprise → Wide-eyed: `(⊙_⊙)`, `(°ロ°)`
- Digital vibes → Robot-ish: `[●__●]`, `⟨◉_◉⟩`
- Chill → Relaxed: `(￣ω￣)`, `(˘▾˘)`

## Emoticons Included

**Happy/Friendly:**
- `(^_^)` - Classic smile
- `(^‿^)` - Content
- `(•‿•)` - Friendly
- `(｡◕‿◕｡)` - Cute smile

**Excited/Energetic:**
- `(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧` - Super excited
- `(≧▽≦)` - Laughing
- `(★_★)` - Amazed
- `(^o^)` - Joyful

**Curious/Thinking:**
- `(・ω・)` - Wondering
- `(@_@)` - Processing
- `(･ω･)?` - Curious
- `(・_・)` - Confused

**Digital/Robot:**
- `[●__●]` - Robot mode
- `⟨◉_◉⟩` - Digital being
- `◉_◉` - Computing
- `⟨⊙_⊙⟩` - Processing

**Chill/Relaxed:**
- `(￣ω￣)` - Chilling
- `(˘▾˘)` - Content
- `(~‾▿‾)~` - Vibing

**Cool/Playful:**
- `(^_~)` - Wink
- `(☞ﾟヮﾟ)☞` - Finger guns
- `(ง'̀-'́)ง` - Ready to go

## Files Modified

### 1. `config.py`
- Added `EMOTION_ADAPTER_DIR`
- Updated `check_adapters_available()` to include emotion adapter

### 2. `server/tomo_api.py`
- Added `emotion_adapter_dir` to `TomoState.model_config`
- Created `generate_emotion()` function (lines 456-471)
- Modified `generate_chat_response()` to accept `emotion` parameter
- Updated `process_chat_response()` to generate emotion first
- Emotion is passed as context to DialoGPT and appended to response

### 3. `ai/emotion_adapter/`
- `adapter_config.json` - LoRA configuration (r=32, smaller than persona)
- Training will create adapter weights here

### 4. `ai/training_data/emotion_training.jsonl`
- 30 training examples for emotion generation

## Training the Emotion Adapter

**Requirements:**
- PyTorch
- transformers
- peft
- datasets

**Run training:**
```bash
cd /home/user/tomodachi
python ai/train_emotion_adapter.py
```

**Training details:**
- Base model: TinyLlama-1.1B-Chat-v1.0
- LoRA rank: 32 (smaller task than full persona)
- Epochs: 5
- Batch size: 4
- Learning rate: 2e-4

**Output:**
- Adapter saved to `/ai/emotion_adapter/`
- ~50MB of LoRA weights

## Usage

Once trained, the emotion adapter automatically works:

```python
# In process_chat_response():
emotion, _ = generate_emotion(user_input)  # e.g., "(^_^)"
response, _ = generate_chat_response(input, emotion=emotion)
# Response: "yo! vibing (^_^)"
```

## Configuration

**Disable emotion generation:**
Set `use_mood_params=False` in `generate_emotion()` call (already configured).

**Fallback emoticon:**
If generation fails or produces text instead of emoticon: `(・ω・)`

**Max emoticon length:**
20 characters (cleanup validates this)

## Benefits

1. **Personality**: Emoticons add visual personality to text responses
2. **Emotion context**: DialoGPT uses emotion to influence response tone
3. **Quirky vibes**: ASCII art feels playful and retro
4. **Lightweight**: Small LoRA adapter (~50MB), fast inference
5. **Dual model**: TinyLlama generates emotion, DialoGPT generates words

## Example Responses

**Before emotion adapter:**
```
User: "hey tomo!"
Tomo: "yo! what's good?"
```

**After emotion adapter:**
```
User: "hey tomo!"
Tomo: "yo! what's good? (^_^)"

User: "lol ur funny"
Tomo: "vibing in the chaos! (≧▽≦)"

User: "how's the digital world?"
Tomo: "binary soup is tasty today ⟨◉_◉⟩"
```

## Next Steps

1. Train the emotion adapter: `python ai/train_emotion_adapter.py`
2. Restart API server
3. Test with chat messages
4. Enjoy the quirky emoticons!

## Customization

Want different emoticons? Edit `ai/training_data/emotion_training.jsonl`:

```jsonl
{"text": "<|im_start|>system\nYou generate ASCII emoticons that express emotion. Output ONLY the emoticon, nothing else.<|im_end|>\n<|im_start|>user\nyour custom input<|im_end|>\n<|im_start|>assistant\nyour_emoticon<|im_end|>"}
```

Then retrain the adapter!
