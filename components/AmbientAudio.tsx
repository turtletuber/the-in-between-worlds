import React, { useEffect, useRef, useState } from "react";

export const AmbientAudio: React.FC = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const FADE_DURATION = 5.0; // Seconds of fade in/out

    useEffect(() => {
        // Attempt play on mount (browsers might block autoplay)
        if (audioRef.current) {
            audioRef.current.volume = 0;
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => console.log("Audio autoplay blocked:", e));
        }
    }, []);

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio) return;

        const { currentTime, duration } = audio;
        if (!duration) return;

        const timeLeft = duration - currentTime;

        // Calculate volume based on position
        let targetVolume = 1.0;

        if (currentTime < FADE_DURATION) {
            // Fade In
            targetVolume = currentTime / FADE_DURATION;
        } else if (timeLeft < FADE_DURATION) {
            // Fade Out
            targetVolume = timeLeft / FADE_DURATION;
        } else {
            // Full Volume
            targetVolume = 1.0;
        }

        // Clamp volume
        audio.volume = Math.max(0, Math.min(1, targetVolume));
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
            <audio
                ref={audioRef}
                src="/soft-syth-rain.m4a"
                loop
                onTimeUpdate={handleTimeUpdate}
            />

            {/* Simple Mute/Play Control */}
            <button
                onClick={togglePlay}
                className="text-cyan-500/50 hover:text-cyan-400 transition-colors text-xs font-mono"
            >
                {isPlaying ? "(( 🔊 ))" : "(( 🔇 ))"}
            </button>
        </div>
    );
};
