# Deploy to Railway (Auto-Deploy from GitHub)

## One-Time Setup (5 min)

1. **Go to [railway.app](https://railway.app)** and sign in with GitHub

2. **Create New Project** → "Deploy from GitHub repo"

3. **Select this repo** (`the-in-between-worlds`)

4. **Set Root Directory** to `llm`

5. **Add Environment Variables**:
   - `REPLICATE_API_KEY` - Get from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
   - Optional: `GEMINI_API_KEY` (if you want Gemini as an option)

6. **Deploy** — Railway auto-detects Node.js and deploys

7. **Get your URL** — Railway gives you a public URL like `https://your-app.up.railway.app`

## Auto-Deploy

Every time you push to `main`, Railway auto-deploys. Zero manual steps.

## Update the Game

Once deployed, update the chat component to use your Railway URL instead of localhost:

```javascript
// In components/ChatPrompt.tsx
const res = await fetch('https://your-app.up.railway.app/chat', {
```

## How It Works

- **Local (home)**: Game tries Railway URL → Railway tries Ollama on your Mac (if configured) → Falls back to Replicate
- **Away**: Game tries Railway URL → Railway uses Replicate (no local Ollama available)
- **Memories**: Persist on Railway's disk (survives restarts)

Railway free tier: 500 hours/month (enough for personal use)
