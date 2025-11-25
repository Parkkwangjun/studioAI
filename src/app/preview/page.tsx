'use client';

import { useState, useRef, useEffect } from 'react';
import { useProjectStore, Scene } from '@/store/useProjectStore';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Film } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PreviewPage() {
    const { currentProject } = useProjectStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const router = useRouter();

    const scenes = currentProject?.scenes || [];
    const currentScene = scenes[currentIndex];

    // Reset when project changes or on mount
    useEffect(() => {
        setCurrentIndex(0);
        setIsPlaying(false);
    }, [currentProject?.id]);

    // Handle auto-play sequence
    useEffect(() => {
        if (isPlaying && currentScene) {
            // If scene has audio, play it
            if (currentScene.audioUrl) {
                if (audioRef.current) {
                    audioRef.current.src = currentScene.audioUrl;
                    audioRef.current.play().catch(e => console.error("Audio play failed", e));
                }
            } else {
                // If no audio, just wait 3 seconds then move next
                const timer = setTimeout(() => {
                    handleNext();
                }, 3000);
                return () => clearTimeout(timer);
            }
        } else {
            // Pause media if not playing
            if (audioRef.current) audioRef.current.pause();
            if (videoRef.current) videoRef.current.pause();
        }
    }, [isPlaying, currentIndex]);

    // Sync video playback with audio if both exist, or just play video if no audio
    useEffect(() => {
        if (isPlaying && currentScene?.videoUrl && videoRef.current) {
            videoRef.current.play().catch(e => console.error("Video play failed", e));
        }
    }, [isPlaying, currentIndex]);

    const handleAudioEnded = () => {
        if (currentIndex < scenes.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsPlaying(false); // End of sequence
        }
    };

    const handleNext = () => {
        if (currentIndex < scenes.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setIsPlaying(true);
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    if (!currentProject) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-gray)]">
                <Film className="w-12 h-12 mb-4 opacity-50" />
                <p>No active project to preview.</p>
                <button
                    onClick={() => router.push('/library')}
                    className="mt-4 text-[var(--primary-color)] hover:underline"
                >
                    Go to Library
                </button>
            </div>
        );
    }

    if (scenes.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-gray)]">
                <p>This project has no scenes.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0f0f16] overflow-hidden">
            {/* Main Viewer Area */}
            <div className="flex-1 flex items-center justify-center p-10 relative">
                <div className="aspect-video w-full max-w-5xl bg-black rounded-xl overflow-hidden relative shadow-2xl border border-[#2a2a35]">

                    {/* Media Layer */}
                    {currentScene?.videoUrl ? (
                        <video
                            ref={videoRef}
                            src={currentScene.videoUrl}
                            className="w-full h-full object-contain"
                            loop={!!currentScene.audioUrl} // Loop video if audio is driving duration
                            muted // Mute video audio to prefer TTS audio
                            playsInline
                        />
                    ) : currentScene?.imageUrl ? (
                        <img
                            src={currentScene.imageUrl}
                            alt={`Scene ${currentScene.id}`}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1a1a24] text-[var(--text-gray)]">
                            <div className="text-center">
                                <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No visual asset</p>
                            </div>
                        </div>
                    )}

                    {/* Subtitle Overlay */}
                    <div className="absolute bottom-8 left-0 right-0 text-center px-10">
                        <div className="inline-block bg-black/60 backdrop-blur-sm px-6 py-3 rounded-lg">
                            <p className="text-white text-lg font-medium leading-relaxed drop-shadow-md">
                                {currentScene?.text || "..."}
                            </p>
                        </div>
                    </div>

                    {/* Hidden Audio Player for TTS */}
                    <audio
                        ref={audioRef}
                        onEnded={handleAudioEnded}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Controls & Timeline */}
            <div className="h-48 bg-(--bg-sidebar) border-t border-[#2a2a35] flex flex-col">

                {/* Playback Controls */}
                <div className="h-14 flex items-center justify-center gap-4 border-b border-[#2a2a35]">
                    <button onClick={handleRestart} className="p-2 text-[var(--text-gray)] hover:text-white transition-colors" title="Restart">
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button onClick={handlePrev} className="p-2 text-[var(--text-gray)] hover:text-white transition-colors" disabled={currentIndex === 0}>
                        <SkipBack className="w-5 h-5" />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-(--primary-color) hover:bg-[#4a4ddb] flex items-center justify-center text-white transition-transform hover:scale-105"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <button onClick={handleNext} className="p-2 text-[var(--text-gray)] hover:text-white transition-colors" disabled={currentIndex === scenes.length - 1}>
                        <SkipForward className="w-5 h-5" />
                    </button>
                    <div className="text-xs text-[var(--text-gray)] font-mono ml-4">
                        Scene {currentIndex + 1} / {scenes.length}
                    </div>
                </div>

                {/* Filmstrip Timeline */}
                <div className="flex-1 overflow-x-auto custom-scrollbar p-4 flex gap-3 items-center">
                    {scenes.map((scene, index) => (
                        <div
                            key={scene.id}
                            onClick={() => {
                                setCurrentIndex(index);
                                setIsPlaying(false);
                            }}
                            className={`relative h-20 aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-all shrink-0 ${index === currentIndex
                                ? 'border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]/30 scale-105'
                                : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                        >
                            {scene.imageUrl ? (
                                <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#2b2b36] flex items-center justify-center text-[0.6rem] text-[var(--text-gray)]">
                                    #{scene.id}
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[0.5rem] text-white px-1 py-0.5 truncate">
                                {scene.text}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
