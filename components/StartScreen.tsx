import React from 'react';

interface StartScreenProps {
    onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white selection:bg-cyan-500/30">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black pointer-events-none" />
            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-overlay" />

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center gap-12 animate-in fade-in duration-1000">

                {/* Title */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-serif tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/30 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        THE IN BETWEEN
                    </h1>
                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mx-auto" />
                    <p className="text-cyan-400/60 font-mono text-xs tracking-widest">
                        powered by Tomo2 a collaboration with AI
                    </p>
                </div>

                {/* Start Button */}
                <button
                    onClick={onStart}
                    className="group relative px-12 py-4 bg-transparent border border-white/10 hover:border-cyan-500/50 transition-all duration-500 rounded-sm overflow-hidden"
                >
                    {/* Hover Fill */}
                    <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />

                    {/* Text */}
                    <span className="relative font-mono text-sm tracking-[0.3em] group-hover:tracking-[0.5em] transition-all duration-500 text-gray-400 group-hover:text-white">
                        INITIALIZE
                    </span>

                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/30 group-hover:border-cyan-400 transition-colors" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/30 group-hover:border-cyan-400 transition-colors" />
                </button>

            </div>

            {/* Footer */}
        </div>
    );
};
