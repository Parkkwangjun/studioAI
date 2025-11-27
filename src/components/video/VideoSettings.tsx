'use client';

import { Settings2, Info, Image as ImageIcon, Film, Layers } from 'lucide-react';

export interface VideoSettingsState {
    videoType: 'image-to-video' | 'start-end-frame' | 'reference';
    model: 'grok' | 'bytedance' | 'veo' | 'veo3' | 'veo3_fast';
    mode: 'normal' | 'fun';
    duration: '5' | '10';
    resolution: '720p' | '1080p';
    aspectRatio?: '16:9' | '9:16' | 'Auto';
    seed?: string;
    watermark?: string;
}

interface VideoSettingsProps {
    settings: VideoSettingsState;
    onSettingsChange: (settings: VideoSettingsState) => void;
}

export function VideoSettings({ settings, onSettingsChange }: VideoSettingsProps) {
    const handleChange = (key: keyof VideoSettingsState, value: string) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    const handleTypeChange = (type: 'image-to-video' | 'start-end-frame' | 'reference') => {
        let newModel = settings.model;
        if (type === 'start-end-frame') {
            newModel = 'veo3_fast'; // Default to fast
        } else if (type === 'reference') {
            newModel = 'veo3_fast'; // Reference only supports fast
        } else if (type === 'image-to-video') {
            newModel = 'grok';
        }

        // Reset aspect ratio for reference mode as it only supports 16:9 (though API says 16:9, let's keep it safe)
        const newSettings: VideoSettingsState = {
            ...settings,
            videoType: type,
            model: newModel,
        };

        if (type === 'reference') {
            newSettings.aspectRatio = '16:9';
        }

        onSettingsChange(newSettings);
    };

    const isVeoModel = settings.model === 'veo' || settings.model === 'veo3' || settings.model === 'veo3_fast';

    return (
        <div className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color)">
            <div className="flex items-center gap-2.5 mb-[15px]">
                <Settings2 className="w-4 h-4 text-white" />
                <h3 className="text-[1rem] font-semibold">비디오 설정</h3>
            </div>

            {/* Video Type Selection */}
            <div className="mb-5">
                <label className="text-[0.8rem] text-(--text-gray) font-medium mb-2 block">비디오 타입</label>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleTypeChange('image-to-video')}
                        className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${settings.videoType === 'image-to-video'
                            ? 'border-(--primary-color) bg-(--primary-color)/10'
                            : 'border-(--border-color) hover:border-(--text-gray)'
                            }`}
                    >
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[0.7rem] font-medium">Img2Vid</span>
                    </button>
                    <button
                        onClick={() => handleTypeChange('start-end-frame')}
                        className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${settings.videoType === 'start-end-frame'
                            ? 'border-(--primary-color) bg-(--primary-color)/10'
                            : 'border-(--border-color) hover:border-(--text-gray)'
                            }`}
                    >
                        <Film className="w-4 h-4" />
                        <span className="text-[0.7rem] font-medium">Start-End</span>
                    </button>
                    <button
                        onClick={() => handleTypeChange('reference')}
                        className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${settings.videoType === 'reference'
                            ? 'border-(--primary-color) bg-(--primary-color)/10'
                            : 'border-(--border-color) hover:border-(--text-gray)'
                            }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span className="text-[0.7rem] font-medium">Reference</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Model Selection */}
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
                        <select
                            value={settings.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            disabled={settings.videoType === 'reference'} // Reference mode only supports fast
                            className="bg-[#16161d] border border-(--border-color) rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-(--primary-color) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="veo3_fast">Veo 3.1 Fast (Speed/Cost)</option>
                            <option value="veo3">Veo 3.1 Quality (High Detail)</option>
                        </select>
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
                ) : isVeoModel ? (
                    <>
                        {/* Veo Specific Settings */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-(--text-gray) font-medium">화면 비율</label>
                            <select
                                value={settings.aspectRatio || '16:9'}
                                onChange={(e) => handleChange('aspectRatio', e.target.value)}
                                disabled={settings.videoType === 'reference'} // Reference mode limited to 16:9
                                className="bg-[#16161d] border border-(--border-color) rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-(--primary-color) transition-colors disabled:opacity-50"
                            >
                                <option value="16:9">16:9 (Landscape)</option>
                                <option value="9:16">9:16 (Portrait)</option>
                                <option value="Auto">Auto</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-(--text-gray) font-medium">Seed (Optional)</label>
                                <input
                                    type="number"
                                    placeholder="Random"
                                    value={settings.seed || ''}
                                    onChange={(e) => handleChange('seed', e.target.value)}
                                    className="bg-[#16161d] border border-(--border-color) rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-(--primary-color) transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-(--text-gray) font-medium">Watermark</label>
                                <input
                                    type="text"
                                    placeholder="None"
                                    value={settings.watermark || ''}
                                    onChange={(e) => handleChange('watermark', e.target.value)}
                                    className="bg-[#16161d] border border-(--border-color) rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-(--primary-color) transition-colors"
                                />
                            </div>
                        </div>
                    </>
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

            <div className="mt-4 flex items-start gap-2 text-[0.75rem] text-(--text-gray) bg-[#1a1a24] p-3 rounded-lg">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>
                    {settings.videoType === 'image-to-video'
                        ? settings.model === 'grok'
                            ? 'Grok: 창의적인 움직임에 강점'
                            : 'Bytedance: 빠르고 안정적인 생성'
                        : settings.videoType === 'reference'
                            ? 'Reference: 1~3장의 이미지를 스타일/캐릭터 참조로 사용하여 영상 생성 (Fast 모델 전용)'
                            : settings.model === 'veo3'
                                ? 'Veo 3.1 Quality: 고품질 디테일 (크레딧 소모 큼)'
                                : 'Veo 3.1 Fast: 빠른 생성 속도 (경제적)'}
                </p>
            </div>
        </div>
    );
}
