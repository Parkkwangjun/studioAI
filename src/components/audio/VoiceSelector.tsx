'use client';

import { useState } from 'react';
import { Check, ChevronDown, Volume2 } from 'lucide-react';
import { TTSVoice, KOREAN_TTS_VOICES, getVoicesByGender } from '@/lib/tts-voices';

interface VoiceSelectorProps {
    selectedVoice: TTSVoice;
    onVoiceChange: (voice: TTSVoice) => void;
    onPreview?: (voice: TTSVoice) => void;
}

export function VoiceSelector({ selectedVoice, onVoiceChange, onPreview }: VoiceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

    const filteredVoices = genderFilter === 'all'
        ? KOREAN_TTS_VOICES
        : getVoicesByGender(genderFilter);

    const handleVoiceSelect = (voice: TTSVoice) => {
        onVoiceChange(voice);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Selected Voice Display */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#15151e] border border-[var(--border-color)] rounded-lg p-3 flex items-center justify-between hover:border-[var(--primary-color)] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedVoice.avatar}</span>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-white">{selectedVoice.name}</span>
                        <span className="text-xs text-[var(--text-gray)]">
                            {selectedVoice.gender === 'male' ? '남성' : '여성'} • {selectedVoice.model}
                        </span>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--text-gray)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a24] border border-[var(--border-color)] rounded-lg shadow-2xl z-20 max-h-[400px] overflow-hidden flex flex-col">
                        {/* Gender Filter */}
                        <div className="p-3 border-b border-[var(--border-color)] flex gap-2">
                            <button
                                onClick={() => setGenderFilter('all')}
                                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${genderFilter === 'all'
                                    ? 'bg-[var(--primary-color)] text-white'
                                    : 'bg-[#15151e] text-[var(--text-gray)] hover:text-white'
                                    }`}
                            >
                                전체
                            </button>
                            <button
                                onClick={() => setGenderFilter('female')}
                                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${genderFilter === 'female'
                                    ? 'bg-[var(--primary-color)] text-white'
                                    : 'bg-[#15151e] text-[var(--text-gray)] hover:text-white'
                                    }`}
                            >
                                여성
                            </button>
                            <button
                                onClick={() => setGenderFilter('male')}
                                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${genderFilter === 'male'
                                    ? 'bg-[var(--primary-color)] text-white'
                                    : 'bg-[#15151e] text-[var(--text-gray)] hover:text-white'
                                    }`}
                            >
                                남성
                            </button>
                        </div>

                        {/* Voice List */}
                        <div className="overflow-y-auto custom-scrollbar">
                            {filteredVoices.map((voice) => (
                                <div
                                    key={voice.id}
                                    onClick={() => handleVoiceSelect(voice)}
                                    className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors group cursor-pointer"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleVoiceSelect(voice);
                                        }
                                    }}
                                >
                                    <span className="text-2xl">{voice.avatar}</span>
                                    <div className="flex-1 flex flex-col items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">{voice.name}</span>
                                            {selectedVoice.id === voice.id && (
                                                <Check className="w-3 h-3 text-[var(--primary-color)]" />
                                            )}
                                        </div>
                                        <span className="text-xs text-[var(--text-gray)]">{voice.description}</span>
                                    </div>
                                    {onPreview && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPreview(voice);
                                            }}
                                            className="p-2 rounded-full hover:bg-white/10 text-[var(--text-gray)] hover:text-[var(--primary-color)] transition-colors"
                                            title="미리듣기"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
