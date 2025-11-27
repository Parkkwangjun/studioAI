'use client';

import { Image as ImageIcon, Wand2, RefreshCw, Zap, X, Upload, Trash2, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import toast, { Toaster } from 'react-hot-toast';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MagicPromptButton } from '@/components/common/MagicPromptButton';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function ImagePage() {
    const [fixedPrompt, setFixedPrompt] = useState('high quality, professional photography, 8k resolution, detailed, cinematic lighting, vibrant colors');
    const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());
    const [selectedModel, setSelectedModel] = useState<'dev' | 'schnell' | 'nanobanana'>('schnell');
    const [imageSize, setImageSize] = useState<string>('landscape_16_9');

    // Nano Banana Pro specific states
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('1K');
    const [referenceImages, setReferenceImages] = useState<string[]>([]);

    // New state to track editable prompts for each scene
    const [editablePrompts, setEditablePrompts] = useState<{ [key: number]: string }>({});
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const { currentProject, updateScene, saveCurrentProject, updateProjectInfo, addAsset } = useProjectStore();
    const { falKey, openaiKey } = useSettingsStore();
    const scenes = currentProject?.scenes || [];

    // Initialize editable prompts when scenes load
    useEffect(() => {
        if (scenes.length > 0) {
            setEditablePrompts(prev => {
                const newPrompts = { ...prev };
                let changed = false;
                scenes.forEach(scene => {
                    if (!newPrompts[scene.id]) {
                        newPrompts[scene.id] = fixedPrompt
                            ? `${fixedPrompt}, ${scene.text}`
                            : scene.text;
                        changed = true;
                    }
                });
                return changed ? newPrompts : prev;
            });
        }
    }, [scenes]); // Only run when scenes change (new scenes added)

    // Load state from localStorage when project loads
    useEffect(() => {
        if (currentProject?.id) {
            const savedFixed = localStorage.getItem(`fixedPrompt_${currentProject.id}`);
            if (savedFixed !== null) setFixedPrompt(savedFixed);

            const savedEditable = localStorage.getItem(`editablePrompts_${currentProject.id}`);
            if (savedEditable) {
                try {
                    const parsed = JSON.parse(savedEditable);
                    setEditablePrompts(prev => ({ ...prev, ...parsed }));
                } catch (e) {
                    console.error('Failed to parse saved prompts', e);
                }
            }
        }
    }, [currentProject?.id]);

    // Save state to localStorage
    useEffect(() => {
        if (currentProject?.id) {
            localStorage.setItem(`fixedPrompt_${currentProject.id}`, fixedPrompt);
        }
    }, [fixedPrompt, currentProject?.id]);

    useEffect(() => {
        if (currentProject?.id) {
            localStorage.setItem(`editablePrompts_${currentProject.id}`, JSON.stringify(editablePrompts));
        }
    }, [editablePrompts, currentProject?.id]);

    const handleFixedPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFixed = e.target.value;
        setFixedPrompt(newFixed);

        // Sync to all scenes immediately
        setEditablePrompts(prev => {
            const newPrompts = { ...prev };
            scenes.forEach(scene => {
                newPrompts[scene.id] = newFixed
                    ? `${newFixed}, ${scene.text}`
                    : scene.text;
            });
            return newPrompts;
        });
    };

    const handlePromptChange = (sceneId: number, newPrompt: string) => {
        setEditablePrompts(prev => ({
            ...prev,
            [sceneId]: newPrompt
        }));
    };

    const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newImages: string[] = [];
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    newImages.push(URL.createObjectURL(file));
                }
            });
            setReferenceImages(prev => [...prev, ...newImages].slice(0, 8)); // Max 8 images
        }
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
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

        setGeneratingIds(prev => new Set(prev).add(sceneId));
        try {
            const response = await fetch('/api/image/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-fal-key': falKey,
                    'x-openai-key': openaiKey,
                    'x-kie-key': useSettingsStore.getState().kieKey
                },
                body: JSON.stringify({
                    prompt: finalPrompt,
                    imageSize: imageSize,
                    guidanceScale: 3.5,
                    model: selectedModel,
                    // Nano Banana Pro params
                    resolution: selectedModel === 'nanobanana' ? resolution : undefined,
                    referenceImages: selectedModel === 'nanobanana' ? referenceImages : undefined
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Image generation failed');
            }

            const data = await response.json();

            let finalImageUrl = data.imageUrl;

            // Handle Polling for Nanobanana
            if (data.status === 'pending' && data.taskId) {
                const taskId = data.taskId;
                let attempts = 0;
                const maxAttempts = 60; // 2 minutes max (2s interval)

                while (attempts < maxAttempts) {
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Use the existing image-generation status route or a new one. 
                    // Since we don't have a dedicated /api/image/status, we can use the one from AI Tools if compatible,
                    // or better, fetch directly from KIE if we had the key client-side (we don't want to expose it).
                    // Let's assume we can use /api/image-generation/[taskId] which is generic for KIE tasks.
                    const statusRes = await fetch(`/api/image-generation/${taskId}`, {
                        headers: { 'x-kie-key': useSettingsStore.getState().kieKey || '' }
                    });
                    const statusData = await statusRes.json();

                    if (statusData.data?.state === 'success') {
                        const resultJson = JSON.parse(statusData.data.resultJson);
                        // Try multiple paths
                        finalImageUrl = resultJson.resultUrls?.[0]
                            || resultJson.url
                            || resultJson.image_url
                            || (Array.isArray(resultJson) ? resultJson[0] : null);

                        if (finalImageUrl) break;
                    } else if (statusData.data?.state === 'fail') {
                        throw new Error(`Generation failed: ${statusData.data.failMsg}`);
                    }
                }

                if (!finalImageUrl) throw new Error('Timeout waiting for image generation');
            }

            if (!finalImageUrl) throw new Error('No image URL received');

            // Update scene with new image
            updateScene(sceneId, { imageUrl: finalImageUrl });

            // Update project info (thumbnail & type)
            updateProjectInfo({
                type: 'image',
                thumbnail: finalImageUrl
            });

            // Auto-save to library
            await addAsset({
                type: 'image',
                title: `${currentProject?.title || 'Project'} - Scene ${sceneId}`,
                url: finalImageUrl,
                tag: selectedModel,
                sceneNumber: sceneId
            });

            saveCurrentProject();

            toast.success(`이미지 생성 완료 (${selectedModel === 'dev' ? 'High Quality' : selectedModel === 'schnell' ? 'Fast' : 'Pro'})`);
        } catch (error) {
            console.error('Image generation error:', error);
            toast.error(`이미지 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(sceneId);
                return next;
            });
        }
    };

    const handleGenerateAll = async () => {
        let triggeredCount = 0;
        const scenesToGenerate = scenes.filter(scene => !scene.imageUrl && editablePrompts[scene.id]);

        if (scenesToGenerate.length === 0) {
            toast('생성할 이미지가 없습니다.');
            return;
        }

        toast.success(`${scenesToGenerate.length}개 이미지 생성 요청을 시작합니다.`);

        for (const scene of scenesToGenerate) {
            // Fire and forget, but handle errors internally
            handleGenerateImage(scene.id).catch(console.error);
            triggeredCount++;
            // Stagger requests by 1 second to avoid rate limits/overload
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    };

    const handleDownloadAll = async () => {
        const imagesToDownload = scenes.filter(scene => scene.imageUrl);
        if (imagesToDownload.length === 0) {
            toast.error('다운로드할 이미지가 없습니다.');
            return;
        }

        const zip = new JSZip();
        const folder = zip.folder("generated_images");

        const toastId = toast.loading('이미지 압축 중...');

        try {
            await Promise.all(imagesToDownload.map(async (scene) => {
                if (!scene.imageUrl) return;
                try {
                    const response = await fetch(scene.imageUrl);
                    const blob = await response.blob();
                    // Extract extension or default to png
                    // Handle potential query params in URL
                    const urlPath = scene.imageUrl.split('?')[0];
                    const ext = urlPath.split('.').pop() || 'png';
                    const filename = `scene_${scene.id}.${ext}`;
                    folder?.file(filename, blob);
                } catch (e) {
                    console.error(`Failed to download image for scene ${scene.id}`, e);
                }
            }));

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${currentProject?.title || 'project'}_images.zip`);
            toast.success('다운로드 완료!', { id: toastId });
        } catch (error) {
            console.error('Download error:', error);
            toast.error('다운로드 실패', { id: toastId });
        }
    };

    return (
        <div className="flex-1 p-[30px_40px] flex flex-col gap-5 overflow-y-auto custom-scrollbar">
            <Toaster position="top-center" />

            <header className="flex items-center justify-between mb-2.5 shrink-0">
                <div className="flex items-center gap-2.5">
                    <ImageIcon className="w-5 h-5 text-white" />
                    <h2 className="text-[1.2rem] font-semibold">이미지</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadAll}
                        className="bg-[#3e3e50] text-white px-5 py-2.5 rounded-lg font-semibold text-[0.9rem] cursor-pointer hover:bg-[#4a4a5c] transition-colors flex items-center gap-2"
                        title="모든 이미지 다운로드"
                    >
                        <Download className="w-4 h-4" />
                        전체 다운로드
                    </button>
                    <button
                        onClick={handleGenerateAll}
                        disabled={generatingIds.size > 0}
                        className="bg-(--primary-color) text-white px-5 py-2.5 rounded-lg font-semibold text-[0.9rem] cursor-pointer hover:bg-[#4a4ddb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        전체 이미지 생성
                    </button>
                </div>
            </header>

            {/* Settings Section */}
            <section className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color) flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <h3 className="text-[1rem] font-semibold">이미지 설정</h3>
                            <span className="text-[0.85rem] text-(--text-gray)">모델과 프롬프트를 설정하세요.</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-start">
                        {/* Model Selector */}
                        <div className="flex bg-[#16161d] p-1 rounded-lg border border-(--border-color)">
                            <button
                                onClick={() => setSelectedModel('schnell')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${selectedModel === 'schnell'
                                    ? 'bg-(--primary-color) text-white shadow-sm'
                                    : 'text-(--text-gray) hover:text-white'
                                    }`}
                            >
                                <Zap className="w-3 h-3" />
                                Flux Schnell (Fast)
                            </button>
                            <button
                                onClick={() => setSelectedModel('dev')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${selectedModel === 'dev'
                                    ? 'bg-(--primary-color) text-white shadow-sm'
                                    : 'text-(--text-gray) hover:text-white'
                                    }`}
                            >
                                <Wand2 className="w-3 h-3" />
                                Flux Dev (Quality)
                            </button>
                            <button
                                onClick={() => setSelectedModel('nanobanana')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${selectedModel === 'nanobanana'
                                    ? 'bg-(--primary-color) text-white shadow-sm'
                                    : 'text-(--text-gray) hover:text-white'
                                    }`}
                            >
                                <Wand2 className="w-3 h-3" />
                                Nano Banana Pro
                            </button>
                        </div>

                        {/* Aspect Ratio Selector */}
                        <div className="flex bg-[#16161d] p-1 rounded-lg border border-(--border-color)">
                            {[
                                { label: '16:9', value: 'landscape_16_9' },
                                { label: '9:16', value: 'portrait_16_9' },
                                { label: '1:1', value: 'square_hd' },
                                { label: '4:3', value: 'landscape_4_3' }
                            ].map((ratio) => (
                                <button
                                    key={ratio.value}
                                    onClick={() => setImageSize(ratio.value)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${imageSize === ratio.value
                                        ? 'bg-(--primary-color) text-white shadow-sm'
                                        : 'text-(--text-gray) hover:text-white'
                                        }`}
                                >
                                    {ratio.label}
                                </button>
                            ))}
                        </div>

                        {/* Resolution Selector (Nano Banana Pro Only) */}
                        {selectedModel === 'nanobanana' && (
                            <div className="flex bg-[#16161d] p-1 rounded-lg border border-(--border-color)">
                                {['1K', '2K', '4K'].map((res) => (
                                    <button
                                        key={res}
                                        onClick={() => setResolution(res as '1K' | '2K' | '4K')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${resolution === res
                                            ? 'bg-(--primary-color) text-white shadow-sm'
                                            : 'text-(--text-gray) hover:text-white'
                                            }`}
                                    >
                                        {res}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reference Images (Nano Banana Pro Only) */}
                    {selectedModel === 'nanobanana' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-(--text-gray)">참조 이미지 (선택사항, 최대 8장)</label>
                            <div className="flex flex-wrap gap-2">
                                {referenceImages.map((img, idx) => (
                                    <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-(--border-color) group">
                                        <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeReferenceImage(idx)}
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                ))}
                                {referenceImages.length < 8 && (
                                    <label className="w-16 h-16 rounded-md border border-dashed border-(--border-color) flex items-center justify-center cursor-pointer hover:border-(--primary-color) transition-colors">
                                        <Upload className="w-4 h-4 text-(--text-gray)" />
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleReferenceImageUpload} />
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2.5">
                        <input
                            type="text"
                            className="flex-1 bg-[#16161d] border border-(--border-color) rounded-lg px-4 py-2.5 text-white outline-none focus:border-(--primary-color) text-[0.9rem] transition-colors"
                            placeholder="고정 프롬프트 입력 (예: high quality, professional photography, 8k resolution)"
                            value={fixedPrompt}
                            onChange={handleFixedPromptChange}
                        />
                    </div>
                    <p className="text-[0.75rem] text-(--text-gray)">
                        💡 <strong>{selectedModel === 'dev' ? 'Flux Dev' : selectedModel === 'schnell' ? 'Flux Schnell' : 'Nano Banana Pro'}</strong> 모델이 선택되었습니다.
                        {selectedModel === 'dev' ? ' 높은 품질의 이미지를 생성하지만 시간이 더 걸릴 수 있습니다.' : selectedModel === 'schnell' ? ' 빠르게 이미지를 생성하며 비용 효율적입니다.' : ' 최신 Nano Banana 모델로 고품질 이미지를 생성합니다. 참조 이미지와 해상도 설정이 가능합니다.'}
                    </p>
                </div>
            </section>

            {/* Scene Image Cards Grid */}
            <div className="grid grid-cols-2 gap-5">
                {scenes.length > 0 ? scenes.map((scene) => (
                    <div key={scene.id} className="bg-(--bg-card) rounded-xl border border-(--border-color) p-4 flex flex-col gap-4 h-[280px]">
                        {/* Card Header */}
                        <div className="flex justify-between items-center shrink-0">
                            <span className="font-bold text-[1rem]">#{scene.id}</span>
                            <button
                                onClick={() => handleGenerateImage(scene.id)}
                                disabled={generatingIds.has(scene.id) || !editablePrompts[scene.id]}
                                className="bg-[#3e3e50] text-[#c0c0c0] border-none px-3 py-1.5 rounded text-[0.8rem] cursor-pointer hover:bg-[#4a4a5c] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                            >
                                {generatingIds.has(scene.id) ? (
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
                                    <span className="text-[0.75rem] font-bold text-(--text-gray) shrink-0">스크립트 (참고용)</span>
                                    <div className="flex-1 bg-[#16161d] rounded-md p-2.5 text-[0.85rem] text-[#d0d0d0] overflow-y-auto leading-[1.4] custom-scrollbar opacity-70">
                                        {scene.text || "스크립트가 없습니다"}
                                    </div>
                                </div>

                                {/* Prompt Editor (Editable - 70%) */}
                                <div className="flex flex-col gap-1.5 h-[70%] min-h-0 relative">
                                    <div className="flex justify-between items-center shrink-0">
                                        <span className="text-[0.75rem] font-bold text-(--text-gray)">최종 프롬프트 (편집 가능)</span>
                                    </div>
                                    <div className="flex-1 relative flex flex-col gap-2">
                                        <div className="relative flex-1">
                                            <textarea
                                                className="w-full h-full bg-[#1a1a24] rounded-md p-2.5 text-[0.8rem] text-white overflow-y-auto custom-scrollbar font-mono leading-relaxed border border-transparent focus:border-(--primary-color) outline-none resize-none transition-colors"
                                                value={editablePrompts[scene.id] || ''}
                                                onChange={(e) => handlePromptChange(scene.id, e.target.value)}
                                                placeholder="프롬프트를 입력하세요..."
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <MagicPromptButton
                                                prompt={editablePrompts[scene.id] || ''}
                                                onPromptChange={(newPrompt) => handlePromptChange(scene.id, newPrompt)}
                                                type="image"
                                                className="scale-90"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview Section */}
                            <div className="w-[200px] shrink-0">
                                <div className="w-full h-full bg-[#323242] rounded-lg flex justify-center items-center text-(--text-gray) text-[0.9rem] border border-(--border-color) overflow-hidden relative group">
                                    {scene.imageUrl ? (
                                        <>
                                            <img src={scene.imageUrl} alt={`Scene ${scene.id}`} className="w-full h-full object-cover" />
                                            <div
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                                onClick={() => setPreviewImage(scene.imageUrl!)}
                                            >
                                                <span className="text-white text-xs font-medium">크게 보기</span>
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
                    <div className="col-span-2 text-center text-(--text-gray) py-10">
                        생성된 장면이 없습니다. 스크립트 탭에서 먼저 스크립트를 생성하세요.
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-[90vw] max-h-[90vh]">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
