# Integration Guide for Game Chat UI

## Running Servers

1. **LLM Server** - Port 3001
   ```bash
   cd llm && node server.js
   ```

2. **Vector DB** - Port 5001
   ```bash
   cd scraps/memories && .venv/bin/python run.py
   ```

## What's Ready

### LLM API (localhost:3001)
- **POST /chat** - Send messages to qwen2.5:7b
- **GET/POST /prompt** - View/edit system prompt
- **GET/POST/DELETE /memories** - Manage in-memory storage

### Vector DB API (localhost:5001)
- Full RAG system with embeddings
- **POST /api/ingest** - Store documents with vectors
- **POST /api/query** - Semantic search
- Web UI at http://localhost:5001

## Integration Tasks

### 1. Add Chat Component
Create a React component in `/components` that:
- Fetches from `http://localhost:3001/chat`
- Shows conversation history
- Has input field for user messages

Example:
```tsx
const ChatPanel = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    const res = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    setMessages([...messages, { user: input, bot: data.response }]);
    setInput('');
  };

  return (
    <div className="chat-panel">
      {messages.map((msg, i) => (
        <div key={i}>
          <p>You: {msg.user}</p>
          <p>Bot: {msg.bot}</p>
        </div>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};
```

### 2. Add Admin Modal
Instead of opening `admin.html` in new tab, create modal:
- Toggle with gear icon
- Edit system prompt via `/prompt` endpoint
- View/manage memories via `/memories` endpoint

### 3. Optional: Connect Vector DB
For persistent, semantic memory:
```typescript
// Store game events
await fetch('http://localhost:5001/api/ingest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Player defeated dragon at coordinates 100,50',
    thread_id: 'gameplay'
  })
});

// Query relevant memories
const res = await fetch('http://localhost:5001/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query_text: 'Tell me about dragons',
    top_k: 5,
    thread_id: 'gameplay'
  })
});
const results = await res.json();
```

## File Locations
- LLM code: `/llm/server.js`
- Integration docs: `/llm/INTEGRATION.md`
- Admin UI reference: `/llm/admin.html`
- Vector DB: `/scraps/memories/`

## Notes
- Both servers use CORS, so fetch from game UI works
- Memories in LLM server are in-memory (cleared on restart)
- Vector DB has persistent SQLite + Annoy index
- First LLM request takes ~4s (model load), then <1s
