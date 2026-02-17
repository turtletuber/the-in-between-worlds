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

    // Button Theme State: 'n64' | 'playstation' | 'xbox' | 'pc'
    const [buttonTheme, setButtonTheme] = useState<'n64' | 'playstation' | 'xbox' | 'pc'>('n64');

    useEffect(() => {
        const checkMobile = () => {
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsMobile(hasTouch);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Listen for internal theme cycles
        const handleThemeCycle = () => {
            setButtonTheme(prev => {
                if (prev === 'n64') return 'playstation';
                if (prev === 'playstation') return 'xbox';
                if (prev === 'xbox') return 'pc';
                return 'n64';
            });
        };
        window.addEventListener('cycle-button-theme', handleThemeCycle);

        // Keyboard listeners for desktop
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

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
                    if ((window as any).currentWorld === 'CosmicHub') {
                        keys.down = true;
                    } else {
                        if ((window as any).radialMenu) (window as any).radialMenu.collapse();
                        window.dispatchEvent(new CustomEvent('close-side-panel'));
                        window.dispatchEvent(new CustomEvent('close-admin-panel-mobile'));
                        setChatVisible(false);
                        setShowSettings(false);
                    }
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === 'k') keys.space = false;
            if (key === 'l') keys.down = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Pinch to Zoom
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
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
                for (let i = 0; i < e.touches.length; i++) {
                    const target = e.touches[i].target as HTMLElement;
                    if (target && target.closest('.pointer-events-auto')) return;
                }
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const delta = dist - lastPinchDist.current;
                const sensitivity = 0.01;
                let p = (window as any).targetZoomProgress || 0.0;
                p -= delta * sensitivity;
                p = Math.max(-3.0, Math.min(p, 7.0));
                if ((window as any).setZoomProgress) (window as any).setZoomProgress(p);
                lastPinchDist.current = dist;
            }
        };

        const handleTouchEnd = () => { lastPinchDist.current = null; };

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
            window.removeEventListener('cycle-button-theme', handleThemeCycle);
        };
    }, []);

    const handleJoystickStart = (e: React.TouchEvent) => handleJoystickMove(e);

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

    // --- Dynamic Styles based on Theme ---
    const getButtonStyles = () => {
        switch (buttonTheme) {
            case 'playstation':
                return {
                    north: { bg: 'bg-[#2a2a2e]', label: '△', color: 'text-[#2EAB7C]' }, // Green Triangle
                    east: { bg: 'bg-[#2a2a2e]', label: '○', color: 'text-[#E0202F]' }, // Red Circle
                    south: { bg: 'bg-[#2a2a2e]', label: '✕', color: 'text-[#4E5BB1]' }, // Blue Cross (Thin geometric ✕)
                    west: { bg: 'bg-[#2a2a2e]', label: '□', color: 'text-[#B972A9]' }, // Pink Square
                };
            case 'xbox':
                return {
                    north: { bg: 'bg-[#fbbd08]', label: 'Y', color: 'text-[#fbbd08]' }, // Y (Yellow)
                    east: { bg: 'bg-[#db2828]', label: 'B', color: 'text-[#db2828]' }, // B (Red)
                    south: { bg: 'bg-[#21ba45]', label: 'A', color: 'text-[#21ba45]' }, // A (Green)
                    west: { bg: 'bg-[#2185d0]', label: 'X', color: 'text-[#2185d0]' }, // X (Blue)
                };
            case 'pc':
                return {
                    north: { bg: 'bg-[#e5e1d8] border-[#c0bab0]', label: 'I', color: 'text-gray-800' }, // Manila I
                    east: { bg: 'bg-[#e5e1d8] border-[#c0bab0]', label: 'L', color: 'text-gray-800' }, // Manila L
                    south: { bg: 'bg-[#e5e1d8] border-[#c0bab0]', label: 'K', color: 'text-gray-800' }, // Manila K
                    west: { bg: 'bg-[#e5e1d8] border-[#c0bab0]', label: 'J', color: 'text-gray-800' }, // Manila J
                };
            case 'n64':
            default:
                return {
                    north: { bg: 'bg-[#fbbf24]', label: '▲', color: 'text-[#fbbf24]' }, // Triangle icon
                    east: { bg: 'bg-[#1db954]', label: 'B', color: 'text-[#1db954]' }, // B (Green)
                    south: { bg: 'bg-[#3b82f6]', label: 'A', color: 'text-[#3b82f6]' }, // A (Blue)
                    west: { bg: 'bg-[#e11d48]', label: 'START', color: 'text-[#e11d48]' }, // START (Red)
                };
        }
    };

    const styles = getButtonStyles();

    return (
        <div className="fixed inset-0 pointer-events-none z-[200] flex flex-col justify-end p-12">
            <div className="flex justify-between items-end w-full">
                {/* Joystick / WASD Area */}
                <div className="relative">
                    {isMobile && buttonTheme !== 'pc' && (
                        <div
                            ref={joystickRef}
                            className="w-32 h-32 flex items-center justify-center relative touch-none pointer-events-auto"
                            onTouchStart={handleJoystickStart}
                            onTouchMove={handleJoystickMove}
                            onTouchEnd={handleJoystickEnd}
                        >
                            <div className="w-24 h-24 rounded-full border border-white/5 opacity-20" />
                            <div
                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform duration-75 flex items-center justify-center absolute"
                                style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
                            >
                                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10" />
                            </div>
                        </div>
                    )}

                    {isMobile && buttonTheme === 'pc' && (
                        <div className="w-32 h-32 flex flex-col items-center justify-center gap-1 pointer-events-auto">
                            {/* W */}
                            <div
                                className={`w-10 h-10 rounded border-b-4 bg-[#e5e1d8] border-[#c0bab0] flex items-center justify-center font-bold text-gray-800 transition-all active:translate-y-0.5 active:border-b-0 ${keys.w ? 'translate-y-0.5 border-b-0 brightness-90' : ''}`}
                                onTouchStart={() => { keys.w = true; }}
                                onTouchEnd={() => { keys.w = false; }}
                            >W</div>
                            <div className="flex gap-1">
                                {/* A */}
                                <div
                                    className={`w-10 h-10 rounded border-b-4 bg-[#e5e1d8] border-[#c0bab0] flex items-center justify-center font-bold text-gray-800 transition-all active:translate-y-0.5 active:border-b-0 ${keys.a ? 'translate-y-0.5 border-b-0 brightness-90' : ''}`}
                                    onTouchStart={() => { keys.a = true; }}
                                    onTouchEnd={() => { keys.a = false; }}
                                >A</div>
                                {/* S */}
                                <div
                                    className={`w-10 h-10 rounded border-b-4 bg-[#e5e1d8] border-[#c0bab0] flex items-center justify-center font-bold text-gray-800 transition-all active:translate-y-0.5 active:border-b-0 ${keys.s ? 'translate-y-0.5 border-b-0 brightness-90' : ''}`}
                                    onTouchStart={() => { keys.s = true; }}
                                    onTouchEnd={() => { keys.s = false; }}
                                >S</div>
                                {/* D */}
                                <div
                                    className={`w-10 h-10 rounded border-b-4 bg-[#e5e1d8] border-[#c0bab0] flex items-center justify-center font-bold text-gray-800 transition-all active:translate-y-0.5 active:border-b-0 ${keys.d ? 'translate-y-0.5 border-b-0 brightness-90' : ''}`}
                                    onTouchStart={() => { keys.d = true; }}
                                    onTouchEnd={() => { keys.d = false; }}
                                >D</div>
                            </div>
                        </div>
                    )}

                    {/* Desktop WASD Keys (Visible for all themes on desktop) */}
                    {!isMobile && (
                        <div className="w-32 h-32 flex flex-col items-center justify-center gap-1 pointer-events-none mb-8 opacity-40 scale-75">
                            {/* W */}
                            <div className={`w-10 h-10 rounded border-b-2 bg-white/5 border-white/20 flex items-center justify-center font-bold text-white transition-all ${keys.w ? 'translate-y-0.5 border-b-0 bg-white/20' : ''}`}>W</div>
                            <div className="flex gap-1">
                                {/* A */}
                                <div className={`w-10 h-10 rounded border-b-2 bg-white/5 border-white/20 flex items-center justify-center font-bold text-white transition-all ${keys.a ? 'translate-y-0.5 border-b-0 bg-white/20' : ''}`}>A</div>
                                {/* S */}
                                <div className={`w-10 h-10 rounded border-b-2 bg-white/5 border-white/20 flex items-center justify-center font-bold text-white transition-all ${keys.s ? 'translate-y-0.5 border-b-0 bg-white/20' : ''}`}>S</div>
                                {/* D */}
                                <div className={`w-10 h-10 rounded border-b-2 bg-white/5 border-white/20 flex items-center justify-center font-bold text-white transition-all ${keys.d ? 'translate-y-0.5 border-b-0 bg-white/20' : ''}`}>D</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col items-center gap-4 pointer-events-auto pr-4">
                    <div className="relative w-40 h-40 flex items-center justify-center">

                        {/* North Button */}
                        <div
                            className={`absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 ${buttonTheme === 'pc' ? 'rounded-lg' : 'rounded-full'} ${styles.north.bg} border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90`}
                            onTouchStart={() => setChatVisible(!chatVisible)}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)' }}
                        >
                            <span className={`font-black ${buttonTheme === 'n64' ? 'italic n64-recessed text-2xl mt-1' :
                                buttonTheme === 'playstation' ? 'not-italic ' + styles.north.color + ' text-5xl active:scale-95 transition-transform translate-y-[-1px]' :
                                    'italic ' + styles.north.color + ' text-xl drop-shadow-md'
                                }`}>
                                {styles.north.label}
                            </span>
                        </div>
                        {buttonTheme !== 'pc' && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-mono">I</div>}

                        {/* East Button */}
                        <div
                            className={`absolute top-1/2 -translate-y-1/2 right-0 w-14 h-14 ${buttonTheme === 'pc' ? 'rounded-lg' : 'rounded-full'} ${styles.east.bg} border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90`}
                            onTouchStart={() => {
                                if ((window as any).currentWorld === 'CosmicHub') {
                                    keys.down = true;
                                } else {
                                    if ((window as any).radialMenu) (window as any).radialMenu.collapse();
                                    window.dispatchEvent(new CustomEvent('close-side-panel'));
                                    window.dispatchEvent(new CustomEvent('close-admin-panel-mobile'));
                                    setChatVisible(false);
                                    setShowSettings(false);
                                }
                            }}
                            onTouchEnd={() => {
                                if ((window as any).currentWorld === 'CosmicHub') {
                                    keys.down = false;
                                }
                            }}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)' }}
                        >
                            <span className={`font-black ${buttonTheme === 'n64' ? 'italic n64-recessed text-xl' :
                                buttonTheme === 'playstation' ? 'not-italic ' + styles.east.color + ' text-7xl active:scale-95 transition-transform translate-y-[-2px]' :
                                    'italic ' + styles.east.color + ' text-xl drop-shadow-md'
                                }`}>{styles.east.label}</span>
                        </div>
                        {buttonTheme !== 'pc' && <div className="absolute top-1/2 -translate-y-1/2 -right-5 text-[10px] text-white/40 font-mono">L</div>}

                        {/* South Button */}
                        <div
                            className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 ${buttonTheme === 'pc' ? 'rounded-lg' : 'rounded-full'} ${styles.south.bg} border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90`}
                            onTouchStart={() => {
                                keys.space = true;
                                window.dispatchEvent(new CustomEvent('confirm-action'));
                            }}
                            onTouchEnd={() => { keys.space = false; }}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)' }}
                        >
                            <span className={`font-black ${buttonTheme === 'n64' ? 'italic n64-recessed text-xl' :
                                buttonTheme === 'playstation' ? 'not-italic ' + styles.south.color + ' text-5xl active:scale-95 transition-transform' :
                                    'italic ' + styles.south.color + ' text-xl drop-shadow-md'
                                }`}>{styles.south.label}</span>
                        </div>
                        {buttonTheme !== 'pc' && <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-mono">K</div>}

                        {/* West Button */}
                        <div
                            className={`absolute top-1/2 -translate-y-1/2 left-0 w-14 h-14 ${buttonTheme === 'pc' ? 'rounded-lg' : 'rounded-full'} ${styles.west.bg} border-b-4 border-black/40 shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all active:brightness-90`}
                            onTouchStart={() => setShowSettings(!showSettings)}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)' }}
                        >
                            <span className={`font-black ${buttonTheme === 'n64' ? 'italic n64-recessed text-[8px]' :
                                buttonTheme === 'playstation' ? 'not-italic ' + styles.west.color + ' text-6xl active:scale-95 transition-transform translate-y-[-4px]' :
                                    'italic ' + styles.west.color + ' text-xl drop-shadow-md'
                                }`}>
                                {styles.west.label}
                            </span>
                        </div>
                        {buttonTheme !== 'pc' && <div className="absolute top-1/2 -translate-y-1/2 -left-5 text-[10px] text-white/40 font-mono">J</div>}
                    </div>
                </div>
            </div>

            {/* Settings */}
            {showSettings && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
                    <div className="w-full max-w-md px-4 pointer-events-auto">
                        <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/30 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-lg">Settings</h3>
                                <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><span className="text-white text-lg">×</span></button>
                            </div>
                            <div className="text-white/60 text-sm">
                                <p className="mb-2">Active Theme: <span className="text-cyan-400 uppercase font-bold">{buttonTheme}</span></p>
                                <ul className="text-xs space-y-1 font-mono">
                                    <li>WASD - Move</li>
                                    <li>I - Open Chat</li>
                                    <li>J - Settings</li>
                                    <li>K - Confirm/Jump</li>
                                    <li>L - Back/Exit</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ChatPrompt visible={chatVisible} onClose={() => setChatVisible(false)} />

            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@1,900&display=swap');
                .drop-shadow-md { filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5)); }
                .n64-recessed {
                    color: rgba(0,0,0,0.4);
                    text-shadow: 0 1px 0 rgba(255,255,255,0.15);
                    filter: none;
                }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
};
