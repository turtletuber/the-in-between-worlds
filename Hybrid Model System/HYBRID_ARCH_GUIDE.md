# Hybrid Cloud Testing Architecture

This guide explains how to connect your **Windows PC** (Powerful "Cloud" Brain acting as a server) to **Railway** (Mid-tier Logic) and **Vercel** (Frontend).

## The Flow
1.  **Windows PC** (Home) -> Runs Ollama (LLM) on RTX 5090.
2.  **Ngrok** (Home) -> Creates a public tunnel to your Windows PC.
3.  **Railway** (Cloud) -> Runs Node.js Middleware. It talks to the Ngrok URL.
4.  **Vercel** (Cloud) -> Runs the React Site. It talks to Railway.

## Step 1: Windows PC (Home Server)
1.  **Install Ollama**: Download from ollama.com.
2.  **Pull Model**: `ollama pull qwen2.5:7b` (or your preferred model).
3.  **Install Ngrok**: Sign up at `ngrok.com`, download the Windows agent.
4.  **Open Tunnel**:
    Open PowerShell and run:
    ```powershell
    ngrok http 11434 --host-header="localhost:11434"
    ```
    *Note: `11434` is the default Ollama port.*
5.  **Copy the URL**: You will get a URL like `https://5a2b-123-456.ngrok-free.app`. Save this!

## Step 2: Railway (Middleware)
We invoke the Node.js middleware on Railway so your squad interacts with a persistent "server" logic, not just your PC directly (better security/logging).

1.  **Deploy**: Connect your GitHub repo to **Railway.app**.
2.  **Config**: Select the `/llm` folder context if possible, or deploy the whole repo and set Start Command to `node llm/server.js`.
3.  **Variable**: Go to "Variables" in Railway.
    *   Add `OLLAMA_HOST` = `https://5a2b-123-456.ngrok-free.app` (The URL from Step 1).
    *   *Note: Just update this variable whenever you restart Ngrok.*

## Step 3: Vercel (Frontend)
1.  **Deploy**: Your Vercel site is already live.
2.  **Config**: Go to Vercel -> Settings -> Environment Variables.
3.  **Variable**:
    *   Update `VITE_API_URL` = `https://your-railway-app.up.railway.app` (The URL Railway gives you).
4.  **Redeploy**.

## Summary for the Squad
*   **You**: Turn on PC -> Run Ollama -> Run Ngrok -> Update Railway Variable.
*   **Squad**: Go to `https://the-in-between-worlds.vercel.app`.
*   **Result**: They chat on the web, it hits Vercel -> Railway -> Ngrok -> **Your RTX 5090**.
