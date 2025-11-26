"use client";

import { useTimelineStore, TimelineClip } from "@/store/useTimelineStore";
import { useShallow } from "zustand/react/shallow";
import { X } from "lucide-react";

export function PropertyPanel() {
    const { selectedClipIds, tracks, updateClip, setSelectedClipIds } = useTimelineStore(useShallow(state => ({
        selectedClipIds: state.selectedClipIds,
        tracks: state.timeline.tracks,
        updateClip: state.updateClip,
        setSelectedClipIds: state.setSelectedClipIds
    })));

    if (selectedClipIds.length === 0) {
        return (
            <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-4 text-zinc-500 text-sm">
                Select a clip to edit properties
            </div>
        );
    }

    // For now, just handle single selection
    const clipId = selectedClipIds[0];
    let clip: TimelineClip | undefined;

    for (const track of tracks) {
        const found = track.clips.find(c => c.id === clipId);
        if (found) {
            clip = found;
            break;
        }
    }

    if (!clip) return null;

    return (
        <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-y-auto">
            <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50">
                <span className="font-medium text-white">Properties</span>
                <button onClick={() => setSelectedClipIds([])} className="text-zinc-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* Common Properties */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Start Time (ms)</label>
                    <input
                        type="number"
                        value={Math.round(clip.startMs)}
                        onChange={(e) => updateClip(clipId, { startMs: Number(e.target.value) })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Duration (ms)</label>
                    <input
                        type="number"
                        value={Math.round(clip.endMs - clip.startMs)}
                        onChange={(e) => updateClip(clipId, { endMs: clip.startMs + Number(e.target.value) })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                    />
                </div>

                {/* Type Specific Properties */}
                {clip.type === 'text' && (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                        <h3 className="text-sm font-medium text-white">Text Style</h3>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400">Content</label>
                            <textarea
                                value={clip.content}
                                onChange={(e) => updateClip(clipId, { content: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white h-20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400">Font Size</label>
                            <input
                                type="number"
                                value={clip.style.fontSize}
                                onChange={(e) => updateClip(clipId, { style: { ...clip.style, fontSize: Number(e.target.value) } })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400">Color</label>
                            <input
                                type="color"
                                value={clip.style.color}
                                onChange={(e) => updateClip(clipId, { style: { ...clip.style, color: e.target.value } })}
                                className="w-full h-8 bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {clip.type === 'shape' && (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                        <h3 className="text-sm font-medium text-white">Shape Style</h3>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400">Fill Color</label>
                            <input
                                type="color"
                                value={clip.style.fillColor}
                                onChange={(e) => updateClip(clipId, { style: { ...clip.style, fillColor: e.target.value } })}
                                className="w-full h-8 bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* Transform Properties (Position/Size) - Simplified for now */}
                {(clip.type === 'text' || clip.type === 'shape') && (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                        <h3 className="text-sm font-medium text-white">Transform</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">X Position (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={clip.position.x}
                                    onChange={(e) => updateClip(clipId, { position: { ...clip.position, x: Number(e.target.value) } })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Y Position (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={clip.position.y}
                                    onChange={(e) => updateClip(clipId, { position: { ...clip.position, y: Number(e.target.value) } })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
