'use client';

import { Settings2, Info } from 'lucide-react';

export interface VideoSettingsState {
    model: 'grok' | 'bytedance';
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

    return (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
            <div className="flex items-center gap-2.5 mb-[15px]">
                <Settings2 className="w-4 h-4 text-white" />
                <h3 className="text-[1rem] font-semibold">비디오 설정</h3>
            </div>

            <div className="grid grid-cols-2 gap-5">
                {/* Model Selection */}
                <div className="flex flex-col gap-2">
                    <label className="text-[0.8rem] text-[var(--text-gray)] font-medium">모델</label>
                    <select
                        value={settings.model}
                        onChange={(e) => handleChange('model', e.target.value)}
                        className="bg-[#16161d] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-[var(--primary-color)] transition-colors"
                    >
                        <option value="grok">Grok (Creative)</option>
                        <option value="bytedance">Bytedance (Fast/Pro)</option>
                    </select>
                </div>

                {/* Dynamic Settings based on Model */}
                {settings.model === 'grok' ? (
                    <div className="flex flex-col gap-2">
                        <label className="text-[0.8rem] text-[var(--text-gray)] font-medium">모드</label>
                        <select
                            value={settings.mode}
                            onChange={(e) => handleChange('mode', e.target.value)}
                            className="bg-[#16161d] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-[var(--primary-color)] transition-colors"
                        >
                            <option value="normal">Normal</option>
                            <option value="fun">Fun</option>
                        </select>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-[var(--text-gray)] font-medium">길이</label>
                            <select
                                value={settings.duration}
                                onChange={(e) => handleChange('duration', e.target.value)}
                                className="bg-[#16161d] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-[var(--primary-color)] transition-colors"
                            >
                                <option value="5">5초</option>
                                <option value="10">10초</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-[var(--text-gray)] font-medium">해상도</label>
                            <select
                                value={settings.resolution}
                                onChange={(e) => handleChange('resolution', e.target.value)}
                                className="bg-[#16161d] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-[var(--primary-color)] transition-colors"
                            >
                                <option value="720p">720p</option>
                                <option value="1080p">1080p</option>
                            </select>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 flex items-start gap-2 text-[0.75rem] text-[var(--text-gray)] bg-[#1a1a24] p-2.5 rounded-lg">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>
                    {settings.model === 'grok'
                        ? 'Grok 모델은 창의적인 움직임에 강점이 있습니다. 외부 이미지 사용 시 Spicy 모드는 지원되지 않습니다.'
                        : 'Bytedance 모델은 빠르고 안정적인 영상 생성에 최적화되어 있습니다. 해상도와 길이를 조절할 수 있습니다.'}
                </p>
            </div>
        </div>
    );
}
