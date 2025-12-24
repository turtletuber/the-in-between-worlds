# Debug Metrics Dashboard - Implementation Guide

## Overview
Added comprehensive real-time debugging metrics to the Campground UI Status Panel (📊) for monitoring model performance, memory usage, and fine-tuning decisions.

## What's New

### 📊 Status Panel - Monitoring Window

All debug metrics are now consolidated in the **Status Panel** (accessible via toolbox). The panel displays four key sections:

#### 1. **⚡ Inference Metrics**
- **Latency**: Time taken for complete inference (orchestrator + persona)
  - Format: `X.XXs` (seconds)
  - Updates: After each message
  - Use case: Identify slow responses

- **Tokens**: Approximate token count of generated response
  - Calculation: `response_length / 4` characters per token
  - Updates: After each message
  - Use case: Monitor output verbosity

- **Tokens/sec**: Inference speed
  - Calculation: `tokens / latency`
  - Format: `XX.X t/s`
  - Updates: After each message
  - Use case: Compare model performance, identify bottlenecks

#### 2. **💾 Memory Storage**
- **RAM Usage**: Actual memory consumed by the model process
  - Source: `psutil` process RSS (Resident Set Size)
  - Format: `XXX.X MB`
  - Updates: Every 3 seconds
  - Use case: Monitor memory leaks, compare base vs adapter memory

#### 3. **💾 Memory Storage (continued)**
- **Memories**: Total documents stored in vector DB
  - Source: Memory service `/api/metrics`
  - Updates: Every 5 seconds
  - Use case: Track conversation history growth

- **Size**: Total storage used by vector DB + index
  - Format: `X.XX MB`
  - Includes: SQLite DB + Annoy index file
  - Updates: Every 5 seconds
  - Use case: Monitor storage growth rate

- **Oldest**: Timestamp of oldest memory
  - Format: `YYYY-MM-DD HH:MM:SS`
  - Updates: Every 5 seconds
  - Use case: Understand memory retention window

#### 4. **🎛️ Smart Knob**
- **Button Status**: Real-time hardware button press indicator
  - States: "Waiting..." or "PRESSED!"
  - Updates: Every 500ms polling
  - Visual feedback: Green highlight on press
  - Use case: Test hardware integration

## Technical Implementation

### Frontend Changes (`campground/index.html`)

**Location:** Status Panel sidebar (accessible via 📊 toolbox button)

```html
<!-- Status Panel with all metrics -->
<div class="side-panel" id="statusPanel" data-panel="status">
  <!-- System Status -->
  <div class="status-item">Architecture</div>
  <div class="status-item">API Status</div>
  <div class="status-item">Model Loaded</div>
  <div class="status-item">Messages</div>

  <!-- ⚡ Inference Metrics -->
  <div id="hudLatency">-</div>
  <div id="hudTokens">-</div>
  <div id="hudTokensPerSec">-</div>

  <!-- 💾 Memory Storage -->
  <div id="hudModelMemory">-</div>
  <div id="hudMemoryCount">-</div>
  <div id="hudMemorySize">-</div>
  <div id="hudMemoryOldest">-</div>

  <!-- 🎛️ Smart Knob -->
  <div id="knobIndicator">Waiting...</div>
</div>
```

### Frontend Changes (`campground/public/ui.js`)

#### New Functions:
1. **`checkModelMemory()`** - Polls `/api/model/memory` every 3s
2. **Updated `checkMemoryMetrics()`** - Now updates both Status panel AND HUD
3. **Updated `updateStats(lastLatency, responseText)`** - Calculates tokens and tokens/sec

#### Token Calculation:
```javascript
tokenCount = Math.ceil(responseText.length / 4);
tokensPerSec = tokenCount / latency;
```

### Backend Changes (`server/tomo_api.py`)

#### New Endpoint: `/api/model/memory`

**Method:** `GET`

**Response:**
```json
{
  "model_loaded": true,
  "rss_mb": 1234.56,
  "vms_mb": 2345.67,
  "rss_human": "1234.6 MB",
  "process_id": 12345
}
```

**Implementation:**
- Uses `psutil.Process().memory_info()`
- Returns RSS (actual RAM) and VMS (virtual memory)
- Falls back gracefully if psutil not installed

