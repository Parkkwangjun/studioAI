import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';

// --- Types ---

export type TimelineTrackType = "video" | "audio" | "text" | "shape" | "image";

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce';

export interface KeyframeData {
    id: string;
    timeMs: number;
    value: number;
    easing: EasingType;
}

export type TransitionType = 'none' | 'cross-dissolve' | 'wipe-left' | 'wipe-right';

export interface Transition {
    type: TransitionType;
    durationMs: number;
}

export interface ClipFilter {
    brightness: number; // 1.0 = normal
    contrast: number;   // 1.0 = normal
    saturation: number; // 1.0 = normal
    grayscale: number;  // 0.0 = none, 1.0 = full
}

export interface TimelineClipBase {
    id: string;
    trackId: string;
    startMs: number; // Start time on timeline
    endMs: number;   // End time on timeline
    isSelected?: boolean;
    transitionIn?: Transition;
    filter?: ClipFilter;
}

export interface MediaClip extends TimelineClipBase {
    type: "video" | "image" | "audio";
    assetId: string; // Reference to Supabase Asset ID
    sourceStartMs: number; // Start time in source media
    src?: string; // URL for preview
    title?: string;
    opacity?: number | KeyframeData[];
    volume?: number | KeyframeData[];
}

export interface TextClip extends TimelineClipBase {
    type: "text";
    content: string;
    style: {
        fontFamily: string;
        fontSize: number;
        color: string;
        backgroundColor?: string;
        textAlign: "left" | "center" | "right";
        bold?: boolean;
        italic?: boolean;
    };
    position: { x: number; y: number }; // Normalized 0-1
    size?: { width: number; height: number }; // Normalized 0-1
    opacity?: number | KeyframeData[];
    rotation?: number | KeyframeData[];
    scale?: number | KeyframeData[];
}

export interface ShapeClip extends TimelineClipBase {
    type: "shape";
    shapeType: "rectangle" | "circle";
    style: {
        fillColor: string;
        strokeColor?: string;
        strokeWidth?: number;
        opacity: number;
    };
    position: { x: number; y: number }; // Normalized 0-1
    size: { width: number; height: number }; // Normalized 0-1
    opacity?: number | KeyframeData[];
    rotation?: number | KeyframeData[];
    scale?: number | KeyframeData[];
}

export type TimelineClip = MediaClip | TextClip | ShapeClip;

export interface TimelineTrack {
    id: string;
    type: TimelineTrackType;
    name: string;
    index: number; // Vertical order (0 = top)
    isMuted: boolean;
    isLocked: boolean;
    clips: TimelineClip[];
}

export interface TimelineProject {
    id: string;
    durationMs: number;
    tracks: TimelineTrack[];
    fps: number;
}

interface TimelineState {
    timeline: TimelineProject;
    zoomLevel: number;
    scrollPosition: number;
    playback: {
        isPlaying: boolean;
        currentTime: number;
    };
    selectedClipIds: string[];
    snappingEnabled: boolean;

