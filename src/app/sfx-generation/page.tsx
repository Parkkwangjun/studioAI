"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Loader2, Speaker, Play, Pause, Download, Music, Clock, Sliders } from "lucide-react"
import { useSettingsStore } from "@/store/useSettingsStore"
import { useProjectStore } from "@/store/useProjectStore"
import { MagicPromptButton } from "@/components/common/MagicPromptButton"

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
    const [generatedSfx, setGeneratedSfx] = React.useState<GeneratedSfx[]>([])
    const [playingId, setPlayingId] = React.useState<string | null>(null)
    const audioRefs = React.useRef<{ [key: string]: HTMLAudioElement }>({})
    const { kieKey } = useSettingsStore()
    const { addAsset, currentProject, saveCurrentProject } = useProjectStore()

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

            // 2. Poll for Status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/sfx-generation/${taskId}`, {
                        headers: { 'x-kie-key': kieKey || '' }
                    });
                    const statusData = await statusRes.json();

                    if (statusData.data?.state === 'success') {
                        clearInterval(pollInterval);
                        const resultJson = JSON.parse(statusData.data.resultJson);
                        const audioUrl = resultJson.resultUrls[0];

                        const newSfx: GeneratedSfx = {
                            id: taskId,
                            url: audioUrl,
                            prompt: prompt,
                            duration: parseFloat(duration),
                            createdAt: Date.now()
                        };

                        setGeneratedSfx(prev => [newSfx, ...prev]);

                        // Auto-save to library
                        if (currentProject) {
                            addAsset({
                                type: 'audio',
                                title: `SFX - ${prompt.slice(0, 20)}...`,
                                url: audioUrl,
                                tag: 'sfx',
                                sceneNumber: 0 // Global asset
                            });
                            saveCurrentProject();
                        }

                        setIsGenerating(false);
                    } else if (statusData.data.state === 'fail') {
                        clearInterval(pollInterval);
                        setIsGenerating(false);
                        alert(`Generation failed: ${statusData.data.failMsg}`);
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                }
            }, 2000);

        } catch (error) {
            console.error('Generation error:', error);
            setIsGenerating(false);
            alert('Failed to generate SFX. Please try again.');
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
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="rounded-full w-10 h-10 shrink-0"
                                            onClick={() => togglePlay(sfx.id, sfx.url)}
                                        >
                                            {playingId === sfx.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                        </Button>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-medium text-white truncate">{sfx.prompt}</h4>
                                            <p className="text-xs text-muted">{sfx.duration}s • {new Date(sfx.createdAt).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
