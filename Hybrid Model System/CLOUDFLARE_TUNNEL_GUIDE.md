# Setting up Cloudflare Tunnel (Stable URL)

This replaces Ngrok. It gives your Windows PC a **permanent** public URL (e.g., `https://tomo-brain.trycloudflare.com`) that never changes, even if you restart.

## 1. Get Cloudflare Account (Do this now)
1.  Go to **[cloudflare.com](https://www.cloudflare.com/)** and sign up (Free).
2.  *(Optional but excellent)*: If you own a domain (e.g., `tomo-game.com`), add it to Cloudflare. If not, don't worry, we can use their `trycloudflare` temporary domains or quick tunnels, but for a truly **permanent** custom domain (like `api.tomo-game.com`), owning a domain ($10/yr) is best.

**For this guide, we will assume you WANT a stable, free Quick Tunnel first.**

## 2. On Your Windows PC (When you get there)

### A. Install cloudflared
1.  Open **PowerShell** (Admin).
2.  Run: `winget install Cloudflare.cloudflared` 
    *   *Or download the `.exe` from their [Github releases](https://github.com/cloudflare/cloudflared/releases).*

### B. Authenticate
```powershell
cloudflared tunnel login
```
*   This will pop up a browser window. Login and select your account/domain if you added one.

### C. Create the Tunnel
Name it something cool, like `tomo-tunnel`:
```powershell
cloudflared tunnel create tomo-tunnel
```
*   This creates a UUID file for credentials.

### D. Configure the Tunnel
Create a file named `config.yml` in your `.cloudflared` folder (usually `C:\Users\You\.cloudflared\config.yml`):

```yaml
tunnel: <UUID-FROM-STEP-C>
credentials-file: C:\Users\You\.cloudflared\<UUID>.json

ingress:
  # Route traffic to Ollama Port
  - hostname: bigboi.planza.app
    service: http://localhost:11434
  - service: http_status:404
```

### E. Run It (Stable)
1.  **If you have a Domain**:
    ```powershell
    cloudflared tunnel route dns tomo-tunnel bigboi.planza.app
    cloudflared tunnel run tomo-tunnel
    ```
    *Result: `https://bigboi.planza.app` is now your stable endpoint to your PC.*

2.  **If you DO NOT have a Domain (The "Better-than-Ngrok" Free method)**:
    Just run this command (no config needed):
    ```powershell
    cloudflared tunnel --url http://localhost:11434
    ```
    *Result: It will print a URL like `https://funny-words-random-words.trycloudflare.com`. This URL is stable **as long as the process runs**. If you restart, it changes. For 100% stability across reboots, you really want **Method 1 (Own a Domain)**.*

## 3. Persistent Service (Auto-Start)
To make sure this runs when your PC boots:
```powershell
cloudflared service install
```

## Summary for Setup Day
1.  Buy a cheap domain (like `tomo-ai-test.com`) on Namecheap/Cloudflare (~$10/year). It makes this 100x easier.
2.  Follow **Step E -> Method 1**.
3.  Add that URL to **Railway**.
4.  You never have to touch it again.
