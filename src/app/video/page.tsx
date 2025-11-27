'use client';

import { PlayCircle, Upload, Wand2, RefreshCw, Image as ImageIcon, Check, X, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const VideoResultModal = dynamic(() => import('@/components/video/VideoResultModal').then(mod => mod.VideoResultModal), { ssr: false });
import { useProjectStore } from '@/store/useProjectStore';
import { VideoSettings, VideoSettingsState } from '@/components/video/VideoSettings';
import toast, { Toaster } from 'react-hot-toast';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MagicPromptButton } from '@/components/common/MagicPromptButton';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function VideoPageContent() {
    const searchParams = useSearchParams();

    // Image-to-Video 상태
    const [singleImage, setSingleImage] = useState<string | null>(null);
    const [singleSceneId, setSingleSceneId] = useState<number | null>(null);

    // Start-End Frame 상태
    const [startImage, setStartImage] = useState<string | null>(null);
    const [endImage, setEndImage] = useState<string | null>(null);
    const [startSceneId, setStartSceneId] = useState<number | null>(null);
    const [endSceneId, setEndSceneId] = useState<number | null>(null);

    // Reference Mode State
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [referenceSceneIds, setReferenceSceneIds] = useState<(number | null)[]>([]);

    const [prompt, setPrompt] = useState('');
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [taskId, setTaskId] = useState<string | null>(null);

    const [settings, setSettings] = useState<VideoSettingsState>({
        videoType: 'image-to-video',
        model: 'grok',
        mode: 'normal',
        duration: '5',
        resolution: '720p',
        aspectRatio: '16:9',
        seed: '',
        watermark: ''
    });

    const { currentProject, updateScene, saveCurrentProject, updateProjectInfo, addAsset } = useProjectStore();
    const { kieKey, openaiKey } = useSettingsStore();
    const scenes = currentProject?.scenes || [];

    // Handle query params for library integration
    useEffect(() => {
        const sourceImageParam = searchParams.get('sourceImage');
        const sceneIdParam = searchParams.get('sceneId');

        if (sourceImageParam) {
            setSingleImage(sourceImageParam);
            if (sceneIdParam) {
                setSingleSceneId(parseInt(sceneIdParam));
            }
            // Ensure we are in image-to-video mode
            setSettings(prev => ({ ...prev, videoType: 'image-to-video' }));
        }
    }, [searchParams]);

    // Auto-select first available image if none selected (Image-to-Video only)
    useEffect(() => {
        // Only auto-select if NOT set by query param (checked above) and empty
        if (settings.videoType === 'image-to-video' && !singleImage && scenes.length > 0 && !searchParams.get('sourceImage')) {
            const firstImageScene = scenes.find(s => s.imageUrl);
            if (firstImageScene) {
                setSingleImage(firstImageScene.imageUrl!);
                setSingleSceneId(firstImageScene.id);
            }
        }
    }, [scenes, singleImage, settings.videoType, searchParams]);

    // Polling effect removed

    const handleGenerateVideo = async () => {
        // Validation
        if (settings.videoType === 'image-to-video' && !singleImage) {
            toast.error('이미지를 선택해주세요');
            return;
        }
        if (settings.videoType === 'start-end-frame' && (!startImage || !endImage)) {
            toast.error('시작 프레임과 종료 프레임을 모두 선택해주세요');
            return;
        }
        if (settings.videoType === 'reference' && referenceImages.length === 0) {
            toast.error('참조 이미지를 최소 1장 이상 선택해주세요 (최대 3장)');
            return;
        }

        if (!kieKey || !openaiKey) {
            toast.error('설정에서 KIE 및 OpenAI API 키를 먼저 입력해주세요.');
            return;
        }

        try {
            let requestBody: any = {
                prompt: prompt,
                ...settings
            };

            if (settings.videoType === 'image-to-video') {
                requestBody.imageUrl = singleImage;
            } else if (settings.videoType === 'start-end-frame') {
                requestBody.startImageUrl = startImage;
                requestBody.endImageUrl = endImage;
            } else if (settings.videoType === 'reference') {
                requestBody.imageUrls = referenceImages;
                requestBody.generationType = 'REFERENCE_2_VIDEO';
            }

            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-kie-key': kieKey,
                    'x-openai-key': openaiKey
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || '생성 실패');
            }

            const data = await response.json();

            // Add pending asset to library
            await addAsset({
                type: 'video',
                title: `Video - ${new Date().toLocaleTimeString()}`,
                url: '', // Placeholder
                tag: `pending:${data.taskId}`,
                sceneNumber: settings.videoType === 'image-to-video'
                    ? (singleSceneId || undefined)
                    : settings.videoType === 'start-end-frame'
                        ? (startSceneId || undefined)
                        : (referenceSceneIds[0] || undefined)
            });

            saveCurrentProject();
            toast.success('비디오 생성이 시작되었습니다. 라이브러리에서 진행 상황을 확인할 수 있습니다.');
        } catch (error) {
            console.error('Video generation error:', error);
            toast.error(`생성 시작 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'single' | 'start' | 'end' | 'reference') => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('이미지 파일만 업로드 가능합니다.');
                return;
            }
            const url = URL.createObjectURL(file);

            // Auto-save uploaded image to assets
            if (currentProject) {
                try {
                    await addAsset({
                        type: 'image',
                        title: file.name,
                        url: url,
                        tag: 'upload',
                        sceneNumber: 0
                    });
                    saveCurrentProject();
                } catch (error) {
                    console.error('Failed to save uploaded image to assets:', error);
                }
            }

            if (target === 'single') {
                setSingleImage(url);
                setSingleSceneId(null);
            } else if (target === 'start') {
                setStartImage(url);
                setStartSceneId(null);
            } else if (target === 'end') {
                setEndImage(url);
                setEndSceneId(null);
            } else if (target === 'reference') {
                if (referenceImages.length >= 3) {
                    toast.error('참조 이미지는 최대 3장까지 선택 가능합니다.');
                    return;
                }
                setReferenceImages(prev => [...prev, url]);
                setReferenceSceneIds(prev => [...prev, null]);
            }
        }
    };

    // 드래그 앤 드롭 핸들러
    const handleDrop = (e: React.DragEvent, target: 'single' | 'start' | 'end' | 'reference') => {
        e.preventDefault();
        const imageUrl = e.dataTransfer.getData('imageUrl');
        const sceneId = e.dataTransfer.getData('sceneId');

        if (imageUrl) {
            if (target === 'single') {
                setSingleImage(imageUrl);
                setSingleSceneId(sceneId ? parseInt(sceneId) : null);
            } else if (target === 'start') {
                setStartImage(imageUrl);
                setStartSceneId(sceneId ? parseInt(sceneId) : null);
            } else if (target === 'end') {
                setEndImage(imageUrl);
                setEndSceneId(sceneId ? parseInt(sceneId) : null);
            } else if (target === 'reference') {
                if (referenceImages.length >= 3) {
                    toast.error('참조 이미지는 최대 3장까지 선택 가능합니다.');
                    return;
                }
                setReferenceImages(prev => [...prev, imageUrl]);
                setReferenceSceneIds(prev => [...prev, sceneId ? parseInt(sceneId) : null]);
            }
        }
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
        setReferenceSceneIds(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="flex-1 p-[30px_40px] flex flex-col gap-5 overflow-y-auto custom-scrollbar">
            <Toaster position="top-center" />

            <header className="flex items-center gap-2.5 mb-2.5">
                <PlayCircle className="w-5 h-5 text-white" />
                <h2 className="text-[1.2rem] font-semibold">비디오</h2>
            </header>

            <div className="grid grid-cols-3 gap-5 h-full">
                {/* Left Column: Image Source & Prompt */}
                <section className="col-span-2 flex flex-col gap-5">
                    {settings.videoType === 'image-to-video' ? (
                        /* Image-to-Video UI */
                        <div className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color) flex-1 flex flex-col min-h-0">
                            <h3 className="text-[0.9rem] font-semibold mb-[15px]">소스 이미지 선택</h3>

                            {/* Scene Images Grid - Fixed Height & Scrollable */}
                            <div className="h-[320px] overflow-y-auto custom-scrollbar border border-[#2a2a35] rounded-lg p-3 mb-5 bg-[#16161d]">
                                <div className="grid grid-cols-4 gap-3">
                                    {currentProject?.assets.filter(a => a.type === 'image').map(asset => (
                                        <div
                                            key={asset.id}
                                            onClick={() => {
                                                setSingleImage(asset.url);
                                                setSingleSceneId(asset.sceneNumber || null);
                                            }}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('imageUrl', asset.url);
                                                e.dataTransfer.setData('sceneId', asset.sceneNumber?.toString() || '');
                                            }}
                                            className={`aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-all relative group ${singleImage === asset.url
                                                ? 'border-(--primary-color) ring-2 ring-(--primary-color)/30'
                                                : 'border-transparent hover:border-(--text-gray)'
                                                }`}
                                        >
                                            <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                                            {singleImage === asset.url && (
                                                <div className="absolute top-1 right-1 bg-(--primary-color) rounded-full p-0.5">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[0.65rem] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                {asset.title}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Upload Button */}
                                    <div className="aspect-video bg-[#15151e] rounded-md border border-dashed border-(--border-color) flex flex-col items-center justify-center cursor-pointer hover:border-(--text-gray) hover:bg-[#1a1a24] transition-colors relative group">
                                        <Upload className="w-5 h-5 text-(--text-gray) mb-1 group-hover:text-white transition-colors" />
                                        <span className="text-[0.7rem] text-(--text-gray)">업로드</span>
                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'single')} />
                                    </div>
                                </div>
                            </div>

                            {/* Selected Image Preview with Drop Zone */}
                            <div
                                onDrop={(e) => handleDrop(e, 'single')}
                                onDragOver={handleDragOver}
                                className="flex-1 bg-[#15151e] border-2 border-dashed border-(--border-color) rounded-lg flex flex-col items-center justify-center relative overflow-hidden group hover:border-(--primary-color) transition-colors min-h-[200px]"
                            >
                                {singleImage ? (
                                    <>
                                        <img src={singleImage} alt="Source" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => { setSingleImage(null); setSingleSceneId(null); }} className="text-white underline text-sm">이미지 변경</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="w-10 h-10 text-(--text-gray) mb-3" />
                                        <p className="text-[0.9rem] text-(--text-gray) mb-1">위 목록에서 선택하거나 이미지를 드래그 앤 드롭하세요</p>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : settings.videoType === 'start-end-frame' ? (
                        /* Start-End Frame UI */
                        <div className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color) flex-1 flex flex-col">
                            <h3 className="text-[0.9rem] font-semibold mb-[15px]">시작 및 종료 프레임 선택</h3>

                            <div className="grid grid-cols-2 gap-4 flex-1">
                                {/* Start Frame */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-[0.8rem] text-(--text-gray) font-medium">시작 프레임</label>
                                    <div
                                        onDrop={(e) => handleDrop(e, 'start')}
                                        onDragOver={handleDragOver}
                                        className="flex-1 bg-[#15151e] border-2 border-dashed border-(--border-color) rounded-lg flex flex-col items-center justify-center relative overflow-hidden hover:border-(--primary-color) transition-colors min-h-[200px] cursor-pointer"
                                    >
                                        {startImage ? (
                                            <>
                                                <img src={startImage} alt="Start Frame" className="w-full h-full object-contain" />
                                                <button
                                                    onClick={() => { setStartImage(null); setStartSceneId(null); }}
                                                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded text-xs"
                                                >
                                                    변경
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-8 h-8 text-(--text-gray) mb-2" />
                                                <p className="text-[0.75rem] text-(--text-gray) text-center px-4">드래그 앤 드롭 또는 클릭하여 업로드</p>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'start')} />
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* End Frame */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-[0.8rem] text-(--text-gray) font-medium">종료 프레임</label>
                                    <div
                                        onDrop={(e) => handleDrop(e, 'end')}
                                        onDragOver={handleDragOver}
                                        className="flex-1 bg-[#15151e] border-2 border-dashed border-(--border-color) rounded-lg flex flex-col items-center justify-center relative overflow-hidden hover:border-(--primary-color) transition-colors min-h-[200px] cursor-pointer"
                                    >
                                        {endImage ? (
                                            <>
                                                <img src={endImage} alt="End Frame" className="w-full h-full object-contain" />
                                                <button
                                                    onClick={() => { setEndImage(null); setEndSceneId(null); }}
                                                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded text-xs"
                                                >
                                                    변경
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-8 h-8 text-(--text-gray) mb-2" />
                                                <p className="text-[0.75rem] text-(--text-gray) text-center px-4">드래그 앤 드롭 또는 클릭하여 업로드</p>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'end')} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Scene Images Grid for Selection */}
                            <div className="mt-4">
                                <p className="text-[0.75rem] text-(--text-gray) mb-2">라이브러리에서 드래그하거나 클릭하여 선택:</p>
                                <div className="h-[120px] overflow-y-auto custom-scrollbar border border-[#2a2a35] rounded bg-[#16161d] p-2">
                                    <div className="grid grid-cols-6 gap-2">
                                        {currentProject?.assets.filter(a => a.type === 'image').map(asset => (
                                            <div
                                                key={asset.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('imageUrl', asset.url);
                                                    e.dataTransfer.setData('sceneId', asset.sceneNumber?.toString() || '');
                                                }}
                                                className="aspect-video rounded overflow-hidden cursor-move border border-(--border-color) hover:border-(--primary-color) transition-all"
                                            >
                                                <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Reference Mode UI */
                        <div className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color) flex-1 flex flex-col">
                            <h3 className="text-[0.9rem] font-semibold mb-[15px]">참조 이미지 선택 (1~3장)</h3>

                            <div className="flex-1 bg-[#15151e] border-2 border-dashed border-(--border-color) rounded-lg p-5 flex flex-col items-center justify-center relative overflow-hidden hover:border-(--primary-color) transition-colors min-h-[200px]"
                                onDrop={(e) => handleDrop(e, 'reference')}
                                onDragOver={handleDragOver}
                            >
                                {referenceImages.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-4 w-full">
                                        {referenceImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-video rounded-lg overflow-hidden group border border-(--border-color)">
                                                <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removeReferenceImage(idx)}
                                                    className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white p-1 rounded-full transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[0.6rem] text-white">
                                                    Ref {idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                        {referenceImages.length < 3 && (
                                            <div className="aspect-video rounded-lg border border-dashed border-(--border-color) flex flex-col items-center justify-center cursor-pointer hover:bg-[#1a1a24] transition-colors relative">
                                                <Upload className="w-5 h-5 text-(--text-gray) mb-1" />
                                                <span className="text-[0.7rem] text-(--text-gray)">추가</span>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'reference')} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <Layers className="w-10 h-10 text-(--text-gray) mb-3" />
                                        <p className="text-[0.9rem] text-(--text-gray) mb-1">참조할 이미지를 드래그하거나 업로드하세요</p>
                                        <p className="text-[0.75rem] text-(--text-gray)">최대 3장까지 선택 가능</p>
                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'reference')} />
                                    </>
                                )}
                            </div>

                            {/* Scene Images Grid for Selection */}
                            <div className="mt-4">
                                <p className="text-[0.75rem] text-(--text-gray) mb-2">라이브러리에서 드래그하여 추가:</p>
                                <div className="h-[120px] overflow-y-auto custom-scrollbar border border-[#2a2a35] rounded bg-[#16161d] p-2">
                                    <div className="grid grid-cols-6 gap-2">
                                        {currentProject?.assets.filter(a => a.type === 'image').map(asset => (
                                            <div
                                                key={asset.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('imageUrl', asset.url);
                                                    e.dataTransfer.setData('sceneId', asset.sceneNumber?.toString() || '');
                                                }}
                                                className="aspect-video rounded overflow-hidden cursor-move border border-(--border-color) hover:border-(--primary-color) transition-all"
                                            >
                                                <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Prompt Section - Restored */}
                    <div className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color)">
                        <div className="flex justify-between items-center mb-[15px]">
                            <h3 className="text-[0.9rem] font-semibold">프롬프트 (Optional)</h3>
                            <MagicPromptButton
                                prompt={prompt}
                                onPromptChange={setPrompt}
                                type="video"
                            />
                        </div>
                        <textarea
                            className="w-full h-24 bg-[#15151e] border border-(--border-color) rounded-lg p-3 text-white resize-none outline-none focus:border-(--primary-color) text-sm transition-colors"
                            placeholder={settings.videoType === 'image-to-video'
                                ? "비디오의 움직임이나 분위기를 설명하세요... (비워두면 AI가 이미지에 맞춰 자동으로 생성합니다)"
                                : settings.videoType === 'reference'
                                    ? "참조 이미지를 바탕으로 생성할 비디오 내용을 설명하세요..."
                                    : "두 프레임 사이의 전환 과정을 설명하세요... (비워두면 자동으로 자연스러운 전환을 생성합니다)"}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        ></textarea>
                    </div>
                </section>

                {/* Right Column: Settings */}
                <section className="col-span-1 flex flex-col gap-5">
                    <div className="flex flex-col gap-5 h-full">
                        <VideoSettings
                            settings={settings}
                            onSettingsChange={setSettings}
                        />

                        <div className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color) mt-auto">
                            <button
                                className="w-full bg-(--primary-color) text-white py-3.5 rounded-lg font-semibold hover:bg-[#4a4ddb] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                                disabled={
                                    (settings.videoType === 'image-to-video' && !singleImage) ||
                                    (settings.videoType === 'start-end-frame' && (!startImage || !endImage)) ||
                                    (settings.videoType === 'reference' && referenceImages.length === 0)
                                }
                                onClick={handleGenerateVideo}
                            >
                                <Wand2 className="w-5 h-5" />
                                비디오 생성하기
                            </button>
                            <p className="text-[0.7rem] text-(--text-gray) text-center mt-3">
                                생성 요청 시 라이브러리에 대기열이 추가됩니다.
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            <VideoResultModal
                isOpen={!!generatedVideo}
                onClose={() => setGeneratedVideo(null)}
                videoUrl={generatedVideo || ''}
            />
        </div>
    );
}

export default function VideoPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full text-white">Loading...</div>}>
            <VideoPageContent />
        </Suspense>
    );
}
