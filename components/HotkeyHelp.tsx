import React, { useState, useEffect } from 'react';

const HOTKEYS = [
    { key: 'W A S D', desc: 'Movement' },
    { key: 'Click', desc: 'Interact / Walk' },
    { key: 'H', desc: 'Toggle HUD' },
    { key: 'M', desc: 'Mech Arm' },
    { key: 'L', desc: 'Low Power' },
    { key: '0 - 8', desc: 'Teleport' },
];

export const HotkeyHelp: React.FC = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [metrics, setMetrics] = useState({ cpu: 0, ram: 0, net: { down: 0, up: 0 } });

    useEffect(() => {
        const checkMobile = () => {
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsMobile(hasTouch);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        const interval = setInterval(() => {
            setMetrics({
                cpu: parseFloat((2 + Math.random() * 33).toFixed(1)),
                ram: parseFloat((3.5 + Math.random() * 0.4).toFixed(1)),
                net: {
                    down: parseFloat((Math.random() * 2.5).toFixed(1)),
                    up: parseFloat((Math.random() * 0.5).toFixed(1))
                }
            });
        }, 2000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    const Bar = ({ percent, color = 'bg-cyan-500' }: { percent: number, color?: string }) => (
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
            <div
                className={`h-full ${color} transition-all duration-1000`}
                style={{ width: `${Math.min(100, percent)}%` }}
            />
        </div>
    );

    return (
        <div className="absolute top-4 left-4 z-50 flex flex-col items-start pointer-events-auto font-mono text-xs">
            {/* Trigger Idea: A simple [?] ascii box */}
            <div
                className="group relative cursor-pointer"
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                <div className="text-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm border border-cyan-500/30 px-2 py-1 rounded">
                    [ ? ]
                </div>

                {/* Dropdown */}
                <div
                    className={`
                        absolute top-8 left-0 w-56
                        bg-black/90 backdrop-blur-xl border border-white/10 
                        shadow-[0_0_30px_rgba(0,0,0,0.5)]
                        rounded-lg
                        transition-all duration-300 ease-in-out
                        overflow-hidden
                        ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                    `}
                >
                    <div className="p-4 space-y-4">
                        {/* PERFORMANCE METRICS (NOW HIDDEN IN HERE) */}
                        <div className="space-y-2">
                            <div className="text-[10px] text-cyan-600 border-b border-cyan-900 pb-1 flex justify-between uppercase tracking-tighter">
                                <span>:: Diagnostics ::</span>
                                <span className="text-green-500/40 animate-pulse">online</span>
                            </div>
                            <div className="space-y-2 pt-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-500">CPU</span>
                                    <span className="text-white text-[10px]">{metrics.cpu}%</span>
                                </div>
                                <Bar percent={metrics.cpu * 2} />

                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-500">RAM</span>
                                    <span className="text-white text-[10px]">{metrics.ram}GB</span>
                                </div>
                                <Bar percent={(metrics.ram / 16) * 100} color="bg-purple-500" />

                                <div className="flex justify-between text-[10px] pt-1">
                                    <span className="text-gray-500">NET_DATA</span>
                                    <span className="text-blue-400">↓ {metrics.net.down}mbps</span>
                                </div>
                            </div>
                        </div>

                        {/* CONTROLS */}
                        <div>
                            <div className="text-[10px] text-cyan-600 mb-2 border-b border-cyan-900 pb-1 uppercase tracking-tighter">
                                :: {isMobile ? 'Touch Inputs' : 'Access Keys'} ::
                            </div>
                            <div className="flex flex-col gap-2">
                                {(isMobile ? [
                                    { key: 'Joy', desc: 'Movement' },
                                    { key: 'Tap', desc: 'Interact / Walk' },
                                    { key: 'A', desc: 'OK / Float' },
                                    { key: 'B', desc: 'Back / Exit' },
                                    { key: 'Swipe', desc: 'Rotate Flo Menu' },
                                    { key: 'Pinch', desc: 'Zoom / Breakthrough' },
                                ] : HOTKEYS).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-gray-300">
                                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[9px] text-yellow-500/90 font-bold border border-white/5">
                                            {item.key}
                                        </span>
                                        <span className="text-[10px] opacity-60">
                                            {item.desc}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
