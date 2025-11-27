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
        name: '지영',
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
        name: '수진',
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
        name: '예진',
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
        name: '민지',
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
        name: '소희',
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
        name: '유진',
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
        name: '서연',
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
        name: '혜원',
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
        name: '채원',
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
        name: '다은',
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
        name: '은지',
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
        name: '하은',
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
        name: '지은',
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
        name: '현우',
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
        name: '철수',
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
        name: '진만이',
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
        name: '경수',
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
        name: '우빈',
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
        name: '상호',
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
        name: '민수',
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
        name: '영수',
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
        name: '정수',
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
        name: '준호',
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
        name: '태수',
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
        name: '동현',
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
        name: '성호',
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
        name: '재현',
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
        name: '건우',
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
        name: '승현',
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
        name: '준영',
        gender: 'male',
        language: '한국어',
        languageCode: 'ko-KR',
        model: 'Chirp3-HD',
        description: '안정적이고 믿음직한 남성 목소리',
        avatar: '👨‍✈️',
        provider: 'google'
    }
];

export const ALL_VOICES = [...KOREAN_TTS_VOICES];

// Helper functions
export function getVoicesByGender(gender: 'male' | 'female'): TTSVoice[] {
    return ALL_VOICES.filter(voice => voice.gender === gender);
}

export function getVoiceById(id: string): TTSVoice | undefined {
    return ALL_VOICES.find(voice => voice.id === id);
}

export function getDefaultVoice(): TTSVoice {
    return KOREAN_TTS_VOICES[0]; // Default to first Korean voice
}
