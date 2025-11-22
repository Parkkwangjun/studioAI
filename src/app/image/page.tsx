'use client';

import { Image as ImageIcon, Wand2, RefreshCw, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import toast, { Toaster } from 'react-hot-toast';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function ImagePage() {
    const [fixedPrompt, setFixedPrompt] = useState('high quality, professional photography, 8k resolution, detailed, cinematic lighting, vibrant colors');
    const [generatingId, setGeneratingId] = useState<number | null>(null);
    const [selectedModel, setSelectedModel] = useState<'dev' | 'schnell'>('dev');

    // New state to track editable prompts for each scene
    const [editablePrompts, setEditablePrompts] = useState<{ [key: number]: string }>({});

    const { currentProject, updateScene, saveCurrentProject, updateProjectInfo } = useProjectStore();
    const { falKey, openaiKey } = useSettingsStore();
    const scenes = currentProject?.scenes || [];

    // Initialize editable prompts when scenes load
    useEffect(() => {
        if (scenes.length > 0) {
            const initialPrompts: { [key: number]: string } = {};
            scenes.forEach(scene => {
                // If we already have an edited prompt in state, keep it. 
                // Otherwise, initialize with fixedPrompt + scene.text
                if (!editablePrompts[scene.id]) {
                    initialPrompts[scene.id] = fixedPrompt
                        ? `${fixedPrompt}, ${scene.text}`
                        : scene.text;
                }
            });
            setEditablePrompts(prev => ({ ...prev, ...initialPrompts }));
        }
    }, [scenes, fixedPrompt]);

    const handlePromptChange = (sceneId: number, newPrompt: string) => {
        setEditablePrompts(prev => ({
            ...prev,
            [sceneId]: newPrompt
        }));
    };

    const handleGenerateImage = async (sceneId: number) => {
        const finalPrompt = editablePrompts[sceneId];

        if (!finalPrompt) {
            toast.error('프롬프트가 없습니다');
            return;
        }

        if (!falKey || !openaiKey) {
            toast.error('설정에서 FAL 및 OpenAI API 키를 먼저 입력해주세요.');
            return;
        }

        setGeneratingId(sceneId);
        try {
            const response = await fetch('/api/image/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-fal-key': falKey,
                    'x-openai-key': openaiKey
                },
                body: JSON.stringify({
                    prompt: finalPrompt,
                    imageSize: "landscape_16_9",
                    guidanceScale: 3.5,
                    model: selectedModel
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Image generation failed');
            }

            const data = await response.json();

            // Update scene with new image
            updateScene(sceneId, { imageUrl: data.imageUrl });

            // Update project info (thumbnail & type)
            updateProjectInfo({
                type: 'image',
                thumbnail: data.imageUrl
            });

            // Auto-save to library
            saveCurrentProject();

            toast.success(`이미지 생성 완료 (${selectedModel === 'dev' ? 'High Quality' : 'Fast'})`);
        } catch (error) {
            console.error('Image generation error:', error);
            toast.error(`이미지 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setGeneratingId(null);
        }
    };

    const handleGenerateAll = async () => {
        let successCount = 0;
        for (const scene of scenes) {
            if (!scene.imageUrl && editablePrompts[scene.id]) {
                await handleGenerateImage(scene.id);
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        if (successCount > 0) {
            toast.success(`${successCount}개 이미지 생성 완료`);
        }
    };

    return (
        <div className="flex-1 p-[30px_40px] flex flex-col gap-5 overflow-y-auto custom-scrollbar">
            <Toaster position="top-center" />

            <header className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                    <ImageIcon className="w-5 h-5 text-white" />
                    <h2 className="text-[1.2rem] font-semibold">이미지</h2>
                </div>
                <button
                    onClick={handleGenerateAll}
                    disabled={generatingId !== null}
                    className="bg-[var(--primary-color)] text-white px-5 py-2.5 rounded-lg font-semibold text-[0.9rem] cursor-pointer hover:bg-[#4a4ddb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    전체 이미지 생성
                </button>
            </header>

            {/* Settings Section */}
            <section className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <h3 className="text-[1rem] font-semibold">이미지 설정</h3>
                        <span className="text-[0.85rem] text-[var(--text-gray)]">모델과 프롬프트를 설정하세요.</span>
                    </div>

                    {/* Model Selector */}
                    <div className="flex bg-[#16161d] p-1 rounded-lg border border-[var(--border-color)]">
                        <button
                            onClick={() => setSelectedModel('dev')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${selectedModel === 'dev'
                                ? 'bg-[var(--primary-color)] text-white shadow-sm'
                                : 'text-[var(--text-gray)] hover:text-white'
                                }`}
                        >
                            <Wand2 className="w-3 h-3" />
                            Flux Dev (Quality)
                        </button>
                        <button
                            onClick={() => setSelectedModel('schnell')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${selectedModel === 'schnell'
                                ? 'bg-[var(--primary-color)] text-white shadow-sm'
                                : 'text-[var(--text-gray)] hover:text-white'
                                }`}
                        >
                            <Zap className="w-3 h-3" />
                            Flux Schnell (Fast)
                        </button>
                    </div>
                </div>

                <div className="flex gap-2.5">
                    <input
                        type="text"
                        className="flex-1 bg-[#16161d] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-white outline-none focus:border-[var(--primary-color)] text-[0.9rem] transition-colors"
                        placeholder="고정 프롬프트 입력 (예: high quality, professional photography, 8k resolution)"
                        value={fixedPrompt}
                        onChange={(e) => setFixedPrompt(e.target.value)}
                    />
                </div>
                <p className="text-[0.75rem] text-[var(--text-gray)]">
                    💡 <strong>{selectedModel === 'dev' ? 'Flux Dev' : 'Flux Schnell'}</strong> 모델이 선택되었습니다.
                    {selectedModel === 'dev' ? ' 높은 품질의 이미지를 생성하지만 시간이 더 걸릴 수 있습니다.' : ' 빠르게 이미지를 생성하며 비용 효율적입니다.'}
                </p>
            </section>

            {/* Scene Image Cards Grid */}
            <div className="grid grid-cols-2 gap-5">
                {scenes.length > 0 ? scenes.map((scene) => (
                    <div key={scene.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 flex flex-col gap-4 h-[280px]">
                        {/* Card Header */}
                        <div className="flex justify-between items-center shrink-0">
                            <span className="font-bold text-[1rem]">#{scene.id}</span>
                            <button
                                onClick={() => handleGenerateImage(scene.id)}
                                disabled={generatingId === scene.id || !editablePrompts[scene.id]}
                                className="bg-[#3e3e50] text-[#c0c0c0] border-none px-3 py-1.5 rounded text-[0.8rem] cursor-pointer hover:bg-[#4a4a5c] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                            >
                                {generatingId === scene.id ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        생성 중...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-3.5 h-3.5" />
                                        생성
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Card Body */}
                        <div className="flex gap-4 flex-1 min-h-0">
                            {/* Text Section */}
                            <div className="flex-1 flex flex-col gap-3 min-w-0">
                                {/* Script Text (Read Only - 30%) */}
                                <div className="flex flex-col gap-1.5 h-[30%] min-h-0">
                                    <span className="text-[0.75rem] font-bold text-[var(--text-gray)] shrink-0">스크립트 (참고용)</span>
                                    <div className="flex-1 bg-[#16161d] rounded-md p-2.5 text-[0.85rem] text-[#d0d0d0] overflow-y-auto leading-[1.4] custom-scrollbar opacity-70">
                                        {scene.text || "스크립트가 없습니다"}
                                    </div>
                                </div>

                                {/* Prompt Editor (Editable - 70%) */}
                                <div className="flex flex-col gap-1.5 h-[70%] min-h-0">
                                    <span className="text-[0.75rem] font-bold text-[var(--text-gray)] shrink-0">최종 프롬프트 (편집 가능)</span>
                                    <textarea
                                        className="flex-1 bg-[#1a1a24] rounded-md p-2.5 text-[0.8rem] text-white overflow-y-auto custom-scrollbar font-mono leading-relaxed border border-transparent focus:border-[var(--primary-color)] outline-none resize-none transition-colors"
                                        value={editablePrompts[scene.id] || ''}
                                        onChange={(e) => handlePromptChange(scene.id, e.target.value)}
                                        placeholder="프롬프트를 입력하세요..."
                                    />
                                </div>
                            </div>

                            {/* Preview Section */}
                            <div className="w-[200px] flex-shrink-0">
                                <div className="w-full h-full bg-[#323242] rounded-lg flex justify-center items-center text-[var(--text-gray)] text-[0.9rem] border border-[var(--border-color)] overflow-hidden relative group">
                                    {scene.imageUrl ? (
                                        <>
                                            <img src={scene.imageUrl} alt={`Scene ${scene.id}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-xs font-medium">Click Library to View</span>
                                            </div>
                                        </>
                                    ) : (
                                        <span>프리뷰</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-2 text-center text-[var(--text-gray)] py-10">
                        생성된 장면이 없습니다. 스크립트 탭에서 먼저 스크립트를 생성하세요.
                    </div>
                )}
            </div>
        </div>
    );
}
