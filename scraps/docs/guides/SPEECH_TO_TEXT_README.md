# Speech-to-Text Integration

This feature adds real-time speech-to-text transcription for audio streaming from the ESP32 SmartKnob to the Campground interface using faster-whisper.

## Architecture

```
ESP32 (PDM Mic) → WebSocket → Campground Client → Socket.IO → Audio Server → faster-whisper → Transcription
                                     ↓                                              ↓
                                Web Audio API                                  Socket.IO emit
                                  (Playback)                                        ↓
                                                                              Campground UI
```

## Components

### 1. Speech-to-Text Service (`server/speech_to_text.py`)
- Wraps faster-whisper for audio transcription
- Supports multiple model sizes (tiny, base, small, medium, large)
- Handles audio buffering and VAD (Voice Activity Detection)
- Provides both streaming and file-based transcription

### 2. Audio Server (`server/audio_server.py`)
- Socket.IO server on port 8080
- `/campground` namespace for audio streaming
- Receives audio chunks via `audio_stream` event
- Buffers audio for 1.5 seconds after last chunk
- Emits `transcription` events with text results

### 3. AudioStreamReceiver (`campground/src/AudioStreamReceiver.ts`)
- Receives audio from ESP32
- Sends audio to server for transcription
- Displays transcriptions in real-time UI
- Shows transcription panel below the waveform

## Setup

### 1. Install Dependencies

```bash
cd tomodachi
pip install -r server/requirements.txt
```

New dependencies added:
- `faster-whisper>=0.10.0`
- `flask-socketio>=5.3.0`
- `python-socketio>=5.10.0`

### 2. Start the Audio Server

#### Windows:
```bash
start_audio_server.bat
```

#### Linux/Mac:
```bash
./venv/bin/python server/audio_server.py
```

The server will:
- Run on `http://localhost:8080`
- Pre-load the Whisper model (first load takes ~10-30 seconds)
- Listen for audio on `/campground` namespace

### 3. Start the Campground Client

```bash
cd campground
npm run dev
```

## Usage

1. **Start the audio server** (runs on port 8080)
2. **Start the campground client** (runs on port 5173)
3. **Stream audio from ESP32** to the campground
4. **Transcriptions appear automatically** in the green panel below the waveform

## Transcription Display

- **Location**: Fixed panel below the audio waveform settings
- **Style**: Green monospace text on dark background
- **Behavior**:
  - Hidden by default
  - Appears when first transcription is received
  - Updates in real-time as speech is detected

## Configuration

### Model Size Selection

Edit `server/audio_server.py` line ~140 in the `init_stt_service()` function:

```python
stt_service = get_stt_service(
    model_size="base",  # Options: tiny, base, small, medium, large
    device="cpu",       # Options: cpu, cuda, auto
    compute_type="int8" # Options: int8 (CPU), float16 (GPU), float32
)
```

**Model Comparison:**
- `tiny`: Fastest, lowest accuracy (~1GB RAM)
- `base`: Good balance (recommended for CPU) (~1.5GB RAM)
- `small`: Better accuracy, slower (~2GB RAM)
- `medium`: High accuracy, requires GPU (~5GB RAM)
- `large`: Best accuracy, requires powerful GPU (~10GB RAM)

### Transcription Delay

Edit `server/audio_server.py` line ~46:

```python
TRANSCRIPTION_DELAY = 1.5  # Seconds to wait after last audio chunk
```

- Lower value = faster response, may cut off words
- Higher value = more complete sentences, higher latency

### Language Detection

By default, the service auto-detects language. To force a specific language:

Edit `server/audio_server.py` in the `transcribe_buffer()` function:

```python
result = stt_service.transcribe_audio_data(
    audio_array,
    language="en",  # Options: en, es, fr, de, ja, zh, etc.
    beam_size=5,    # Higher = more accurate but slower
    vad_filter=True # Enable silence removal
)
```

## API Events

### Client → Server

#### `audio_stream`
Send audio data for transcription
```typescript
socket.emit('audio_stream', int16ArrayBuffer);
```

#### `request_transcription`
Manually trigger transcription of current buffer
```typescript
socket.emit('request_transcription', {});
```

### Server → Client

#### `transcription`
Transcription result with text and metadata
```typescript
socket.on('transcription', (data) => {
  // data.text: Full transcription text
  // data.segments: Array of timestamped segments
  // data.language: Detected language code
  // data.duration: Audio duration in seconds
  // data.confidence: Language detection confidence (0-1)
});
```

#### `transcription_error`
Error during transcription
```typescript
socket.on('transcription_error', (data) => {
  // data.error: Error message
});
```

## Performance Tuning

### CPU Usage
- Use `model_size="tiny"` or `"base"` for CPU
- Use `compute_type="int8"` for CPU inference

### GPU Acceleration
If you have an NVIDIA GPU:
```python
stt_service = get_stt_service(
    model_size="small",     # Can use larger models
    device="cuda",          # Use GPU
    compute_type="float16"  # GPU-optimized precision
)
```

### Memory Usage
- Each model loads into RAM/VRAM
- Base model uses ~1.5GB RAM
- Keep only one audio server instance running

## Troubleshooting

### "Model loading failed"
- Check internet connection (first run downloads model)
- Ensure enough RAM/VRAM for model size
- Try smaller model size (`tiny` or `base`)

### "No speech detected"
- Check ESP32 audio is streaming correctly
- Verify audio waveform is showing in campground
- Try lowering `TRANSCRIPTION_DELAY`
- Disable `vad_filter=False` to transcribe everything

### "Transcription panel not showing"
- Check browser console for Socket.IO connection
- Verify audio server is running on port 8080
- Check `AudioStreamReceiver` is connected to `/campground`

### "Slow transcription"
- Use smaller model (`tiny` or `base`)
- Lower `beam_size` to 1-3
- Enable GPU if available
- Reduce `TRANSCRIPTION_DELAY`

## Development

### Running Tests

```bash
# Test STT service
python -c "from server.speech_to_text import get_stt_service; stt = get_stt_service(); stt.load_model(); print('✅ STT ready')"

# Test audio server
python server/audio_server.py
# Should see: "✅ faster-whisper ready"
```

### Adding Features

The transcription result includes:
- `text`: Full transcription
- `segments`: Array of segments with timestamps
- `language`: Detected language
- `language_probability`: Confidence score

You can extend `AudioStreamReceiver.ts` to:
- Display segments with timestamps
- Show confidence scores
- Add language indicators
- Store transcription history

## Credits

- **faster-whisper**: [https://github.com/guillaumekln/faster-whisper](https://github.com/guillaumekln/faster-whisper)
- **OpenAI Whisper**: [https://github.com/openai/whisper](https://github.com/openai/whisper)
