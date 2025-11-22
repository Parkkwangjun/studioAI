'use client';

import { Modal } from '@/components/ui/Modal';
import { Copy } from 'lucide-react';

interface ScriptResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    script: string;
    projectName: string;
}

export function ScriptResultModal({ isOpen, onClose, script, projectName }: ScriptResultModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={projectName}>
            <div className="space-y-4">
                <div className="bg-[#15151e] rounded-lg p-4 text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-wrap border border-[#2a2a35]">
                    {script}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md border border-[#383845] text-[#a0a0b0] hover:text-white hover:border-white transition-colors text-sm"
                    >
                        닫기
                    </button>
                    <button className="px-4 py-2 rounded-md bg-[#5b5ef5] text-white hover:bg-[#4a4ddb] transition-colors text-sm flex items-center gap-2 font-medium">
                        <Copy className="w-4 h-4" />
                        전체 복사
                    </button>
                </div>
            </div>
        </Modal>
    );
}
