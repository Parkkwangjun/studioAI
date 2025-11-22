'use client';

import { Volume2, FileText, Split } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AudioSplitModal } from '@/components/audio/AudioSplitModal';
import { AudioGenerationView } from '@/components/audio/AudioGenerationView';
import { useProjectStore } from '@/store/useProjectStore';

export default function AudioPage() {
    const [scriptText, setScriptText] = useState('');
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'input' | 'generation'>('input');

    const { currentProject, setProject } = useProjectStore();

    useEffect(() => {
        if (currentProject && currentProject.scenes.length > 0) {
            setViewMode('generation');
        }
    }, [currentProject]);

    const handleAnalyze = () => {
        if (!scriptText.trim()) return;
        setIsSplitModalOpen(true);
    };

    const handleConfirmSplit = () => {
        const newScenes = scriptText.split('\n\n').filter(Boolean).map((text, i) => ({
            id: i + 1,
            text: text.trim()
        }));

        setProject({
            id: 'temp-audio-project',
            title: 'Audio Project',
            description: 'Temporary audio project',
            type: 'audio',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            thumbnail: undefined,
            scenes: newScenes
        });

        setIsSplitModalOpen(false);
        setViewMode('generation');
    };

    return (
        <div className="flex-1 p-[30px_40px] flex flex-col gap-5 overflow-y-auto custom-scrollbar h-full">
            <header className="flex items-center gap-2.5 mb-2.5 shrink-0">
                <Volume2 className="w-5 h-5 text-white" />
                <h2 className="text-[1.2rem] font-semibold">오디오</h2>
            </header>

            {viewMode === 'input' ? (
                <div className="grid grid-cols-3 gap-5 h-full">
                    {/* Left Column: Script Input */}
                    <section className="col-span-2 bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] flex flex-col">
                        <div className="flex justify-between items-center mb-[15px]">
                            <h3 className="text-[0.9rem] font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[var(--primary-color)]" />
                                스크립트 입력
                            </h3>
                            <button className="text-[0.8rem] text-[var(--text-gray)] hover:text-white transition-colors">
                                불러오기
                            </button>
                        </div>
                        <textarea
                            className="flex-1 w-full bg-[#15151e] border border-[var(--border-color)] rounded-lg p-4 text-white resize-none outline-none focus:border-[var(--primary-color)] transition-colors leading-relaxed"
                            placeholder="오디오로 변환할 스크립트를 입력하거나 붙여넣으세요..."
                            value={scriptText}
                            onChange={(e) => setScriptText(e.target.value)}
                        ></textarea>
                    </section>

                    {/* Right Column: Settings & Actions */}
                    <section className="col-span-1 flex flex-col gap-5">
                        <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
                            <h3 className="text-[0.9rem] font-semibold mb-[15px]">설정</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[0.8rem] text-[var(--text-gray)]">기본 보이스</label>
                                    <select className="bg-[#15151e] border border-[var(--border-color)] rounded-md p-2.5 text-white outline-none focus:border-[var(--primary-color)] text-[0.9rem]">
                                        <option>Google TTS - Chirp 3 HD (Korean)</option>
                                        <option>Google TTS - Neural2 (English)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] flex-1 flex flex-col justify-center items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[var(--bg-input)] flex items-center justify-center mb-2">
                                <Split className="w-6 h-6 text-[var(--primary-color)]" />
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">장면 분리하기</h4>
                                <p className="text-[0.8rem] text-[var(--text-gray)]">
                                    AI가 스크립트를 분석하여<br />최적의 장면 단위로 분리합니다.
                                </p>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                className="w-full bg-[var(--primary-color)] text-white py-3 rounded-lg font-semibold hover:bg-[#4a4ddb] transition-colors mt-2"
                            >
                                분석 및 분리 시작
                            </button>
                        </div>
                    </section>
                </div>
            ) : (
                <AudioGenerationView scenes={currentProject?.scenes || []} />
            )}

            <AudioSplitModal
                isOpen={isSplitModalOpen}
                onClose={() => setIsSplitModalOpen(false)}
                onConfirm={handleConfirmSplit}
                scriptText={scriptText}
            />
        </div>
    );
}
