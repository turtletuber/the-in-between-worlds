# LLM Integration Guide

## Server
Running on: `http://localhost:3001`
Start: `cd llm && node server.js`
Admin UI: `http://localhost:3001/admin.html`

## API Endpoints

### POST /chat
Chat with the LLM
```javascript
fetch('http://localhost:3001/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'your message here',
    useSystemPrompt: true  // optional, default true
  })
})
.then(r => r.json())
.then(data => console.log(data.response))
```

### GET /prompt
Get current system prompt
```javascript
fetch('http://localhost:3001/prompt')
  .then(r => r.json())
  .then(data => console.log(data.prompt))
```

### POST /prompt
Update system prompt
```javascript
fetch('http://localhost:3001/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'You are...' })
})
```

### GET /memories
List all stored memories
```javascript
fetch('http://localhost:3001/memories')
  .then(r => r.json())
  .then(data => console.log(data.memories))
```

### POST /memories
Add a memory
```javascript
fetch('http://localhost:3001/memories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Player found sword',
    thread_id: 'default'  // optional
  })
})
```

### DELETE /memories/:id
Delete a memory by ID

## Notes
- First request takes ~4s (loads model)
- Subsequent requests <1s
- Model: qwen2.5:7b via Ollama
- Memories are in-memory (restart clears them)
- For persistent storage, integrate with scraps/memories VDB
