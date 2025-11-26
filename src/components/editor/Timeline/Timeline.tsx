"use client";

import { useRef } from "react";
import { useTimelineStore } from "@/store/useTimelineStore";
import { TrackRow } from "./TrackRow";
import { TimelineRuler } from "./TimelineRuler";
import { useShallow } from "zustand/react/shallow";
import { Plus } from "lucide-react";

export function Timeline() {
    const containerRef = useRef<HTMLDivElement>(null);

    const {
        tracks,
        durationMs,
        zoomLevel,
        addTrack
    } = useTimelineStore(useShallow(state => ({
        tracks: state.timeline.tracks,
        durationMs: state.timeline.durationMs,
        zoomLevel: state.zoomLevel,
        addTrack: state.addTrack
    })));

    const pixelsPerMs = 0.1 * zoomLevel; // Base scale * zoom
    const totalWidth = durationMs * pixelsPerMs;

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-white select-none">
            {/* Toolbar / Header */}
            <div className="h-10 border-b border-zinc-800 flex items-center px-4 bg-zinc-900">
                <span className="text-sm font-medium text-zinc-400">Timeline</span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => addTrack('video')}
                        className="p-1 hover:bg-zinc-800 rounded text-xs flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" /> Video Track
                    </button>
                    <button
                        onClick={() => addTrack('audio')}
                        className="p-1 hover:bg-zinc-800 rounded text-xs flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" /> Audio Track
                    </button>
                </div>
            </div>

            <TimelineRuler />

            {/* Tracks Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden relative"
            >
                <div
                    className="min-h-full relative"
                    style={{ width: `${Math.max(totalWidth, containerRef.current?.clientWidth || 0)}px` }}
                >
                    {/* Time Ruler Background (Optional Grid) */}
                    <div className="absolute inset-0 pointer-events-none opacity-10"
                        style={{
                            backgroundImage: 'linear-gradient(90deg, #333 1px, transparent 1px)',
                            backgroundSize: `${1000 * pixelsPerMs}px 100%`
                        }}
                    />

                    {tracks.map((track) => (
                        <TrackRow
                            key={track.id}
                            trackId={track.id}
                            type={track.type}
                            pixelsPerMs={pixelsPerMs}
                            timelineDurationMs={durationMs}
                        />
                    ))}

                    {/* Drop Zone for new tracks */}
                    <div
                        className="h-32 flex items-center justify-center text-zinc-600 border-t border-zinc-800/50 hover:bg-zinc-900/30 transition-colors cursor-pointer"
                        onClick={() => addTrack('video')}
                    >
                        <span className="text-sm">Click or Drag here to add track</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
