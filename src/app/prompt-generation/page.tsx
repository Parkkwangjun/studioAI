"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Card, CardContent } from "@/components/ui/Card"
import { MessageSquarePlus, Copy, Check, Sparkles, RefreshCw } from "lucide-react"

interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    fields: {
        key: string;
        label: string;
        placeholder: string;
    }[];
    generate: (values: { [key: string]: string }) => string;
}

const TEMPLATES: PromptTemplate[] = [
    {
        id: 'cinematic',
        name: '시네마틱 영화 장면',
        description: '영화 같은 고품질 이미지 생성을 위한 프롬프트',
        fields: [
            { key: 'subject', label: '주제/피사체', placeholder: '예: 사이버펑크 거리의 탐정' },
            { key: 'lighting', label: '조명', placeholder: '예: 네온 사인, 비 오는 밤의 가로등' },
            { key: 'camera', label: '카메라 앵글', placeholder: '예: 로우 앵글, 광각 렌즈' },
            { key: 'mood', label: '분위기', placeholder: '예: 미스터리, 긴장감' }
        ],
        generate: (v) => `Cinematic shot of ${v.subject}, ${v.lighting} lighting, ${v.camera}, ${v.mood} atmosphere, 8k resolution, highly detailed, photorealistic, movie still.`
    },
    {
        id: 'anime',
        name: '애니메이션 스타일',
        description: '일본 애니메이션 스타일의 캐릭터나 배경',
        fields: [
            { key: 'character', label: '캐릭터 설명', placeholder: '예: 은발의 마법사 소녀' },
            { key: 'action', label: '행동/포즈', placeholder: '예: 마법을 시전하는, 하늘을 나는' },
            { key: 'background', label: '배경', placeholder: '예: 마법 학교 교실' },
            { key: 'style', label: '화풍', placeholder: '예: 지브리 스타일, 신카이 마코토 스타일' }
        ],
        generate: (v) => `Anime style illustration of ${v.character}, ${v.action}, ${v.background} background, ${v.style}, vibrant colors, high quality, detailed.`
    },
    {
        id: 'product',
        name: '제품 사진',
        description: '광고용 고퀄리티 제품 사진',
        fields: [
            { key: 'product', label: '제품명/설명', placeholder: '예: 고급 가죽 시계' },
            { key: 'setting', label: '배경/세팅', placeholder: '예: 대리석 테이블 위' },
            { key: 'lighting', label: '조명', placeholder: '예: 스튜디오 조명, 부드러운 그림자' }
        ],
        generate: (v) => `Professional product photography of ${v.product}, placed on ${v.setting}, ${v.lighting}, 4k, sharp focus, commercial quality, elegant. ${v.remarks ? `Note: ${v.remarks}` : ''}`
    }
];

// Add 'remarks' field to all templates dynamically or manually
TEMPLATES.forEach(t => {
    t.fields.push({ key: 'remarks', label: '비고 (추가 요청사항)', placeholder: '추가적으로 원하는 내용을 자유롭게 적어주세요...' });
});

export default function PromptGenerationPage() {
    const [selectedTemplateId, setSelectedTemplateId] = React.useState(TEMPLATES[0].id);
    const [fieldValues, setFieldValues] = React.useState<{ [key: string]: string }>({});
    const [generatedPrompt, setGeneratedPrompt] = React.useState("");
    const [isCopied, setIsCopied] = React.useState(false);

    const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

    const handleFieldChange = (key: string, value: string) => {
        setFieldValues(prev => ({ ...prev, [key]: value }));
    };

    const handleGenerate = () => {
        const prompt = selectedTemplate.generate(fieldValues);
        setGeneratedPrompt(prompt);
        setIsCopied(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedPrompt);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="flex h-full gap-6 p-6">
            {/* Left Panel - Controls */}
            <div className="w-[400px] shrink-0 flex flex-col gap-6 overflow-y-auto pr-2">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">프롬프트 생성기</h1>
                    <p className="text-sm text-muted">템플릿을 사용하여 완벽한 프롬프트를 만드세요.</p>
                </div>

                <div className="space-y-6">
                    {/* Template Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">템플릿 선택</label>
                        <div className="grid grid-cols-1 gap-2">
                            {TEMPLATES.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => {
                                        setSelectedTemplateId(template.id);
                                        setFieldValues({});
                                        setGeneratedPrompt("");
                                    }}
                                    className={`flex flex-col items-start p-3 rounded-lg border transition-all ${selectedTemplateId === template.id
                                        ? 'bg-primary/10 border-primary text-white'
                                        : 'bg-[#262633] border-[#2a2a35] text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    <span className="font-medium text-sm">{template.name}</span>
                                    <span className="text-xs opacity-70">{template.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Fields */}
                    <div className="space-y-4 p-4 bg-[#15151e] rounded-lg border border-[#2a2a35]">
                        <h3 className="text-sm font-semibold text-white mb-2">{selectedTemplate.name} 설정</h3>
                        {selectedTemplate.fields.map(field => (
                            <div key={field.key} className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400">{field.label}</label>
                                {field.key === 'custom_prompt' || field.key === 'remarks' ? (
                                    <Textarea
                                        placeholder={field.placeholder}
                                        value={fieldValues[field.key] || ''}
                                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                        className="h-24 text-sm resize-none"
                                    />
                                ) : (
                                    <Input
                                        placeholder={field.placeholder}
                                        value={fieldValues[field.key] || ''}
                                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Generate Button */}
                    <Button
                        className="w-full h-12 text-lg font-semibold shadow-blue-500/20"
                        size="lg"
                        onClick={handleGenerate}
                    >
                        <Sparkles className="w-5 h-5 mr-2" />
                        프롬프트 생성
                    </Button>
                </div>
            </div>

            {/* Right Panel - Result */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">생성 결과</h2>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    <Card className="flex-1 bg-[#15151e] border-[#2a2a35]">
                        <CardContent className="p-6 h-full flex flex-col">
                            {generatedPrompt ? (
                                <>
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-400 mb-2 block">English Prompt (Optimized)</label>
                                        <div className="p-4 bg-[#262633] rounded-lg border border-[#2a2a35] text-white text-lg leading-relaxed min-h-[200px]">
                                            {generatedPrompt}
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end gap-3">
                                        <Button variant="outline" onClick={handleGenerate}>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            다시 생성
                                        </Button>
                                        <Button onClick={handleCopy} className={isCopied ? "bg-green-600 hover:bg-green-700" : ""}>
                                            {isCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                            {isCopied ? "복사됨" : "프롬프트 복사"}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted opacity-50">
                                    <MessageSquarePlus className="w-16 h-16 mb-4" />
                                    <p>왼쪽에서 설정을 입력하고 프롬프트를 생성하세요</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tips Section */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 프롬프트 작성 팁</h4>
                        <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                            <li>구체적일수록 좋습니다. (단순히 "개"보다는 "공원에서 뛰노는 골든 리트리버")</li>
                            <li>조명과 분위기를 묘사하면 퀄리티가 높아집니다. (예: "따뜻한 햇살", "신비로운 안개")</li>
                            <li>원하는 스타일을 명시하세요. (예: "수채화 풍", "3D 렌더링", "픽셀 아트")</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
