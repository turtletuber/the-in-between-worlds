import React, { useState, useEffect, useRef } from 'react';
import { keys } from '../game/Player';
import { ChatPrompt } from './ChatPrompt';

export const MobileControls: React.FC = () => {
    const [isMobile, setIsMobile] = useState(false);
    const joystickRef = useRef<HTMLDivElement>(null);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const lastPinchDist = useRef<number | null>(null);
    const [chatVisible, setChatVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsMobile(hasTouch);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Keyboard listeners for desktop
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'i':
                    e.preventDefault();
                    setChatVisible(prev => !prev);
                    break;
                case 'j':
                    e.preventDefault();
                    setShowSettings(prev => !prev);
                    break;
                case 'k':
                    e.preventDefault();
                    keys.space = true;
                    window.dispatchEvent(new CustomEvent('confirm-action'));
                    break;
                case 'l':
                    e.preventDefault();
                    if ((window as any).radialMenu) {
                        (window as any).radialMenu.collapse();
                    }
                    window.dispatchEvent(new CustomEvent('close-side-panel'));
                    window.dispatchEvent(new CustomEvent('close-admin-panel-mobile'));
                    setChatVisible(false);
                    setShowSettings(false);
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'k') {
                keys.space = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Pinch to Zoom Logic
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                // If any finger is on a UI element (joystick/buttons), ignore pinch
                for (let i = 0; i < e.touches.length; i++) {
                    const target = e.touches[i].target as HTMLElement;
                    if (target && target.closest('.pointer-events-auto')) {
                        lastPinchDist.current = null;
                        return;
                    }
                }

                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && lastPinchDist.current !== null) {
                // Also double check move targets just in case
                for (let i = 0; i < e.touches.length; i++) {
                    const target = e.touches[i].target as HTMLElement;
                    if (target && target.closest('.pointer-events-auto')) {
                        return;
                    }
                }

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
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

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
                {/* Minimal Joystick with WASD indicators */}
                <div className="relative">
                    {isMobile && (
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
                    )}

                    {/* WASD Indicators */}
                    <div className={`flex justify-center gap-2 text-sm text-white/30 font-mono pointer-events-none ${isMobile ? 'absolute -bottom-6 left-0 right-0' : 'mb-4'}`}>
                        <span className={`transition-colors ${keys.w ? 'text-white font-bold' : ''}`}>W</span>
                        <span className={`transition-colors ${keys.a ? 'text-white font-bold' : ''}`}>A</span>
                        <span className={`transition-colors ${keys.s ? 'text-white font-bold' : ''}`}>S</span>
                        <span className={`transition-colors ${keys.d ? 'text-white font-bold' : ''}`}>D</span>
                    </div>
                </div>

                {/* Action Buttons - Cross Layout */}
                <div className="flex flex-col items-center gap-4 pointer-events-auto pr-4">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        {/* Button I (Y) - North - Chat / Tomo */}
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-[#fbbf24] border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90"
                            onTouchStart={() => {
                                setChatVisible(!chatVisible);
                            }}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)' }}
                        >
                            <span className="text-white font-black italic text-xl drop-shadow-md">Y</span>
                        </div>
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-mono">I</div>

                        {/* Button L (B) - East - Back / Exit / No */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 right-0 w-14 h-14 rounded-full bg-[#1db954] border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90 opacity-80"
                            onTouchStart={() => {
                                // 1. Close Flo Radial Menu
                                if ((window as any).radialMenu) {
                                    (window as any).radialMenu.collapse();
                                }
                                // 2. Close Side Panel (Chat etc)
                                window.dispatchEvent(new CustomEvent('close-side-panel'));
                                // 3. Close Admin Panel
                                window.dispatchEvent(new CustomEvent('close-admin-panel-mobile'));
                                // 4. Close Chat
                                setChatVisible(false);
                                setShowSettings(false);
                            }}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)' }}
                        >
                            <span className="text-white font-black italic text-xl drop-shadow-md">B</span>
                        </div>
                        <div className="absolute top-1/2 -translate-y-1/2 -right-5 text-[10px] text-white/40 font-mono">L</div>

                        {/* Button K (A) - South - OK / Forward / Jump */}
                        <div
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-[#3b82f6] border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90"
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
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-mono">K</div>

                        {/* Button J - West - Settings / Menu - Circle with Square Icon */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 left-0 w-14 h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90"
                            onTouchStart={() => {
                                setShowSettings(!showSettings);
                            }}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)' }}
                        >
                            <div className="w-6 h-6 border-2 border-purple-400" style={{ borderRadius: 0 }} />
                        </div>
                        <div className="absolute top-1/2 -translate-y-1/2 -left-5 text-[10px] text-white/40 font-mono">J</div>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
                    <div className="w-full max-w-md px-4 pointer-events-auto">
                        <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/30 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-lg">Settings</h3>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                                >
                                    <span className="text-white text-lg">×</span>
                                </button>
                            </div>
                            <div className="text-white/60 text-sm">
                                <p className="mb-2">Controls:</p>
                                <ul className="text-xs space-y-1 font-mono">
                                    <li>WASD - Move</li>
                                    <li>I - Open Chat (Y button)</li>
                                    <li>J - Settings (Purple square)</li>
                                    <li>K - Confirm/Jump (A button)</li>
                                    <li>L - Back/Exit (B button)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Prompt */}
            <ChatPrompt visible={chatVisible} onClose={() => setChatVisible(false)} />

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
