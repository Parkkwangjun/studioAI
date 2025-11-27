'use client';

import { useRouter } from 'next/navigation';
import {
    FileText,
    Wand2,
    Image as ImageIcon,
    Mic,
    Video,
    Music,
    Volume2,
    ArrowRight,
    LayoutDashboard,
    Settings,
    Zap
} from 'lucide-react';

export default function LibraryPage() {
    const router = useRouter();

    const mainFeatures = [
        {
            icon: FileText,
            title: '스크립트 생성',
            description: '주제만 입력하면 AI가 영상 대본을 작성합니다.',
            path: '/script',
        },
        {
            icon: Wand2,
            title: '프롬프트 생성',
            description: '이미지/비디오 생성을 위한 최적의 프롬프트를 만듭니다.',
            path: '/prompt-generation',
        }
    ];

    const mediaTools = [
        {
            icon: ImageIcon,
            title: '이미지 생성',
            description: '고품질 AI 이미지를 생성합니다.',
            path: '/image-generation',
        },
        {
            icon: Video,
            title: '비디오 생성',
            description: '텍스트나 이미지로 영상을 만듭니다.',
            path: '/video-generation',
        },
        {
            icon: Mic,
            title: '오디오 생성',
            description: '텍스트를 자연스러운 음성으로 변환합니다.',
            path: '/audio',
        },
        {
            icon: Music,
            title: 'BGM 생성',
            description: '영상 분위기에 맞는 배경음악을 작곡합니다.',
            path: '/bgm-generation',
        },
        {
            icon: Volume2,
            title: '효과음 생성',
            description: '다양한 상황별 효과음을 생성합니다.',
            path: '/sfx-generation',
        }
    ];

    return (
        <div className="h-full overflow-y-auto bg-[#09090b] text-zinc-100 p-8 md:p-12">
            <div className="max-w-6xl mx-auto pb-20">

                {/* Header */}
                <div className="mb-12 border-b border-zinc-800 pb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <LayoutDashboard className="w-8 h-8 text-zinc-400" />
                        <h1 className="text-3xl font-semibold tracking-tight text-white">
                            Studio Dashboard
                        </h1>
                    </div>
                    <p className="text-zinc-400 text-lg max-w-2xl">
                        AI 기반의 올인원 콘텐츠 제작 스튜디오입니다. 원하는 작업을 선택하여 시작하세요.
                    </p>
                </div>

                {/* Quick Guide */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3 text-zinc-300">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">1</div>
                            <h3 className="font-medium">API 설정</h3>
                        </div>
                        <p className="text-sm text-zinc-500 pl-9">
                            설정 메뉴에서 필요한 AI 서비스의 API 키를 등록하세요.
                        </p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3 text-zinc-300">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">2</div>
                            <h3 className="font-medium">도구 선택</h3>
                        </div>
                        <p className="text-sm text-zinc-500 pl-9">
                            제작하려는 콘텐츠 유형에 맞는 AI 도구를 선택하세요.
                        </p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3 text-zinc-300">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">3</div>
                            <h3 className="font-medium">생성 및 활용</h3>
                        </div>
                        <p className="text-sm text-zinc-500 pl-9">
                            프롬프트를 입력하여 콘텐츠를 생성하고 다운로드하세요.
                        </p>
                    </div>
                </div>

                {/* Main Features Section */}
                <div className="mb-12">
                    <h2 className="text-xl font-semibold mb-6 text-zinc-200 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-zinc-500" />
                        핵심 도구
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {mainFeatures.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => router.push(feature.path)}
                                    className="group flex items-start gap-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-8 text-left transition-all duration-200 hover:bg-zinc-800/50"
                                >
                                    <div className="bg-zinc-800 rounded-lg p-4 group-hover:bg-zinc-700 transition-colors">
                                        <Icon className="w-8 h-8 text-zinc-300" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold mb-2 text-zinc-100 group-hover:text-white">
                                            {feature.title}
                                        </h3>
                                        <p className="text-zinc-400 leading-relaxed mb-4">
                                            {feature.description}
                                        </p>
                                        <div className="flex items-center text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                            시작하기 <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Media Tools Section */}
                <div>
                    <h2 className="text-xl font-semibold mb-6 text-zinc-200 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-zinc-500" />
                        미디어 생성 도구
                    </h2>
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {mediaTools.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => router.push(feature.path)}
                                    className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 rounded-lg p-6 text-left transition-all duration-200 hover:bg-zinc-800"
                                >
                                    <div className="mb-4 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-medium mb-2 text-zinc-200 group-hover:text-white">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-zinc-500 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
