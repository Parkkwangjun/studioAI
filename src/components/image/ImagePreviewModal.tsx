'use client';

import { X, Download } from 'lucide-react';
import { useEffect } from 'react';

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    prompt: string;
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl, prompt }: ImagePreviewModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `generated-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="relative max-w-[90vw] max-h-[90vh] bg-[#15151e] rounded-xl overflow-hidden border border-[var(--border-color)] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] bg-[#1e1e2d]">
                    <h3 className="text-white font-medium text-sm">Image Preview</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors flex items-center gap-2 text-xs"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-gray)] hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Image Area */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#0f0f16]">
                    <img
                        src={imageUrl}
                        alt={prompt}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                    />
                </div>

                {/* Footer (Prompt) */}
                <div className="p-4 border-t border-[var(--border-color)] bg-[#1e1e2d]">
                    <p className="text-xs text-[var(--text-gray)] line-clamp-3 font-mono">
                        {prompt}
                    </p>
                </div>
            </div>
        </div>
    );
}
