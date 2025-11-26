"use client";

import { useRef, useState } from "react";
import { useTimelineStore, TimelineClip, KeyframeData } from "@/store/useTimelineStore";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { v4 as uuidv4 } from 'uuid'; // Added for generating new track IDs

interface TrackRowProps {
    trackId: string;
    type: 'video' | 'audio' | 'text' | 'image' | 'shape';
    pixelsPerMs: number;
    timelineDurationMs: number;
}

export function TrackRow({ trackId, type, pixelsPerMs, timelineDurationMs }: TrackRowProps) {
    // Select only the specific track to avoid re-renders when other tracks change
    const track = useTimelineStore(useShallow(state => state.timeline.tracks.find(t => t.id === trackId)));

    // Select actions (stable references)
    const { deleteClip, updateClip, moveClip } = useTimelineStore(useShallow(state => ({
        deleteClip: state.deleteClip,
        updateClip: state.updateClip,
        moveClip: state.moveClip
    })));

    const clips = track?.clips || [];

    return (
        <div className="relative w-full h-16 bg-zinc-900/50 border-b border-zinc-800 flex flex-col select-none group">
            <div className="flex-1 relative overflow-hidden">
                {clips.map(clip => (
                    <ClipView
                        key={clip.id}
                        clip={clip}
                        trackId={trackId}
                        pixelsPerMs={pixelsPerMs}
                        timelineDurationMs={timelineDurationMs}
                        onUpdate={(id, updates) => updateClip(id, updates)}
                        onRemove={(id) => deleteClip(id)}
                        onMove={(id, newTrackId, newStartMs) => moveClip(id, newTrackId, newStartMs)}
                    />
                ))}
            </div>
        </div>
    );
}

interface ClipViewProps {
    clip: TimelineClip;
    trackId: string;
    pixelsPerMs: number;
    timelineDurationMs: number;
    onUpdate: (id: string, updates: Partial<TimelineClip>) => void;
    onRemove: (id: string) => void;
    onMove: (id: string, newTrackId: string, newStartMs: number) => void;
}

