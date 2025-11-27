'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Wand2, Mail, Lock, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // ✅ 타임아웃 설정 (30초)
        let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
            setIsLoading(false);
            toast.error('로그인 시간이 초과되었습니다. 다시 시도해주세요.');
        }, 30000);

        try {
            // ✅ Supabase 클라이언트 초기화 (회원가입/로그인 공통)
            const supabase = createClient();

            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    }
                });
                if (error) throw error;

                // Check if email confirmation is required
                if (data?.user?.identities?.length === 0) {
                    if (timeoutId) clearTimeout(timeoutId);
                    setIsLoading(false);
                    toast.error('이 이메일은 이미 사용 중입니다.');
                } else if (data?.user && !data?.session) {
                    if (timeoutId) clearTimeout(timeoutId);
                    setIsLoading(false);
                    toast.success('회원가입 성공! 이메일을 확인해주세요.');
                } else {
                    if (timeoutId) clearTimeout(timeoutId);
                    toast.success('회원가입 및 로그인 성공!');
                    // ✅ 전체 페이지 리로드하여 세션 반영
                    window.location.href = '/library';
                }
            } else {
                // ✅ 위에서 이미 초기화했으므로 재사용 (변수명 일치)
                const supabaseClient = supabase;

                if (!supabaseClient) {
                    throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');
                }

                // ✅ 타임아웃이 긴 경우를 대비한 재시도 로직
                let data, error;
                let retries = 0;
                const maxRetries = 3;

                while (retries < maxRetries) {
                    try {
                        const result = await supabaseClient.auth.signInWithPassword({
                            email,
                            password,
                        });

                        data = result.data;
                        error = result.error;
                        break; // 성공하면 루프 종료
                    } catch (err: any) {
                        retries++;
                        if (retries < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        } else {
                            error = err;
                        }
                    }
                }

                if (error) {

                    // ✅ 522 에러 처리 (Cloudflare 타임아웃)
                    if (error.message?.includes('522') || error.status === 522) {
                        throw new Error('Supabase 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요. (에러 코드: 522)');
                    }

                    throw error;
                }

                // ✅ 세션이 업데이트될 때까지 잠시 대기
                if (data?.session) {
                    if (timeoutId) clearTimeout(timeoutId);

                    // ✅ 세션이 쿠키에 저장될 때까지 잠시 대기
                    await new Promise(resolve => setTimeout(resolve, 500));

                    toast.success('로그인 성공!');
                    // ✅ 전체 페이지 리로드하여 세션 반영
                    window.location.href = '/library';
                } else {
                    throw new Error('세션을 받지 못했습니다.');
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
            const errorMessage = error instanceof Error ? error.message : '인증 실패';
            toast.error(errorMessage);
            if (timeoutId) clearTimeout(timeoutId);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f16] flex items-center justify-center p-4">
            <Toaster position="top-center" />

            <div className="w-full max-w-md bg-[#1a1a24] rounded-2xl border border-[#2a2a35] p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-(--primary-color) rounded-xl flex items-center justify-center mb-4">
                        <Wand2 className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">AI Studio</h1>
                    <p className="text-(--text-gray) text-sm">
                        {isSignUp ? '새로운 계정을 만들어보세요' : '나만의 스튜디오로 입장하세요'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-(--text-gray) ml-1">이메일</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-gray)" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#15151e] border border-[#2a2a35] rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-(--primary-color) outline-none transition-colors"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-(--text-gray) ml-1">비밀번호</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-gray)" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#15151e] border border-[#2a2a35] rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-(--primary-color) outline-none transition-colors"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-(--primary-color) hover:bg-[#4a4ddb] text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            isSignUp ? '회원가입' : '로그인'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-xs text-(--text-gray) hover:text-white transition-colors"
                    >
                        {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
                    </button>
                </div>
            </div>
        </div>
    );
}
