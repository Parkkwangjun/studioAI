"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Loader2, Speaker, Play, Pause, Download, Music, Clock, Sliders } from "lucide-react"
import { useSettingsStore } from "@/store/useSettingsStore"
import { useProjectStore } from "@/store/useProjectStore"
import { MagicPromptButton } from "@/components/common/MagicPromptButton"
import toast from 'react-hot-toast'

interface GeneratedSfx {
    id: string;
    url: string;
    prompt: string;
    duration: number;
    createdAt: number;
}

export default function SfxGenerationPage() {
    const [prompt, setPrompt] = React.useState("")
    const [duration, setDuration] = React.useState("5") // Default 5 seconds
    const [promptInfluence, setPromptInfluence] = React.useState("0.3")
    const [isGenerating, setIsGenerating] = React.useState(false)
    const [playingId, setPlayingId] = React.useState<string | null>(null)
    const audioRefs = React.useRef<{ [key: string]: HTMLAudioElement }>({})
    const { kieKey } = useSettingsStore()
    const { addAsset, currentProject, saveCurrentProject } = useProjectStore()

    // Get SFX assets from project library (most recent first)
    const generatedSfx = React.useMemo(() => {
        if (!currentProject?.assets) return []
        
        return currentProject.assets
            .filter(asset => asset.type === 'sfx')
            .map(asset => {
                const createdAtStr = asset.createdAt || new Date().toISOString()
                const createdAt = new Date(createdAtStr).getTime() || Date.now()
                return {
                    id: asset.id.toString(),
                    url: asset.url || '',
                    prompt: asset.title.replace(' (생성 중...)', '').replace('(생성 중...)', ''),
                    duration: asset.duration || 0,
                    createdAt: createdAt,
                    isPending: asset.tag?.startsWith('pending-sfx:') || false,
                    hasUrl: !!asset.url
                }
            })
            .sort((a, b) => b.createdAt - a.createdAt)
    }, [currentProject?.assets])

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        try {
            // 1. Create Task
            const createRes = await fetch('/api/sfx-generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-kie-key': kieKey || ''
                },
                body: JSON.stringify({
                    text: prompt,
                    duration: parseFloat(duration),
                    promptInfluence: parseFloat(promptInfluence)
                })
            });

            const createData = await createRes.json();
            if (!createRes.ok) throw new Error(createData.error || 'Failed to start generation');

            const taskId = createData.data.taskId;

            // Create pending asset immediately
            if (currentProject) {
                await addAsset({
                    type: 'sfx',
                    title: `${prompt.slice(0, 30)}... (생성 중...)`,
                    url: '',
                    tag: `pending-sfx:${taskId}`,
                    sceneNumber: 0
                });
                saveCurrentProject();
            }

            toast.success('효과음 생성이 시작되었습니다! 라이브러리에서 진행 상황을 확인하세요.');
            setIsGenerating(false);
            setPrompt('');
            // Polling handled by useAudioTaskPoller

        } catch (error) {
            console.error('Generation error:', error);
            setIsGenerating(false);
            toast.error('효과음 생성에 실패했습니다. 다시 시도해주세요.');
        }
    };

    const togglePlay = (id: string, url: string) => {
        if (playingId === id) {
            audioRefs.current[id]?.pause();
            setPlayingId(null);
        } else {
            if (playingId && audioRefs.current[playingId]) {
                audioRefs.current[playingId].pause();
            }
            if (!audioRefs.current[id]) {
                audioRefs.current[id] = new Audio(url);
                audioRefs.current[id].onended = () => setPlayingId(null);
            }
            audioRefs.current[id].play();
            setPlayingId(id);
        }
    };

    return (
        <div className="flex h-full gap-6 p-[30px_40px]">
            {/* Left Panel - Controls */}
            <div className="w-[400px] shrink-0 flex flex-col gap-6 overflow-y-auto px-2">
                <div>
                    <h1 className="text-[1.2rem] font-semibold text-white mb-2">AI 효과음 생성</h1>
                    <p className="text-sm text-muted">텍스트 설명으로 고품질 효과음을 생성하세요.</p>
                </div>

                <div className="space-y-6">
                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-300">효과음 설명</label>
                            <MagicPromptButton
                                prompt={prompt}
                                onPromptChange={setPrompt}
                                type="sfx"
                            />
                        </div>
                        <Textarea
                            placeholder="생성하고 싶은 소리를 설명해주세요... (예: 빗속을 걷는 발자국 소리, 레이저 총 발사음)"
                            className="h-32 resize-none"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <div className="flex justify-between text-xs text-muted">
                            <span>한국어 지원</span>
                            <span>{prompt.length}/500</span>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                길이 (초)
                            </label>
                            <Input
                                type="number"
                                min="0.5"
                                max="22"
                                step="0.1"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Sliders className="w-4 h-4" />
                                프롬프트 영향력
                            </label>
                            <Input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                value={promptInfluence}
                                onChange={(e) => setPromptInfluence(e.target.value)}
                            />
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
                                <Speaker className="w-5 h-5 mr-2" />
                                효과음 생성하기
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Right Panel - List */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">최근 생성된 효과음</h2>
                </div>

                <div className="flex-1 rounded-xl border border-border bg-[#15151e] p-6 overflow-y-auto custom-scrollbar">
                    {generatedSfx.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted opacity-50">
                            <Music className="w-16 h-16 mb-4" />
                            <p>생성된 효과음이 여기에 표시됩니다</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {generatedSfx.map((sfx) => (
                                <div key={sfx.id} className="flex items-center justify-between p-4 rounded-lg bg-[#262633] border border-[#2a2a35] hover:border-primary transition-colors">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {sfx.isPending || !sfx.hasUrl ? (
                                            <div className="rounded-full w-10 h-10 shrink-0 flex items-center justify-center bg-primary/20">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            </div>
                                        ) : (
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="rounded-full w-10 h-10 shrink-0"
                                                onClick={() => togglePlay(sfx.id, sfx.url)}
                                            >
                                                {playingId === sfx.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                            </Button>
                                        )}
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-medium text-white truncate">
                                                {sfx.isPending || !sfx.hasUrl ? `${sfx.prompt} (생성 중...)` : sfx.prompt}
                                            </h4>
                                            {sfx.isPending || !sfx.hasUrl ? (
                                                <p className="text-xs text-muted">백그라운드에서 생성 중...</p>
                                            ) : (
                                                <p className="text-xs text-muted">{sfx.duration}s • {new Date(sfx.createdAt).toLocaleTimeString()}</p>
                                            )}
                                        </div>
                                    </div>
                                    {!sfx.isPending && sfx.hasUrl && (
                                        <div className="flex items-center gap-2 ml-4">
                                            <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
