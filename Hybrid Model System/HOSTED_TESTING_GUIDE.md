# Hosted Baseline Testing Guide (RunPod)

Since you want to validate the **exact** Gemma 2 + Ollama stack without your team needing to install anything, using a "One-Click" GPU Cloud provider like **RunPod** or **Vast.ai** is significantly better/cheaper than AWS.

**Cost Comparison:**
*   **AWS (g4dn.xlarge)**: ~$0.52/hr + Storage fees + Complex networking setup.
*   **RunPod (RTX 3090)**: ~$0.34/hr. Simple on/off. No hidden fees.

## Recommended Setup: RunPod

This guide sets up a temporary, powerful server running your exact stack for the squad to hit.

### 1. Rent the Server
1.  Go to **RunPod.io** and add $5-10 credits.
2.  Click **Deploy** -> **Community Cloud**.
3.  Filter for **RTX 3090** or **RTX 4090** (Best bang for buck).
4.  **Template**: Select `RunPod Ollama` (often available) or just `Ubuntu` with generic GPU.
5.  **Customize Deployment**:
    *   Expose HTTP Ports: `3001` (Node), `5001` (Vector), `11434` (Ollama), `5173` (Frontend - Optional if not using Vercel).
    *   Set a Volume (e.g., 20GB) to persist your model if you restart.

### 2. Setup (SSH)
Once deployed, SSH into the pod (RunPod gives you a web terminal or SSH command).

**A. Install Dependencies:**
```bash
# Update
apt update && apt install -y curl git nodejs npm python3-pip python3-venv

# Install Ollama (if not in template)
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &  # Start in background
ollama pull gemma2  # Pull YOUR baseline model
```

**B. Deploy Code:**
```bash
git clone https://github.com/turtletuber/the-in-between-worlds.git
cd the-in-between-worlds
npm install
```

**C. Start Backend Services:**
Use `tmux` or background processes:
```bash
# Terminal 1: Node Middleware
cd llm
node server.js &

# Terminal 2: Vector DB
cd ../scraps/memories
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py &
```

### 3. Connect the Squad
Now your backend is live on the RunPod IP.

**Option A: Vercel Frontend (Recommended)**
1.  Go to your Vercel Project Settings.
2.  Update Environment Variable `VITE_API_URL` to `http://<RUNPOD-IP>:3001`.
3.  Redeploy.
4.  Send the Vercel link to your squad.

**Option B: Full Cloud Hosting**
1.  Run `npm run dev -- --host` on the RunPod machine.
2.  Send `http://<RUNPOD-IP>:5173` to your squad.

## Alternative: "Poor Man's" Tunnel (Free)
If you have a fast internet connection at home, you can host it **on your own machine** and let them in.

1.  Run your full stack locally (npm run dev, ollama, etc.).
2.  Install **ngrok**: `brew install ngrok`.
3.  Expose your Node middleware: `ngrok http 3001`.
4.  Update your Vercel Frontend env var to the `https://....ngrok-free.app` URL.

*Note: This is free but relies on your computer being on and having good upload speed.*
