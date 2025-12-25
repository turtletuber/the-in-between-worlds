import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// In-memory storage for now
let systemPrompt = 'You are a helpful assistant in a mystical game world.';
const memories = [];

// Metrics tracking
const metrics = {
  totalChatRequests: 0,
  totalResponseTimeMs: 0,
  lastRequestAt: null,
  serverStartedAt: new Date().toISOString()
};

// Configurable Ollama Host (Local or Tunnel)
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

app.post('/chat', async (req, res) => {
  const startTime = Date.now();
  const { message, useSystemPrompt = true, useMemories = true, maxMemories = 5 } = req.body;

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

  console.log(`Sending to Ollama [${OLLAMA_HOST}]...`);

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        prompt: fullPrompt,
        stream: false
      })
    });

    if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);

    const data = await response.json();

    // Track metrics
    const responseTime = Date.now() - startTime;
    metrics.totalChatRequests++;
    metrics.totalResponseTimeMs += responseTime;
    metrics.lastRequestAt = new Date().toISOString();

    res.json({
      response: data.response,
      memories_used: relevantMemories.length
    });
  } catch (error) {
    console.error('LLM Server Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
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
  res.json({ memory });
});

app.delete('/memories/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = memories.findIndex(m => m.id === id);
  if (index !== -1) {
    memories.splice(index, 1);
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
