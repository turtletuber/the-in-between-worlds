# Self-Hosting on Windows (Home Server)

Your Windows PC with an RTX GPU (12GB VRAM) is **more than powerful enough** to host this stack. It will likely outperform cheap cloud instances. This is the **most cost-effective** way to let your squad test.

## Prerequisites
We highly recommend using **WSL2 (Windows Subsystem for Linux)**. It makes running the Node/Python/Ollama stack significantly easier and matches your Mac environment.

### 1. Setup Environment (WSL2)
1.  Open PowerShell as Admin and run: `wsl --install`. Reboot if asked.
2.  Open "Ubuntu" from your Start Menu.
3.  Install dependencies inside Ubuntu:
    ```bash
    sudo apt update && sudo apt install -y curl git nodejs npm python3-pip python3-venv
    ```

### 2. Install & Serve Ollama (Windows or WSL)
You can run Ollama directly on Windows (easier GPU access) or inside WSL.
*   **Option A: Windows Native (Recommended for GPU)**: Download Ollama for Windows from `ollama.com`. Run it. It will listen on `localhost:11434`.
*   **Pull Model**: Open PowerShell/CMD and run `ollama pull gemma2`.

### 3. Setup Project in WSL
Inside your Ubuntu terminal:
```bash
# Clone your repo
git clone https://github.com/turtletuber/the-in-between-worlds.git
cd the-in-between-worlds

# Install Frontend/Node deps
npm install

# Setup Python Vector DB
cd scraps/memories
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Running the Stack
Run these in separate WSL terminals:

**1. Node Middleware:**
```bash
cd ~/the-in-between-worlds/llm
# IMPORTANT: Point to Windows host for Ollama if running Native Windows Ollama
export OLLAMA_HOST=http://host.docker.internal:11434 
# OR just http://localhost:11434 if it works automatically (Ollama 0.1.30+ binds 0.0.0.0 often)
node server.js
```
*Note: If `host.docker.internal` doesn't work, try your local IP.*

**2. Python Vector DB:**
```bash
cd ~/the-in-between-worlds/scraps/memories
source .venv/bin/activate
python run.py
```

## Exposing to the World (Tunneling)
To let your squad access this server from their homes, you need to expose **Port 3001** (The Node Middleware).

**The Easy Way: Ngrok**
1.  Register at `ngrok.com` (Free).
2.  Install (inside WSL): `curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | ...` (follow their guide).
3.  Run:
    ```bash
    ngrok http 3001
    ```
4.  It will give you a URL like `https://a1b2-c3d4.ngrok-free.app`.

## Connect the Frontend
1.  Go to your **Vercel Project Settings**.
2.  Update `VITE_API_URL` to your Ngrok URL (e.g., `https://a1b2-c3d4.ngrok-free.app`).
3.  **Redeploy** (or just hit "Save" and trigger a rebuild).

## Summary
*   **Windows** runs the heavy lifting (Ollama GPU).
*   **WSL** runs the logic (Node/Python).
*   **Ngrok** creates the bridge.
*   **Vercel** serves the UI to your users.
