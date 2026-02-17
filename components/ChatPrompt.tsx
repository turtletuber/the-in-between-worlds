import React, { useState, useRef, useEffect } from 'react';

const THINKING_FACES = ['(~_~)', '(o_o)', '(^-^)', '(^_~)'];

export const ChatPrompt: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [response, setResponse] = useState('');
    const [thinkingFaceIndex, setThinkingFaceIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (visible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [visible]);

    // Cycle through thinking faces while processing
    useEffect(() => {
        if (!sending) return;

        const interval = setInterval(() => {
            setThinkingFaceIndex((prev) => (prev + 1) % THINKING_FACES.length);
        }, 800);

        return () => clearInterval(interval);
    }, [sending]);

    const handleSend = async () => {
        if (!message.trim() || sending) return;

        setSending(true);
        setResponse('');

        // 1. Direct Gemini Call (if API key provided in .env)
        const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey !== 'PLACEHOLDER_API_KEY') {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `You are Tomo, an AI companion in a digital world. Be precise, creative, and productive. Keep it brief. User says: ${message}`
                            }]
                        }]
                    })
                });

                const data = await res.json();
                if (data.error) {
                    throw new Error(data.error.message || 'Gemini API Error');
                }

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
                setResponse(text);
                setMessage('');
                setSending(false);
                return;
            } catch (err: any) {
                console.error('Gemini error:', err);
                setResponse(`Error: ${err.message || 'Failed to reach Gemini'}`);
                setSending(false);
                return;
            }
        }

        // 2. Fallback to LLM server flow
        const apiUrl = (import.meta as any).env.VITE_LLM_API_URL || 'http://localhost:3001';
        const apiKey = (import.meta as any).env.VITE_API_SECRET;

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }

            const res = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: message.trim(),
                    useSystemPrompt: true
                })
            });

            const data = await res.json();
            setResponse(data.response || 'No response');
            setMessage('');
        } catch (err) {
            setResponse('Error: LLM server not reachable. Check deployment or start local server.');
            console.error('Chat error:', err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-end justify-center pb-32 pointer-events-none">
            <div className="w-full max-w-2xl px-4 pointer-events-auto">

                {/* Thinking state (while processing) */}
                {sending && (
                    <div className="mb-4 p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl font-mono animate-pulse" style={{ animationDuration: '2s' }}>
                                {THINKING_FACES[thinkingFaceIndex]}
                            </div>
                            <div className="text-white/50 text-sm italic">
                                taking a moment to think...
                            </div>
                        </div>
                    </div>
                )}

                {/* Response bubble (if present) */}
                {response && !sending && (
                    <div className="mb-4 p-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-xs text-white/60 mb-1 font-mono">TOMO:</div>
                        <div className="text-white text-sm leading-relaxed select-text cursor-text selection:bg-purple-500/40">
                            {response}
                        </div>
                    </div>
                )}

                {/* Input pill - Buttons removed for keyboard-only focus */}
                <div className="flex items-center gap-2 p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 shadow-2xl">
                    <input
                        ref={inputRef}
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Talk to Tomo..."
                        disabled={sending}
                        className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-sm px-3"
                    />
                </div>

                <div className="text-center mt-2 text-[10px] text-white/30 font-mono">
                    ESC to close · ENTER to send
                </div>
            </div>
        </div>
    );
};
