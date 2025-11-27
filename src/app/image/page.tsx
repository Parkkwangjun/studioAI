'use client';

import { Image as ImageIcon, Wand2, RefreshCw, Zap, X, Upload, Trash2, Download, Loader2 } from 'lucide-react';
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
    const [referenceImages, setReferenceImages] = useState<string[]>([]); // Display URLs (blob)
    const [referenceImageFiles, setReferenceImageFiles] = useState<File[]>([]); // Actual files for upload
    const [isUploadingRefs, setIsUploadingRefs] = useState(false);

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isMigrated, setIsMigrated] = useState(false);

    const { currentProject, updateScene, saveCurrentProject, updateProjectInfo, addAsset } = useProjectStore();
    const { falKey, openaiKey } = useSettingsStore();
    const scenes = currentProject?.scenes || [];

    // Initialize image prompts for new scenes (first time only)
    useEffect(() => {
        if (scenes.length > 0) {
            let needsSave = false;
            scenes.forEach(scene => {
                if (!scene.imagePrompt) {
                    const initialPrompt = fixedPrompt
                        ? `${fixedPrompt}, ${scene.text}`
                        : scene.text;
                    updateScene(scene.id, { imagePrompt: initialPrompt });
                    needsSave = true;
                }
            });
            if (needsSave) {
                saveCurrentProject();
            }
        }
    }, [scenes.length]); // Only run when number of scenes changes

    // One-time migration: Load from localStorage and move to Supabase
    useEffect(() => {
        if (currentProject?.id && !isMigrated) {
            const savedEditable = localStorage.getItem(`editablePrompts_${currentProject.id}`);
            if (savedEditable) {
                try {
                    const parsed = JSON.parse(savedEditable);
                    let migrated = false;
                    
                    // Move each prompt to Supabase
                    Object.entries(parsed).forEach(([sceneIdStr, prompt]) => {
                        const sceneId = parseInt(sceneIdStr);
                        const scene = scenes.find(s => s.id === sceneId);
                        if (scene && typeof prompt === 'string') {
                            updateScene(sceneId, { imagePrompt: prompt });
                            migrated = true;
                        }
                    });

                    if (migrated) {
                        saveCurrentProject();
                        // Remove from localStorage after successful migration
                        localStorage.removeItem(`editablePrompts_${currentProject.id}`);
                        console.log('✅ Successfully migrated image prompts from localStorage to Supabase');
                    }
                } catch (e) {
                    console.error('Failed to migrate prompts from localStorage', e);
                }
            }
            
            // Also migrate fixed prompt if exists
            const savedFixed = localStorage.getItem(`fixedPrompt_${currentProject.id}`);
            if (savedFixed !== null) {
                setFixedPrompt(savedFixed);
                localStorage.removeItem(`fixedPrompt_${currentProject.id}`);
            }
            
            setIsMigrated(true);
        }
    }, [currentProject?.id, scenes.length, isMigrated]);

    const handleFixedPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFixed = e.target.value;
        setFixedPrompt(newFixed);

        // Sync to all scenes immediately
        scenes.forEach(scene => {
            const newPrompt = newFixed
                ? `${newFixed}, ${scene.text}`
                : scene.text;
            updateScene(scene.id, { imagePrompt: newPrompt });
        });
        
        // Auto-save after bulk update
        saveCurrentProject();
    };

    const handlePromptChange = (sceneId: number, newPrompt: string) => {
        updateScene(sceneId, { imagePrompt: newPrompt });
        // Note: We don't auto-save on every keystroke to avoid excessive DB writes
        // Users can manually save or it will save when generating images
    };

    const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles: File[] = [];
            const newImages: string[] = [];
            
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    newFiles.push(file);
                    newImages.push(URL.createObjectURL(file));
                }
            });
            
            setReferenceImageFiles(prev => [...prev, ...newFiles].slice(0, 8)); // Max 8 images
            setReferenceImages(prev => [...prev, ...newImages].slice(0, 8));
        }
        e.target.value = ''; // Reset input
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
        setReferenceImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerateImage = async (sceneId: number) => {
        const scene = scenes.find(s => s.id === sceneId);
        const finalPrompt = scene?.imagePrompt;

        if (!finalPrompt) {
            toast.error('프롬프트가 없습니다');
            return;
        }
        
        // Save current prompt before generating
        await saveCurrentProject();

        if (!falKey || !openaiKey) {
            toast.error('설정에서 FAL 및 OpenAI API 키를 먼저 입력해주세요.');
            return;
        }

        if (selectedModel === 'nanobanana' && !useSettingsStore.getState().kieKey) {
            toast.error('설정에서 KIE API 키를 먼저 입력해주세요.');
            return;
        }

        setGeneratingIds(prev => new Set(prev).add(sceneId));
        
        // Create pending asset immediately (before API call)
        const tempTag = selectedModel === 'nanobanana' 
            ? `pending-image:temp-${sceneId}-${Date.now()}` 
            : `flux-pending:${sceneId}:${Date.now()}`;
        
        await addAsset({
            type: 'image',
            title: `${finalPrompt.slice(0, 30)}... (생성 중...)`,
            url: '',
            tag: tempTag,
            sceneNumber: sceneId
        });
        await saveCurrentProject();
        
        let uploadedReferenceUrls: string[] = [];

        try {
            // Upload reference images if using nanobanana model
            if (selectedModel === 'nanobanana' && referenceImageFiles.length > 0) {
                setIsUploadingRefs(true);
                toast.loading(`참조 이미지 업로드 중... (${referenceImageFiles.length}장)`, { id: 'ref-upload' });
                
                let uploadedCount = 0;
                for (let i = 0; i < referenceImageFiles.length; i++) {
                    const file = referenceImageFiles[i];
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    try {
                        const uploadRes = await fetch('/api/upload-image', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (uploadRes.ok) {
                            const { url } = await uploadRes.json();
                            uploadedReferenceUrls.push(url);
                            uploadedCount++;
                            toast.loading(`참조 이미지 업로드 중... (${uploadedCount}/${referenceImageFiles.length})`, { id: 'ref-upload' });
                        } else {
                            const errorData = await uploadRes.json();
                            console.error('Failed to upload reference image:', file.name, errorData);
                        }
                    } catch (uploadError) {
                        console.error('Upload error:', uploadError);
                    }
                }
                
                if (uploadedReferenceUrls.length === 0) {
                    throw new Error('참조 이미지 업로드에 실패했습니다. 다시 시도해주세요.');
                }
                
                toast.success(`${uploadedReferenceUrls.length}장의 참조 이미지 업로드 완료`, { id: 'ref-upload' });
                setIsUploadingRefs(false);
            }

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
                    referenceImages: selectedModel === 'nanobanana' && uploadedReferenceUrls.length > 0 
                        ? uploadedReferenceUrls 
                        : undefined
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Image generation failed');
            }

            const data = await response.json();

            // Handle different response types
            if (data.status === 'pending' && data.taskId) {
                // Nano Banana Pro: Update pending asset with real taskId
                const taskId = data.taskId;
                console.log('[AI Tools Image] Task created:', taskId);
                
                // Find the temp pending asset and update tag with real taskId
                const { currentProject: updatedProject, updateAsset } = useProjectStore.getState();
                const tempPendingAsset = updatedProject?.assets.find(
                    asset => asset.type === 'image' && asset.tag === tempTag && asset.sceneNumber === sceneId
                );

                if (tempPendingAsset) {
                    await updateAsset(tempPendingAsset.id, {
                        tag: `pending-image:${taskId}`
                    });
                    await saveCurrentProject();
                }

                toast.success('이미지 생성이 시작되었습니다! 라이브러리에서 진행 상황을 확인하세요.');
                setGeneratingIds(prev => {
                    const next = new Set(prev);
                    next.delete(sceneId);
                    return next;
                });
                return; // Exit early, polling handled by useImagePoller
            }

            // Flux models: Update pending asset with final URL
            const finalImageUrl = data.imageUrl;

            if (!finalImageUrl) throw new Error('No image URL received');

            // Update scene with new image immediately
            updateScene(sceneId, { imageUrl: finalImageUrl });

            // Update project info (thumbnail & type)
            updateProjectInfo({
                type: 'image',
                thumbnail: finalImageUrl
            });

            // Find the pending asset and update it with final URL
            const { currentProject: updatedProject, updateAsset } = useProjectStore.getState();
            const pendingAsset = updatedProject?.assets.find(
                asset => asset.type === 'image' && asset.tag === tempTag && asset.sceneNumber === sceneId
            );

            if (pendingAsset) {
                await updateAsset(pendingAsset.id, {
                    url: finalImageUrl,
                    title: `${finalPrompt.slice(0, 50)} - Scene ${sceneId}`,
                    tag: selectedModel
                });
            } else {
                // Fallback: create new asset if pending asset not found
                await addAsset({
                    type: 'image',
                    title: `${finalPrompt.slice(0, 50)} - Scene ${sceneId}`,
                    url: finalImageUrl,
                    tag: selectedModel,
                    sceneNumber: sceneId
                });
            }

            await saveCurrentProject();
            toast.success('이미지가 생성되어 라이브러리에 저장되었습니다!');
            
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(sceneId);
                return next;
            });
            
        } catch (error) {
            console.error('Image generation error:', error);
            
            // Remove or mark pending asset as failed
            const { currentProject: errorProject, deleteAsset, updateAsset } = useProjectStore.getState();
            const failedPendingAsset = errorProject?.assets.find(
                asset => asset.type === 'image' && asset.tag === tempTag && asset.sceneNumber === sceneId
            );
            
            if (failedPendingAsset) {
                if (failedPendingAsset.url) {
                    // If asset has URL, just mark as failed
                    await updateAsset(failedPendingAsset.id, {
                        tag: `error: ${error instanceof Error ? error.message : 'Generation failed'}`,
                        title: `(실패) ${failedPendingAsset.title}`
                    });
                } else {
                    // If no URL, delete the pending asset
                    await deleteAsset(failedPendingAsset.id);
                }
                await saveCurrentProject();
            }
            
            toast.error(`이미지 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(sceneId);
                return next;
            });
        }
    };

    const handleGenerateAll = async () => {
        let triggeredCount = 0;
        const scenesToGenerate = scenes.filter(scene => !scene.imageUrl && scene.imagePrompt);

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
                                <ImageIcon className="w-3 h-3" />
                                Nano Banana (Img2Img)
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
                        <div className="flex flex-col gap-3 bg-[#1a1a24] rounded-lg p-4 border border-(--border-color)">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[0.9rem] font-semibold text-white flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        참조 이미지 (Image-to-Image)
                                    </label>
                                    <span className="text-[0.75rem] text-(--text-gray)">
                                        {referenceImages.length > 0 
                                            ? `${referenceImages.length}장 선택됨 (최대 8장)` 
                                            : '이미지를 업로드하여 스타일을 참조하세요'}
                                    </span>
                                </div>
                                {referenceImages.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setReferenceImages([]);
                                            setReferenceImageFiles([]);
                                        }}
                                        className="text-xs text-(--text-gray) hover:text-red-400 transition-colors flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" />
                                        전체 삭제
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {referenceImages.map((img, idx) => (
                                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-(--border-color) group hover:border-(--primary-color) transition-all">
                                        <img src={img} alt={`참조 ${idx + 1}`} className="w-full h-full object-cover" />
                                        <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                            {idx + 1}
                                        </div>
                                        <button
                                            onClick={() => removeReferenceImage(idx)}
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                        >
                                            <Trash2 className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                ))}
                                {referenceImages.length < 8 && (
                                    <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-(--border-color) flex flex-col items-center justify-center cursor-pointer hover:border-(--primary-color) hover:bg-[#2a2a35] transition-all ${isUploadingRefs ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <Upload className="w-5 h-5 text-(--text-gray) mb-1" />
                                        <span className="text-[0.65rem] text-(--text-gray)">업로드</span>
                                        <input 
                                            type="file" 
                                            accept="image/jpeg,image/png,image/webp" 
                                            multiple 
                                            className="hidden" 
                                            onChange={handleReferenceImageUpload}
                                            disabled={isUploadingRefs}
                                        />
                                    </label>
                                )}
                            </div>
                            <div className="bg-[#252530] rounded-md p-3 border border-(--border-color)">
                                {referenceImages.length > 0 ? (
                                    <p className="text-[0.75rem] text-(--text-gray) leading-relaxed">
                                        💡 <strong className="text-white">참조 이미지 활용 팁:</strong> 업로드한 이미지의 스타일, 구도, 색감을 기반으로 새로운 이미지를 생성합니다. 
                                        여러 장을 업로드하면 더 풍부한 참조가 가능합니다.
                                        <br /><br />
                                        <strong className="text-(--primary-color)">✨ 추천 사용 사례:</strong>
                                        <br />• 기존 제품 사진의 스타일을 유지하면서 새로운 컨셉 생성
                                        <br />• 여러 참조 이미지를 결합한 독특한 스타일 합성
                                        <br />• 브랜드 아이덴티티를 반영한 일관된 비주얼 생성
                                    </p>
                                ) : (
                                    <p className="text-[0.75rem] text-(--text-gray) leading-relaxed">
                                        💡 <strong className="text-white">참조 이미지는 선택사항입니다.</strong>
                                        <br />• <strong>참조 이미지 있음:</strong> Image-to-Image 모드로 스타일 합성
                                        <br />• <strong>참조 이미지 없음:</strong> Text-to-Image 모드로 프롬프트만으로 생성
                                    </p>
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
                    <div className="bg-[#1a1a24] rounded-lg p-3 border border-(--border-color)">
                        <p className="text-[0.75rem] text-(--text-gray) leading-relaxed">
                            💡 <strong className="text-white">{selectedModel === 'dev' ? 'Flux Dev' : selectedModel === 'schnell' ? 'Flux Schnell' : 'Nano Banana Pro'}</strong> 모델이 선택되었습니다.
                            {selectedModel === 'dev' && ' 높은 품질의 이미지를 생성하지만 시간이 더 걸릴 수 있습니다.'}
                            {selectedModel === 'schnell' && ' 빠르게 이미지를 생성하며 비용 효율적입니다.'}
                            {selectedModel === 'nanobanana' && (
                                <>
                                    <br /><br />
                                    <strong className="text-(--primary-color)">✨ Image-to-Image 전용 모드</strong>
                                    <br />
                                    • 참조 이미지를 업로드하여 스타일, 구도, 색감을 반영한 새로운 이미지 생성<br />
                                    • 최대 8장의 참조 이미지 지원 (권장: 3~5장)<br />
                                    • 해상도: 1K (빠름), 2K (균형), 4K (최고 품질)<br />
                                    • 참조 이미지 없이도 Text-to-Image로 사용 가능
                                </>
                            )}
                        </p>
                    </div>
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
                                disabled={generatingIds.has(scene.id) || !scene.imagePrompt}
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
                                                value={scene.imagePrompt || ''}
                                                onChange={(e) => handlePromptChange(scene.id, e.target.value)}
                                                onBlur={() => saveCurrentProject()} // Auto-save on blur
                                                placeholder="프롬프트를 입력하세요..."
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <MagicPromptButton
                                                prompt={scene.imagePrompt || ''}
                                                onPromptChange={(newPrompt) => {
                                                    handlePromptChange(scene.id, newPrompt);
                                                    saveCurrentProject();
                                                }}
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
                                    {generatingIds.has(scene.id) ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                            <span className="text-xs">생성 중...</span>
                                        </div>
                                    ) : scene.imageUrl ? (
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
