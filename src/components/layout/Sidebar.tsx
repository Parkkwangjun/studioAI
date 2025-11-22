'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wand2, MessageSquare, Volume2, Image as ImageIcon, PlayCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import SettingsModal from '@/components/settings/SettingsModal';

const menuItems = [
    { href: '/script', label: '스크립트', icon: MessageSquare },
    { href: '/audio', label: '오디오', icon: Volume2 },
    { href: '/image', label: '이미지', icon: ImageIcon },
    { href: '/video', label: '비디오', icon: PlayCircle },
    { href: '/preview', label: '미리보기', icon: PlayCircle },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    if (pathname === '/login') return null;

    return (
        <>
            <nav className="w-[240px] bg-[var(--bg-sidebar)] flex flex-col p-5 border-r border-[#2a2a35] h-full shrink-0">
                <div className="flex items-center gap-2.5 text-[1.2rem] font-bold mb-10 pl-2.5 text-white">
                    <Wand2 className="w-6 h-6 text-[var(--primary-color)]" />
                    <span>AI Studio</span>
                </div>

                <ul className="flex flex-col gap-2.5 flex-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-[15px] px-[15px] py-3 rounded-lg cursor-pointer text-[0.95rem] transition-colors duration-200",
                                        isActive
                                            ? "bg-[var(--primary-color)] text-white"
                                            : "text-[var(--text-gray)] hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <Icon className="w-5 h-5 text-center" />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}

                </ul>

                {/* User Profile Section */}
                <div className="mt-auto pt-4 border-t border-[#2a2a35]">
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white font-bold text-xs">
                            ME
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">My Studio</p>
                            <p className="text-xs text-[var(--text-gray)] truncate">Pro Plan</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full flex items-center gap-[15px] px-[15px] py-3 rounded-lg cursor-pointer text-[0.95rem] transition-colors duration-200 text-[var(--text-gray)] hover:bg-white/5 hover:text-white"
                    >
                        <Settings className="w-5 h-5 text-center" />
                        <span>설정</span>
                    </button>
                </div>
            </nav>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
}
