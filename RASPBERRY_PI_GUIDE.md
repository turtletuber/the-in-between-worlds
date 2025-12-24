# Running The In-Between on Raspberry Pi 5 (16GB)

Yes, you can run both the AI Model (Ollama) and the Visuals (Web App) on the Pi 5 16GB.

## 1. System Requirements
- Raspberry Pi 5 (16GB RAM)
- Active Cooling (Fan/Case) - The AI + Graphics will heat it up!
- Raspberry Pi OS (Bookworm) 64-bit

## 2. Setup AI (Backend)
The Pi handles the "brain" using Ollama.

1. **Install Ollama**:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Pull the Model**:
   We recommend `qwen2.5:7b` (balanced) or `llama3.2:3b` (faster).
   ```bash
   ollama pull qwen2.5:7b
   ```

3. **Serve**:
   Allow connections from localhost (and network if needed):
   ```bash
   OLLAMA_HOST=0.0.0.0:11434 ollama serve
   ```

## 3. Setup Visuals (Frontend)
Run the game interface directly on the Pi's desktop.

1. **Install Node.js (v20+)**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone & Install**:
   ```bash
   git clone https://github.com/turtletuber/the-in-between-worlds.git
   cd the-in-between-worlds
   npm install
   ```

3. **Run**:
   ```bash
   npm run dev
   ```
   Open Chromium to `http://localhost:5173`.

## 4. Performance Tips
If the framerate is low (< 30 FPS):

1. **Browser Flags**:
   Run Chromium with GPU acceleration enforced:
   ```bash
   chromium-browser --ignore-gpu-blocklist --enable-gpu-rasterization --enable-zero-copy http://localhost:5173
   ```
   
2. **Kiosk Mode**:
   To run purely as a game console:
   ```bash
   chromium-browser --kiosk --fullscreen http://localhost:5173
   ```

3. **Code Tweak**:
   In `game/scene.ts`, change `render.setPixelRatio(...)` to `1` or `0.8` to render at lower resolution, significantly boosting FPS.
