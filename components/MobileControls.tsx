import React, { useState, useEffect, useRef } from 'react';
import { keys } from '../game/Player';

export const MobileControls: React.FC = () => {
    const [isMobile, setIsMobile] = useState(false);
    const joystickRef = useRef<HTMLDivElement>(null);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const lastPinchDist = useRef<number | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsMobile(hasTouch);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Pinch to Zoom Logic
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && lastPinchDist.current !== null) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const delta = dist - lastPinchDist.current;
                const sensitivity = 0.01;
                let p = (window as any).targetZoomProgress || 0.0;

                // Inverse relationship: pinch in (towards center) = zoom out. 
                // In our engine, higher value = zoom out.
                p -= delta * sensitivity;

                // Clamp
                p = Math.max(-3.0, Math.min(p, 7.0));

                if ((window as any).setZoomProgress) {
                    (window as any).setZoomProgress(p);
                }
                lastPinchDist.current = dist;
            }
        };

        const handleTouchEnd = () => {
            lastPinchDist.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    if (!isMobile) return null;

    const handleJoystickStart = (e: React.TouchEvent) => {
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

        const threshold = maxDist * 0.2;
        keys.w = dy < -threshold;
        keys.s = dy > threshold;
        keys.a = dx < -threshold;
        keys.d = dx > threshold;
    };

    const handleJoystickEnd = () => {
        setJoystickPos({ x: 0, y: 0 });
        keys.w = false;
        keys.s = false;
        keys.a = false;
        keys.d = false;
    };

    return (
        <div className="fixed inset-0 pointer-events-none z-[200] flex flex-col justify-end p-12">

            <div className="flex justify-between items-end w-full">
                {/* Minimal Joystick */}
                <div
                    ref={joystickRef}
                    className="w-32 h-32 flex items-center justify-center relative touch-none pointer-events-auto"
                    onTouchStart={handleJoystickStart}
                    onTouchMove={handleJoystickMove}
                    onTouchEnd={handleJoystickEnd}
                >
                    {/* Subtler Guideline */}
                    <div className="w-24 h-24 rounded-full border border-white/5 opacity-20" />

                    {/* The Knob */}
                    <div
                        className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform duration-75 flex items-center justify-center absolute"
                        style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
                    >
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10" />
                    </div>
                </div>

                {/* N64 Style Action Buttons */}
                <div className="flex flex-col items-center gap-4 pointer-events-auto pr-4">
                    <div className="relative w-32 h-32">
                        {/* Button B (Top Left-ish) - Back / Exit / No */}
                        <div
                            className="absolute top-2 left-2 w-14 h-14 rounded-full bg-[#1db954] border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90 opacity-80"
                            onTouchStart={() => {
                                // 1. Close Flo Radial Menu
                                if ((window as any).radialMenu) {
                                    (window as any).radialMenu.collapse();
                                }
                                // 2. Close Side Panel (Chat etc)
                                window.dispatchEvent(new CustomEvent('close-side-panel'));
                                // 3. Close Admin Panel
                                window.dispatchEvent(new CustomEvent('close-admin-panel-mobile')); // We'll add a listener for this
                            }}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)' }}
                        >
                            <span className="text-white font-black italic text-xl drop-shadow-md">B</span>
                        </div>

                        {/* Button A (Bottom Right-ish) - OK / Forward / Jump */}
                        <div
                            className="absolute bottom-2 right-2 w-14 h-14 rounded-full bg-[#3b82f6] border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90"
                            onTouchStart={() => {
                                keys.space = true;
                                // Can also be used to confirm dialogues or move forward in tutorials
                                window.dispatchEvent(new CustomEvent('confirm-action'));
                            }}
                            onTouchEnd={() => { keys.space = false; }}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)' }}
                        >
                            <span className="text-white font-black italic text-xl drop-shadow-md">A</span>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@1,900&display=swap');
                .drop-shadow-md {
                    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));
                }
            `}} />
        </div>
    );
};
