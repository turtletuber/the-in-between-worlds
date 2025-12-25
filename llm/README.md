# Qwen 2.5:7b LLM Setup

## Local (Mac)
✓ Model installed
✓ Web app ready

Start server:
```bash
cd llm
node server.js
```

Open http://localhost:3001 in browser

## Raspberry Pi Deployment

### 1. Install Ollama on Pi
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b
```

### 2. Copy files
```bash
scp -r llm pi@raspberrypi.local:~/
```

### 3. Install Node.js on Pi
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 4. Run on Pi
```bash
cd ~/llm
npm install
node server.js
```

Access at http://raspberrypi.local:3001