    // Actions
    setTimeline: (timeline: TimelineProject) => void;
    addTrack: (type: TimelineTrackType, id?: string) => void;
    addClip: (trackId: string, clip: Omit<TimelineClip, 'id' | 'trackId'>) => void;
    moveClip: (clipId: string, newTrackId: string, newStartMs: number) => void;
    updateClip: (clipId: string, partial: Partial<TimelineClip>) => void;
    deleteClip: (clipId: string) => void;
    toggleMuteTrack: (trackId: string) => void;
    setPlaybackTime: (timeMs: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setZoomLevel: (level: number) => void;
    setSelectedClipIds: (ids: string[]) => void;
    splitClip: (clipId: string, splitTimeMs: number) => void;
    toggleSnapping: () => void;

    // Keyframe Actions
    addKeyframe: (clipId: string, property: string, keyframe: KeyframeData) => void;
    removeKeyframe: (clipId: string, property: string, keyframeId: string) => void;
    updateKeyframe: (clipId: string, property: string, keyframeId: string, updates: Partial<KeyframeData>) => void;

    // Transition Actions
    setClipTransition: (clipId: string, transition: Transition) => void;

    // Filter Actions
    updateClipFilter: (clipId: string, filter: Partial<ClipFilter>) => void;
}

// --- Store ---

export const useTimelineStore = create<TimelineState>()(
    temporal(
        immer((set) => ({
            timeline: {
                id: uuidv4(),
                durationMs: 30000, // Default 30s
                tracks: [
                    { id: 'track-1', type: 'video', name: 'Video 1', index: 0, isMuted: false, isLocked: false, clips: [] },
                    { id: 'track-2', type: 'audio', name: 'Audio 1', index: 1, isMuted: false, isLocked: false, clips: [] },
                ],
                fps: 30,
            },
            zoomLevel: 1,
            scrollPosition: 0,
            playback: {
                isPlaying: false,
                currentTime: 0,
            },
            selectedClipIds: [],
            snappingEnabled: true,

            setTimeline: (timeline) => set((state) => {
                state.timeline = timeline;
            }),

            addTrack: (type, id) => set((state) => {
                const newTrack: TimelineTrack = {
                    id: id || uuidv4(),
                    type,
                    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${state.timeline.tracks.length + 1}`,
                    index: state.timeline.tracks.length,
                    isMuted: false,
                    isLocked: false,
                    clips: [],
                };
                state.timeline.tracks.push(newTrack);
            }),

            addClip: (trackId, clipData) => set((state) => {
                const track = state.timeline.tracks.find(t => t.id === trackId);
                if (track) {
                    const newClip = {
                        ...clipData,
                        id: uuidv4(),
                        trackId,
                    } as TimelineClip;
                    track.clips.push(newClip);
                }
            }),

            moveClip: (clipId, newTrackId, newStartMs) => set((state) => {
                let clipToMove: TimelineClip | undefined;
                let oldTrackIndex = -1;
                let clipIndex = -1;

                // 1. Find and remove clip from old track
                state.timeline.tracks.forEach((track, tIndex) => {
                    const cIndex = track.clips.findIndex(c => c.id === clipId);
                    if (cIndex !== -1) {
                        clipToMove = track.clips[cIndex];
                        oldTrackIndex = tIndex;
                        clipIndex = cIndex;
                    }
                });

                if (clipToMove && oldTrackIndex !== -1) {
                    // Remove from old track
                    state.timeline.tracks[oldTrackIndex].clips.splice(clipIndex, 1);

                    // Update properties
                    clipToMove.trackId = newTrackId;
                    clipToMove.startMs = Math.max(0, newStartMs);
                    clipToMove.endMs = Math.max(0, newStartMs) + (clipToMove.endMs - clipToMove.startMs);

                    // Add to new track
                    const newTrack = state.timeline.tracks.find(t => t.id === newTrackId);
                    if (newTrack) {
                        newTrack.clips.push(clipToMove);
                    }
                }
            }),

            updateClip: (clipId, partial) => set((state) => {
                for (const track of state.timeline.tracks) {
                    const clip = track.clips.find(c => c.id === clipId);
                    if (clip) {
                        Object.assign(clip, partial);
                        break;
                    }
                }
            }),

            deleteClip: (clipId) => set((state) => {
                for (const track of state.timeline.tracks) {
                    const index = track.clips.findIndex(c => c.id === clipId);
                    if (index !== -1) {
                        track.clips.splice(index, 1);
                        break;
                    }
                }
            }),

            toggleMuteTrack: (trackId) => set((state) => {
                const track = state.timeline.tracks.find(t => t.id === trackId);
                if (track) {
                    track.isMuted = !track.isMuted;
                }
            }),

            setPlaybackTime: (timeMs) => set((state) => {
                state.playback.currentTime = timeMs;
            }),

            setIsPlaying: (isPlaying) => set((state) => {
                state.playback.isPlaying = isPlaying;
            }),

            setZoomLevel: (level) => set((state) => {
                state.zoomLevel = level;
            }),

            setSelectedClipIds: (ids) => set((state) => {
                state.selectedClipIds = ids;
            }),

            splitClip: (clipId, splitTimeMs) => set((state) => {
                let trackIndex = -1;
                let clipIndex = -1;
                let clip: TimelineClip | undefined;

                // Find clip
                state.timeline.tracks.forEach((t, tIdx) => {
                    const cIdx = t.clips.findIndex(c => c.id === clipId);
                    if (cIdx !== -1) {
                        trackIndex = tIdx;
                        clipIndex = cIdx;
                        clip = t.clips[cIdx];
                    }
                });

                if (!clip || trackIndex === -1) return;

                // Validate split time
                if (splitTimeMs <= clip.startMs || splitTimeMs >= clip.endMs) return;

                const firstPartDuration = splitTimeMs - clip.startMs;

                // Create second part
                const secondPart = {
                    ...clip,
                    id: uuidv4(),
                    startMs: splitTimeMs,
                    endMs: clip.endMs,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    sourceStartMs: (clip as any).sourceStartMs + firstPartDuration,
                } as TimelineClip;

                // Update first part
                clip.endMs = splitTimeMs;

                // Insert second part
                state.timeline.tracks[trackIndex].clips.splice(clipIndex + 1, 0, secondPart);

                // Select new part
                state.selectedClipIds = [secondPart.id];
            }),

            toggleSnapping: () => set((state) => {
                state.snappingEnabled = !state.snappingEnabled;
            }),

            addKeyframe: (clipId, property, keyframe) => set((state) => {
                for (const track of state.timeline.tracks) {
                    const clip = track.clips.find(c => c.id === clipId);
                    if (clip) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const currentValue = (clip as any)[property];
                        let newKeyframes: KeyframeData[] = [];

                        if (Array.isArray(currentValue)) {
                            newKeyframes = [...currentValue, keyframe];
                        } else {
                            newKeyframes = [keyframe];
                        }

                        newKeyframes.sort((a, b) => a.timeMs - b.timeMs);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (clip as any)[property] = newKeyframes;
                        break;
                    }
                }
            }),

            removeKeyframe: (clipId, property, keyframeId) => set((state) => {
                for (const track of state.timeline.tracks) {
                    const clip = track.clips.find(c => c.id === clipId);
                    if (clip) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const currentValue = (clip as any)[property];
                        if (Array.isArray(currentValue)) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (clip as any)[property] = currentValue.filter(k => k.id !== keyframeId);
                        }
                        break;
                    }
                }
            }),

            updateKeyframe: (clipId, property, keyframeId, updates) => set((state) => {
                for (const track of state.timeline.tracks) {
                    const clip = track.clips.find(c => c.id === clipId);
                    if (clip) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const currentValue = (clip as any)[property];
                        if (Array.isArray(currentValue)) {
                            const kf = currentValue.find(k => k.id === keyframeId);
                            if (kf) {
                                Object.assign(kf, updates);
                                if (updates.timeMs !== undefined) {
                                    currentValue.sort((a, b) => a.timeMs - b.timeMs);
                                }
                            }
                        }
                        break;
                    }
                }
            }),

            setClipTransition: (clipId, transition) => set((state) => {
                for (const track of state.timeline.tracks) {
                    const clip = track.clips.find(c => c.id === clipId);
                    if (clip) {
                        clip.transitionIn = transition;
                        break;
                    }
                }
            }),

            updateClipFilter: (clipId, filter) => set((state) => {
                for (const track of state.timeline.tracks) {
                    const clip = track.clips.find(c => c.id === clipId);
                    if (clip) {
                        if (!clip.filter) {
                            clip.filter = { brightness: 1, contrast: 1, saturation: 1, grayscale: 0 };
                        }
                        Object.assign(clip.filter, filter);
                        break;
                    }
                }
            }),
        })),
        {
            partialize: (state) => ({
                timeline: state.timeline,
                zoomLevel: state.zoomLevel,
                snappingEnabled: state.snappingEnabled
            }),
        }
    )
);
