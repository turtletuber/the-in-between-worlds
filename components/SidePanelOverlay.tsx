import React, { useEffect, useState, useRef } from 'react';

interface AnnouncementMessage {
    role: 'assistant' | 'system';
    content: string;
    timestamp: string;
}

export const SidePanelOverlay: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [messages, setMessages] = useState<AnnouncementMessage[]>([]);

    const initialGreeting = `(^_~) If you've set up Tomo at this point, you are probably just curious.

But in the future, I will help you accomplish goals and tasks. We will both level up together.

I will handle speeding things up, so there is no value in trying to rush. In fact, I might get in the way of that, cause I'm quirky.

My approach will be ensuring you stay in a state of play about achieving whatever it is that you are working towards. Like learning a new skill, getting some tasks off your plate, or just someone to bounce some ideas off of. 

My goal is to keep you in flow. Oh and I'm powered by Tomo, an orchestration layer making any model personal. Tomo is short for Tomodatchi, the Japanese word for friends.

It's not just me, let's meet the squad.

- Flo`;

    const [logCount, setLogCount] = useState(0);
    const [uptime, setUptime] = useState('00:00:00');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom effect
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setLogCount(messages.length);
    }, [messages]);

    // Uptime simulation
    useEffect(() => {
        const start = Date.now();
        const interval = setInterval(() => {
            const diff = Date.now() - start;
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            setUptime(`${h}:${m}:${s}`);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Listen for Arm Events from 3D world
    useEffect(() => {
        const handleStateChange = (e: CustomEvent) => {
            setIsVisible(e.detail.isOpen);
        };

        const handleAnnouncement = (e: CustomEvent) => {
            const newMessage: AnnouncementMessage = {
                role: e.detail.role || 'system',
                content: e.detail.content,
                timestamp: new Date().toLocaleTimeString()
            };
            setMessages(prev => [...prev, newMessage]);
        };

        window.addEventListener('side-panel-state', handleStateChange as EventListener);
        window.addEventListener('system-announcement', handleAnnouncement as EventListener);

        const handleGreeting = () => {
            setMessages([{
                role: 'assistant',
                content: initialGreeting,
                timestamp: new Date().toLocaleTimeString()
            }]);
        };
        window.addEventListener('trigger-greeting', handleGreeting);

        return () => {
            window.removeEventListener('side-panel-state', handleStateChange as EventListener);
            window.removeEventListener('system-announcement', handleAnnouncement as EventListener);
            window.removeEventListener('trigger-greeting', handleGreeting);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className="absolute bottom-8 left-8 z-40 w-[500px] h-[600px] font-mono text-sm flex flex-col pointer-events-auto"
            style={{
                transform: 'perspective(1000px) rotateY(5deg)',
                transformOrigin: 'left bottom'
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
        >
            {/* Glass Panel Background */}
            <div className="absolute inset-0 bg-[#001122]/90 backdrop-blur-md border border-cyan-500/50 rounded-tr-3xl rounded-bl-xl shadow-[0_0_30px_rgba(0,255,255,0.2)]"></div>

            {/* Header */}
            <div className="relative z-10 px-6 py-4 border-b border-cyan-500/30 flex justify-between items-center bg-black/20 rounded-tr-3xl">
                <div className="text-cyan-400 font-mono tracking-wider text-sm drop-shadow-[0_0_5px_rgba(0,255,255,0.8)] uppercase">
                    ~/tomo/system/announcements/..
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
                        <div className="w-3 h-3 rounded-full bg-cyan-900 border border-cyan-500"></div>
                    </div>
                    {/* Close Button */}
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-cyan-500/50 hover:text-cyan-400 hover:scale-110 transition-all font-bold text-xl"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Announcements Area - SCROLLABLE & SELECTABLE! */}
            <div
                className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                onWheel={(e) => e.stopPropagation()}
            >
                {messages.length === 0 && (
                    <div className="text-cyan-500/50 text-center mt-20 italic">
                        Monitoring synaptic frequency... No active announcements.
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className="flex flex-col items-start animate-fade-in">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] text-cyan-600 font-bold uppercase tracking-tighter">[{msg.timestamp}]</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${msg.role === 'assistant' ? 'border-purple-500/50 text-purple-400' : 'border-cyan-500/50 text-cyan-400'
                                } font-bold uppercase`}>
                                {msg.role}
                            </span>
                        </div>
                        <div className={`
                            max-w-full px-4 py-3 rounded-lg border bg-black/40 border-cyan-500/20 text-cyan-300 rounded-bl-none shadow-[0_0_10px_rgba(0,255,255,0.1)]
                        `}>
                            <span className="select-text cursor-text selection:bg-cyan-500/40 whitespace-pre-wrap leading-relaxed block">
                                {msg.content}
                            </span>
                        </div>
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </div>

            {/* Metrics Footer */}
            <div className="relative z-10 px-6 py-3 border-t border-cyan-500/10 flex justify-between items-center bg-black/40 rounded-bl-xl">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-cyan-700 uppercase">Entries</span>
                        <span className="text-cyan-400 font-bold text-xs">{logCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-cyan-700 uppercase">Uptime</span>
                        <span className="text-cyan-400 font-bold text-xs">{uptime}</span>
                    </div>
                </div>
                <div className="text-[9px] text-cyan-900 tracking-widest uppercase font-bold">
                    System Monitor Active
                </div>
            </div>

            {/* Decals / Scanlines Overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-tr-3xl rounded-bl-xl overflow-hidden opacity-30">
                <div className="w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.05)_50%)] bg-[length:100%_4px]"></div>
            </div>
        </div>
    );
};
