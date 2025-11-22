'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} />
            <div
                className={cn(
                    "relative bg-[#21212b] rounded-xl border border-[#383845] shadow-2xl flex flex-col max-h-[90vh] w-[600px] overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                    className
                )}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#383845]">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-[#a0a0b0] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
