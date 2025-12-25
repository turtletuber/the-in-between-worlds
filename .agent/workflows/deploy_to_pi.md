---
description: Deploy the complete Tomo AI stack to a Raspberry Pi 5
---

This workflow guides you through deploying the current application (Frontend + Node Middleware + Vertex DB + Ollama) to a Raspberry Pi 5.

# 1. Prepare Local Files
First, we need to package your current code, excluding heavy/generated folders (`node_modules`, `.next`, `dist`, `.venv`).

```bash
# Run this on your MAC
tar --exclude='node_modules' --exclude='.git' --exclude='.venv' --exclude='dist' -czf tomo_deploy.tar.gz .
```

# 2. Transfer to Raspberry Pi
Replace `<user>` and `<pi-ip>` with your Pi's username and IP address (e.g., `pi@192.168.1.50`).

```bash
scp tomo_deploy.tar.gz <user>@<pi-ip>:~/tomo_deploy.tar.gz
```

# 3. Setup Raspberry Pi (Run on Pi)
SSH into your Pi (`ssh <user>@<pi-ip>`) and run the following commands:

## A. Install System Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git python3-venv python3-pip unzip
```

## B. Install Node.js (v20) & npm
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## C. Install Ollama & Pull Model
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b
```

## D. Unpack Application
```bash
mkdir -p ~/tomo-app
tar -xzf tomo_deploy.tar.gz -C ~/tomo-app
cd ~/tomo-app
```

## E. Install Project Dependencies

**1. Frontend & Node Middleware:**
```bash
npm install
```

**2. Python Vector DB:**
```bash
cd scraps/memories
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..  # Go back to root
```

# 4. Running the Application (On Pi)
You need to run these processes simultaneously. Using `tmux` or multiple terminal tabs is recommended.

**Terminal 1: Ollama**
```bash
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

**Terminal 2: Node Middleware (LLM Server)**
```bash
cd ~/tomo-app/llm
node server.js
```
*Port 3001 must be free.*

**Terminal 3: Vector DB**
```bash
cd ~/tomo-app/scraps/memories
source .venv/bin/activate
python run.py
```
*Port 5001 must be free.*

**Terminal 4: React Frontend**
```bash
cd ~/tomo-app
npm run dev -- --host
```
*Access via `http://<pi-ip>:5173` on your other devices, or localhost on the Pi.*
