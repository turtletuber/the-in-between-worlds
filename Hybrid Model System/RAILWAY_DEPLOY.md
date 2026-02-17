# Railway Deployment Guide for Tomo

This guide enables you to deploy your **Node.js Middleware** and **Python Vector DB** to Railway 🚂.

## Why Railway?
It will run your code 24/7 in the cloud so your Vercel site works for everyone, not just you.

## Prerequisite: GitHub
Ensure your latest code is pushed to GitHub.
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push
```

## Step 1: Create Project
1.  Go to **[railway.app](https://railway.app)** and Login with GitHub.
2.  Click **New Project** -> **Deploy from GitHub repo**.
3.  Select your `the-in-between-worlds` repo.
4.  Click **Deploy Now**.

## Step 2: Configuration (Variables)
Railway will try to build it, but we need to tell it where your "Brain" (Windows PC) is.

1.  Click on your project card in Railway.
2.  Go to **Variables**.
3.  Add the following:
    *   `OLLAMA_HOST`: `https://your-ngrok-url.ngrok-free.app` (Copy this from your Windows Ngrok window).
    *   `PORT`: `3001` (This tells Railway which port to expose to the world).

## Step 3: Networking
1.  Go to **Settings** -> **Networking**.
2.  Your service needs a public domain. Click **Generate Domain**.
3.  It will create something like `web-production-1234.up.railway.app`. **Copy this.**

## Step 4: Update Vercel
1.  Go to your Vercel Project Dashboard.
2.  **Settings** -> **Environment Variables**.
3.  Edit `VITE_API_URL`.
4.  Paste your **Railway URL** (from Step 3, e.g., `https://web-production-123.up.railway.app`).
    *   *Note: Do NOT add port :3001. Railway handles SSL/Routing automatically.*
5.  **Redeploy** on Vercel.

## Done!
**The Flow:**
User (Browser) -> Vercel UI -> Railway (Node Logic) -> Ngrok -> Your Windows PC (Ollama GPU)
