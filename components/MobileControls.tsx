import React, { useState, useEffect, useRef } from 'react';
import { keys } from '../game/Player';

export const MobileControls: React.FC = () => {
    const [isMobile, setIsMobile] = useState(false);
    const joystickRef = useRef<HTMLDivElement>(null);
    const [joystickActive, setJoystickActive] = useState(false);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const [zoomValue, setZoomValue] = useState(1.0);

    useEffect(() => {
        const checkMobile = () => {
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsMobile(hasTouch);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Sync local zoom value with global state if it changes externally
        const syncInterval = setInterval(() => {
            if ((window as any).targetZoomProgress !== undefined) {
                setZoomValue((window as any).targetZoomProgress);
            }
        }, 500);

        return () => {
            window.removeEventListener('resize', checkMobile);
            clearInterval(syncInterval);
        };
    }, []);

    if (!isMobile) return null;

    const handleJoystickStart = (e: React.TouchEvent) => {
        setJoystickActive(true);
        handleJoystickMove(e);
    };

    const handleJoystickMove = (e: React.TouchEvent) => {
        if (!joystickRef.current) return;
        const touch = e.touches[0];
        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;

        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = rect.width / 2;

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        setJoystickPos({ x: dx, y: dy });

        // Update player keys
        const threshold = maxDist * 0.3;
        keys.w = dy < -threshold;
        keys.s = dy > threshold;
        keys.a = dx < -threshold;
        keys.d = dx > threshold;
    };

    const handleJoystickEnd = () => {
        setJoystickActive(false);
        setJoystickPos({ x: 0, y: 0 });
        keys.w = false;
        keys.s = false;
        keys.a = false;
        keys.d = false;
    };

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setZoomValue(val);
        if ((window as any).setZoomProgress) {
            (window as any).setZoomProgress(val);
        }
    };

    const handleFloatStart = () => { keys.space = true; };
    const handleFloatEnd = () => { keys.space = false; };

    return (
        <div className="fixed inset-0 pointer-events-none z-[200] flex flex-col justify-end p-8">

            {/* Top Right: Zoom Slider */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col items-center gap-4 pointer-events-auto">
                <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold opacity-60 [writing-mode:vertical-lr]">Zoom Axis</div>
                <div className="h-48 w-8 relative flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.1)]">
                    <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.01"
                        value={zoomValue}
                        onChange={handleZoomChange}
                        className="absolute h-40 w-2 cursor-pointer accent-cyan-400 appearance-none bg-white/5 rounded-full"
                        style={{ transform: 'rotate(-90deg)', width: '160px' }}
                    />
                </div>
            </div>

            <div className="flex justify-between items-end w-full">
                {/* Left: Joystick */}
                <div
                    ref={joystickRef}
                    className="w-32 h-32 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center relative touch-none pointer-events-auto"
                    onTouchStart={handleJoystickStart}
                    onTouchMove={handleJoystickMove}
                    onTouchEnd={handleJoystickEnd}
                >
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-white/20 absolute" />
                    <div
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.5)] border border-white/30 transition-transform duration-75 flex items-center justify-center"
                        style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
                    >
                        <div className="w-1 h-1 rounded-full bg-white/50" />
                    </div>
                </div>

                {/* Right: Float Button */}
                <div
                    className="w-20 h-20 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center pointer-events-auto active:scale-95 transition-transform"
                    onTouchStart={handleFloatStart}
                    onTouchEnd={handleFloatEnd}
                >
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 flex items-center justify-center relative animate-pulse">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                        </div>
                        <span className="text-[10px] font-bold tracking-tighter text-cyan-400">FLOAT</span>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                input[type=range]::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #22d3ee;
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(34,211,238,0.8);
                    border: 2px solid white;
                }
            `}} />
        </div>
    );
};
