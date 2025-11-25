export interface TTSVoice {
    id: string;
    name: string;
    gender: 'male' | 'female';
    language: string;
    languageCode: string;
    model: string;
    description: string;
    avatar: string; // Emoji or icon
    provider: 'google' | 'elevenlabs';
}

// ElevenLabs Turbo 2.5 Voices
export const ELEVENLABS_VOICES: TTSVoice[] = [
    {
        id: 'JBFqnCBsd6RMkjVDRZzb', // George
        name: 'George',
        gender: 'male',
        language: 'Multilingual',
        languageCode: 'en-US', // ElevenLabs handles language auto-detection
        model: 'eleven_turbo_v2_5',
        description: '따뜻하고 신뢰감 있는 남성 목소리 (Turbo 2.5)',
        avatar: '🧔',
        provider: 'elevenlabs'
    },
    {
        id: 'Xb7hH8MSUDp1Np981dUa', // Alice
        name: 'Alice',
        gender: 'female',
        language: 'Multilingual',
        languageCode: 'en-US',
        model: 'eleven_turbo_v2_5',
        description: '자신감 있고 뉴스 앵커 같은 여성 목소리 (Turbo 2.5)',
        avatar: '👩‍💼',
        provider: 'elevenlabs'
    },
    {
        id: 'pFZP5JQG7iQjIQuC4Bku', // Lily
        name: 'Lily',
        gender: 'female',
        language: 'Multilingual',
        languageCode: 'en-US',
        model: 'eleven_turbo_v2_5',
        description: '따뜻하고 매력적인 여성 목소리 (Turbo 2.5)',
        avatar: '👩',
        provider: 'elevenlabs'
    },
    {
        id: 'cgSgspJ2msm6clMCkdW9', // Jessica
        name: 'Jessica',
        gender: 'female',
        language: 'Multilingual',
        languageCode: 'en-US',
        model: 'eleven_turbo_v2_5',
        description: '표현력이 풍부한 여성 목소리 (Turbo 2.5)',
        avatar: '👩‍🎤',
        provider: 'elevenlabs'
    },
    {
        id: 'iP95p4xoKVk53GoZ742B', // Chris
        name: 'Chris',
        gender: 'male',
        language: 'Multilingual',
        languageCode: 'en-US',
        model: 'eleven_turbo_v2_5',
        description: '대화하듯 자연스러운 남성 목소리 (Turbo 2.5)',
        avatar: '👨',
        provider: 'elevenlabs'
    }
];

// Korean Chirp 3 HD Voices
// Based on Google Cloud TTS documentation
export const KOREAN_TTS_VOICES: TTSVoice[] = [
    // Female Voices
    {
        id: 'ko-KR-Chirp3-HD-Aoede',
        name: 'Aoede',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '부드럽고 따뜻한 여성 목소리',
        avatar: '👩',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Autonoe',
        name: 'Autonoe',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '명료하고 전문적인 여성 목소리',
        avatar: '👩‍💼',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Callirrhoe',
        name: 'Callirrhoe',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '차분하고 우아한 여성 목소리',
        avatar: '👩‍🎨',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Despina',
        name: 'Despina',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '밝고 활기찬 여성 목소리',
        avatar: '👩‍🎤',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Erinome',
        name: 'Erinome',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '자연스럽고 친근한 여성 목소리',
        avatar: '👩‍🏫',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Gacrux',
        name: 'Gacrux',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '신뢰감 있는 여성 목소리',
        avatar: '👩‍⚕️',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Kore',
        name: 'Kore',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '젊고 생동감 있는 여성 목소리',
        avatar: '👩‍🎓',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Laomedeia',
        name: 'Laomedeia',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '세련되고 우아한 여성 목소리',
        avatar: '👩‍💻',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Leda',
        name: 'Leda',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '안정적이고 신뢰감 있는 여성 목소리',
        avatar: '👩‍🔬',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Pulcherrima',
        name: 'Pulcherrima',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '아름답고 매력적인 여성 목소리',
        avatar: '👸',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Sulafat',
        name: 'Sulafat',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '부드럽고 감성적인 여성 목소리',
        avatar: '👩‍🎨',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Vindemiatrix',
        name: 'Vindemiatrix',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '명료하고 정확한 여성 목소리',
        avatar: '👩‍⚖️',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Zephyr',
        name: 'Zephyr',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '경쾌하고 상쾌한 여성 목소리',
        avatar: '👩‍🌾',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Achernar',
        name: 'Achernar',
        gender: 'female',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '깊이 있고 성숙한 여성 목소리',
        avatar: '👩‍🏭',
        provider: 'google'
    },

    // Male Voices
    {
        id: 'ko-KR-Chirp3-HD-Achird',
        name: 'Achird',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '차분하고 신뢰감 있는 남성 목소리',
        avatar: '👨‍💼',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Algenib',
        name: 'Algenib',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '명료하고 전문적인 남성 목소리',
        avatar: '👨‍⚕️',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Algieba',
        name: 'Algieba',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '안정적이고 권위 있는 남성 목소리',
        avatar: '👨‍🏫',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Alnilam',
        name: 'Alnilam',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '깊고 풍부한 남성 목소리',
        avatar: '👨‍🎤',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Charon',
        name: 'Charon',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '부드럽고 친근한 남성 목소리',
        avatar: '👨‍🎨',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Enceladus',
        name: 'Enceladus',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '젊고 활기찬 남성 목소리',
        avatar: '👨‍🎓',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Fenrir',
        name: 'Fenrir',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '강인하고 힘찬 남성 목소리',
        avatar: '👨‍🏭',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Iapetus',
        name: 'Iapetus',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '성숙하고 지혜로운 남성 목소리',
        avatar: '👨‍🔬',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Orus',
        name: 'Orus',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '자연스럽고 편안한 남성 목소리',
        avatar: '👨‍💻',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Puck',
        name: 'Puck',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '밝고 경쾌한 남성 목소리',
        avatar: '👨‍🌾',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Rasalgethi',
        name: 'Rasalgethi',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '위엄 있고 카리스마 있는 남성 목소리',
        avatar: '🤴',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Sadachbia',
        name: 'Sadachbia',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '세련되고 우아한 남성 목소리',
        avatar: '👨‍⚖️',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Sadaltager',
        name: 'Sadaltager',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '명확하고 정확한 남성 목소리',
        avatar: '👨‍🏫',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Schedar',
        name: 'Schedar',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '따뜻하고 친절한 남성 목소리',
        avatar: '👨‍🍳',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Umbriel',
        name: 'Umbriel',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '깊이 있고 진중한 남성 목소리',
        avatar: '👨‍🔧',
        provider: 'google'
    },
    {
        id: 'ko-KR-Chirp3-HD-Zubenelgenubi',
        name: 'Zubenelgenubi',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '안정적이고 믿음직한 남성 목소리',
        avatar: '👨‍✈️',
        provider: 'google'
    }
];

export const ALL_VOICES = [...ELEVENLABS_VOICES, ...KOREAN_TTS_VOICES];

// Helper functions
export function getVoicesByGender(gender: 'male' | 'female'): TTSVoice[] {
    return ALL_VOICES.filter(voice => voice.gender === gender);
}

export function getVoiceById(id: string): TTSVoice | undefined {
    return ALL_VOICES.find(voice => voice.id === id);
}

export function getDefaultVoice(): TTSVoice {
    return ELEVENLABS_VOICES[0]; // Default to ElevenLabs George
}
