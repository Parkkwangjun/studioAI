"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Card, CardContent } from "@/components/ui/Card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { Image as ImageIcon, Upload, Sparkles, Wand2, Settings2, Loader2, Download, Video, Save, Check } from "lucide-react"
import { MagicPromptButton } from "@/components/common/MagicPromptButton"
import { useSettingsStore } from "@/store/useSettingsStore"
import { useProjectStore } from "@/store/useProjectStore"

interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    createdAt: number;
    saved?: boolean;
}

const GeneratedImageCard = React.memo(({ img }: { img: GeneratedImage }) => (
    <div className="group relative aspect-square rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-primary transition-all cursor-pointer">
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
    </div>
));
GeneratedImageCard.displayName = 'GeneratedImageCard';

export default function ImageGenerationPage() {
    const [prompt, setPrompt] = React.useState("")
    const [isGenerating, setIsGenerating] = React.useState(false)
    const [aspectRatio, setAspectRatio] = React.useState("1:1")
    const [selectedModel, setSelectedModel] = React.useState("nanobanana")

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
                    model: selectedModel
                })
            });

            const createData = await createRes.json();
            if (!createRes.ok) throw new Error(createData.error || 'Failed to start generation');

            // Handle Polling for Nanobanana (status: 'pending')
            if (createData.status === 'pending' && createData.taskId) {
                const taskId = createData.taskId;

                // 2. Poll for Status
                const pollInterval = setInterval(async () => {
                    try {
                        const kieKey = useSettingsStore.getState().kieKey;
                        const statusRes = await fetch(`/api/image-generation/${taskId}`, {
                            headers: { 'x-kie-key': kieKey || '' }
                        });
                        const statusData = await statusRes.json();

                        if (statusData.data?.state === 'success') {
                            clearInterval(pollInterval);
                            const resultJson = JSON.parse(statusData.data.resultJson);
                            // Try multiple paths for image URL
                            const imageUrl = resultJson.resultUrls?.[0]
                                || resultJson.url
                                || resultJson.image_url
                                || (Array.isArray(resultJson) ? resultJson[0] : null);

                            if (imageUrl) {
                                // Auto-save to library
                                if (currentProject) {
                                    await addAsset({
                                        type: 'image',
                                        title: `AI Generated - ${prompt}`,
                                        url: imageUrl,
                                        tag: selectedModel,
                                        sceneNumber: 0
                                    });
                                    saveCurrentProject();
                                }
                            }
                            setIsGenerating(false);
                        } else if (statusData.data?.state === 'fail') {
                            clearInterval(pollInterval);
                            setIsGenerating(false);
                            alert(`Generation failed: ${statusData.data.failMsg}`);
                        }
                    } catch (error) {
                        console.error('Polling error:', error);
                    }
                }, 2000);
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
            alert('Failed to generate image. Please try again.');
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
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id="img-to-img-upload"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        // Handle file upload (mock for now or implement real upload)

                                        // You might want to set a state here to show the selected image
                                    }
                                }}
                            />
                            <label
                                htmlFor="img-to-img-upload"
                                className="block w-full"
                            >
                                <Card className="border-dashed border-2 border-border bg-transparent hover:bg-white/5 transition-colors cursor-pointer w-full">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <Upload className="w-10 h-10 text-muted mb-4" />
                                        <h3 className="text-lg font-medium text-white mb-1">참조 이미지 업로드</h3>
                                        <p className="text-sm text-muted">클릭하거나 이미지를 드래그하세요</p>
                                        <p className="text-xs text-muted mt-2">JPG, PNG (최대 10MB)</p>
                                    </CardContent>
                                </Card>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">변경 프롬프트</label>
                            <Textarea
                                placeholder="이미지를 어떻게 변경하고 싶으신가요?"
                                className="h-24 w-full resize-none"
                            />
                        </div>

                        <Button className="w-full h-12 text-lg font-semibold" size="lg" disabled>
                            <Wand2 className="w-5 h-5 mr-2" />
                            변환하기 (준비 중)
                        </Button>
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
