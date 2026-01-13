import React, { useEffect, useState } from 'react';

interface NetworkMetrics {
    down: number;
    up: number;
}

export const MetricsHUD: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [fps, setFps] = useState(60);
    const [cpu, setCpu] = useState(0);
    const [ram, setRam] = useState(0);
    const [net, setNet] = useState<NetworkMetrics>({ down: 0, up: 0 });
    const [activeBrain, setActiveBrain] = useState<string>('Pi 5 (Smol)');

    // Listen for model changes
    useEffect(() => {
        const handleModelChange = (e: any) => setActiveBrain(e.detail.model);
        window.addEventListener('ai-model-active', handleModelChange);
        return () => window.removeEventListener('ai-model-active', handleModelChange);
    }, []);

    // Simulate metrics updates
    useEffect(() => {
        const interval = setInterval(() => {
            // FPS: 55-60
            setFps(Math.floor(55 + Math.random() * 5));
            // CPU: 2-35%
            setCpu(parseFloat((2 + Math.random() * 33).toFixed(1)));
            // RAM: 3.5GB base + variance
            setRam(parseFloat((3.5 + Math.random() * 0.4).toFixed(1)));

            // Network traffic simulation
            setNet({
                down: parseFloat((Math.random() * 2.5).toFixed(1)),
                up: parseFloat((Math.random() * 0.5).toFixed(1))
            });

        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    // Helper for bar visualization
    const Bar = ({ percent, color = 'bg-cyan-400' }: { percent: number, color?: string }) => (
        <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
            <div
                className={`h-full ${color} transition-all duration-500`}
                style={{ width: `${Math.min(100, percent)}%` }}
            />
        </div>
    );

    return (
        <div className="absolute top-4 right-4 z-50 font-mono text-xs pointer-events-auto opacity-80">
            <div className="flex flex-col gap-3">

                {/* System Stats Block */}
                <div
                    className="bg-black/40 backdrop-blur-sm p-3 rounded-lg border border-white/10 shadow-lg w-48 transition-all duration-300"
                >
                    <div
                        className="text-[10px] text-gray-400 border-b border-white/10 pb-1 flex justify-between cursor-pointer select-none group"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-2">
                            <span className="group-hover:text-cyan-400 transition-colors uppercase">SYS.MONITOR</span>
                            <span className={`text-[8px] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                        <span className="text-green-400 animate-pulse">●</span>
                    </div>

                    {isExpanded && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            {/* CPU */}
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-cyan-300">CPU</span>
                                <div className="text-right">
                                    <span className="text-white">{cpu}%</span>
                                    <Bar percent={cpu * 2} color="bg-cyan-500" />
                                </div>
                            </div>

                            {/* RAM */}
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-purple-300">RAM</span>
                                <div className="text-right">
                                    <span className="text-white">{ram}GB</span>
                                    <Bar percent={(ram / 16) * 100} color="bg-purple-500" />
                                </div>
                            </div>

                            {/* Network */}
                            <div className="flex justify-between items-center mt-2 pb-2 border-b border-white/10">
                                <span className="text-blue-300">NET</span>
                                <div className="text-[10px] text-gray-300 text-right">
                                    <div>↓ {net.down} MB/s</div>
                                    <div>↑ {net.up} MB/s</div>
                                </div>
                            </div>

                            {/* AI Brain Status */}
                            <div className="mt-2 pt-1">
                                <div className="text-[9px] text-neutral-500 mb-1">AI CORE ACTIVE</div>
                                <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${activeBrain.includes('14b') ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse shadow-[0_0_5px_rgba(0,255,255,0.5)]`}></span>
                                    <span className="text-white font-bold text-[10px] truncate">
                                        {activeBrain.includes('14b') ? 'RTX 5070' : (activeBrain.includes('flash') ? 'GEMINI FLASH' : 'PI 5 NATIVE')}
                                    </span>
                                </div>
                                <div className="text-[8px] text-neutral-400 mt-0.5 opacity-60">MODEL: {activeBrain}</div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
};