**Dependencies Added:**
- `psutil>=5.9.0` (server/requirements.txt)
- `requests>=2.31.0` (server/requirements.txt)

## Usage for Fine-Tuning Decisions

### When to Fine-Tune?

Monitor these patterns:

1. **Token Distribution Issues**
   - Responses consistently too short (<10 tokens) → Increase `max_new_tokens` or retrain
   - Responses consistently too long (>200 tokens) → Adjust temperature or retrain

2. **Speed Degradation**
   - Tokens/sec dropping over time → Memory leak or model degradation
   - Compare base model vs adapter speed

3. **Memory Growth**
   - RAM usage increasing linearly → Check for memory leaks
   - Vector memory growing faster than expected → Review ingestion rate

4. **Latency Patterns**
   - High variance in latency → Inconsistent routing (orchestrator issue)
   - Consistently high latency → Model too large, need optimization

### Collecting Training Data

The debug metrics help identify which conversations to use for fine-tuning:

- **Fast, accurate responses** (low latency, good tokens/sec) → Keep these examples
- **Slow responses** (high latency) → Might indicate complex reasoning paths
- **Memory retrieval patterns** → Check if RAG is working effectively

## Testing the Metrics

1. **Start the services:**
   ```bash
   cd /Users/mamatoya/tomodachi
   ./start.sh
   ```

2. **Install psutil (if not already):**
   ```bash
   source venv/bin/activate
   pip install psutil
   ```

3. **Open Campground:**
   ```
   http://localhost:5173
   ```

4. **Open Status Panel:**
   - Click the toolbox button (🧰) in bottom-right
   - Scroll to select the Status icon (📊)
   - Press Enter/Space or click to open panel

5. **Send a test message and observe:**
   - Latency updates immediately in "⚡ Inference Metrics" section
   - Token count appears
   - Tokens/sec calculated
   - Model memory shows current RAM usage in "💾 Memory Storage"
   - Vector memory shows storage stats
   - Smart Knob shows "Waiting..." until hardware button pressed

6. **Test edge cases:**
   - Send very long message → Watch token count increase
   - Send rapid messages → Monitor latency variation
   - Check after model load → RAM should jump up
   - Unload model (Status panel button) → RAM should decrease
   - Press smart knob button → "PRESSED!" appears with green highlight

## Next Steps

### Recommended Enhancements:

1. **Add historical tracking:**
   - Graph latency over time (last 50 messages)
   - Track average tokens/sec per session
   - Memory growth rate chart

2. **Add alerting:**
   - Warning if latency > 5s
   - Warning if RAM > 2GB
   - Warning if tokens/sec < 5

3. **Export metrics:**
   - Download metrics as CSV
   - Send to monitoring service (Prometheus, etc.)

4. **Fine-tuning analysis dashboard:**
   - Analyze conversation quality from metrics
   - Suggest when to retrain based on thresholds
   - Compare before/after fine-tuning metrics

## Troubleshooting

**Status Panel shows "N/A" for everything:**
- Check browser console for API errors
- Verify backend is running on port 8081
- Check memory service is running on port 5003
- Make sure Status Panel is open (📊 toolbox option)

**Model Memory shows "N/A (install psutil)":**
```bash
source venv/bin/activate
pip install psutil>=5.9.0
```

**Vector Memory shows "Offline":**
- Memory service not running
- Check `./start.sh` started all 3 services
- Verify port 5003 is accessible

**Tokens/sec seems wrong:**
- Token calculation is approximate (4 chars/token)
- For accurate count, use tokenizer: `len(tokenizer.encode(text))`
- Consider adding exact token count to backend response

## Files Modified

1. `/Users/mamatoya/tomodachi/campground/index.html` - Added debug HUD UI
2. `/Users/mamatoya/tomodachi/campground/public/ui.js` - Added metric polling functions
3. `/Users/mamatoya/tomodachi/server/tomo_api.py` - Added `/api/model/memory` endpoint
4. `/Users/mamatoya/tomodachi/server/requirements.txt` - Added psutil and requests

---

**Status:** ✅ Ready for testing
**Last Updated:** 2025-11-05
