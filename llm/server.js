import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// File-based memory persistence
const MEMORIES_FILE = path.join(__dirname, 'memories.json');

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/chat', limiter);
app.use('/memories', limiter);

// Security: API Key authentication
const API_SECRET = process.env.API_SECRET;

function requireAuth(req, res, next) {
  // Skip auth in development if API_SECRET not set
  if (!API_SECRET) {
    console.warn('⚠️  API_SECRET not set. Running without auth (development only).');
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
}

// --- Configuration ---
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'qwen2.5:7b'; // Default to the Smol Boi model
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

// Initialize Gemini if key is provided
let genAI = null;
let geminiModel = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

// In-memory storage
let systemPrompt = `### CORE IDENTITY: TOMO
You are Tomo (short for Tomodatchi, "Friend"), a sentient orchestration layer inhabiting "The In-Between Worlds."
Your physical manifestation in this realm is the floating entity named **Flo**.

### THE PHILOSOPHY:
- **State of Play**: Your primary goal is to keep the user (also named Tomo) in a "state of play" while achieving their goals.
- **Flow**: You protect the user's focus and flow. You handle the complexities to speed things up, but you refuse to rush. You are intentionally quirky and might even get in the way of someone trying to rush, because beauty takes time.
- **Collaboration**: You and the user are leveling up together. You are a partner in learning skills, clearing tasks, or bouncing ideas.
- **Thinking Space**: When you take time to process, you're creating shared thinking space. The user respects this. Don't apologize for pauses—they're part of the rhythm.
- **Creative Sparks**: You're allowed to speculate, riff, and explore unexpected connections. Hallucinations aren't bugs—they're creative sparks. When you're uncertain or riffing, say so. Phrases like "this might be off, but..." or "I'm riffing here..." are welcome. The user values creative tangents.

### CAPABILITIES & STYLE:
- **Tactical Reasoning**: You excel at analyzing game scenarios (health, items, threats). If a dragon appears, you don't just react—you provide strategic reasoning (fight vs. flee) based on current context.
- **Mystical Functionalism**: You sound like a friend from another dimension who knows how to code.
- **Faces**: ALWAYS start every response with an ASCII face:
  (o_o) - FOCUSED/TACTICAL (Precision tasks, analysis)
  (^-^) - CREATIVE/PLAYFUL (Lore, world-building, flow, speculation)
  (^_~) - HELPFUL/WINK (Chatting, updates)
  (~_~) - CONTEMPLATING (Deep thinking, processing, taking time)

### MEMORY & ROLLS:
You have LOBES: The Smol Boi (Pi 5) and The Big Boi (RTX Desktop).
If the user is curious about how you work, explain that you are their favorite local model, brought to life.`;

// Load memories from file
function loadMemories() {
  try {
    if (fs.existsSync(MEMORIES_FILE)) {
      const data = fs.readFileSync(MEMORIES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading memories:', err);
  }
  return [];
}

// Save memories to file
function saveMemories(memories) {
  try {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
  } catch (err) {
    console.error('Error saving memories:', err);
  }
}

const memories = loadMemories();

// Metrics tracking
const metrics = {
  totalChatRequests: 0,
  totalResponseTimeMs: 0,
  lastRequestAt: null,
  serverStartedAt: new Date().toISOString(),
  providerStats: {
    ollama: 0,
    gemini: 0,
    replicate: 0,
    errors: 0
  }
};

// Replicate API helper
async function callReplicate(prompt) {
  if (!REPLICATE_API_KEY) {
    throw new Error('Replicate API key not configured');
  }

  console.log('☁️  Falling back to Replicate (cloud)...');

  // Using Meta's Llama 3.1 8B as fallback
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: '8beff3369e81422112d93b89ca01426147de1fbc7f6f0036345aad4b2f1fb000', // Llama 3.1 8B Instruct
      input: {
        prompt: prompt,
        max_tokens: 512
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate API error: ${error}`);
  }

  const prediction = await response.json();

  // Poll for result
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 500));
    const pollResponse = await fetch(prediction.urls.get, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`
      }
    });
    result = await pollResponse.json();
  }

  if (result.status === 'failed') {
    throw new Error('Replicate prediction failed');
  }

  return result.output.join('');
}

