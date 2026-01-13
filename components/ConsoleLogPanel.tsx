import React, { useEffect, useState, useRef } from 'react';

interface LogEntry {
    time: string;
    type: 'log' | 'error' | 'warn' | 'info';
    content: string;
}

interface ConsoleLogPanelProps {
    isVisible: boolean;
    onClose: () => void;
}

export const ConsoleLogPanel: React.FC<ConsoleLogPanelProps> = ({ isVisible, onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;

        const addLog = (type: LogEntry['type'], args: any[]) => {
            const content = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');

            const newEntry: LogEntry = {
                time: new Date().toLocaleTimeString(),
                type,
                content
            };

            setLogs(prev => [...prev.slice(-100), newEntry]); // Keep last 100 logs
        };

        console.log = (...args) => {
            originalLog(...args);
            addLog('log', args);
        };
        console.error = (...args) => {
            originalError(...args);
            addLog('error', args);
        };
        console.warn = (...args) => {
            originalWarn(...args);
            addLog('warn', args);
        };
        console.info = (...args) => {
            originalInfo(...args);
            addLog('info', args);
        };

        return () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
            console.info = originalInfo;
        };
    }, []);

    useEffect(() => {
        if (isVisible) {
            scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, [isVisible, logs]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isVisible) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, onClose]);

    const copyAll = () => {
        const text = logs.map(l => `[${l.time}] ${l.type.toUpperCase()}: ${l.content}`).join('\n');
        navigator.clipboard.writeText(text);
    };

    const clearLogs = () => setLogs([]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-end justify-center pointer-events-none p-8 font-mono">
            <div className="w-full max-w-5xl h-[300px] bg-black/90 border border-neutral-700 rounded-lg shadow-2xl flex flex-col pointer-events-auto backdrop-blur-md overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-2 bg-neutral-900 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold text-[10px]">CONSOLE_TERMINAL</span>
                        <span className="text-[10px] text-neutral-500">v1.0.4-LORE</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={copyAll} className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-[9px] text-neutral-300 rounded transition-all">COPY ALL</button>
                        <button onClick={clearLogs} className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-[9px] text-neutral-300 rounded transition-all">CLEAR</button>
                        <button onClick={onClose} className="px-2 py-1 bg-red-900/50 hover:bg-red-900 text-[9px] text-white rounded transition-all">CLOSE (ESC)</button>
                    </div>
                </div>

                {/* Log List */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 text-[10px]">
                    {logs.length === 0 && <div className="text-neutral-600 italic">No synaptic logs detected yet...</div>}
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-4 border-b border-neutral-800/10 pb-1">
                            <span className="text-neutral-600 shrink-0">[{log.time}]</span>
                            <span className={`shrink-0 w-12 font-bold ${log.type === 'error' ? 'text-red-500' :
                                    log.type === 'warn' ? 'text-yellow-500' :
                                        log.type === 'info' ? 'text-blue-500' : 'text-cyan-500'
                                }`}>{log.type.toUpperCase()}</span>
                            <span className="text-neutral-300 whitespace-pre-wrap break-all">{log.content}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
