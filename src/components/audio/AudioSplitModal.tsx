'use client';

import { Modal } from '@/components/ui/Modal';
import { Check, Split } from 'lucide-react';

interface AudioSplitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    scriptText: string;
}

export function AudioSplitModal({ isOpen, onClose, onConfirm, scriptText }: AudioSplitModalProps) {
    // Mock splitting logic for display
    const scenes = scriptText.split('\n\n').filter(Boolean).map((text, i) => ({
        id: i + 1,
        text: text.trim()
    }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="장면 분리 결과" className="w-[800px]">
            <div className="flex flex-col gap-5">
                <div className="bg-[#15151e] rounded-lg p-4 border border-[#2a2a35] max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    {scenes.length > 0 ? scenes.map((scene) => (
                        <div key={scene.id} className="bg-[#21212b] p-4 rounded-md border border-[#383845] flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-[#2b2b36] flex items-center justify-center text-[0.8rem] font-bold text-[var(--text-gray)] shrink-0">
                                {scene.id}
                            </div>
                            <p className="text-[0.9rem] text-[#d0d0e0] leading-relaxed">
                                {scene.text}
                            </p>
                        </div>
                    )) : (
                        <div className="text-center text-[var(--text-gray)] py-10">
                            분리할 스크립트가 없습니다.
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-[#2a2a35]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md border border-[#383845] text-[#a0a0b0] hover:text-white hover:border-white transition-colors text-sm"
                    >
                        취소
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 rounded-md bg-[var(--primary-color)] text-white hover:bg-[#4a4ddb] transition-colors text-sm flex items-center gap-2 font-medium"
                    >
                        <Check className="w-4 h-4" />
                        적용하기
                    </button>
                </div>
            </div>
        </Modal>
    );
}
