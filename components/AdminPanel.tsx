import React, { useEffect, useState } from 'react';
import { AiService } from '../game/AiService';

export const AdminPanel: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'prompt' | 'ram' | 'vector'>('prompt');
    const [status, setStatus] = useState<string>('');

    // Prompt State
    const [promptText, setPromptText] = useState('');

    // RAM Memories State
    const [memories, setMemories] = useState<any[]>([]);
    const [newMemory, setNewMemory] = useState('');

    // Dashboard State
    const [llmMetrics, setLlmMetrics] = useState<any>({});
    const [vectorMetrics, setVectorMetrics] = useState<any>({});
    const [aiMode, setAiMode] = useState<'local' | 'cloud'>(AiService.getInstance().getMode());

    // Vector DB State
    const [vectorQuery, setVectorQuery] = useState('');
    const [vectorResults, setVectorResults] = useState<any[]>([]);
    const [vectorIngestText, setVectorIngestText] = useState('');

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-admin-panel', handleOpen);
        return () => window.removeEventListener('open-admin-panel', handleOpen);
    }, []);

    useEffect(() => {
        let interval: any;
        if (isOpen) {
            setAiMode(AiService.getInstance().getMode());
            refreshData();
            // Poll for metrics significantly faster if dashboard is active
            interval = setInterval(refreshData, 2000);
        }
        return () => clearInterval(interval);
    }, [isOpen]);

    const toggleMode = () => {
        const newMode = aiMode === 'local' ? 'cloud' : 'local';
        AiService.getInstance().setMode(newMode);
        setAiMode(newMode);
        refreshData();
    };

    const refreshData = async () => {
        try {
            // Parallel fetch to speed up
            // Note: If in Cloud mode, some of these local endpoints might fail or return mock data.
            // That's acceptable for now as we transition.
            const [p, m, llmM, vecM] = await Promise.all([
                AiService.getInstance().getSystemPrompt().catch(() => ''),
                AiService.getInstance().getMemories().catch(() => []),
                // Metrics might only be available locally for now
                AiService.getInstance().getLlmMetrics(),
                AiService.getInstance().getVectorMetrics()
            ]);

            setPromptText(p);
            setMemories(m);
            setLlmMetrics(llmM);
            setVectorMetrics(vecM);
        } catch (e) {
            console.error(e);
            setStatus('Error fetching data');
        }
    };

    const handleSavePrompt = async () => {
        await AiService.getInstance().updateSystemPrompt(promptText);
        setStatus('System Prompt Saved');
        setTimeout(() => setStatus(''), 2000);
    };

    const handleAddMemory = async () => {
        if (!newMemory.trim()) return;
        await AiService.getInstance().addMemory(newMemory);
        setNewMemory('');
        refreshData();
    };

    const handleDeleteMemory = async (id: number) => {
        await AiService.getInstance().deleteMemory(id);
        refreshData();
    };

    const handleVectorQuery = async () => {
        if (!vectorQuery.trim()) return;
        setStatus('Querying Vector DB...');
        try {
            const results = await AiService.getInstance().queryVector(vectorQuery);
            setVectorResults(results);
            setStatus(`Found ${results.length} results`);
        } catch (e) {
            setStatus('Vector Query Failed');
        }
    };

    const handleVectorIngest = async () => {
        if (!vectorIngestText.trim()) return;
        setStatus('Ingesting...');
        try {
            await AiService.getInstance().ingestVector(vectorIngestText);
            setVectorIngestText('');
            setStatus('Ingest Complete');
        } catch (e) {
            setStatus('Ingest Failed');
        }
    };

    const formatUptime = (ms: number) => {
        if (!ms) return '0s';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
            <div className="w-full max-w-4xl h-[80vh] bg-neutral-900 border border-neutral-700/50 rounded-lg shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-800 bg-neutral-950">
                    <div className="flex items-center gap-6">
                        <span className="text-xl font-bold text-white">⚙️ ADMIN CONTROL PANEL</span>

                        {/* Mode Switcher */}
                        <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-full border border-neutral-700">
                            <button
                                onClick={() => aiMode !== 'local' && toggleMode()}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${aiMode === 'local' ? 'bg-cyan-900 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'text-neutral-500 hover:text-neutral-300'
                                    }`}
                            >
                                LOCAL
                            </button>
                            <button
                                onClick={() => aiMode !== 'cloud' && toggleMode()}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${aiMode === 'cloud' ? 'bg-purple-900 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'text-neutral-500 hover:text-neutral-300'
                                    }`}
                            >
                                CLOUD
                            </button>
                        </div>

                        <div className="flex gap-4 text-neutral-500 text-[10px] uppercase tracking-wider border-l border-neutral-800 pl-4">
                            <span className={llmMetrics.uptime_ms ? "text-green-500" : "text-red-500"}>● Node: 3001</span>
                            <span className={vectorMetrics.total_vectors ? "text-green-500" : "text-red-500"}>● Vector: 5001</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-neutral-500 hover:text-white transition-colors"
                    >
                        CLOSE [ESC]
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-neutral-800 bg-neutral-900">
                    {['dashboard', 'prompt', 'ram', 'vector'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-3 text-center uppercase tracking-widest hover:bg-neutral-800 transition-colors ${activeTab === tab ? 'bg-neutral-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-neutral-500'
                                }`}
                        >
                            {tab === 'dashboard' ? 'Metrics' : tab === 'prompt' ? 'System Prompt' : tab === 'ram' ? 'In-Memory (RAM)' : 'Vector DB (Disk)'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-neutral-900/50">

                    {/* Status Bar */}
                    {status && (
                        <div className="mb-4 p-2 bg-blue-900/20 border border-blue-500/30 text-blue-300 rounded text-center animate-pulse">
                            {status}
                        </div>
                    )}

                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-2 gap-6">
                            {/* LLM Tile */}
                            <div className="p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg space-y-4">
                                <h3 className="text-cyan-400 font-bold border-b border-neutral-700 pb-2 flex justify-between">
                                    <span>LLM MIDDLEWARE</span>
                                    <span className="text-neutral-500">Port: 3001</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-neutral-500">Total Requests</div>
                                        <div className="text-2xl text-white">{llmMetrics.total_requests || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-neutral-500">Avg Latency</div>
                                        <div className="text-2xl text-white">{Math.round(llmMetrics.avg_response_time_ms || 0)} <span className="text-sm text-neutral-500">ms</span></div>
                                    </div>
                                    <div>
                                        <div className="text-neutral-500">Active Memories</div>
                                        <div className="text-2xl text-white">{llmMetrics.total_memories || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-neutral-500">Uptime</div>
                                        <div className="text-2xl text-white">{formatUptime(llmMetrics.uptime_ms || 0)}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-neutral-600 font-mono mt-2">
                                    Last Req: {llmMetrics.last_request_at ? new Date(llmMetrics.last_request_at).toLocaleTimeString() : 'Never'}
                                </div>
                            </div>

                            {/* Vector DB Tile */}
                            <div className="p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg space-y-4">
                                <h3 className="text-purple-400 font-bold border-b border-neutral-700 pb-2 flex justify-between">
                                    <span>VECTOR DATABASE</span>
                                    <span className="text-neutral-500">Port: 5001</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-neutral-500">Total Documents</div>
                                        <div className="text-2xl text-white">{vectorMetrics.total_documents || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-neutral-500">Indexed Vectors</div>
                                        <div className="text-2xl text-white">{vectorMetrics.total_vectors || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-neutral-500">DB Size</div>
                                        <div className="text-2xl text-white">{vectorMetrics.total_size_mb ? vectorMetrics.total_size_mb.toFixed(2) : 0} <span className="text-sm text-neutral-500">MB</span></div>
                                    </div>
                                    <div>
                                        <div className="text-neutral-500">Threads</div>
                                        <div className="text-2xl text-white">{Object.keys(vectorMetrics.documents_by_thread || {}).length}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-neutral-600 font-mono mt-2 truncate">
                                    Latest: {vectorMetrics.newest_document || 'None'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PROMPT TAB */}
                    {activeTab === 'prompt' && (
                        <div className="h-full flex flex-col gap-4">
                            <p className="text-neutral-400">
                                This prompt defines the persona of the AI. It is stored in the Node server's memory.
                            </p>
                            <textarea
                                value={promptText}
                                onChange={e => setPromptText(e.target.value)}
                                className="flex-1 w-full bg-black/50 border border-neutral-700 p-4 text-cyan-100 focus:border-cyan-500 outline-none rounded font-mono leading-relaxed resize-none"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSavePrompt}
                                    className="px-6 py-3 bg-cyan-900/50 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-400 rounded transition-all font-bold"
                                >
                                    SAVE SYSTEM PROMPT
                                </button>
                            </div>
                        </div>
                    )}

                    {/* RAM TAB */}
                    {activeTab === 'ram' && (
                        <div className="flex flex-col gap-6">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMemory}
                                    onChange={e => setNewMemory(e.target.value)}
                                    placeholder="Add temporary context..."
                                    className="flex-1 bg-black/30 border border-neutral-700 px-4 py-2 rounded focus:border-cyan-500 outline-none text-white"
                                    onKeyDown={e => e.key === 'Enter' && handleAddMemory()}
                                />
                                <button
                                    onClick={handleAddMemory}
                                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white rounded"
                                >
                                    ADD
                                </button>
                            </div>

                            <div className="space-y-2">
                                {memories.length === 0 && <div className="text-neutral-600 italic text-center">No memories in RAM.</div>}
                                {memories.map((mem) => (
                                    <div key={mem.id} className="flex justify-between items-start p-3 bg-neutral-800/50 border border-neutral-800 rounded group">
                                        <div>
                                            <div className="text-white">{mem.text}</div>
                                            <div className="text-xs text-neutral-500 mt-1">ID: {mem.id} | {new Date(mem.created_at).toLocaleTimeString()}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMemory(mem.id)}
                                            className="text-red-500/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all font-bold px-2"
                                        >
                                            DEL
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VECTOR TAB */}
                    {activeTab === 'vector' && (
                        <div className="flex flex-col gap-8">
                            {/* Query Section */}
                            <div className="flex flex-col gap-2">
                                <h3 className="text-white font-bold border-b border-neutral-800 pb-2">SEMANTIC SEARCH</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={vectorQuery}
                                        onChange={e => setVectorQuery(e.target.value)}
                                        placeholder="Search persistent memories..."
                                        className="flex-1 bg-black/30 border border-neutral-700 px-4 py-2 rounded focus:border-purple-500 outline-none text-white"
                                        onKeyDown={e => e.key === 'Enter' && handleVectorQuery()}
                                    />
                                    <button
                                        onClick={handleVectorQuery}
                                        className="px-4 py-2 bg-purple-900/30 hover:bg-purple-800/50 border border-purple-500/50 text-purple-300 rounded"
                                    >
                                        SEARCH
                                    </button>
                                </div>
                                <div className="space-y-2 mt-2">
                                    {vectorResults.map((res, i) => (
                                        <div key={i} className="p-3 bg-black/20 border border-purple-500/20 rounded">
                                            <p className="text-purple-100">{res.text || JSON.stringify(res)}</p>
                                            <p className="text-xs text-neutral-500 mt-1">Score: {res.score?.toFixed(4)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ingest Section */}
                            <div className="flex flex-col gap-2">
                                <h3 className="text-white font-bold border-b border-neutral-800 pb-2">MANUAL INGEST</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={vectorIngestText}
                                        onChange={e => setVectorIngestText(e.target.value)}
                                        placeholder="Store new permanent memory..."
                                        className="flex-1 bg-black/30 border border-neutral-700 px-4 py-2 rounded focus:border-green-500 outline-none text-white"
                                        onKeyDown={e => e.key === 'Enter' && handleVectorIngest()}
                                    />
                                    <button
                                        onClick={handleVectorIngest}
                                        className="px-4 py-2 bg-green-900/30 hover:bg-green-800/50 border border-green-500/50 text-green-300 rounded"
                                    >
                                        INGEST
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
