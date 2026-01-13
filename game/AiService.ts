

export class AiService {
    private static instance: AiService;

    // Configuration
    private mode: 'local' | 'cloud' = 'local';
    private provider: 'raspi' | 'desktop' | 'gemini' = 'gemini'; // Default to Gemini for Demo
    private localLlmUrl: string = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
    private cloudLlmUrl: string = 'https://api.tomo-cloud.com/v1'; // Placeholder
    private vectorEndpoint: string = (import.meta as any).env.VITE_VECTOR_URL || 'http://localhost:5001/api';

    private constructor() {
        // Load persisted mode
        const savedMode = localStorage.getItem('tomo-ai-mode');
        if (savedMode === 'local' || savedMode === 'cloud') {
            this.mode = savedMode;
        }

        // Load persisted provider
        const savedProvider = localStorage.getItem('tomo-provider');
        if (savedProvider === 'raspi' || savedProvider === 'desktop' || savedProvider === 'gemini') {
            this.provider = savedProvider as any;
        }

        // Load persisted node URL
        const savedUrl = localStorage.getItem('tomo-local-url');
        if (savedUrl) {
            this.localLlmUrl = savedUrl;
        }
    }

    public getLocalUrl(): string {
        return this.localLlmUrl;
    }

    public setLocalUrl(url: string): void {
        this.localLlmUrl = url;
        localStorage.setItem('tomo-local-url', url);
    }

    public getProvider(): string {
        return this.provider;
    }

    public setProvider(provider: 'raspi' | 'desktop' | 'gemini'): void {
        this.provider = provider;
        localStorage.setItem('tomo-provider', provider);
        console.log(`[AiService] Provider switched to: ${provider}`);
    }

    public static getInstance(): AiService {
        if (!AiService.instance) {
            AiService.instance = new AiService();
        }
        return AiService.instance;
    }

    public getMode(): 'local' | 'cloud' {
        return this.mode;
    }

    public setMode(mode: 'local' | 'cloud'): void {
        this.mode = mode;
        localStorage.setItem('tomo-ai-mode', mode);
        console.log(`[AiService] Switched to ${mode} mode`);
    }

    private get llmEndpoint(): string {
        return this.mode === 'local' ? this.localLlmUrl : this.cloudLlmUrl;
    }

    // --- LLM Server Interaction ---

    public async sendMessage(
        message: string,
        history: { role: string, content: string }[],
        onChunk: (chunk: string) => void
    ): Promise<string> {
        try {
            const startTime = performance.now();

            const response = await fetch(`${this.llmEndpoint}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    provider: this.provider // Sends 'raspi', 'desktop', or 'gemini'
                })
            });

            const data = await response.json();
            const fullText = data.response;
            const activeModel = data.model || 'unknown';

            // Report Latency & Model
            const latency = Math.round(performance.now() - startTime);
            window.dispatchEvent(new CustomEvent('ai-latency', { detail: { latency, model: activeModel } }));
            window.dispatchEvent(new CustomEvent('ai-model-active', { detail: { model: activeModel } }));

            // Simulate Streaming for UX
            // We split by words to make it feel "typed"
            const chunks = fullText.split(/(?=\s)/g);
            for (const chunk of chunks) {
                onChunk(chunk);
                // Tiny delay to simulate typing speed
                await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
            }

            return fullText;

        } catch (e: any) {
            console.error('AI Service Error:', e);
            const errorMsg = `Synaptic Stream Unstable (${e.message || 'Connection Refused'}). Endpoint: ${this.llmEndpoint}`;
            onChunk(`[ ${errorMsg} ]`);
            return errorMsg;
        }
    }

    public async getSystemPrompt(): Promise<string> {
        const res = await fetch(`${this.llmEndpoint}/prompt`);
        const data = await res.json();
        return data.prompt;
    }

    public async updateSystemPrompt(prompt: string): Promise<void> {
        await fetch(`${this.llmEndpoint}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
    }

    public async getMemories(): Promise<any[]> {
        const res = await fetch(`${this.llmEndpoint}/memories`);
        const data = await res.json();
        return data.memories;
    }

    public async addMemory(text: string): Promise<void> {
        await fetch(`${this.llmEndpoint}/memories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
    }

    public async deleteMemory(id: number): Promise<void> {
        await fetch(`${this.llmEndpoint}/memories/${id}`, {
            method: 'DELETE'
        });
    }

    // --- Vector DB Interaction ---

    public async ingestVector(text: string, threadId: string = 'gameplay'): Promise<any> {
        const res = await fetch(`${this.vectorEndpoint}/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, thread_id: threadId })
        });
        return await res.json();
    }

    public async queryVector(text: string, threadId: string = 'gameplay'): Promise<any[]> {
        const res = await fetch(`${this.vectorEndpoint}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query_text: text, top_k: 5, thread_id: threadId })
        });
        const data = await res.json();
        return data.results || [];
    }

    // --- Metrics ---

    public async getLlmMetrics(): Promise<any> {
        try {
            const res = await fetch(`${this.llmEndpoint}/metrics`);
            return await res.json();
        } catch (e) {
            console.error('Failed to fetch LLM metrics', e);
            return {};
        }
    }

    public async getVectorMetrics(): Promise<any> {
        try {
            const res = await fetch(`${this.vectorEndpoint}/metrics`);
            return await res.json();
        } catch (e) {
            console.error('Failed to fetch Vector metrics', e);
            return {};
        }
    }
}

