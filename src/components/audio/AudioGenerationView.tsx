'use client';

import { Play, Pause, Download, RefreshCw, Wand2, Save, GripVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { VoiceSelector } from './VoiceSelector';
import { TTSVoice, getDefaultVoice } from '@/lib/tts-voices';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast, { Toaster } from 'react-hot-toast';
import { useSettingsStore } from '@/store/useSettingsStore';

interface Scene {
    id: number;
    text: string;
    audioUrl?: string;
}

interface AudioGenerationViewProps {
    scenes: Scene[];
}

interface SortableSceneItemProps {
    scene: Scene;
    playingId: number | null;
    generatingId: number | null;
    isGeneratingAll: boolean;
    togglePlay: (id: number, url?: string) => void;
    handleGenerateAudio: (scene: Scene) => void;
    handleDownload: (scene: Scene) => void;
    handleTextChange: (id: number, text: string) => void;
    audioRef: (el: HTMLAudioElement | null) => void;
}

function SortableSceneItem({
    scene,
    playingId,
    generatingId,
    isGeneratingAll,
    togglePlay,
    handleGenerateAudio,
    handleDownload,
    handleTextChange,
    audioRef
}: SortableSceneItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: scene.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)] flex gap-3 group hover:border-[var(--text-gray)] transition-colors relative items-start"
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 cursor-grab text-[var(--text-gray)] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <GripVertical className="w-4 h-4" />
            </div>

            <div className="w-6 h-6 rounded-full bg-[#2b2b36] flex items-center justify-center text-[0.8rem] font-bold text-[var(--text-gray)] shrink-0 mt-1 ml-5">
                {scene.id}
            </div>

            <div className="flex-1 flex flex-col gap-2">
                <textarea
                    value={scene.text}
                    onChange={(e) => handleTextChange(scene.id, e.target.value)}
                    className="w-full bg-transparent text-[0.9rem] text-white leading-relaxed outline-none resize-none border border-transparent focus:border-[var(--border-color)] rounded p-1.5 transition-colors min-h-[60px]"
                    placeholder="스크립트를 입력하세요..."
                />

                <div className="flex items-center gap-3">
                    {/* Audio Player */}
                    <div className="flex-1 h-8 bg-[#15151e] rounded-full border border-[var(--border-color)] flex items-center px-2.5 gap-2.5">
                        <button
                            onClick={() => togglePlay(scene.id, scene.audioUrl)}
                            disabled={!scene.audioUrl && !generatingId}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-white transition-transform ${scene.audioUrl ? 'bg-[var(--primary-color)] hover:scale-105' : 'bg-[#2b2b36] cursor-not-allowed'
                                }`}
                        >
                            {playingId === scene.id ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 ml-0.5" />}
                        </button>

                        {scene.audioUrl ? (
                            <div className="flex-1 h-1 bg-[#2b2b36] rounded-full overflow-hidden">
                                <div className="h-full bg-[var(--primary-color)] w-[0%]"></div>
                            </div>
                        ) : (
                            <span className="text-[0.7rem] text-[var(--text-gray)] flex-1">
                                {generatingId === scene.id ? 'Generating...' : 'No audio generated'}
                            </span>
                        )}

                        {scene.audioUrl && <span className="text-[0.65rem] text-[var(--text-gray)]">00:00</span>}

                        {/* Hidden Audio Element */}
                        {scene.audioUrl && (
                            <audio
                                ref={audioRef}
                                src={scene.audioUrl}
                                onEnded={() => togglePlay(scene.id, scene.audioUrl)} // Reset play state on end
                                className="hidden"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handleGenerateAudio(scene)}
                            disabled={generatingId === scene.id || isGeneratingAll}
                            className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-gray)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate/Regenerate"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${generatingId === scene.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => handleDownload(scene)}
                            disabled={!scene.audioUrl}
                            className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-gray)] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Download"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AudioGenerationView({ scenes }: AudioGenerationViewProps) {
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [generatingId, setGeneratingId] = useState<number | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<TTSVoice>(getDefaultVoice());
    const [speed, setSpeed] = useState(1.0);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const audioRefs = useRef<{ [key: number]: HTMLAudioElement | null }>({});

    const { updateScene, updateScenes, saveCurrentProject, updateProjectInfo } = useProjectStore();
    const { googleCredentials } = useSettingsStore();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = scenes.findIndex((scene) => scene.id === active.id);
            const newIndex = scenes.findIndex((scene) => scene.id === over.id);

            const newScenes = arrayMove(scenes, oldIndex, newIndex);
            updateScenes(newScenes);
        }
    };

    const handleTextChange = (id: number, text: string) => {
        updateScene(id, { text });
    };

    const handleSaveToLibrary = () => {
        updateProjectInfo({ type: 'audio' });
        saveCurrentProject();
        toast.success('Project saved to library!');
    };

    const handleGenerateAudio = async (scene: Scene, voiceId?: string) => {
        setGeneratingId(scene.id);
        try {
            const response = await fetch('/api/audio/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: scene.text,
                    voiceId: voiceId || selectedVoice.id,
                    speed: speed,
                    googleCredentials: googleCredentials // Send in body
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Audio generation failed');
            }

            const data = await response.json();
            updateScene(scene.id, { audioUrl: data.audioUrl });
        } catch (error) {
            console.error(error);
            toast.error('오디오 생성 실패: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setGeneratingId(null);
        }
    };

    const handleGenerateAll = async () => {
        setIsGeneratingAll(true);
        for (const scene of scenes) {
            await handleGenerateAudio(scene);
            // Small delay between generations
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        setIsGeneratingAll(false);
        toast.success('All audio generated!');
    };

    const handleVoicePreview = async (voice: TTSVoice) => {
        try {
            const response = await fetch('/api/audio/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: '안녕하세요. 저는 ' + voice.name + ' 입니다.',
                    voiceId: voice.id,
                    speed: 1.0,
                    googleCredentials: googleCredentials // Send in body
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Preview failed');
            }

            const data = await response.json();
            const audio = new Audio(data.audioUrl);
            audio.play();
        } catch (error) {
            console.error('Preview error:', error);
            toast.error('Preview failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const togglePlay = (id: number, url?: string) => {
        if (!url) return;

        if (playingId === id) {
            audioRefs.current[id]?.pause();
            setPlayingId(null);
        } else {
            // Stop others
            if (playingId !== null) {
                audioRefs.current[playingId]?.pause();
            }

            // Play new
            const audio = audioRefs.current[id];
            if (audio) {
                audio.play();
                setPlayingId(id);
            }
        }
    };

    const handleDownload = (scene: Scene) => {
        if (!scene.audioUrl) return;
        const link = document.createElement('a');
        link.href = scene.audioUrl;
        link.download = `scene-${scene.id}-audio.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <Toaster position="top-center" />

            {/* Global Settings */}
            <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)]">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[0.9rem] font-semibold text-white">Audio Settings</h3>
                    <button
                        onClick={handleSaveToLibrary}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2b2b36] hover:bg-[#3b3b46] text-white text-xs font-medium transition-colors"
                    >
                        <Save className="w-3.5 h-3.5" />
                        Save to Library
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {/* Voice Selection */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.75rem] text-[var(--text-gray)] font-medium">음성 선택</label>
                        <VoiceSelector
                            selectedVoice={selectedVoice}
                            onVoiceChange={setSelectedVoice}
                            onPreview={handleVoicePreview}
                        />
                    </div>

                    {/* Speed Control */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.75rem] text-[var(--text-gray)] font-medium">
                            속도: {speed.toFixed(1)}x
                        </label>
                        <div className="bg-[#15151e] border border-[var(--border-color)] rounded-lg p-2.5 flex items-center gap-3">
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={speed}
                                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                className="flex-1 accent-[var(--primary-color)]"
                            />
                            <span className="text-xs text-white font-medium min-w-[2.5rem] text-right">
                                {speed.toFixed(1)}x
                            </span>
                        </div>
                    </div>

                    {/* Generate All Button */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.75rem] text-[var(--text-gray)] font-medium">일괄 생성</label>
                        <button
                            onClick={handleGenerateAll}
                            disabled={isGeneratingAll || generatingId !== null}
                            className="h-full bg-[var(--primary-color)] text-white rounded-lg hover:bg-[#4a4ddb] transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            <Wand2 className={`w-4 h-4 ${isGeneratingAll ? 'animate-spin' : ''}`} />
                            {isGeneratingAll ? '생성 중...' : '전체 생성'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Scene List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={scenes.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="flex flex-col gap-2.5">
                            {scenes.map((scene) => (
                                <SortableSceneItem
                                    key={scene.id}
                                    scene={scene}
                                    playingId={playingId}
                                    generatingId={generatingId}
                                    isGeneratingAll={isGeneratingAll}
                                    togglePlay={togglePlay}
                                    handleGenerateAudio={handleGenerateAudio}
                                    handleDownload={handleDownload}
                                    handleTextChange={handleTextChange}
                                    audioRef={(el) => (audioRefs.current[scene.id] = el)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}
