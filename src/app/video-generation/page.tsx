"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Card, CardContent } from "@/components/ui/Card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { Video, Upload, Play, Film, Clock, Zap } from "lucide-react"

export default function VideoGenerationPage() {
    return (
        <div className="flex h-full gap-6 p-6">
            {/* Left Panel - Controls */}
            <div className="w-[400px] flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-2">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">AI 비디오 생성기</h1>
                    <p className="text-sm text-muted">이미지에 생명을 불어넣어 동영상으로 만드세요.</p>
                </div>

                <Tabs defaultValue="image-to-video" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-4">
                        <TabsTrigger value="image-to-video">이미지를 동영상으로</TabsTrigger>
                        <TabsTrigger value="text-to-video">텍스트를 동영상으로</TabsTrigger>
                    </TabsList>

                    <TabsContent value="image-to-video" className="space-y-6">
                        {/* Image Upload Area */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="border-dashed border-2 border-border bg-transparent hover:bg-white/5 transition-colors cursor-pointer aspect-video flex items-center justify-center">
                                <div className="text-center p-4">
                                    <Upload className="w-6 h-6 text-muted mx-auto mb-2" />
                                    <span className="text-xs text-muted">시작 이미지</span>
                                </div>
                            </Card>
                            <Card className="border-dashed border-2 border-border bg-transparent hover:bg-white/5 transition-colors cursor-pointer aspect-video flex items-center justify-center opacity-50 hover:opacity-100">
                                <div className="text-center p-4">
                                    <Upload className="w-6 h-6 text-muted mx-auto mb-2" />
                                    <span className="text-xs text-muted">최종 프레임 (선택)</span>
                                </div>
                            </Card>
                        </div>

                        {/* Prompt Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">모션 설명</label>
                            <Textarea
                                placeholder="이미지가 어떻게 움직여야 하는지 설명하세요... (예: 카메라가 천천히 줌인하면서 깃발이 펄럭임)"
                                className="h-24 resize-none"
                            />
                        </div>

                        {/* Settings */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">품질 설정</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="justify-start gap-2 h-auto py-2 border-primary bg-primary/10 text-white">
                                        <Zap className="w-4 h-4 text-primary" />
                                        <div className="text-left">
                                            <div className="text-sm font-medium">빠르게 V2.0</div>
                                        </div>
                                    </Button>
                                    <Button variant="outline" className="justify-start gap-2 h-auto py-2">
                                        <Film className="w-4 h-4" />
                                        <div className="text-left">
                                            <div className="text-sm font-medium">고품질 V1.0</div>
                                        </div>
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">해상도</label>
                                    <select className="w-full h-10 rounded-lg border border-border bg-input px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary">
                                        <option>720p</option>
                                        <option>1080p</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">길이</label>
                                    <select className="w-full h-10 rounded-lg border border-border bg-input px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary">
                                        <option>5초</option>
                                        <option>10초</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <Button className="w-full h-12 text-lg font-semibold shadow-blue-500/20" size="lg">
                            <Video className="w-5 h-5 mr-2" />
                            비디오 생성하기
                        </Button>
                    </TabsContent>

                    <TabsContent value="text-to-video" className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">비디오 프롬프트</label>
                            <Textarea
                                placeholder="생성하고 싶은 비디오 장면을 묘사하세요..."
                                className="h-32 resize-none"
                            />
                        </div>
                        <Button className="w-full h-12 text-lg font-semibold" size="lg">
                            <Video className="w-5 h-5 mr-2" />
                            비디오 생성하기
                        </Button>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Right Panel - Preview Player */}
            <div className="flex-1 flex flex-col min-w-0 bg-black/40 rounded-xl border border-border overflow-hidden">
                {/* Main Preview Area */}
                <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] relative group">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors cursor-pointer">
                            <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                        <p className="text-muted text-sm">생성된 비디오가 여기에 재생됩니다</p>
                    </div>
                </div>

                {/* History Strip */}
                <div className="h-32 border-t border-border bg-[#15151e] p-4 flex gap-4 overflow-x-auto">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex-shrink-0 aspect-video rounded-lg bg-gray-800 relative overflow-hidden border border-transparent hover:border-primary cursor-pointer">
                            <img src={`https://picsum.photos/seed/${i + 10}/300/169`} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                                <Clock className="w-3 h-3" /> 00:05
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
