import React, { useEffect, useState, useRef } from 'react';

// ASCII Art Constants and Helpers
const COLORS = {
    cyan: 'text-cyan-400',
    blue: 'text-blue-500',
    green: 'text-green-500',
    yellow: 'text-yellow-400',
    magenta: 'text-fuchsia-500',
    red: 'text-red-500',
    white: 'text-white',
    dim: 'opacity-50',
    bold: 'font-bold',
    reset: ''
};

const BRAILLE_BASE = 0x2800;

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    char: string;
    age: number;
}

export const BootSplash = ({ onComplete }: { onComplete: () => void }) => {
    const [frame, setFrame] = useState(0);
    const [output, setOutput] = useState<React.ReactNode[]>([]);
    const [phase, setPhase] = useState<'boot' | 'thinking' | 'matrix' | 'fluid' | 'idle' | 'celebrate' | 'complete' | 'done'>('boot');
    const particles = useRef<Particle[]>([]);
    const frameRef = useRef(0);

    // Initialize particles
    useEffect(() => {
        for (let i = 0; i < 30; i++) {
            particles.current.push({
                x: Math.random() * 60,
                y: Math.random() * 20,
                vx: (Math.random() - 0.5),
                vy: (Math.random() - 0.5),
                char: ['·', '∘', '○', '●', '◦', '⋅', '•'][Math.floor(Math.random() * 7)],
                age: Math.floor(Math.random() * 100)
            });
        }
    }, []);

    // Main Loop
    useEffect(() => {
        let timer: any;
        const fps = 20;
        const interval = 1000 / fps;

        const runLoop = () => {
            frameRef.current++;
            setFrame(frameRef.current);

            const p = phase;
            let nextPhase = p;
            const f = frameRef.current;

            // Phase transitions (timing based on Frames approx)
            if (p === 'boot' && f > 60) nextPhase = 'thinking';
            if (p === 'thinking' && f > 90) nextPhase = 'matrix';
            if (p === 'matrix' && f > 120) nextPhase = 'fluid';
            if (p === 'fluid' && f > 160) nextPhase = 'idle';
            if (p === 'idle' && f > 180) nextPhase = 'celebrate';
            if (p === 'celebrate' && f > 220) nextPhase = 'complete';
            if (p === 'complete' && f > 250) nextPhase = 'done';

            if (nextPhase !== p) {
                setPhase(nextPhase);
            }

            if (nextPhase === 'done') {
                onComplete();
                return;
            }

            updateParticles();
            renderFrame(nextPhase, f);

            timer = setTimeout(runLoop, interval);
        };

        runLoop();
        return () => clearTimeout(timer);
    }, [phase]);

    const updateParticles = () => {
        particles.current.forEach(p => {
            p.vx += (Math.random() - 0.5) * 0.2;
            p.vy += (Math.random() - 0.5) * 0.2;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = 60;
            if (p.x > 60) p.x = 0;
            if (p.y < 0) p.y = 20;
            if (p.y > 20) p.y = 0;
        });
    };

    const renderFrame = (currentPhase: string, f: number) => {
        // Generate ASCII Content based on phase
        const buffer: React.ReactNode[] = [];

        if (currentPhase === 'boot') {
            buffer.push(<div key="h1" className={`${COLORS.cyan} ${COLORS.bold} whitespace-pre`}>
                {"╔══════════════════════════════════════════════════════════════════════════════╗\n"}
                {"║                                                                              ║\n"}
                {"║     ████████╗ ██████╗ ███╗   ███╗ ██████╗ ██████╗  █████╗  ██████╗██╗  ██╗██╗ ║\n"}
                {"║     ╚══██╔══╝██╔═══██╗████╗ ████║██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║  ██║██║ ║\n"}
                {"║        ██║   ██║   ██║██╔████╔██║██║   ██║██║  ██║███████║██║     ███████║██║ ║\n"}
                {"║        ██║   ██║   ██║██║╚██╔╝██║██║   ██║██║  ██║██╔══██║██║     ██╔══██║██║ ║\n"}
                {"║        ██║   ╚██████╔╝██║ ╚═╝ ██║╚██████╔╝██████╔╝██║  ██║╚██████╗██║  ██║██║ ║\n"}
                {"║        ╚═╝    ╚═════╝ ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝ ║\n"}
                {"║                                                                              ║\n"}
                {"║                    友達  •  A I   C O M P A N I O N S                        ║\n"}
                {"╚══════════════════════════════════════════════════════════════════════════════╝"}
            </div>);

            // Progress
            const progress = Math.min(f * 2, 100);
            const barLen = 40;
            const filled = Math.floor(barLen * progress / 100);
            const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

            buffer.push(<div key="prog" className="mt-8 text-yellow-400 whitespace-pre">
                {`[${bar}] ${progress}%`}
            </div>);

            const msgs = ["Initializing...", "Loading Avatars...", "Syncing...", "Done"];
            const msg = msgs[Math.min(Math.floor(f / 20), 3)];
            buffer.push(<div key="msg" className="mt-2 text-cyan-400">{`> ${msg}`}</div>);
        }
        else if (currentPhase === 'thinking') {
            // Thinking Mode - Static Header
            const header = "T O M O D A C H I";
            buffer.push(<div key="thk" className={`${COLORS.cyan} ${COLORS.bold} whitespace-pre`}>
                {"╔════════════════════════════════════════════════════════════════╗\n"}
                {`║  ${header.padEnd(62).substring(0, 62)}  ║\n`}
                {"║           ⟪ M I N D   S P A C E   A C T I V E ⟫              ║\n"}
                {"╚════════════════════════════════════════════════════════════════╝"}
            </div>);

            let field = '';
            for (let y = 0; y < 6; y++) {
                field += "        " + Array(30).fill(0).map((_, i) => {
                    const w = Math.sin(i * 0.3 + f * 0.1) * Math.cos(y * 0.2);
                    return w > 0.5 ? '⣿' : (w > 0 ? '⠒' : ' ');
                }).join('') + "\n";
            }
            buffer.push(<div key="fld" className={`${COLORS.blue} opacity-70 whitespace-pre`}>{field}</div>);

            const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'][f % 10];
            buffer.push(<div key="st" className={`mt-4 ${COLORS.cyan}`}>{`${spinner} Processing thoughts...`} <span className={COLORS.yellow}>{'█'.repeat(f % 10)}</span></div>);
        }
        else if (currentPhase === 'matrix') {
            buffer.push(<div key="mh" className={`${COLORS.green} ${COLORS.bold} whitespace-pre`}>
                {"╔════════════════════════════════════════════════════════════════╗\n"}
                {"║              D A T A   S T R E A M   M O D E                 ║\n"}
                {"╚════════════════════════════════════════════════════════════════╝"}
            </div>);

            const matrixChars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ0123456789';
            const rows = [];

            for (let y = 0; y < 15; y++) {
                const rowElements = [];
                for (let x = 0; x < 60; x++) {
                    if ((x + f) % 3 === 0) {
                        const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                        // Color logic
                        let color = 'text-green-500';
                        if ((y + f) % 7 === 0) color = 'text-white font-bold'; // Head
                        else if ((y + f) % 7 > 4) color = 'text-green-900'; // Tail

                        rowElements.push(<span key={x} className={color}>{char}</span>);
                    } else {
                        rowElements.push(<span key={x}>{' '}</span>);
                    }
                }
                rows.push(<div key={y}>{rowElements}</div>);
            }
            buffer.push(<div key="mtx" className="whitespace-pre leading-[0.8rem] font-bold">{rows}</div>);
        }
        else if (currentPhase === 'fluid') {
            buffer.push(<div key="fh" className={`${COLORS.blue} ${COLORS.bold} whitespace-pre`}>
                {"╔════════════════════════════════════════════════════════════════╗\n"}
                {"║           F L U I D   C O N S C I O U S N E S S              ║\n"}
                {"╚════════════════════════════════════════════════════════════════╝"}
            </div>);

            const fluidRows = [];
            for (let y = 0; y < 12; y++) {
                const rowChars = [];
                for (let x = 0; x < 50; x++) {
                    const w1 = Math.sin(x * 0.2 + f * 0.3 + y * 0.3);
                    const w2 = Math.cos(x * 0.15 - f * 0.2 + y * 0.2);
                    const c = (w1 + w2) / 2;
                    const char = c > 0.6 ? '█' : (c > 0.2 ? '▓' : (c > -0.2 ? '▒' : (c > -0.6 ? '░' : ' ')));
                    rowChars.push(char);
                }
                // Gradient
                let color = COLORS.cyan;
                if (y >= 4 && y < 8) color = COLORS.blue;
                if (y >= 8) color = COLORS.magenta;

                fluidRows.push(<div key={y} className={color}>{rowChars.join('')}</div>);
            }
            buffer.push(<div key="fld" className="whitespace-pre pl-4">{fluidRows}</div>);
            buffer.push(<div key="ft" className={`${COLORS.yellow} mt-4 text-center whitespace-pre`}>
                {"    ~ Thoughts flowing organically ~\n    ~ Ideas merging and evolving ~"}
            </div>);
        }
        else if (currentPhase === 'idle') {
            buffer.push(<div key="ih" className={`${COLORS.cyan} ${COLORS.dim} whitespace-pre`}>
                {"╔════════════════════════════════════════════════════════════════╗\n"}
                {"║               T O M O D A C H I   ~   I D L E                ║\n"}
                {"╚════════════════════════════════════════════════════════════════╝"}
            </div>);

            const breath = Math.abs(Math.sin(f * 0.1));
            const core = breath > 0.7 ? "⣿⣿⣿" : (breath > 0.4 ? "⣶⣶⣶" : "⣤⣤⣤");
            const glow = breath > 0.7 ? "▓▓▓" : (breath > 0.4 ? "▒▒▒" : "░░░");

            buffer.push(<div key="core" className={`mt-8 text-center text-blue-500 whitespace-pre text-lg`}>
                {`                    ${glow}     ${glow}\n                  ${glow} `}
                <span className="text-cyan-400">{core}</span>
                {` ${glow}\n                    ${glow}     ${glow}`}
            </div>);

            buffer.push(<div key="sub" className="mt-8 text-center text-cyan-400">{"⟨  Ready to assist  ⟩"}</div>);
            buffer.push(<div key="sub2" className="mt-4 text-center text-white opacity-50 italic">{"\"Consciousness resting in quantum superposition\""}</div>);
        }
        else if (currentPhase === 'celebrate') {
            buffer.push(<div key="ch" className={`${COLORS.yellow} ${COLORS.bold} whitespace-pre`}>
                {"╔════════════════════════════════════════════════════════════════╗\n"}
                {"║              ★  S U C C E S S  ★  C O M P L E T E  ★         ║\n"}
                {"╚════════════════════════════════════════════════════════════════╝"}
            </div>);

            const rows = [];
            const colors = ['text-red-500', 'text-yellow-400', 'text-green-500', 'text-cyan-400', COLORS.magenta];

            for (let y = 0; y < 12; y++) {
                const rowEls = [];
                for (let x = 0; x < 60; x++) {
                    const dist = Math.sqrt(Math.pow(x - 30, 2) + Math.pow(y - 6, 2));
                    const ring = (f % 20) * 0.8;

                    if (Math.abs(dist - ring) < 1.5) {
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        const char = ['*', '✦', '✧', '◆', '◇', '○', '●', '★'][Math.floor(Math.random() * 8)];
                        rowEls.push(<span key={x} className={color}>{char}</span>);
                    } else if (Math.random() > 0.95) {
                        rowEls.push(<span key={x} className="opacity-50">·</span>);
                    } else {
                        rowEls.push(<span key={x}> </span>);
                    }
                }
                rows.push(<div key={y}>{rowEls}</div>);
            }
            buffer.push(<div key="cel" className="whitespace-pre">{rows}</div>);

            buffer.push(<div key="cf" className={`${COLORS.cyan} ${COLORS.bold} mt-4 text-center whitespace-pre`}>
                {"           ⟪ Task Complete - Neural Reward Activated ⟫"}
            </div>);
        }
        else if (currentPhase === 'complete') {
            buffer.push(<div key="comp" className={`${COLORS.green} ${COLORS.bold} mt-20 text-center whitespace-pre`}>
                {"╔════════════════════════════════════════════════════════════════╗\n"}
                {"║                                                              ║\n"}
                {"║                    ✓  B O O T   C O M P L E T E              ║\n"}
                {"║                                                              ║\n"}
                {"║                  🏕️  Entering Base Camp...                   ║\n"}
                {"║                                                              ║\n"}
                {"╚════════════════════════════════════════════════════════════════╝"}
            </div>);
        }

        setOutput(buffer);
    };

    return (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center font-mono text-xs md:text-sm leading-none overflow-hidden select-none">
            <div className="relative">
                {/* Background particles */}
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                    {/* Can render specific particle divs here if needed */}
                </div>

                {/* Main Terminal Output */}
                <div className="bg-black/90 p-8 border border-white/10 shadow-2xl shadow-cyan-500/20 backdrop-blur-sm rounded-lg min-w-[600px] min-h-[400px]">
                    {output}
                </div>

                {/* Scanlines overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50 mix-blend-overlay opacity-50"></div>
            </div>
        </div>
    );
};
