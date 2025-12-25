# Cost-Efficient Cloud Architecture for "Tomo"

Running an LLM stack in the cloud can be expensive if not optimized. AWS EC2 GPU instances suitable for LLMs (like `g4dn.xlarge`) cost ~$300-$400/mo.

For a test environment / MVP, we recommend a **Hybrid "Serverless" Architecture**. This splits your stack to minimize heavy infrastructure costs while maintaining high performance.

## The Stack Breakdown

| Components | Recommended Provider | Cost Est. | Why? |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** (keep existing) | **Free** | You already have this. It handles the React UI perfectly. |
| **Orchestration** | **Railway.app** or **Render** | **$5-10/mo** | Hosts your Node.js (Middleware) and Python (Vector DB) servers. Much easier than AWS EC2. |
| **LLM Inference** | **Groq** or **OpenRouter** | **Free / Cheap** | Instead of renting a GPU server ($$$), use an API that serves open models (Llama 3, Qwen, etc.). Groq is currently free/extremely fast. |
| **Vector DB** | **Upstash** or **Pinecone** | **Free / Cheap** | Serverless Vector DBs. No need to manage a Python Chroma instance if you switch to a managed provider, but for now we can stick to your Python server on Railway. |

---

## Deployment Strategy

### 1. Frontend (Vercel)
*   **Action**: Connect your GitHub repo to Vercel.
*   **Config**: Add Environment Variables to point to your deployed Middleware (Step 2).
    *   `VITE_API_URL`: `https://your-node-server.railway.app`

### 2. Middleware & Vector DB (Railway)
Railway is excellent because it allows multi-service deployments from a single repo easily.

**Node.js Middleware:**
*   Deploy your `/llm` folder as a service.
*   **Env Vars**:
    *   `LLM_PROVIDER`: `cloud` (We need to add this logic to use OpenAI/Groq instead of local Ollama).
    *   `GROQ_API_KEY`: `your-key-here`.

**Python Vector DB:**
*   Deploy your `/scraps/memories` folder as a service.
*   **Env Vars**:
    *   `API_SECRET`: (Optional security).

### 3. The "Switch" (LLM Provider)
Attempting to run Ollama on Railway/Render (CPU only) will be too slow.
**Crucial Change**: Update your Node.js server (`server.js`) to act as a router.
*   **Local Mode**: Forwards requests to `localhost:11434` (Ollama).
*   **Cloud Mode**: Forwards requests to **Groq API** (or OpenAI/OpenRouter).

*Note: Groq offers `llama3-70b` and `mixtral` which are smarter/faster than what you run on a Raspberry Pi, creating a great "Cloud" experience.*

---

## Cost Comparison

| Option | Setup | Monthly Cost | Pros | Cons |
| :--- | :--- | :--- | :--- | :--- |
| **1. AWS EC2 (GPU)** | Manually install Ollama on `g4dn.xlarge` | ~$380/mo | Full control. Same privacy as local. | Expensive. DevOps heavy. |
| **2. Cheap VPS (CPU)** | Hetzner / Contabo (64GB RAM) | ~$30/mo | Cheap dedicated server. | Slow inference (CPU only). Latency issues. |
| **3. Hybrid API (Recommended)** | Vercel + Railway + Groq/OpenRouter | **~$10/mo** | Fast. Cheap. Scalable. | Data leaves your server (Privacy). |

## Recommendation for Testing
Use **Option 3**.
1.  **Frontend** on Vercel.
2.  **Node/Python** on Railway ($5/mo).
3.  **LLM** via **Groq API** (Free tier is generous).

This lets your devs test the *Orchestration* and *UX* without needing to pull the 50GB AI setup locally.
