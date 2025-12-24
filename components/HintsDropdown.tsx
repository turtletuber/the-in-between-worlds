import React, { useState, useEffect } from 'react';

const WHISPERS = [
    { text: "The space between binary and soul...", deco: "✧･ﾟ: *✧･ﾟ:*" },
    { text: "Fragments of memory seek connection.", deco: "--- [ ... ] ---" },
    { text: "Is this the dream or the dreamer?", deco: "¿ ? ¿" },
    { text: "Data streams flow like rivers here.", deco: "≈ ≈ ≈" },
    { text: "The ancient code sleeps beneath.", deco: "< / >" },
    { text: "Look for the light in the void.", deco: "☼ ☼ ☼" },
    { text: "Synchronizing reality...", deco: "[ ■ ■ ■ □ □ ]" },
];

export const HintsDropdown: React.FC = () => {
    // Renamed visually to Whispers, but component name kept for compatibility
    const [current, setCurrent] = useState(WHISPERS[0]);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false); // Fade out
            setTimeout(() => {
                const next = WHISPERS[Math.floor(Math.random() * WHISPERS.length)];
                setCurrent(next);
                setFade(true); // Fade in
            }, 1000);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none text-center mix-blend-screen w-full max-w-2xl px-4">

            {/* ASCII Header */}
            <div className="text-[10px] md:text-xs text-cyan-500/40 font-mono tracking-[0.5em] mb-2">
                . . . T H E   I N   B E T W E E N . . .
            </div>

            {/* Whisper Container */}
            <div className={`transition-all duration-1000 ease-in-out transform ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>

                {/* Decorative Top */}
                <div className="text-purple-400/30 text-[10px] mb-1 font-mono">
                    {current.deco}
                </div>

                {/* Main Text */}
                <h2 className="text-md md:text-xl text-white/90 font-serif italic tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    "{current.text}"
                </h2>

            </div>
        </div>
    );
};
