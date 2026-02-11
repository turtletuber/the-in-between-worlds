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

        // Use Railway URL in production, localhost in dev
        const apiUrl = import.meta.env.VITE_LLM_API_URL || 'http://localhost:3001';

        try {
            const res = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                        <div className="text-white text-sm leading-relaxed">
                            {response}
                        </div>
                    </div>
                )}

                {/* Input pill */}
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

                    <button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        className="w-10 h-10 rounded-full bg-purple-500/80 hover:bg-purple-500 disabled:bg-gray-500/50 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95"
                    >
                        {sending ? (
                            <div className="text-xs font-mono text-white/80 animate-pulse" style={{ animationDuration: '2s' }}>
                                ~_~
                            </div>
                        ) : (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95"
                    >
                        <span className="text-white text-lg">×</span>
                    </button>
                </div>

                <div className="text-center mt-2 text-[10px] text-white/30 font-mono">
                    ESC to close · ENTER to send
                </div>
            </div>
        </div>
    );
};