function ClipView({ clip, trackId, pixelsPerMs, timelineDurationMs, onUpdate, onRemove, onMove }: ClipViewProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Granular selectors
    const isSelected = useTimelineStore(state => state.selectedClipIds.includes(clip.id));
    const snappingEnabled = useTimelineStore(state => state.snappingEnabled);
    const setSelectedClipIds = useTimelineStore(state => state.setSelectedClipIds);
    const setPlaybackTime = useTimelineStore(state => state.setPlaybackTime);

    const left = clip.startMs * pixelsPerMs;
    const width = (clip.endMs - clip.startMs) * pixelsPerMs;

    // Collect keyframes
    const keyframes: { timeMs: number, property: string, id: string }[] = [];
    ['opacity', 'scale', 'rotation', 'volume'].forEach(prop => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const val = (clip as any)[prop];
        if (Array.isArray(val)) {
            val.forEach((k: KeyframeData) => {
                if (!keyframes.some(existing => Math.abs(existing.timeMs - k.timeMs) < 1)) {
                    keyframes.push({ timeMs: k.timeMs, property: prop, id: k.id });
                }
            });
        }
    });

    // Helper to find snap time - Uses getState() to avoid subscribing to playback/timeline updates
    const getSnapTime = (targetMs: number) => {
        if (!snappingEnabled) return targetMs;

        const state = useTimelineStore.getState();
        const thresholdMs = 20 / pixelsPerMs; // 20px threshold
        let closestMs = targetMs;
        let minDiff = Infinity;

        // Snap points: 0, Playhead
        const snapPoints = [0, state.playback.currentTime];

        // Add other clips' start/end as snap points
        state.timeline.tracks.forEach(t => {
            t.clips.forEach(c => {
                if (c.id === clip.id) return; // Skip self
                snapPoints.push(c.startMs);
                snapPoints.push(c.endMs);
            });
        });

        for (const point of snapPoints) {
            const diff = Math.abs(targetMs - point);
            if (diff < thresholdMs && diff < minDiff) {
                minDiff = diff;
                closestMs = point;
            }
        }

        return closestMs;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.button !== 0) return; // Only left click

        setSelectedClipIds([clip.id]); // Select on click

        const startX = e.clientX;
        const startY = e.clientY;
        const startMs = clip.startMs;

        setIsDragging(true);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaMs = deltaX / pixelsPerMs;
            let newStartMs = Math.max(0, startMs + deltaMs);

            // Apply snapping
            newStartMs = getSnapTime(newStartMs);

            // Snap to 0 if close
            if (newStartMs < 100) newStartMs = 0;

            onUpdate(clip.id, { startMs: newStartMs, endMs: newStartMs + (clip.endMs - clip.startMs) });
        };

        const handleMouseUpWithEvent = (upEvent: MouseEvent) => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUpWithEvent);

            const deltaX = upEvent.clientX - startX;
            const deltaY = upEvent.clientY - startY;

            const deltaMs = deltaX / pixelsPerMs;
            let newStartMs = Math.max(0, startMs + deltaMs);
            newStartMs = getSnapTime(newStartMs);
            if (newStartMs < 100) newStartMs = 0;

            // Vertical Logic
            const TRACK_HEIGHT = 64; // h-16
            const trackOffset = Math.round(deltaY / TRACK_HEIGHT);

            if (trackOffset !== 0) {
                const state = useTimelineStore.getState();
                const currentTrackIndex = state.timeline.tracks.findIndex(t => t.id === trackId);
                const targetTrackIndex = currentTrackIndex + trackOffset;

                if (targetTrackIndex >= 0 && targetTrackIndex < state.timeline.tracks.length) {
                    // Move to existing track
                    const targetTrack = state.timeline.tracks[targetTrackIndex];
                    // Check compatibility
                    if (targetTrack.type === clip.type || (['video', 'image', 'text', 'shape'].includes(clip.type) && ['video', 'image', 'text', 'shape'].includes(targetTrack.type))) {
                        state.moveClip(clip.id, targetTrack.id, newStartMs);
                    } else {
                        // Revert to original track but new time
                        onUpdate(clip.id, { startMs: newStartMs, endMs: newStartMs + (clip.endMs - clip.startMs) });
                    }
                } else if (targetTrackIndex >= state.timeline.tracks.length) {
                    // Create new track at bottom
                    const newTrackId = uuidv4();
                    state.addTrack(clip.type === 'audio' ? 'audio' : 'video', newTrackId);
                    state.moveClip(clip.id, newTrackId, newStartMs);
                } else {
                    // Top boundary - just update time
                    onUpdate(clip.id, { startMs: newStartMs, endMs: newStartMs + (clip.endMs - clip.startMs) });
                }
            } else {
                // Same track, just time update
                onUpdate(clip.id, { startMs: newStartMs, endMs: newStartMs + (clip.endMs - clip.startMs) });
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUpWithEvent);
    };

    const handleResize = (e: React.MouseEvent, direction: 'left' | 'right') => {
        e.stopPropagation();
        const startX = e.clientX;
        const startMs = clip.startMs;
        const duration = clip.endMs - clip.startMs;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const startSourceMs = (clip as any).sourceStartMs || 0;

        setIsResizing(true);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaMs = deltaX / pixelsPerMs;

            if (direction === 'right') {
                let newEndMs = startMs + duration + deltaMs;
                // Snap end time
                newEndMs = getSnapTime(newEndMs);

                const newDuration = Math.max(500, newEndMs - startMs); // Min 500ms
                onUpdate(clip.id, { endMs: startMs + newDuration });
            } else {
                // Left resize logic (trim start)
                let newStartMs = startMs + deltaMs;
                // Snap start time
                newStartMs = getSnapTime(newStartMs);

                newStartMs = Math.min(newStartMs, startMs + duration - 500);
                const change = newStartMs - startMs;
                onUpdate(clip.id, {
                    startMs: newStartMs,
                    sourceStartMs: Math.max(0, startSourceMs + change)
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            ref={ref}
            className={cn(
                "absolute top-1 bottom-1 rounded-md overflow-hidden cursor-move border border-white/10 group/clip",
                clip.type === 'video' && "bg-blue-600/80",
                clip.type === 'image' && "bg-purple-600/80",
                clip.type === 'audio' && "bg-green-600/80",
                clip.type === 'text' && "bg-orange-600/80",
                clip.type === 'shape' && "bg-red-600/80",
                isDragging && "opacity-80 z-50 ring-2 ring-white",
                isResizing && "z-50",
                isSelected && "ring-2 ring-yellow-400 z-40" // Highlight selection
            )}
            style={{
                left: `${left}px`,
                width: `${width}px`,
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="px-2 py-1 text-xs text-white font-medium truncate flex items-center justify-between h-full relative">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <span className="z-10">{(clip as any).title || clip.type}</span>

                {/* Transition Indicator */}
                {clip.transitionIn && clip.transitionIn.type !== 'none' && (
                    <div
                        className="absolute left-0 top-0 bottom-0 bg-white/20 z-0 pointer-events-none border-r border-white/30"
                        style={{ width: `${clip.transitionIn.durationMs * pixelsPerMs}px` }}
                        title={`Transition: ${clip.transitionIn.type}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                    </div>
                )}

                {/* Keyframe Markers */}
                {keyframes.map(k => (
                    <div
                        key={k.id}
                        className="absolute w-2 h-2 bg-white rotate-45 transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer hover:bg-yellow-400 shadow-sm"
                        style={{ left: `${k.timeMs * pixelsPerMs}px`, top: '80%' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setPlaybackTime(clip.startMs + k.timeMs);
                        }}
                        title={`Keyframe: ${k.property}`}
                    />
                ))}

                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(clip.id); }}
                    className="opacity-0 group-hover/clip:opacity-100 hover:text-red-400 transition-opacity z-10"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>

            {/* Resize Handles */}
            <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-10"
                onMouseDown={(e) => handleResize(e, 'left')}
            />
            <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-10"
                onMouseDown={(e) => handleResize(e, 'right')}
            />
        </div>
    );
}
