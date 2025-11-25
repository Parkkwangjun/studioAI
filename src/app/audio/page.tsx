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

    const { currentProject, setProject, updateScenes, createProject } = useProjectStore();

    useEffect(() => {
        if (currentProject && currentProject.scenes.length > 0) {
            setViewMode('generation');
        }
    }, [currentProject]);

    const handleAnalyze = () => {
        if (!scriptText.trim()) return;
        setIsSplitModalOpen(true);
    };

    const handleConfirmSplit = async () => {
        const newScenes = scriptText.split('\n\n').filter(Boolean).map((text, i) => ({
            id: i + 1,
            text: text.trim()
        }));

        if (currentProject) {
            updateScenes(newScenes);
        } else {
            await createProject({
                title: 'Audio Project',
                description: scriptText.substring(0, 50) + '...',
                type: 'audio',
            });
            updateScenes(newScenes);
        }

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
                    <section className="col-span-2 bg-(--bg-card) rounded-xl p-5 border border-(--border-color) flex flex-col">
                        <div className="flex justify-between items-center mb-[15px]">
                            <h3 className="text-[0.9rem] font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-(--primary-color)" />
                                스크립트 입력
                            </h3>
                            <button
                                onClick={handleAnalyze}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-(--primary-color) text-white text-sm font-medium hover:bg-[#4a4ddb] transition-colors"
                            >
                                <Split className="w-4 h-4" />
                                분석 및 분리 시작
                            </button>
                        </div>
                        <textarea
                            className="flex-1 bg-[#16161d] border border-(--border-color) rounded-lg p-4 text-white placeholder-gray-500 outline-none focus:border-(--primary-color) resize-none transition-colors leading-relaxed"
                            placeholder="스크립트를 입력하세요. (엔터 두 번으로 장면을 구분합니다)"
                            value={scriptText}
                            onChange={(e) => setScriptText(e.target.value)}
                        />
                    </section>

                    {/* Right Column: Guide */}
                    <section className="col-span-1 bg-(--bg-card) rounded-xl p-5 border border-(--border-color)">
                        <h3 className="text-[0.9rem] font-semibold mb-4">가이드</h3>
                        <div className="text-sm text-(--text-gray) space-y-4">
                            <p>
                                1. 스크립트를 입력하거나 붙여넣으세요.
                            </p>
                            <p>
                                2. 각 장면은 <strong>빈 줄(엔터 두 번)</strong>로 구분됩니다.
                            </p>
                            <p>
                                3. '분석 및 분리 시작' 버튼을 눌러 AI가 장면을 자동으로 나누도록 하세요.
                            </p>
                            <div className="bg-[#16161d] p-3 rounded-lg border border-(--border-color) mt-4">
                                <p className="text-xs text-gray-400 mb-2">예시:</p>
                                <p className="text-xs text-gray-300">
                                    안녕하세요, 반갑습니다.<br />
                                    오늘의 뉴스를 전해드립니다.<br />
                                    <br />
                                    첫 번째 소식입니다.<br />
                                    날씨가 매우 맑습니다.
                                </p>
                            </div>
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
