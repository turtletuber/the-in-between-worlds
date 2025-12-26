import React, { useEffect, useRef, useState } from 'react';
import { initScene, disposeScene } from './game/scene';

import { FloOverlay } from './components/FloOverlay';
import { SidePanelOverlay } from './components/SidePanelOverlay';
import { AdminPanel } from './components/AdminPanel';


import { MetricsHUD } from './components/MetricsHUD';
import { HintsDropdown } from './components/HintsDropdown';
import { HotkeyHelp } from './components/HotkeyHelp';
import { AmbientAudio } from './components/AmbientAudio';

import { StartScreen } from './components/StartScreen';
import { MobileControls } from './components/MobileControls';

import { BootSplash } from './game/BootSplash';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentWorld, setCurrentWorld] = useState('campground');
  const [whisper, setWhisper] = useState('˚ ༘♡ ⋆｡˚ where dreams are coded into being... ˚ ༘♡ ⋆｡˚');
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [showSplash, setShowSplash] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  // Toggle HUD with 'h'
  const [showHud, setShowHud] = useState(true);

  // Responsive State: Mouse Parallax & Zoom Feedback
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);

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
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to 1 range
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      });
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousemove', handleMouseMove);

    // Track Zoom Progress for HUD reactivity
    const zoomInterval = setInterval(() => {
      if ((window as any).targetZoomProgress !== undefined) {
        setZoomLevel((window as any).targetZoomProgress);
      }
    }, 100);

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(zoomInterval);
    };
  }, []);

  const handleStart = () => {
    setHasStarted(true);
    // Boot splash automatically shows because showSplash is true by default
  };

  const handleSplashComplete = (skipped?: boolean) => {
    setShowSplash(false);
    // Reveal the world
    setTimeout(() => {
      setFadeOpacity(0);
      if (!skipped) {
        window.dispatchEvent(new CustomEvent('tutorial-start'));
      }
    }, 1000);
  };

  return (
    <div className="relative w-full h-screen text-white font-serif overflow-hidden select-none">

      {/* 3D Container - MOUNTED ALWAYS */}
      <div ref={containerRef} className="absolute inset-0 z-0 bg-black" />

      {/* Start Screen Overlay */}
      {!hasStarted && (
        <div className="relative z-[100]">
          <StartScreen onStart={handleStart} />
        </div>
      )}

      {/* Game UI - Only shown after start */}
      {hasStarted && (
        <>
          {showSplash && <BootSplash onComplete={handleSplashComplete} />}

          {/* UI Layer */}
          <FloOverlay />
          <SidePanelOverlay />
          <AdminPanel />
          <MobileControls />

          {/* HUD Layer with Mouse Parallax */}
          <div
            className={`transition-opacity duration-500 ${showHud ? 'opacity-100' : 'opacity-0'}`}
            style={{
              transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px)`,
              transition: 'transform 0.2s ease-out, opacity 0.5s ease'
            }}
          >
            <HintsDropdown />
            <HotkeyHelp />
          </div>

          <AmbientAudio />

          {/* Vignette Overlay - Reactive to Zoom Level */}
          <div
            className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-700"
            style={{
              background: `radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(5,5,15,${0.4 + (zoomLevel * 0.08)}) 100%)`,
              opacity: 0.8 + (Math.sin(Date.now() / 2000) * 0.05) // Subtle atmospheric pulse
            }}
          />

          {/* Fade Overlay */}
          <div
            className="absolute inset-0 bg-black z-50 transition-opacity duration-1000 pointer-events-none"
            style={{ opacity: fadeOpacity }}
          />
        </>
      )}
    </div>
  );
}