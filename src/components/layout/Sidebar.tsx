'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Wand2,
    FileText,
    Music,
    Image as ImageIcon,
    Video,
    Settings,
    LogOut,
    Palette,
    Speaker,
    Radio,
    MessageSquarePlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import SettingsModal from '@/components/settings/SettingsModal';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const oneClickItems = [
    { href: '/script', label: '스크립트', icon: FileText },
    { href: '/audio', label: '오디오', icon: Music },
    { href: '/image', label: '이미지', icon: ImageIcon },
    { href: '/video', label: '비디오', icon: Video },
];

const aiToolItems = [
    { href: '/image-generation', label: '이미지 생성', icon: Palette },
    { href: '/sfx-generation', label: '효과음 생성', icon: Speaker },
    { href: '/bgm-generation', label: '배경음 생성', icon: Radio },
    { href: '/prompt-generation', label: '프롬프트 생성', icon: MessageSquarePlus },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const supabase = createClient();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed:', error);
            toast.error('로그아웃 실패');
        }
    };

    if (pathname === '/login') return null;

    return (
        <>
            <nav className="w-[240px] bg-(--bg-sidebar) flex flex-col p-5 border-r border-[#2a2a35] h-full shrink-0 overflow-y-auto">
                <div className="flex items-center gap-2.5 text-[1.2rem] font-bold mb-8 pl-2.5 text-white">
                    <Wand2 className="w-6 h-6 text-[var(--primary-color)]" />
                    <span>AI Studio</span>
                </div>

                <div className="flex flex-col gap-6 flex-1">
                    {/* One Click Section */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">One Click</h3>
                        <ul className="flex flex-col gap-1">
                            {oneClickItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors duration-200",
                                                isActive
                                                    ? "bg-(--primary-color) text-white"
                                                    : "text-[var(--text-gray)] hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* AI Tools Section */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">AI Tools</h3>
                        <ul className="flex flex-col gap-1">
                            {aiToolItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors duration-200",
                                                isActive
                                                    ? "bg-(--primary-color) text-white"
                                                    : "text-[var(--text-gray)] hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                {/* User Profile Section */}
                <div className="mt-auto pt-4 border-t border-[#2a2a35]">
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-(--primary-color) flex items-center justify-center text-white font-bold text-xs">
                            ME
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">My Studio</p>
                            <p className="text-xs text-[var(--text-gray)] truncate">Pro Plan</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors duration-200 text-[var(--text-gray)] hover:bg-white/5 hover:text-white"
                    >
                        <Settings className="w-4 h-4" />
                        <span>설정</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors duration-200 text-[var(--text-gray)] hover:bg-white/5 hover:text-red-400"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>로그아웃</span>
                    </button>
                </div>
            </nav>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
}
