'use client';

import { PlayCircle, Upload, Wand2, RefreshCw, Image as ImageIcon, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { VideoResultModal } from '@/components/video/VideoResultModal';
import { useProjectStore } from '@/store/useProjectStore';
import { VideoSettings, VideoSettingsState } from '@/components/video/VideoSettings';
import toast, { Toaster } from 'react-hot-toast';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function VideoPage() {
    const [prompt, setPrompt] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [taskId, setTaskId] = useState<string | null>(null);

    const [settings, setSettings] = useState<VideoSettingsState>({
        model: 'grok',
        mode: 'normal',
        duration: '5',
        resolution: '720p'
    });

    const { currentProject, updateScene, saveCurrentProject, updateProjectInfo } = useProjectStore();
    const { kieKey, openaiKey } = useSettingsStore();
    const scenes = currentProject?.scenes || [];

    // Auto-select first available image if none selected
    useEffect(() => {
        if (!selectedImage && scenes.length > 0) {
            const firstImageScene = scenes.find(s => s.imageUrl);
            if (firstImageScene) {
                setSelectedImage(firstImageScene.imageUrl!);
                setSelectedSceneId(firstImageScene.id);
            }
        }
    }, [scenes, selectedImage]);

    useEffect(() => {
        if (taskId && !generatedVideo) {
            const interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/video/status?taskId=${taskId}`, {
                        headers: {
                            'x-kie-key': kieKey || ''
                        }
                    });
                    const data = await res.json();

                    if (data.status === 'completed') {
                        setGeneratedVideo(data.videoUrl);
                        setTaskId(null);
                        clearInterval(interval);

                        // Auto-save logic
                        if (selectedSceneId) {
                            updateScene(selectedSceneId, { videoUrl: data.videoUrl });
                        }
                        updateProjectInfo({ type: 'video', thumbnail: data.videoUrl }); // Use video thumbnail if available, or just keep image
                        saveCurrentProject();
                        toast.success('Video generated and saved!');
                    } else if (data.status === 'failed') {
                        toast.error(`Video generation failed: ${data.error}`);
                        setTaskId(null);
                        clearInterval(interval);
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                }
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [taskId, generatedVideo, selectedSceneId, updateScene, saveCurrentProject, updateProjectInfo]);

    const handleGenerateVideo = async () => {
        if (!selectedImage) {
            toast.error('Please select an image first');
            return;
        }

        if (!kieKey || !openaiKey) {
            toast.error('설정에서 KIE 및 OpenAI API 키를 먼저 입력해주세요.');
            return;
        }

        try {
            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-kie-key': kieKey,
                    'x-openai-key': openaiKey
                },
                body: JSON.stringify({
                    imageUrl: selectedImage,
                    prompt: prompt,
                    ...settings
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Generation failed');
            }

            const data = await response.json();
            setTaskId(data.taskId);
            toast.success('Video generation started...');
        } catch (error) {
            console.error('Video generation error:', error);
            toast.error(`Failed to start generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setSelectedImage(url);
            setSelectedSceneId(null); // Not associated with a scene
        }
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
                    <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] flex-1 flex flex-col">
                        <h3 className="text-[0.9rem] font-semibold mb-[15px]">소스 이미지 선택</h3>

                        {/* Scene Images Grid */}
                        <div className="grid grid-cols-4 gap-3 mb-5">
                            {scenes.filter(s => s.imageUrl).map(scene => (
                                <div
                                    key={scene.id}
                                    onClick={() => {
                                        setSelectedImage(scene.imageUrl!);
                                        setSelectedSceneId(scene.id);
                                    }}
                                    className={`aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-all relative group ${selectedImage === scene.imageUrl
                                        ? 'border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]/30'
                                        : 'border-transparent hover:border-[var(--text-gray)]'
                                        }`}
                                >
                                    <img src={scene.imageUrl} alt={`Scene ${scene.id}`} className="w-full h-full object-cover" />
                                    {selectedImage === scene.imageUrl && (
                                        <div className="absolute top-1 right-1 bg-[var(--primary-color)] rounded-full p-0.5">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[0.65rem] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                        Scene #{scene.id}
                                    </div>
                                </div>
                            ))}

                            {/* Upload Button */}
                            <div className="aspect-video bg-[#15151e] rounded-md border border-dashed border-[var(--border-color)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--text-gray)] hover:bg-[#1a1a24] transition-colors relative group">
                                <Upload className="w-5 h-5 text-[var(--text-gray)] mb-1 group-hover:text-white transition-colors" />
                                <span className="text-[0.7rem] text-[var(--text-gray)]">Upload</span>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                            </div>
                        </div>

                        {/* Selected Image Preview */}
                        <div className="flex-1 bg-[#15151e] border-2 border-dashed border-[var(--border-color)] rounded-lg flex flex-col items-center justify-center relative overflow-hidden group hover:border-[var(--primary-color)] transition-colors min-h-[250px]">
                            {selectedImage ? (
                                <>
                                    <img src={selectedImage} alt="Source" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => { setSelectedImage(null); setSelectedSceneId(null); }} className="text-white underline text-sm">이미지 변경</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="w-10 h-10 text-[var(--text-gray)] mb-3" />
                                    <p className="text-[0.9rem] text-[var(--text-gray)] mb-1">위 목록에서 선택하거나 이미지를 업로드하세요</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
                        <h3 className="text-[0.9rem] font-semibold mb-[15px]">프롬프트 (Optional)</h3>
                        <textarea
                            className="w-full h-24 bg-[#15151e] border border-[var(--border-color)] rounded-lg p-3 text-white resize-none outline-none focus:border-[var(--primary-color)] text-sm transition-colors"
                            placeholder="비디오의 움직임이나 분위기를 설명하세요... (비워두면 AI가 이미지에 맞춰 자동으로 생성합니다)"
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

                        <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] mt-auto">
                            <button
                                className="w-full bg-[var(--primary-color)] text-white py-3.5 rounded-lg font-semibold hover:bg-[#4a4ddb] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                                disabled={!selectedImage || !!taskId}
                                onClick={handleGenerateVideo}
                            >
                                {taskId ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        생성 중...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-5 h-5" />
                                        비디오 생성하기
                                    </>
                                )}
                            </button>
                            <p className="text-[0.7rem] text-[var(--text-gray)] text-center mt-3">
                                생성된 비디오는 자동으로 라이브러리에 저장됩니다.
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
