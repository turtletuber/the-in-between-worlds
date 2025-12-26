import React, { useEffect, useState } from 'react';

interface NetworkMetrics {
    down: number;
    up: number;
}

export const MetricsHUD: React.FC = () => {
    const [fps, setFps] = useState(60);
    const [cpu, setCpu] = useState(0);
    const [ram, setRam] = useState(0);
    const [net, setNet] = useState<NetworkMetrics>({ down: 0, up: 0 });

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
        <div className="absolute top-4 right-4 z-50 font-mono text-xs pointer-events-none opacity-80">
            <div className="flex flex-col gap-3">

                {/* System Stats Block */}
                <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg border border-white/10 shadow-lg w-48">
                    <div className="text-[10px] text-gray-400 mb-2 border-b border-white/10 pb-1 flex justify-between">
                        <span>SYS.MONITOR</span>
                        <span className="text-green-400 animate-pulse">●</span>
                    </div>

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
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-blue-300">NET</span>
                        <div className="text-[10px] text-gray-300 text-right">
                            <div>↓ {net.down} MB/s</div>
                            <div>↑ {net.up} MB/s</div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

