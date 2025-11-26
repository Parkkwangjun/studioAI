"use client";

import { useRef, useEffect } from "react";
import { useTimelineStore } from "@/store/useTimelineStore";
import { useShallow } from "zustand/react/shallow";

export function TimelineRuler() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { durationMs, zoomLevel, scrollPosition, setPlaybackTime, currentTime } = useTimelineStore(useShallow(state => ({
        durationMs: state.timeline.durationMs,
        zoomLevel: state.zoomLevel,
        scrollPosition: state.scrollPosition,
        setPlaybackTime: state.setPlaybackTime,
        currentTime: state.playback.currentTime
    })));

    const pixelsPerMs = 0.1 * zoomLevel;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#71717a'; // zinc-500
        ctx.font = '10px sans-serif';

        // Draw ticks
        const majorTickInterval = 1000; // 1 second
        const minorTickInterval = 100;  // 0.1 second

        const startMs = scrollPosition / pixelsPerMs; // Approximate visible start
        // Ideally we should virtualize this, but for now draw all or visible range

        // Simple drawing for now
        for (let t = 0; t <= durationMs; t += minorTickInterval) {
            const x = t * pixelsPerMs;

            if (t % majorTickInterval === 0) {
                // Major tick
                ctx.fillRect(x, height - 12, 1, 12);
                ctx.fillText(`${t / 1000}s`, x + 4, height - 4);
            } else {
                // Minor tick
                ctx.fillRect(x, height - 6, 1, 6);
            }
        }

    }, [durationMs, zoomLevel, scrollPosition]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = x / pixelsPerMs;
        setPlaybackTime(Math.max(0, Math.min(time, durationMs)));
    };

    return (
        <div className="h-8 bg-zinc-900 border-b border-zinc-800 relative overflow-hidden">
            <canvas
                ref={canvasRef}
                width={durationMs * pixelsPerMs}
                height={32}
                className="absolute top-0 left-0 cursor-pointer"
                onMouseDown={handleMouseDown}
            />
            {/* Playhead Indicator */}
            <div
                className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-50"
                style={{ left: `${currentTime * pixelsPerMs}px` }}
            >
                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 transform rotate-45" />
            </div>
        </div>
    );
}
