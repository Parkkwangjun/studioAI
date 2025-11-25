'use client';

import { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import toast from 'react-hot-toast';

interface MagicPromptButtonProps {
    prompt: string;
    onPromptChange: (newPrompt: string) => void;
    type: 'image' | 'video' | 'audio' | 'script' | 'sfx' | 'bgm';
    className?: string;
}

export function MagicPromptButton({ prompt, onPromptChange, type, className = '' }: MagicPromptButtonProps) {
    const [isMagicLoading, setIsMagicLoading] = useState(false);
    const { openaiKey } = useSettingsStore();

    const handleMagicPrompt = async () => {
        if (!prompt.trim()) {
            toast.error('프롬프트를 먼저 입력해주세요.');
            return;
        }

        if (!openaiKey) {
            toast.error('설정에서 OpenAI API 키를 먼저 입력해주세요.');
            return;
        }

        setIsMagicLoading(true);
        try {
            const response = await fetch('/api/magic-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-openai-key': openaiKey
                },
                body: JSON.stringify({ prompt, type })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to refine prompt');
            }

            const data = await response.json();
            onPromptChange(data.refinedPrompt);
            toast.success('매직 프롬프트가 적용되었습니다! ✨');
        } catch (error) {
            console.error('Magic Prompt Error:', error);
            toast.error(`매직 프롬프트 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsMagicLoading(false);
        }
    };

    return (
        <button
            onClick={handleMagicPrompt}
            disabled={isMagicLoading || !prompt.trim()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isMagicLoading
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-linear-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 shadow-sm'
                } ${className}`}
            title="AI로 프롬프트 업그레이드"
        >
            {isMagicLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <Wand2 className="w-3.5 h-3.5" />
            )}
            Magic Prompt
        </button>
    );
}
