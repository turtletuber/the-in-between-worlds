import React, { useEffect, useState, useRef } from 'react';
import { AiService } from '../game/AiService';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export const SidePanelOverlay: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [tokens, setTokens] = useState(0);
    const [latency, setLatency] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom effect
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Listen for Arm Events from 3D world
    useEffect(() => {
        const handleStateChange = (e: CustomEvent) => {
            setIsVisible(e.detail.isOpen);
        };

        window.addEventListener('side-panel-state', handleStateChange as EventListener);

        // AI Metrics listeners
        const handleLatency = (e: CustomEvent) => setLatency(e.detail.latency);
        const handleTokens = (e: CustomEvent) => setTokens(prev => prev + e.detail.tokens);

        window.addEventListener('ai-latency', handleLatency as EventListener);
        window.addEventListener('ai-tokens', handleTokens as EventListener);

        return () => {
            window.removeEventListener('side-panel-state', handleStateChange as EventListener);
            window.removeEventListener('ai-latency', handleLatency as EventListener);
            window.removeEventListener('ai-tokens', handleTokens as EventListener);
        };
    }, []);

    // Auto-focus when visible
    useEffect(() => {
        if (isVisible) {
            // Small timeout to ensure DOM is ready
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;

        const userMsg = input;
        setInput('');
        setIsThinking(true);

        // Add User Message and Assistant Placeholder atomically
        setMessages(prev => [
            ...prev,
            { role: 'user', content: userMsg },
            { role: 'assistant', content: '' }
        ]);

        try {
            // Context History
            const history = messages.slice(-10).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }));

            await AiService.getInstance().sendMessage(userMsg, history, (chunk) => {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastIndex = newMsgs.length - 1;
                    const lastMsg = { ...newMsgs[lastIndex] }; // Shallow copy to enforce immutability

                    if (lastMsg.role === 'assistant') {
                        lastMsg.content += chunk;
                        newMsgs[lastIndex] = lastMsg;
                    }
                    return newMsgs;
                });
            });
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'system', content: 'Connection Error.' }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
        if (e.key === 'Escape') {
            window.dispatchEvent(new CustomEvent('close-side-panel'));
        }
    };

    if (!isVisible) return null;

    return (
        <div
            className="absolute bottom-8 left-8 z-40 w-[500px] h-[600px] font-mono text-sm flex flex-col pointer-events-auto"
            style={{
                transform: 'perspective(1000px) rotateY(5deg)',
                transformOrigin: 'left bottom'
            }}
            onPointerDown={(e) => e.stopPropagation()} // Stop click-drag passing to OrbitControls
            onWheel={(e) => e.stopPropagation()} // Stop scroll passing to Zoom logic
        >
            {/* Glass Panel Background */}
            <div className="absolute inset-0 bg-[#001122]/90 backdrop-blur-md border border-cyan-500/50 rounded-tr-3xl rounded-bl-xl shadow-[0_0_30px_rgba(0,255,255,0.2)]"></div>

            {/* Header */}
            <div className="relative z-10 px-6 py-4 border-b border-cyan-500/30 flex justify-between items-center bg-black/20 rounded-tr-3xl">
                <div className="text-cyan-400 font-mono tracking-wider text-sm drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
                    ~/tomo/system/orchestration/..
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
                        <div className="w-3 h-3 rounded-full bg-cyan-900 border border-cyan-500"></div>
                    </div>
                    {/* Close Button */}
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('close-side-panel'))}
                        className="text-cyan-500/50 hover:text-cyan-400 hover:scale-110 transition-all font-bold text-xl"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Chat History Area - SCROLLABLE & SELECTABLE! */}
            <div
                className="relative z-10 flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                onWheel={(e) => e.stopPropagation()}
            >
                {messages.length === 0 && (
                    <div className="text-cyan-500/50 text-center mt-20 italic">
                        System ready. Initializing neural link...
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`
                            max-w-[85%] px-4 py-2 rounded-lg border
                            ${msg.role === 'user'
                                ? 'bg-cyan-900/30 border-cyan-500/30 text-cyan-100 rounded-br-none'
                                : 'bg-black/40 border-cyan-500/20 text-cyan-300 rounded-bl-none shadow-[0_0_10px_rgba(0,255,255,0.1)]'}
                        `}>
                            {/* Make text selectable */}
                            <span className="select-text whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                            </span>
                        </div>
                    </div>
                ))}

                {/* Thinking Indicator */}
                {isThinking && messages[messages.length - 1]?.content === '' && (
                    <div className="text-cyan-500/50 text-xs animate-pulse ml-2">{'>>>'} Receiving Stream...</div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="relative z-10 p-4 bg-black/40 border-t border-cyan-500/30 rounded-bl-xl">
                <div className="flex items-center gap-3">
                    <span className="text-cyan-500 font-bold text-lg">{'>'}</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            handleKeyDown(e);
                        }}
                        onKeyUp={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Transmit message..."
                        className="flex-1 bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-700/50 font-mono h-10 select-text"
                        autoComplete="off"
                    />
                    <button
                        onClick={handleSend}
                        className="px-4 py-2 bg-cyan-900/50 hover:bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded transition-colors text-xs uppercase font-bold"
                    >
                        Send
                    </button>
                </div>
            </div>

            {/* Metrics Footer */}
            <div className="relative z-10 px-6 py-2 border-t border-cyan-500/10 flex justify-between items-center bg-black/40 rounded-bl-xl">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-cyan-700 uppercase">Tokens</span>
                        <span className="text-cyan-400 font-bold text-xs">{tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-cyan-700 uppercase">Latency</span>
                        <span className="text-cyan-400 font-bold text-xs">{latency}ms</span>
                    </div>
                </div>
                <div className="text-[9px] text-cyan-900 tracking-widest uppercase">
                    Neural Link Active
                </div>
            </div>

            {/* Decals / Scanlines Overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-tr-3xl rounded-bl-xl overflow-hidden opacity-30">
                <div className="w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.05)_50%)] bg-[length:100%_4px]"></div>
            </div>
        </div>
    );
};