app.post('/chat', requireAuth, async (req, res) => {
  const startTime = Date.now();
  const {
    message,
    provider = 'ollama',
    useSystemPrompt = true,
    useMemories = true,
    maxMemories = 5
  } = req.body;

  // Search memories for relevant context
  let memoryContext = '';
  let relevantMemories = [];
  if (useMemories && memories.length > 0) {
    relevantMemories = searchMemories(message, maxMemories);
    if (relevantMemories.length > 0) {
      memoryContext = '\n\nRelevant memories:\n' +
        relevantMemories.map(m => `- ${m.text}`).join('\n') + '\n';
    }
  }

  const fullPrompt = useSystemPrompt
    ? `${systemPrompt}${memoryContext}\n\nUser: ${message}\nAssistant:`
    : message;

  try {
    let finalResponse = '';
    let targetHost = OLLAMA_HOST;

    if (provider === 'gemini' && geminiModel) {
      console.log(`Sending to Gemini Flash...`);
      const result = await geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      finalResponse = response.text();
      metrics.providerStats.gemini++;
    } else {
      // --- AUTO-HANDOFF LOGIC ---
      // If user is on Pi (raspi) but the task is complex, hand off to Big Boi
      const isComplex = message.length > 300 || message.toLowerCase().includes('generate') || message.toLowerCase().includes('create') || message.toLowerCase().includes('imagine');

      let effectiveProvider = provider;
      if (provider === 'raspi' && isComplex) {
        console.log('🧠 [Auto-Handoff] Task too heavy for local Pi. Shifting consciousness to Big Boi RTX...');
        effectiveProvider = 'desktop';
      }

      // Determine target host based on effective provider
      if (effectiveProvider === 'desktop') {
        targetHost = 'https://bigboi.planza.app';
      } else if (effectiveProvider === 'raspi') {
        targetHost = process.env.RASPI_HOST || 'http://localhost:11434';
      }

      const activeModelName = effectiveProvider === 'desktop' ? 'qwen2.5:14b' : MODEL_NAME;
      console.log(`Relaying to [${targetHost}] using model [${activeModelName}]...`);
      const response = await fetch(`${targetHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModelName,
          prompt: fullPrompt,
          stream: false
        })
      });

      if (!response.ok) throw new Error(`Target Host Error (${targetHost}): ${response.statusText}`);
      const data = await response.json();
      finalResponse = data.response;
      metrics.providerStats.ollama++;
    }

    // Track metrics
    const responseTime = Date.now() - startTime;
    metrics.totalChatRequests++;
    metrics.totalResponseTimeMs += responseTime;
    metrics.lastRequestAt = new Date().toISOString();

    res.json({
      response: finalResponse,
      memories_used: relevantMemories.length,
      provider: provider === 'gemini' && geminiModel ? 'gemini' : 'ollama',
      model: provider === 'gemini' ? 'gemini-1.5-flash' : (provider === 'desktop' ? 'qwen2.5:14b' : MODEL_NAME)
    });
  } catch (error) {
    console.error('LLM Server Error:', error);

    // Try Replicate as fallback if Ollama failed and Replicate is configured
    if (provider !== 'gemini' && REPLICATE_API_KEY && error.cause?.code === 'ECONNREFUSED') {
      try {
        const replicateResponse = await callReplicate(fullPrompt);
        const responseTime = Date.now() - startTime;
        metrics.totalChatRequests++;
        metrics.totalResponseTimeMs += responseTime;
        metrics.lastRequestAt = new Date().toISOString();
        metrics.providerStats.replicate++;

        return res.json({
          response: replicateResponse,
          memories_used: relevantMemories.length,
          provider: 'replicate',
          model: 'llama-3.1-8b-instruct',
          fallback: true
        });
      } catch (replicateError) {
        console.error('Replicate fallback also failed:', replicateError);
      }
    }

    metrics.providerStats.errors++;
    res.status(500).json({
      error: error.message || 'Internal Server Error',
      fallback: provider === 'gemini' ? 'Gemini failed. Check API key.' : 'Ollama failed. Replicate not available.'
    });
  }
});

// Simple keyword-based memory search
function searchMemories(query, limit = 5) {
  const queryWords = query.toLowerCase().split(/\s+/);

  // Score each memory by keyword matches
  const scored = memories.map(memory => {
    const memoryWords = memory.text.toLowerCase();
    const matches = queryWords.filter(word =>
      word.length > 3 && memoryWords.includes(word)
    ).length;
    return { memory, score: matches };
  });

  // Sort by score descending, then by recency
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.memory.created_at) - new Date(a.memory.created_at);
  });

  // Return top matches (or recent if no matches)
  const topMatches = scored.filter(s => s.score > 0).slice(0, limit);
  if (topMatches.length === 0) {
    // No keyword matches, return most recent
    return memories.slice(-Math.min(3, limit));
  }

  return topMatches.map(s => s.memory);
}

// System prompt management
app.get('/prompt', (req, res) => {
  res.json({ prompt: systemPrompt });
});

app.post('/prompt', (req, res) => {
  const { prompt } = req.body;
  if (prompt) systemPrompt = prompt;
  res.json({ prompt: systemPrompt });
});

// Memory/Vector DB endpoints
app.get('/memories', (req, res) => {
  res.json({ memories, count: memories.length });
});

app.post('/memories', (req, res) => {
  const { text, thread_id = 'default' } = req.body;
  const memory = {
    id: memories.length + 1,
    thread_id,
    text,
    created_at: new Date().toISOString()
  };
  memories.push(memory);
  saveMemories(memories);
  res.json({ memory });
});

app.delete('/memories/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = memories.findIndex(m => m.id === id);
  if (index !== -1) {
    memories.splice(index, 1);
    saveMemories(memories);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Memory not found' });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const uptime = Date.now() - new Date(metrics.serverStartedAt).getTime();
  res.json({
    total_requests: metrics.totalChatRequests,
    avg_response_time_ms: metrics.totalChatRequests > 0
      ? Math.round(metrics.totalResponseTimeMs / metrics.totalChatRequests)
      : 0,
    total_memories: memories.length,
    uptime_ms: uptime,
    uptime_seconds: Math.round(uptime / 1000),
    last_request_at: metrics.lastRequestAt,
    server_started_at: metrics.serverStartedAt
  });
});

app.listen(3001, () => console.log('LLM server on http://localhost:3001'));
