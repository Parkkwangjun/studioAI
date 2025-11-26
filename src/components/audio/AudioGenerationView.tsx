'use client';

import { Play, Pause, Download, RefreshCw, Wand2, Save, GripVertical, Settings2, Trash2, Copy } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, memo } from 'react';
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
    handleDelete: (id: number) => void;
    handleDuplicate: (scene: Scene) => void;
    isSelected: boolean;
    onSelect: (id: number) => void;
    setAudioRef: (id: number, el: HTMLAudioElement | null) => void;
}

const SortableSceneItem = memo(function SortableSceneItem({
    scene,
    playingId,
    generatingId,
    isGeneratingAll,
    togglePlay,
    handleGenerateAudio,
    handleDownload,
    handleTextChange,
    handleDelete,
    handleDuplicate,
    isSelected,
    onSelect,
    setAudioRef
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

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [scene.text]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelect(scene.id)}
            className={`bg-(--bg-card) p-2 rounded-lg border flex gap-2 group transition-colors relative items-start ${isSelected ? 'border-(--primary-color) ring-1 ring-(--primary-color)' : 'border-(--border-color) hover:border-(--text-gray)'
                }`}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab text-(--text-gray) hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <GripVertical className="w-3 h-3" />
            </div>

            <div className="w-5 h-5 rounded-full bg-[#2b2b36] flex items-center justify-center text-[0.7rem] font-bold text-(--text-gray) shrink-0 mt-1 ml-4">
                {scene.id}
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
                <textarea
                    ref={textareaRef}
                    value={scene.text}
                    onChange={(e) => handleTextChange(scene.id, e.target.value)}
                    className="w-full bg-transparent text-[0.85rem] text-white leading-relaxed outline-none resize-none border border-transparent focus:border-(--border-color) rounded p-1 transition-colors min-h-[32px] overflow-hidden"
                    placeholder="스크립트를 입력하세요..."
                    rows={1}
                />

                <div className="flex items-center gap-2">
                    {/* Audio Player */}
                    <div className="flex-1 h-7 bg-[#15151e] rounded-full border border-(--border-color) flex items-center px-2 gap-2">
                        <button
                            onClick={() => togglePlay(scene.id, scene.audioUrl)}
                            disabled={!scene.audioUrl && !generatingId}
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-white transition-transform ${scene.audioUrl ? 'bg-(--primary-color) hover:scale-105' : 'bg-[#2b2b36] cursor-not-allowed'
                                }`}
                        >
                            {playingId === scene.id ? <Pause className="w-2 h-2" /> : <Play className="w-2 h-2 ml-0.5" />}
                        </button>

                        {scene.audioUrl ? (
                            <div className="flex-1 h-1 bg-[#2b2b36] rounded-full overflow-hidden">
                                <div className="h-full bg-(--primary-color) w-[0%]"></div>
                            </div>
                        ) : (
                            <span className="text-[0.65rem] text-(--text-gray) flex-1">
                                {generatingId === scene.id ? '생성 중...' : '오디오 없음'}
                            </span>
                        )}

                        {scene.audioUrl && <span className="text-[0.6rem] text-(--text-gray)">00:00</span>}

                        {/* Hidden Audio Element */}
                        {scene.audioUrl && (
                            <audio
                                ref={(el) => setAudioRef(scene.id, el)}
                                src={scene.audioUrl}
                                onEnded={() => togglePlay(scene.id, scene.audioUrl)} // Reset play state on end
                                className="hidden"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(scene); }}
                            className="p-1.5 rounded-md hover:bg-white/5 text-(--text-gray) hover:text-white transition-colors"
                            title="복제"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleGenerateAudio(scene); }}
                            disabled={generatingId === scene.id || isGeneratingAll}
                            className="p-1.5 rounded-md hover:bg-white/5 text-(--text-gray) hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="생성/재생성"
                        >
                            <RefreshCw className={`w-3 h-3 ${generatingId === scene.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(scene); }}
                            disabled={!scene.audioUrl}
                            className="p-1.5 rounded-md hover:bg-white/5 text-(--text-gray) hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="다운로드"
                        >
                            <Download className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(scene.id); }}
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-(--text-gray) hover:text-red-500 transition-colors"
                            title="삭제"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export function AudioGenerationView({ scenes }: AudioGenerationViewProps) {
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [generatingId, setGeneratingId] = useState<number | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<TTSVoice>(getDefaultVoice());
    const [speed, setSpeed] = useState(1.0);
    const [pitch, setPitch] = useState(0); // Added Pitch
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
    const [copiedScene, setCopiedScene] = useState<Scene | null>(null);
    const audioRefs = useRef<{ [key: number]: HTMLAudioElement | null }>({});

    const { updateScene, updateScenes, saveCurrentProject, updateProjectInfo, addAsset } = useProjectStore();
    const { googleCredentials, kieKey } = useSettingsStore();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const setAudioRef = useCallback((id: number, el: HTMLAudioElement | null) => {
        audioRefs.current[id] = el;
    }, []);

    const handleDuplicate = useCallback((scene: Scene) => {
        const newId = Math.max(...scenes.map(s => s.id), 0) + 1;
        const newScene = {
            ...scene,
            id: newId,
            audioUrl: undefined
        };
        const newScenes = [...scenes, newScene];
        updateScenes(newScenes);
        toast.success('장면이 붙여넣기 되었습니다.');
    }, [scenes, updateScenes]);

    // Keyboard Shortcuts for Copy/Paste
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c' && selectedSceneId) {
                    const sceneToCopy = scenes.find(s => s.id === selectedSceneId);
                    if (sceneToCopy) {
                        setCopiedScene(sceneToCopy);
                        toast.success('장면이 복사되었습니다.');
                    }
                } else if (e.key === 'v' && copiedScene) {
                    handleDuplicate(copiedScene);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSceneId, copiedScene, scenes, handleDuplicate]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = scenes.findIndex((scene) => scene.id === active.id);
            const newIndex = scenes.findIndex((scene) => scene.id === over.id);

            const newScenes = arrayMove(scenes, oldIndex, newIndex);
            updateScenes(newScenes);
        }
    }, [scenes, updateScenes]);

    const handleTextChange = useCallback((id: number, text: string) => {
        updateScene(id, { text });
    }, [updateScene]);

    const handleDelete = useCallback((id: number) => {
        if (confirm('이 장면을 삭제하시겠습니까?')) {
            const newScenes = scenes.filter(s => s.id !== id);
            updateScenes(newScenes);
            if (selectedSceneId === id) setSelectedSceneId(null);
        }
    }, [scenes, updateScenes, selectedSceneId]);

    const handleSaveToLibrary = useCallback(async () => {
        // 오디오가 없는 scene 확인
        const scenesWithAudio = scenes.filter(scene => scene.audioUrl);

        if (scenesWithAudio.length === 0) {
            toast.error('저장할 오디오가 없습니다. 먼저 오디오를 생성해주세요.');
            return;
        }

        try {
            toast.loading('오디오를 병합하고 라이브러리에 저장 중...', { id: 'save-library' });

            // API 호출하여 오디오 병합
            const response = await fetch('/api/audio/merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '오디오 병합 실패');
            }

            // 병합된 오디오를 에셋으로 저장
            await addAsset({
                type: 'audio',
                url: data.audioUrl,
                title: `${useProjectStore.getState().currentProject?.title || 'Project'} - Full Audio`,
                duration: data.duration,
                tag: `Voice: ${selectedVoice.name}`
            });

            toast.success('오디오가 라이브러리에 저장되었습니다.', { id: 'save-library' });
        } catch (error) {
            console.error('Library save error:', error);
            toast.error('라이브러리 저장에 실패했습니다.', { id: 'save-library' });
        }
    }, [scenes, addAsset, selectedVoice.name]);

    const saveAudioToLibrary = useCallback(async (audioUrl: string, text: string) => {
        try {
            await fetch('/api/assets/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'audio',
                    content: audioUrl,
                    metadata: {
                        title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
                        description: `Voice: ${selectedVoice.name}, Speed: ${speed}x`,
                        voiceId: selectedVoice.id
                    }
                })
            });
        } catch (error) {
            console.error('Background save failed:', error);
        }
    }, [selectedVoice.name, selectedVoice.id, speed]);

    const togglePlay = useCallback((id: number, url?: string) => {
        if (playingId === id) {
            const audio = audioRefs.current[id];
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
            setPlayingId(null);
        } else {
            if (playingId !== null && audioRefs.current[playingId]) {
                audioRefs.current[playingId]?.pause();
            }
            if (url) {
                const audio = audioRefs.current[id];
                if (audio) {
                    audio.play().catch(console.error);
                    setPlayingId(id);
                }
            }
        }
    }, [playingId]);

    const handleGenerateAudio = useCallback(async (scene: Scene, silent: boolean = false) => {
        if (!scene.text.trim()) {
            toast.error('텍스트를 입력해주세요.');
            return;
        }

        setGeneratingId(scene.id);
        try {
            const response = await fetch('/api/audio/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-kie-key': kieKey
                },
                body: JSON.stringify({
                    text: scene.text,
                    voiceId: selectedVoice.id,
                    speed,
                    pitch,
                    provider: 'google',
                    googleCredentials
                })
            });

            const data = await response.json();
            if (data.audioUrl) {
                updateScene(scene.id, { audioUrl: data.audioUrl });

                // Play immediately only if not silent
                if (!silent) {
                    const audio = new Audio(data.audioUrl);
                    audio.play();
                }

                // Background save
                saveAudioToLibrary(data.audioUrl, scene.text);
            } else if (data.error) {
                toast.error(data.details || data.error);
            }
        } catch (error) {
            console.error('Generation error:', error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('오디오 생성 실패');
            }
        } finally {
            setGeneratingId(null);
        }
    }, [selectedVoice.id, speed, pitch, updateScene, saveAudioToLibrary, googleCredentials, kieKey]);

    const handleDownload = useCallback((scene: Scene) => {
        if (!scene.audioUrl) return;
        const a = document.createElement('a');
        a.href = scene.audioUrl;
        a.download = `scene-${scene.id}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, []);

    const handleVoicePreview = useCallback(async (voice: TTSVoice) => {
        try {
            const response = await fetch('/api/audio/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-kie-key': kieKey
                },
                body: JSON.stringify({
                    text: "안녕하세요. 이 목소리는 인공지능이 생성한 목소리입니다. 자연스러운지 확인해 보세요.",
                    voiceId: voice.id,
                    speed: 1.0,
                    pitch: 0,
                    provider: 'google',
                    googleCredentials
                })
            });
            const data = await response.json();
            if (data.audioUrl) {
                new Audio(data.audioUrl).play();
            } else if (data.error) {
                toast.error(data.details || data.error);
            }
        } catch (e) {
            console.error(e);
            if (e instanceof Error) {
                toast.error(e.message);
            } else {
                toast.error('미리듣기 실패');
            }
        }
    }, [googleCredentials, kieKey]);

    const handleGenerateAll = useCallback(async () => {
        setIsGeneratingAll(true);
        const promises = scenes
            .filter(scene => scene.text.trim() && !scene.audioUrl)
            .map(scene => handleGenerateAudio(scene, true));

        await Promise.all(promises);
        setIsGeneratingAll(false);
        toast.success('전체 오디오 생성이 완료되었습니다.');
    }, [scenes, handleGenerateAudio]);

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="bg-(--bg-card) p-3 rounded-xl border border-(--border-color)">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[0.85rem] font-semibold text-white flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        오디오 설정
                    </h3>
                    <button
                        onClick={handleSaveToLibrary}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2b2b36] hover:bg-[#3b3b46] text-white text-xs font-medium transition-colors"
                    >
                        <Save className="w-3.5 h-3.5" />
                        라이브러리에 저장
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    {/* Voice Selection */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                        <label className="text-[0.7rem] text-(--text-gray) font-medium">음성 선택</label>
                        <VoiceSelector
                            selectedVoice={selectedVoice}
                            onVoiceChange={setSelectedVoice}
                            onPreview={handleVoicePreview}
                        />
                    </div>

                    {/* Speed Control */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                        <label className="text-[0.7rem] text-(--text-gray) font-medium">
                            속도: {speed.toFixed(1)}x
                        </label>
                        <div className="bg-[#15151e] border border-(--border-color) rounded-lg p-2 flex items-center gap-2 h-[38px]">
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={speed}
                                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                className="flex-1 accent-(--primary-color) h-1"
                            />
                        </div>
                    </div>

                    {/* Pitch Control */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                        <label className="text-[0.7rem] text-(--text-gray) font-medium">
                            피치: {pitch > 0 ? '+' : ''}{pitch.toFixed(1)}
                        </label>
                        <div className="bg-[#15151e] border border-(--border-color) rounded-lg p-2 flex items-center gap-2 h-[38px]">
                            <input
                                type="range"
                                min="-20.0"
                                max="20.0"
                                step="1.0"
                                value={pitch}
                                onChange={(e) => setPitch(parseFloat(e.target.value))}
                                className="flex-1 accent-(--primary-color) h-1"
                            />
                        </div>
                    </div>

                    {/* Generate All Button */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                        <label className="text-[0.7rem] text-(--text-gray) font-medium">일괄 작업</label>
                        <button
                            onClick={handleGenerateAll}
                            disabled={isGeneratingAll || generatingId !== null}
                            className="h-[38px] bg-(--primary-color) text-white rounded-lg hover:bg-[#4a4ddb] transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-xs w-full"
                        >
                            <Wand2 className={`w-3.5 h-3.5 ${isGeneratingAll ? 'animate-spin' : ''}`} />
                            {isGeneratingAll ? '생성 중...' : '전체 생성'}
                        </button>
                    </div>
                </div>
            </div >

            {/* Scene List */}
            < div className="flex-1 overflow-y-auto custom-scrollbar pr-2" >
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={scenes.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="flex flex-col gap-2">
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
                                    handleDelete={handleDelete}
                                    handleDuplicate={handleDuplicate}
                                    isSelected={selectedSceneId === scene.id}
                                    onSelect={setSelectedSceneId}
                                    setAudioRef={setAudioRef}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div >
        </div >
    );
}
