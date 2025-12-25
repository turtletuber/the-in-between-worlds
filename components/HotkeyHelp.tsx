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
    const [isOpen, setIsOpen] = useState(false);

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
                        absolute top-8 left-0 w-48
                        bg-black/80 backdrop-blur-md border border-cyan-500/20 
                        shadow-[0_0_15px_rgba(0,100,100,0.2)]
                        rounded-br-lg rounded-bl-lg
                        transition-all duration-300 ease-in-out
                        overflow-hidden
                        ${isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}
                    `}
                >
                    <div className="p-3">
                        <div className="text-[10px] text-cyan-600 mb-2 border-b border-cyan-900 pb-1">
                            :: CONTROLS ::
                        </div>
                        <div className="flex flex-col gap-2">
                            {HOTKEYS.map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-gray-300">
                                    <span className="bg-white/10 px-1 rounded text-[10px] text-yellow-500 font-bold min-w-[20px] text-center">
                                        {item.key}
                                    </span>
                                    <span className="text-[10px] opacity-70">
                                        {item.desc}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
