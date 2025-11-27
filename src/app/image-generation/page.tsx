"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Card, CardContent } from "@/components/ui/Card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { Image as ImageIcon, Upload, Sparkles, Wand2, Settings2, Loader2, Download, Video, Save, Check, X, Trash2 } from "lucide-react"
import { MagicPromptButton } from "@/components/common/MagicPromptButton"
import { useSettingsStore } from "@/store/useSettingsStore"
import { useProjectStore } from "@/store/useProjectStore"
import toast from 'react-hot-toast'

interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    createdAt: number;
    saved?: boolean;
}

const GeneratedImageCard = React.memo(({ img }: { img: GeneratedImage }) => (
    <div className="group relative aspect-square rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-primary transition-all cursor-pointer">
        {img.url ? (
            <>
                <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <div className="bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Saved to Library
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate">{img.prompt}</p>
                </div>
            </>
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-xs text-gray-400">생성 중...</p>
            </div>
        )}
    </div>
));
GeneratedImageCard.displayName = 'GeneratedImageCard';

export default function ImageGenerationPage() {
    const [prompt, setPrompt] = React.useState("")
    const [isGenerating, setIsGenerating] = React.useState(false)
    const [aspectRatio, setAspectRatio] = React.useState("1:1")
    const [selectedModel, setSelectedModel] = React.useState("nanobanana")
    
    // Image-to-Image specific states
    const [referenceImages, setReferenceImages] = React.useState<string[]>([]) // Display URLs
    const [referenceImageFiles, setReferenceImageFiles] = React.useState<File[]>([]) // Files for upload
    const [isUploadingRefs, setIsUploadingRefs] = React.useState(false)
    const [img2imgPrompt, setImg2imgPrompt] = React.useState("")
    const [resolution, setResolution] = React.useState<'1K' | '2K' | '4K'>('1K')

    const { falKey, openaiKey, kieKey } = useSettingsStore()
    const { addAsset, currentProject, saveCurrentProject } = useProjectStore()

    // Sync generated images from project assets using useMemo
    const generatedImages = React.useMemo(() => {
        if (!currentProject?.assets) return [];

        return currentProject.assets
            .filter(a => a.type === 'image' && a.tag) // Assuming 'tag' stores the model name or 'upload'
            .map(a => ({
                id: a.id,
                url: a.url,
                prompt: a.title.replace('AI Generated - ', '').replace('...', ''), // Reconstruct prompt roughly or store it better
                createdAt: new Date(a.createdAt).getTime(),
                saved: true
            }))
            .sort((a, b) => b.createdAt - a.createdAt);
    }, [currentProject?.assets]);

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
            
            setReferenceImageFiles(prev => [...prev, ...newFiles].slice(0, 8));
            setReferenceImages(prev => [...prev, ...newImages].slice(0, 8));
        }
        e.target.value = '';
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
        setReferenceImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleImg2ImgGenerate = async () => {
        if (!img2imgPrompt.trim()) {
            toast.warning('프롬프트를 입력해주세요.');
            return;
        }

        if (referenceImageFiles.length === 0) {
            toast.warning('참조 이미지를 최소 1장 이상 업로드해주세요.');
            return;
        }

        setIsGenerating(true);
        
        try {
            // Upload reference images
            setIsUploadingRefs(true);
            const uploadedUrls: string[] = [];
            
            for (const file of referenceImageFiles) {
                const formData = new FormData();
                formData.append('file', file);
                
                const uploadRes = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData
                });
                
                if (uploadRes.ok) {
                    const { url } = await uploadRes.json();
                    uploadedUrls.push(url);
                }
            }
            
            setIsUploadingRefs(false);
            
            if (uploadedUrls.length === 0) {
                throw new Error('이미지 업로드에 실패했습니다.');
            }

            // Generate image with references
            const createRes = await fetch('/api/image/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-fal-key': falKey || '',
                    'x-openai-key': openaiKey || '',
                    'x-kie-key': kieKey || ''
                },
                body: JSON.stringify({
                    prompt: img2imgPrompt,
                    imageSize: aspectRatio === "16:9" ? "landscape_16_9" : aspectRatio === "9:16" ? "portrait_16_9" : "square_hd",
                    model: 'nanobanana',
                    resolution: resolution,
                    referenceImages: uploadedUrls
                })
            });

            const createData = await createRes.json();
            if (!createRes.ok) throw new Error(createData.error || 'Failed to start generation');

            // Create pending asset immediately
            if (createData.status === 'pending' && createData.taskId) {
                const taskId = createData.taskId;
                console.log('[Img2Img] Task created:', taskId);
                
                await addAsset({
                    type: 'image',
                    title: `${img2imgPrompt.slice(0, 30)}... (생성 중...)`,
                    url: '',
                    tag: `pending-image:${taskId}`,
                    sceneNumber: 0
                });

                toast.success('이미지 생성이 시작되었습니다! 라이브러리에서 진행 상황을 확인하세요.');
                setIsGenerating(false);
                // Clear reference images after successful submission
                setReferenceImages([]);
                setReferenceImageFiles([]);
                setImg2imgPrompt('');
            }
        } catch (error) {
            console.error('Img2Img generation error:', error);
            setIsGenerating(false);
            toast.error('이미지 생성에 실패했습니다. 다시 시도해주세요.');
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        try {
            // 1. Create Task
            // Reuse the main image generation API which handles all models and optimization
            const createRes = await fetch('/api/image/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-fal-key': falKey || '',
                    'x-openai-key': openaiKey || '',
                    'x-kie-key': kieKey || ''
                },
                body: JSON.stringify({
                    prompt,
                    imageSize: aspectRatio === "16:9" ? "landscape_16_9" : aspectRatio === "9:16" ? "portrait_16_9" : "square_hd",
                    model: selectedModel,
                    resolution: selectedModel === 'nanobanana' ? resolution : undefined
                })
            });

            const createData = await createRes.json();
            if (!createRes.ok) throw new Error(createData.error || 'Failed to start generation');

            // Handle Nanobanana: Create pending asset immediately
            if (createData.status === 'pending' && createData.taskId) {
                const taskId = createData.taskId;
                console.log('[Text2Img] Task created:', taskId);
                
                                    await addAsset({
                                        type: 'image',
                    title: `${prompt.slice(0, 30)}... (생성 중...)`,
                    url: '',
                    tag: `pending-image:${taskId}`,
                                        sceneNumber: 0
                                    });

                toast.success('이미지 생성이 시작되었습니다! 라이브러리에서 진행 상황을 확인하세요.');
                            setIsGenerating(false);
                setPrompt('');
                return; // Exit early, polling handled by useImagePoller
            }
            // Handle Flux/Direct Response (imageUrl present)
            else if (createData.imageUrl) {
                // Auto-save to library
                if (currentProject) {
                    await addAsset({
                        type: 'image',
                        title: `AI Generated - ${prompt}`,
                        url: createData.imageUrl,
                        tag: selectedModel,
                        sceneNumber: 0
                    });
                    saveCurrentProject();
                }

                setIsGenerating(false);
            } else {
                throw new Error('Invalid response from generation API');
            }

        } catch (error) {
            console.error('Generation error:', error);
            setIsGenerating(false);
            toast.error('이미지 생성에 실패했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <div className="flex h-full gap-6 p-[30px_40px]">
            {/* Left Panel - Controls */}
            <div className="w-[400px] shrink-0 flex flex-col gap-6 overflow-y-auto px-2">
                <div>
                    <h1 className="text-[1.2rem] font-semibold text-white mb-2">AI 이미지 생성기</h1>
                    <p className="text-sm text-muted">텍스트를 입력하여 고품질 이미지를 생성하세요.</p>
                </div>

                <Tabs defaultValue="text-to-image" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-4">
                        <TabsTrigger value="text-to-image">텍스트를 이미지로</TabsTrigger>
                        <TabsTrigger value="image-to-image">이미지를 이미지로</TabsTrigger>
                    </TabsList>

                    <TabsContent value="text-to-image" className="space-y-6">
                        {/* Prompt Input */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-300">프롬프트</label>
                                <MagicPromptButton
                                    prompt={prompt}
                                    onPromptChange={setPrompt}
                                    type="image"
                                />
                            </div>
                            <Textarea
                                placeholder="생성하고 싶은 이미지를 자세히 설명해주세요... (예: 사이버펑크 도시의 네온사인 거리, 비 오는 밤)"
                                className="h-32 resize-none"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                maxLength={2000}
                            />
                            <div className="flex justify-between text-xs text-muted">
                                <span>한국어 지원</span>
                                <span>{prompt.length}/2000</span>
                            </div>
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">모델 선택</label>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant={selectedModel === 'dev' ? 'secondary' : 'outline'}
                                        className={`justify-center gap-2 h-auto py-3 ${selectedModel === 'dev' ? 'border-primary bg-primary/10 text-white' : ''}`}
                                        onClick={() => setSelectedModel('dev')}
                                    >
                                        <Wand2 className="w-4 h-4" />
                                        <div className="text-center">
                                            <div className="font-medium text-xs">Flux Dev</div>
                                            <div className="text-[10px] text-muted">Quality</div>
                                        </div>
                                    </Button>
                                    <Button
                                        variant={selectedModel === 'schnell' ? 'secondary' : 'outline'}
                                        className={`justify-center gap-2 h-auto py-3 ${selectedModel === 'schnell' ? 'border-primary bg-primary/10 text-white' : ''}`}
                                        onClick={() => setSelectedModel('schnell')}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <div className="text-center">
                                            <div className="font-medium text-xs">Flux Schnell</div>
                                            <div className="text-[10px] text-muted">Fast</div>
                                        </div>
                                    </Button>
                                    <Button
                                        variant={selectedModel === 'nanobanana' ? 'secondary' : 'outline'}
                                        className={`justify-center gap-2 h-auto py-3 ${selectedModel === 'nanobanana' ? 'border-primary bg-primary/10 text-white' : ''}`}
                                        onClick={() => setSelectedModel('nanobanana')}
                                    >
                                        <Wand2 className="w-4 h-4 text-primary" />
                                        <div className="text-center">
                                            <div className="font-medium text-xs">Nanobanana</div>
                                            <div className="text-[10px] text-muted">Pro</div>
                                        </div>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Resolution Selection (Nanobanana only) */}
                        {selectedModel === 'nanobanana' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">해상도</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['1K', '2K', '4K'] as const).map((res) => (
                                        <Button
                                            key={res}
                                            variant={resolution === res ? "secondary" : "outline"}
                                            size="sm"
                                            onClick={() => setResolution(res)}
                                            className={resolution === res ? "bg-primary text-white hover:bg-primary/90" : ""}
                                        >
                                            {res}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Aspect Ratio */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">비율</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => (
                                    <Button
                                        key={ratio}
                                        variant={aspectRatio === ratio ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setAspectRatio(ratio)}
                                        className={aspectRatio === ratio ? "bg-primary text-white hover:bg-primary/90" : ""}
                                    >
                                        {ratio}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <Button
                            className="w-full h-12 text-lg font-semibold shadow-blue-500/20"
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt.trim()}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    생성 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    이미지 생성하기
                                </>
                            )}
                        </Button>
                    </TabsContent>

                    <TabsContent value="image-to-image" className="space-y-6">
                        {/* Reference Images Upload */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    참조 이미지 (최대 8장)
                                </label>
                                {referenceImages.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setReferenceImages([]);
                                            setReferenceImageFiles([]);
                                        }}
                                        className="text-xs text-muted hover:text-red-400 transition-colors flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" />
                                        전체 삭제
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                {referenceImages.map((img, idx) => (
                                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-border group hover:border-primary transition-all">
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
                                    <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-white/5 transition-all ${isUploadingRefs ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <Upload className="w-5 h-5 text-muted mb-1" />
                                        <span className="text-[0.65rem] text-muted">추가</span>
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

                            {referenceImages.length === 0 && (
                                <div className="text-xs text-muted bg-white/5 rounded-lg p-3 border border-border">
                                    💡 참조 이미지를 업로드하면 해당 이미지의 스타일과 구도를 반영한 새로운 이미지를 생성합니다.
                                </div>
                            )}
                        </div>

                        {/* Resolution Selection for Nanobanana */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">해상도</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['1K', '2K', '4K'] as const).map((res) => (
                                    <Button
                                        key={res}
                                        variant={resolution === res ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setResolution(res)}
                                        className={resolution === res ? "bg-primary text-white hover:bg-primary/90" : ""}
                                    >
                                        {res}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Aspect Ratio */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">비율</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => (
                                    <Button
                                        key={ratio}
                                        variant={aspectRatio === ratio ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setAspectRatio(ratio)}
                                        className={aspectRatio === ratio ? "bg-primary text-white hover:bg-primary/90" : ""}
                                    >
                                        {ratio}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Prompt Input */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-300">생성 프롬프트</label>
                                <MagicPromptButton
                                    prompt={img2imgPrompt}
                                    onPromptChange={setImg2imgPrompt}
                                    type="image"
                                />
                            </div>
                            <Textarea
                                placeholder="참조 이미지를 기반으로 어떤 이미지를 생성하고 싶으신가요?"
                                className="h-24 w-full resize-none"
                                value={img2imgPrompt}
                                onChange={(e) => setImg2imgPrompt(e.target.value)}
                                maxLength={2000}
                            />
                            <div className="flex justify-end text-xs text-muted">
                                <span>{img2imgPrompt.length}/2000</span>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <Button 
                            className="w-full h-12 text-lg font-semibold" 
                            size="lg"
                            onClick={handleImg2ImgGenerate}
                            disabled={isGenerating || !img2imgPrompt.trim() || referenceImages.length === 0}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    {isUploadingRefs ? '이미지 업로드 중...' : '생성 중...'}
                                </>
                            ) : (
                                <>
                            <Wand2 className="w-5 h-5 mr-2" />
                                    이미지 생성하기
                                </>
                            )}
                        </Button>

                        {/* Info Box */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                            <p className="text-xs text-blue-300 leading-relaxed">
                                <strong className="text-white">✨ Nano Banana Pro 모델</strong>
                                <br />• 여러 참조 이미지를 조합하여 독특한 스타일 생성
                                <br />• 고해상도 지원 (최대 4K)
                                <br />• 브랜드 일관성 유지에 최적화
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Right Panel - Gallery/Preview */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">최근 생성된 이미지</h2>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-muted">
                            <Settings2 className="w-4 h-4 mr-2" />
                            보기 설정
                        </Button>
                    </div>
                </div>

                {/* Empty State / Gallery Grid */}
                <div className="flex-1 rounded-xl border border-border bg-[#15151e] p-6 overflow-y-auto custom-scrollbar">
                    {generatedImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted opacity-50">
                            <ImageIcon className="w-16 h-16 mb-4" />
                            <p>생성된 이미지가 여기에 표시됩니다</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {generatedImages.map((img) => (
                                <GeneratedImageCard key={img.id} img={img} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
