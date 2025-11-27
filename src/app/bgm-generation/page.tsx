
"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Radio, Play, Pause, Download, Loader2, Music, Mic, Disc } from "lucide-react"
import { useSettingsStore } from "@/store/useSettingsStore"
import { useProjectStore } from "@/store/useProjectStore"
import { MagicPromptButton } from "@/components/common/MagicPromptButton"
import toast from 'react-hot-toast'

interface GeneratedBgm {
    id: string;
    url: string;
    title: string;
    prompt: string;
    duration: number;
    createdAt: number;
    imageUrl?: string;
}

interface SunoTrack {
    id: string;
    audioUrl: string;
    title?: string;
    duration: number;
    imageUrl?: string;
}

export default function BgmGenerationPage() {
    const [prompt, setPrompt] = React.useState("")
    const [title, setTitle] = React.useState("")
    const [style, setStyle] = React.useState("")
    const [isInstrumental, setIsInstrumental] = React.useState(false)
    const [isGenerating, setIsGenerating] = React.useState(false)
    const [playingId, setPlayingId] = React.useState<string | null>(null)
    const audioRefs = React.useRef<{ [key: string]: HTMLAudioElement }>({})
    const { kieKey } = useSettingsStore()
    const { addAsset, currentProject, saveCurrentProject } = useProjectStore()

    const [selectedLyrics, setSelectedLyrics] = React.useState<{ title: string; content: string } | null>(null);

    // Get BGM assets from project library (most recent first)
    const generatedBgm = React.useMemo(() => {
        if (!currentProject?.assets) return []
        
        return currentProject.assets
            .filter(asset => asset.type === 'bgm')
            .map(asset => {
                const createdAtStr = asset.createdAt || new Date().toISOString()
                const createdAt = new Date(createdAtStr).getTime() || Date.now()
                return {
                    id: asset.id.toString(),
                    url: asset.url || '',
                    title: asset.title.replace(' (생성 중...)', '').replace('(생성 중...)', ''),
                    prompt: asset.title.replace(' (생성 중...)', '').replace('(생성 중...)', ''), // Use title as prompt for now
                    duration: asset.duration || 0,
                    createdAt: createdAt,
                    imageUrl: undefined, // Can be added later if needed
                    isPending: asset.tag?.startsWith('pending-bgm:') || false,
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
            const createRes = await fetch('/api/bgm-generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-kie-key': kieKey || ''
                },
                body: JSON.stringify({
                    prompt,
                    title,
                    style,
                    instrumental: isInstrumental,
                    model: "V3_5"
                })
            });

            const createData = await createRes.json();
            if (!createRes.ok) throw new Error(createData.error || 'Failed to start generation');

            if (!createData.data || !createData.data.taskId) {
                throw new Error(createData.msg || 'No task ID returned from API');
            }

            const taskId = createData.data.taskId;

            // Create pending asset immediately
            if (currentProject) {
                await addAsset({
                    type: 'bgm',
                    title: `${title || prompt.slice(0, 30)}... (생성 중...)`,
                    url: '',
                    tag: `pending-bgm:${taskId}`,
                    sceneNumber: 0
                });
                saveCurrentProject();
            }

            toast.success('배경음악 생성이 시작되었습니다! 라이브러리에서 진행 상황을 확인하세요.');
            setIsGenerating(false);
            setPrompt('');
            setTitle('');
            // Polling handled by useAudioTaskPoller

        } catch (error) {
            console.error('Generation error:', error);
            setIsGenerating(false);
            toast.error('배경음악 생성에 실패했습니다. 다시 시도해주세요.');
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
                    <h1 className="text-[1.2rem] font-semibold text-white mb-2">AI 배경음악 생성</h1>
                    <p className="text-sm text-muted">원하는 분위기의 음악을 작곡하세요.</p>
                </div>

                <div className="space-y-6">
                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-300">음악 설명 (가사 내용)</label>
                            <MagicPromptButton
                                prompt={prompt}
                                onPromptChange={setPrompt}
                                type="bgm"
                            />
                        </div>
                        <Textarea
                            placeholder="어떤 음악을 만들고 싶으신가요? (예: 희망찬 분위기의 팝송, 가사는 미래에 대한 내용)"
                            className="h-32 resize-none"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <div className="flex justify-between text-xs text-muted">
                            <span>한국어 지원</span>
                            <span>{prompt.length}/500</span>
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="space-y-4 p-4 bg-[#15151e] rounded-lg border border-[#2a2a35]">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-300">보컬 여부</label>
                            <div className="flex items-center gap-2 bg-[#262633] p-1 rounded-lg">
                                <button
                                    onClick={() => setIsInstrumental(false)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!isInstrumental ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    보컬 포함
                                </button>
                                <button
                                    onClick={() => setIsInstrumental(true)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isInstrumental ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    연주곡 (Inst)
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">음악 스타일</label>
                            <Input
                                placeholder="예: K-Pop, Jazz, Rock, EDM"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">제목 (선택)</label>
                            <Input
                                placeholder="곡 제목을 입력하세요"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
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
                                작곡 중...
                            </>
                        ) : (
                            <>
                                <Radio className="w-5 h-5 mr-2" />
                                음악 생성하기
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Right Panel - List */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">최근 생성된 음악</h2>
                </div>

                <div className="flex-1 rounded-xl border border-border bg-[#15151e] p-6 overflow-y-auto custom-scrollbar">
                    {generatedBgm.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted opacity-50">
                            <Disc className="w-16 h-16 mb-4 animate-spin-slow" />
                            <p>생성된 음악이 여기에 표시됩니다</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {generatedBgm.map((bgm) => (
                                <div key={bgm.id} className="flex flex-col p-4 rounded-lg bg-[#262633] border border-[#2a2a35] hover:border-primary transition-colors group">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-20 h-20 rounded-lg bg-black/50 overflow-hidden shrink-0 relative">
                                            {bgm.isPending || !bgm.hasUrl ? (
                                                <div className="w-full h-full flex items-center justify-center text-primary">
                                                    <Loader2 className="w-8 h-8 animate-spin" />
                                                </div>
                                            ) : bgm.imageUrl ? (
                                                <img src={bgm.imageUrl} alt={bgm.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <Music className="w-8 h-8" />
                                                </div>
                                            )}
                                            {!bgm.isPending && bgm.hasUrl && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="icon"
                                                        variant="primary"
                                                        className="rounded-full w-8 h-8"
                                                        onClick={() => togglePlay(bgm.id, bgm.url)}
                                                    >
                                                        {playingId === bgm.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-bold text-white truncate mb-1">
                                                {bgm.isPending || !bgm.hasUrl ? `${bgm.title} (생성 중...)` : bgm.title}
                                            </h4>
                                            {bgm.isPending || !bgm.hasUrl ? (
                                                <p className="text-xs text-gray-400 mb-2">백그라운드에서 생성 중...</p>
                                            ) : (
                                                <>
                                                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">{bgm.prompt}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                        <span className="bg-white/5 px-1.5 py-0.5 rounded">{Math.floor(bgm.duration)}s</span>
                                                        <span>{new Date(bgm.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {!bgm.isPending && bgm.hasUrl && (
                                        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="w-full text-xs h-8"
                                                onClick={() => setSelectedLyrics({ title: bgm.title, content: bgm.prompt })}
                                            >
                                                <Mic className="w-3.5 h-3.5 mr-2" />
                                                가사 보기
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Lyrics Modal */}
            {selectedLyrics && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1e1e2d] border border-[#2a2a35] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-[#2a2a35]">
                            <h3 className="text-lg font-bold text-white truncate pr-4">{selectedLyrics.title}</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLyrics(null)}
                                className="h-8 w-8 p-0 rounded-full hover:bg-white/10"
                            >
                                ✕
                            </Button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="text-center space-y-4">
                                {selectedLyrics.content.split('\n').map((line, i) => (
                                    <p key={i} className="text-gray-300 leading-relaxed">
                                        {line || <br />}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
