'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Wand2, Mail, Lock, Loader2, Github } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
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
                    toast.error('이 이메일은 이미 사용 중입니다.');
                } else if (data?.user && !data?.session) {
                    toast.success('회원가입 성공! 이메일을 확인해주세요.');
                } else {
                    toast.success('회원가입 및 로그인 성공!');
                    router.push('/library');
                    router.refresh();
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('로그인 성공!');
                router.push('/library');
                router.refresh();
            }
        } catch (error) {
            console.error('Auth error:', error);
            const errorMessage = error instanceof Error ? error.message : '인증 실패';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error) {
            toast.error('소셜 로그인 실패');
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

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#2a2a35]"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#1a1a24] px-2 text-(--text-gray)">Or continue with</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleSocialLogin('github')}
                        className="flex items-center justify-center gap-2 bg-[#15151e] hover:bg-[#2a2a35] border border-[#2a2a35] text-white py-2.5 rounded-lg transition-colors text-sm font-medium"
                    >
                        <Github className="w-4 h-4" />
                        GitHub
                    </button>
                    <button
                        onClick={() => handleSocialLogin('google')}
                        className="flex items-center justify-center gap-2 bg-[#15151e] hover:bg-[#2a2a35] border border-[#2a2a35] text-white py-2.5 rounded-lg transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Google
                    </button>
                </div>

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
