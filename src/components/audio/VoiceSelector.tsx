'use client';

import { useState } from 'react';
import { Check, ChevronDown, Volume2, Sparkles, Zap } from 'lucide-react';
import { TTSVoice, ALL_VOICES } from '@/lib/tts-voices';

interface VoiceSelectorProps {
    selectedVoice: TTSVoice;
    onVoiceChange: (voice: TTSVoice) => void;
    onPreview?: (voice: TTSVoice) => void;
}

export function VoiceSelector({ selectedVoice, onVoiceChange, onPreview }: VoiceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
    const [providerFilter, setProviderFilter] = useState<'all' | 'elevenlabs' | 'google'>('elevenlabs'); // Default to ElevenLabs

    const filteredVoices = ALL_VOICES.filter(voice => {
        if (genderFilter !== 'all' && voice.gender !== genderFilter) return false;
        if (providerFilter !== 'all' && voice.provider !== providerFilter) return false;
        return true;
    });

    const handleVoiceSelect = (voice: TTSVoice) => {
        onVoiceChange(voice);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Selected Voice Display */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#15151e] border border-(--border-color) rounded-lg p-2.5 flex items-center justify-between hover:border-(--primary-color) transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <span className="text-xl">{selectedVoice.avatar}</span>
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-white">{selectedVoice.name}</span>
                            {selectedVoice.provider === 'elevenlabs' && (
                                <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[0.6rem] font-bold flex items-center gap-0.5">
                                    <Sparkles className="w-2 h-2" />
                                    AI
                                </span>
                            )}
                        </div>
                        <span className="text-[0.7rem] text-(--text-gray)">
                            {selectedVoice.gender === 'male' ? '남성' : '여성'} • {selectedVoice.model}
                        </span>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-(--text-gray) transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Content */}
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a24] border border-(--border-color) rounded-lg shadow-2xl z-20 max-h-[400px] overflow-hidden flex flex-col w-[300px]">

                        {/* Provider Filter */}
                        <div className="p-2 border-b border-(--border-color) flex gap-1">
                            <button
                                onClick={() => setProviderFilter('elevenlabs')}
                                className={`flex-1 px-2 py-1.5 rounded text-[0.7rem] font-medium transition-colors flex items-center justify-center gap-1 ${providerFilter === 'elevenlabs'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-[#15151e] text-(--text-gray) hover:text-white'
                                    }`}
                            >
                                <Sparkles className="w-3 h-3" />
                                ElevenLabs (AI)
                            </button>
                            <button
                                onClick={() => setProviderFilter('google')}
                                className={`flex-1 px-2 py-1.5 rounded text-[0.7rem] font-medium transition-colors flex items-center justify-center gap-1 ${providerFilter === 'google'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-[#15151e] text-(--text-gray) hover:text-white'
                                    }`}
                            >
                                <Zap className="w-3 h-3" />
                                Google (Fast)
                            </button>
                        </div>

                        {/* Gender Filter */}
                        <div className="p-2 border-b border-(--border-color) flex gap-1">
                            <button
                                onClick={() => setGenderFilter('all')}
                                className={`flex-1 px-2 py-1 rounded text-[0.7rem] font-medium transition-colors ${genderFilter === 'all'
                                    ? 'bg-(--primary-color) text-white'
                                    : 'bg-[#15151e] text-(--text-gray) hover:text-white'
                                    }`}
                            >
                                전체
                            </button>
                            <button
                                onClick={() => setGenderFilter('female')}
                                className={`flex-1 px-2 py-1 rounded text-[0.7rem] font-medium transition-colors ${genderFilter === 'female'
                                    ? 'bg-(--primary-color) text-white'
                                    : 'bg-[#15151e] text-(--text-gray) hover:text-white'
                                    }`}
                            >
                                여성
                            </button>
                            <button
                                onClick={() => setGenderFilter('male')}
                                className={`flex-1 px-2 py-1 rounded text-[0.7rem] font-medium transition-colors ${genderFilter === 'male'
                                    ? 'bg-(--primary-color) text-white'
                                    : 'bg-[#15151e] text-(--text-gray) hover:text-white'
                                    }`}
                            >
                                남성
                            </button>
                        </div>

                        {/* Voice List */}
                        <div className="overflow-y-auto custom-scrollbar max-h-[250px]">
                            {filteredVoices.map((voice) => (
                                <div
                                    key={voice.id}
                                    onClick={() => handleVoiceSelect(voice)}
                                    className="w-full p-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors group cursor-pointer border-b border-white/5 last:border-0"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleVoiceSelect(voice);
                                        }
                                    }}
                                >
                                    <span className="text-xl">{voice.avatar}</span>
                                    <div className="flex-1 flex flex-col items-start min-w-0">
                                        <div className="flex items-center gap-2 w-full">
                                            <span className="text-sm font-medium text-white truncate">{voice.name}</span>
                                            {selectedVoice.id === voice.id && (
                                                <Check className="w-3 h-3 text-(--primary-color) shrink-0" />
                                            )}
                                        </div>
                                        <span className="text-[0.65rem] text-(--text-gray) line-clamp-1">{voice.description}</span>
                                    </div>
                                    {onPreview && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPreview(voice);
                                            }}
                                            className="p-1.5 rounded-full hover:bg-white/10 text-(--text-gray) hover:text-(--primary-color) transition-colors shrink-0"
                                            title="미리듣기"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {filteredVoices.length === 0 && (
                                <div className="p-4 text-center text-(--text-gray) text-xs">
                                    검색 결과가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
