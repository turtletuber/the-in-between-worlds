import React, { useEffect, useRef, useState } from 'react';
import { initScene, disposeScene } from './game/scene';

import { FloOverlay } from './components/FloOverlay';
import { MetricsHUD } from './components/MetricsHUD';
import { HintsDropdown } from './components/HintsDropdown';
import { HotkeyHelp } from './components/HotkeyHelp';
import { AmbientAudio } from './components/AmbientAudio';

import { StartScreen } from './components/StartScreen';

import { BootSplash } from './game/BootSplash';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentWorld, setCurrentWorld] = useState('deskview');
  const [whisper, setWhisper] = useState('˚ ༘♡ ⋆｡˚ where dreams are coded into being... ˚ ༘♡ ⋆｡˚');
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [showSplash, setShowSplash] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  // Toggle HUD with 'h'
  const [showHud, setShowHud] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize the 3D scene
    const cleanup = initScene(containerRef.current, (worldName, message) => {
      setCurrentWorld(worldName);
      if (message) {
        setWhisper(message);
        // Trigger whisper animation
        const el = document.getElementById('whisper-text');
        if (el) {
          el.style.opacity = '0.8';
          setTimeout(() => { el.style.opacity = '0'; }, 4000);
        }
      }
    });

    return () => {
      disposeScene();
      cleanup();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setShowHud(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleStart = () => {
    setHasStarted(true);
    // Boot splash automatically shows because showSplash is true by default
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
    // Reveal the world
    setTimeout(() => setFadeOpacity(0), 1000);
  };

  if (!hasStarted) {
    return <StartScreen onStart={handleStart} />;
  }

  return (
    <div className="relative w-full h-screen text-white font-serif overflow-hidden select-none">
      {showSplash && <BootSplash onComplete={handleSplashComplete} />}

      {/* UI Layer */}
      <FloOverlay />

      {/* HUD Layer - Toggled by 'h' */}
      <div className={`transition-opacity duration-500 ${showHud ? 'opacity-100' : 'opacity-0'}`}>
        <MetricsHUD />
        <HintsDropdown />
        <HotkeyHelp />
      </div>

      {/* Audio starts after user interaction */}
      <AmbientAudio />

      {/* 3D Container (always rendered but hidden behind splash to preload?)
          Actually, we should mount it now to start initScene */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_50%,rgba(5,5,15,0.6)_100%)]" />

      {/* Fade Overlay */}
      <div
        className="absolute inset-0 bg-black z-50 transition-opacity duration-1000 pointer-events-none"
        style={{ opacity: fadeOpacity }}
      />
    </div>
  );
}