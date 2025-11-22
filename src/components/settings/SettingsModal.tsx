'use client';

import { useState, useEffect } from 'react';
import { X, Key, Save } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import toast from 'react-hot-toast';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const {
        openaiKey,
        falKey,
        googleCredentials,
        kieKey,
        setOpenAiKey,
        setFalKey,
        setGoogleCredentials,
        setKieKey,
    } = useSettingsStore();

    const [localOpenAi, setLocalOpenAi] = useState('');
    const [localFal, setLocalFal] = useState('');
    const [localGoogle, setLocalGoogle] = useState('');
    const [localKie, setLocalKie] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLocalOpenAi(openaiKey);
            setLocalFal(falKey);
            setLocalGoogle(googleCredentials);
            setLocalKie(kieKey);
        }
    }, [isOpen, openaiKey, falKey, googleCredentials, kieKey]);

    const handleSave = () => {
        setOpenAiKey(localOpenAi);
        setFalKey(localFal);
        setGoogleCredentials(localGoogle);
        setKieKey(localKie);
        toast.success('API 키가 저장되었습니다!');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] rounded-xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1a1a] border-b border-white/10 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Key className="w-6 h-6 text-blue-400" />
                        <h2 className="text-xl font-semibold text-white">API 키 설정</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-sm text-blue-300">
                            💡 <strong>중요:</strong> 이 서비스는 사용자의 API 키를 사용합니다.
                            아래 키들을 입력하면 브라우저에 안전하게 저장되며, 이후 매번 입력할 필요가 없습니다.
                        </p>
                    </div>

                    {/* OpenAI Key */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                            OpenAI API Key
                        </label>
                        <input
                            type="password"
                            value={localOpenAi}
                            onChange={(e) => setLocalOpenAi(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                        />
                        <p className="text-xs text-white/40">
                            스크립트 생성에 사용됩니다. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">키 발급받기</a>
                        </p>
                    </div>

                    {/* FAL Key */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                            FAL.ai API Key
                        </label>
                        <input
                            type="password"
                            value={localFal}
                            onChange={(e) => setLocalFal(e.target.value)}
                            placeholder="..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                        />
                        <p className="text-xs text-white/40">
                            이미지 생성에 사용됩니다. <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">키 발급받기</a>
                        </p>
                    </div>

                    {/* Google Credentials */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                            Google Cloud Credentials (JSON)
                        </label>
                        <textarea
                            value={localGoogle}
                            onChange={(e) => setLocalGoogle(e.target.value)}
                            placeholder='{"type": "service_account", "project_id": "...", ...}'
                            rows={4}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 font-mono text-xs"
                        />
                        <p className="text-xs text-white/40">
                            음성 생성(TTS)에 사용됩니다. JSON 파일 내용 전체를 붙여넣으세요.
                        </p>
                    </div>

                    {/* KIE Key */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                            KIE.ai API Key
                        </label>
                        <input
                            type="password"
                            value={localKie}
                            onChange={(e) => setLocalKie(e.target.value)}
                            placeholder="..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                        />
                        <p className="text-xs text-white/40">
                            비디오 생성에 사용됩니다.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-white/10 p-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
}
