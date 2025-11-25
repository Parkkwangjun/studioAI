'use client';

import { Settings2, Info, Image as ImageIcon, Film } from 'lucide-react';

export interface VideoSettingsState {
    videoType: 'image-to-video' | 'start-end-frame';
    model: 'grok' | 'bytedance' | 'veo';
    mode: 'normal' | 'fun';
    duration: '5' | '10';
    resolution: '720p' | '1080p';
}

interface VideoSettingsProps {
    settings: VideoSettingsState;
    onSettingsChange: (settings: VideoSettingsState) => void;
}

export function VideoSettings({ settings, onSettingsChange }: VideoSettingsProps) {
    const handleChange = (key: keyof VideoSettingsState, value: string) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    const handleTypeChange = (type: 'image-to-video' | 'start-end-frame') => {
        // 타입 변경 시 모델도 자동 변경
        const newModel = type === 'start-end-frame' ? 'veo' : 'grok';
        onSettingsChange({ ...settings, videoType: type, model: newModel });
    };

    return (
        <div className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color)">
            <div className="flex items-center gap-2.5 mb-[15px]">
                <Settings2 className="w-4 h-4 text-white" />
                <h3 className="text-[1rem] font-semibold">비디오 설정</h3>
            </div>

            {/* Video Type Selection */}
            <div className="mb-5">
                <label className="text-[0.8rem] text-(--text-gray) font-medium mb-2 block">비디오 타입</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleTypeChange('image-to-video')}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${settings.videoType === 'image-to-video'
                            ? 'border-(--primary-color) bg-(--primary-color)/10'
                            : 'border-(--border-color) hover:border-(--text-gray)'
                            }`}
                    >
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-[0.75rem] font-medium">Image-to-Video</span>
                        <span className="text-[0.65rem] text-(--text-gray)">단일 이미지</span>
                    </button>
                    <button
                        onClick={() => handleTypeChange('start-end-frame')}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${settings.videoType === 'start-end-frame'
                            ? 'border-(--primary-color) bg-(--primary-color)/10'
                            : 'border-(--border-color) hover:border-(--text-gray)'
                            }`}
                    >
                        <Film className="w-5 h-5" />
                        <span className="text-[0.75rem] font-medium">Start-End Frame</span>
                        <span className="text-[0.65rem] text-(--text-gray)">시작-끝 장면</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                {/* Model Selection - 타입에 따라 다른 옵션 */}
                <div className="flex flex-col gap-2">
                    <label className="text-[0.8rem] text-(--text-gray) font-medium">모델</label>
                    {settings.videoType === 'image-to-video' ? (
                        <select
                            value={settings.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            className="bg-[#16161d] border border-(--border-color) rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-(--primary-color) transition-colors"
                        >
                            <option value="grok">Grok (Creative)</option>
                            <option value="bytedance">Bytedance (Fast/Pro)</option>
                        </select>
                    ) : (
                        <div className="bg-[#16161d] border border-(--border-color) rounded-lg px-3 py-2.5 text-white text-[0.9rem]">
                            Veo 3.1
                        </div>
                    )}
                </div>

                {/* Dynamic Settings based on Model */}
                {settings.videoType === 'image-to-video' && settings.model === 'grok' ? (
                    <div className="flex flex-col gap-2">
                        <label className="text-[0.8rem] text-(--text-gray) font-medium">모드</label>
                        <select
                            value={settings.mode}
                            onChange={(e) => handleChange('mode', e.target.value)}
                            className="bg-[#16161d] border border-(--border-color) rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-(--primary-color) transition-colors"
                        >
                            <option value="normal">Normal</option>
                            <option value="fun">Fun</option>
                        </select>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-(--text-gray) font-medium">길이</label>
                            <select
                                value={settings.duration}
                                onChange={(e) => handleChange('duration', e.target.value)}
                                className="bg-[#16161d] border border-(--border-color) rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-(--primary-color) transition-colors"
                            >
                                <option value="5">5초</option>
                                <option value="10">10초</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-(--text-gray) font-medium">해상도</label>
                            <select
                                value={settings.resolution}
                                onChange={(e) => handleChange('resolution', e.target.value)}
                                className="bg-[#16161d] border border-(--border-color) rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-(--primary-color) transition-colors"
                            >
                                <option value="720p">720p</option>
                                <option value="1080p">1080p</option>
                            </select>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 flex items-start gap-2 text-[0.75rem] text-(--text-gray) bg-[#1a1a24] p-2.5 rounded-lg">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>
                    {settings.videoType === 'image-to-video'
                        ? settings.model === 'grok'
                            ? 'Grok 모델은 창의적인 움직임에 강점이 있습니다.'
                            : 'Bytedance 모델은 빠르고 안정적인 영상 생성에 최적화되어 있습니다.'
                        : 'Veo 3.1 모델은 시작-끝 프레임 사이의 자연스러운 전환 영상을 생성합니다.'}
                </p>
            </div>
        </div>
    );
}
