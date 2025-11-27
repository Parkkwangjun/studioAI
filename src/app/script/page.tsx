'use client';

import { MessageSquare, Upload, Wand2, FileText, Download } from 'lucide-react';
import { useState, useRef } from 'react';
import { ScriptResultModal } from '@/components/script/ScriptResultModal';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MagicPromptButton } from '@/components/common/MagicPromptButton';
import toast from 'react-hot-toast';

interface ScriptSettings {
    target: string;
    platform: string;
    length: string;
    tone: string;
    manner: string;
    type: string;
}

export default function ScriptPage() {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generatedScript, setGeneratedScript] = useState('');
    const [settings, setSettings] = useState<ScriptSettings>({
        target: '',
        platform: '',
        length: '',
        tone: '',
        manner: '',
        type: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const templateInputRef = useRef<HTMLInputElement>(null);
    const { createProject, updateScenes, saveCurrentProject } = useProjectStore();
    const { openaiKey } = useSettingsStore();

    const handleSettingChange = (key: keyof ScriptSettings, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setPrompt(content);
        };
        reader.readAsText(file);
    };

    // New: Handle Template File Import (behaves same as file upload but for template button)
    const handleTemplateImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setPrompt(content);
        };
        reader.readAsText(file);
    };

    const buildEnhancedPrompt = () => {
        let enhancedPrompt = prompt;

        if (settings.target) enhancedPrompt += `\n\n타겟 오디언스: ${settings.target}`;
        if (settings.platform) enhancedPrompt += `\n배포 플랫폼: ${settings.platform}`;
        if (settings.length) enhancedPrompt += `\n목표 길이: ${settings.length}`;
        if (settings.tone) enhancedPrompt += `\n어투: ${settings.tone}`;
        if (settings.manner) enhancedPrompt += `\n톤 앤 매너: ${settings.manner}`;
        if (settings.type) enhancedPrompt += `\n스크립트 타입: ${settings.type}`;

        return enhancedPrompt;
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        if (!openaiKey) {
            toast.error('설정에서 OpenAI API 키를 먼저 입력해주세요.');
            return;
        }

        setIsGenerating(true);
        try {
            const enhancedPrompt = buildEnhancedPrompt();

            const response = await fetch('/api/script/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-openai-key': openaiKey
                },
                body: JSON.stringify({ prompt: enhancedPrompt }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate script');
            }

            const data = await response.json();

            interface ScriptScene {
                text: string;
            }

            // Format script for display
            const scriptText = data.script.map((s: ScriptScene, i: number) =>
                `Scene ${i + 1}:\n${s.text}`
            ).join('\n\n');

            setGeneratedScript(scriptText);

            // Create new project only if not exists
            if (!useProjectStore.getState().currentProject) {
                await createProject({
                    title: settings.type || 'New Script Project',
                    description: `Generated on ${new Date().toLocaleDateString()}`,
                    type: 'script',
                    thumbnail: undefined
                });
            }

            // Update scenes
            const newScenes = data.script.map((s: ScriptScene, i: number) => ({
                id: i + 1,
                text: s.text
            }));

            updateScenes(newScenes);

            // Save scenes to DB
            await saveCurrentProject();

            setIsModalOpen(true);
        } catch (error) {
            console.error(error);
            toast.error('스크립트 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportPrompt = () => {
        const enhancedPrompt = buildEnhancedPrompt();
        const blob = new Blob([enhancedPrompt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `script-prompt-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex-1 p-[30px_40px] flex flex-col gap-5 overflow-y-auto custom-scrollbar">
            <header className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-5 h-5 text-white" />
                    <h2 className="text-[1.2rem] font-semibold">스크립트</h2>
                </div>
                <button
                    onClick={handleExportPrompt}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-(--border-color) text-(--text-gray) hover:text-white hover:border-white transition-colors text-sm"
                >
                    <Download className="w-4 h-4" />
                    프롬프트 내보내기
                </button>
            </header>

            <section className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color)">
                <h3 className="text-[0.9rem] font-semibold mb-[15px]">맞춤 설정</h3>
                <div className="grid grid-cols-3 gap-[15px_20px]">
                    {[
                        { key: 'target', label: '타겟', placeholder: 'ex) 20-30대 직장인' },
                        { key: 'platform', label: '배포 플랫폼', placeholder: 'ex) YouTube, Instagram' },
                        { key: 'length', label: '목표 길이', placeholder: 'ex) 30초, 1분, 3분' },
                        { key: 'tone', label: '어투', placeholder: 'ex) 친근한, 전문적인, 유머러스한' },
                        { key: 'manner', label: '톤 앤 매너', placeholder: 'ex) 밝고 경쾌한, 진지한' },
                        { key: 'type', label: '스크립트 타입', placeholder: 'ex) 교육, 엔터테인먼트, 광고' }
                    ].map(({ key, label, placeholder }) => (
                        <div key={key} className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-(--text-gray)">{label}</label>
                            <input
                                type="text"
                                placeholder={placeholder}
                                value={settings[key as keyof ScriptSettings]}
                                onChange={(e) => handleSettingChange(key as keyof ScriptSettings, e.target.value)}
                                className="bg-transparent border border-(--border-color) rounded-md p-2.5 text-white text-sm outline-none focus:border-(--primary-color) transition-colors placeholder:text-(--text-gray)"
                            />
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-(--bg-card) rounded-xl p-5 border border-(--border-color) flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-[15px]">
                    <h3 className="text-[0.9rem] font-semibold">프롬프트</h3>
                    <div className="flex items-center gap-2.5 text-[0.85rem] text-(--text-gray)">
                        <span>GPT 지침 업로드</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,.md"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-transparent border border-(--border-color) text-(--text-gray) px-2.5 py-1 rounded text-[0.75rem] hover:text-white hover:border-white transition-colors flex items-center gap-1"
                        >
                            <Upload className="w-3 h-3" /> Upload
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[0.9rem] font-semibold text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        주제 / 아이디어
                    </label>
                    <MagicPromptButton
                        prompt={prompt}
                        onPromptChange={setPrompt}
                        type="script"
                    />
                </div>
                <textarea
                    className="w-full h-[150px] bg-[#16161d] border border-(--border-color) rounded-lg p-4 text-white placeholder-gray-500 outline-none focus:border-(--primary-color) resize-none transition-colors"
                    placeholder="스크립트의 주제나 아이디어를 자유롭게 적어주세요..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />

                <div className="flex justify-between mt-2.5">
                    <input
                        ref={templateInputRef}
                        type="file"
                        accept=".txt"
                        onChange={handleTemplateImport}
                        className="hidden"
                    />
                    <button
                        onClick={() => templateInputRef.current?.click()}
                        className="bg-transparent border border-white text-white px-5 py-2.5 rounded-md text-[0.9rem] hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        파일 가져오기 (.txt)
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-(--primary-color) border-none text-white px-6 py-2.5 rounded-md font-semibold text-[0.9rem] hover:bg-[#4a4ddb] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <Wand2 className="w-4 h-4 animate-spin" />
                                생성 중...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4" />
                                스크립트 생성
                            </>
                        )}
                    </button>
                </div>
            </section>

            <ScriptResultModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                script={generatedScript}
                projectName={settings.type || "New Project"}
            />
        </div>
    );
}
