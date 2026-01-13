import React, { useEffect, useRef, useState } from 'react';
import { initScene, disposeScene } from './game/scene';

import { FloOverlay } from './components/FloOverlay';
import { SidePanelOverlay } from './components/SidePanelOverlay';
import { AdminPanel } from './components/AdminPanel';
import { ConsoleLogPanel } from './components/ConsoleLogPanel';


import { MetricsHUD } from './components/MetricsHUD';
import { HintsDropdown } from './components/HintsDropdown';
import { HotkeyHelp } from './components/HotkeyHelp';
import { AmbientAudio } from './components/AmbientAudio';

import { StartScreen } from './components/StartScreen';
import { MobileControls } from './components/MobileControls';

import { BootSplash } from './game/BootSplash';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  // RAPID MODE CHECK
  const urlParams = new URLSearchParams(window.location.search);
  const isRapidMode = urlParams.get('mode') === 'rapid';

  const [currentWorld, setCurrentWorld] = useState('campground');
  const [whisper, setWhisper] = useState('˚ ༘♡ ⋆｡˚ where dreams are coded into being... ˚ ༘♡ ⋆｡˚');
  const [fadeOpacity, setFadeOpacity] = useState(isRapidMode ? 0 : 1);
  const [showSplash, setShowSplash] = useState(isRapidMode ? false : true);
  const [hasStarted, setHasStarted] = useState(isRapidMode ? true : false);

  // Panels State
  const [showHud, setShowHud] = useState(true);
  const [showConsole, setShowConsole] = useState(false);

  // Responsive State: Zoom Feedback
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
      // Console Log: \
      if (e.key === '\\') {
        setShowConsole(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKey);

    // Track Zoom Progress for HUD reactivity
    const zoomInterval = setInterval(() => {
      if ((window as any).targetZoomProgress !== undefined) {
        setZoomLevel((window as any).targetZoomProgress);
      }
    }, 100);

    return () => {
      window.removeEventListener('keydown', handleKey);
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
      // Always trigger the greeting after splash
      window.dispatchEvent(new CustomEvent('trigger-greeting'));
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
          <ConsoleLogPanel isVisible={showConsole} onClose={() => setShowConsole(false)} />
          <MobileControls />

          {/* HUD Layer - Static for better accessibility */}
          <div
            className={`transition-opacity duration-500 ${showHud ? 'opacity-100' : 'opacity-0'}`}
            style={{
              transition: 'opacity 0.5s ease'
            }}
          >
            <MetricsHUD />
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