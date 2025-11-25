'use client';

import { Modal } from '@/components/ui/Modal';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/useProjectStore';
import { createClient } from '@/lib/supabase/client';

interface ScriptResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    script: string;
    projectName: string;
}

export function ScriptResultModal({ isOpen, onClose, script, projectName }: ScriptResultModalProps) {
    const router = useRouter();
    const { currentProject, createProject, addAsset, updateScenes } = useProjectStore();
    const supabase = createClient();

    const handleMoveToAudio = async () => {
        try {
            if (currentProject) {
                // 1. Upload script as text file to Supabase Storage
                const blob = new Blob([script], { type: 'text/plain' });
                const fileName = `script_${Date.now()}.txt`;
                const filePath = `${currentProject.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('assets')
                    .upload(filePath, blob);

                if (uploadError) {
                    console.error('Error uploading script:', uploadError);
                    // Continue anyway? Or stop? Let's log and try to proceed with asset creation if possible
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('assets')
                    .getPublicUrl(filePath);

                // 2. Add Asset to Store & DB
                await addAsset({
                    type: 'script',
                    title: `${projectName} Script`,
                    url: publicUrl,
                    storagePath: filePath,
                    tag: 'Generated'
                });

                // 3. Update Scenes (Initialize with one scene containing the full script for now)
                // The Audio page might split it later.
                // 3. Update Scenes (Split script into scenes)
                // Try to split by "Scene N:" or double newlines
                const sceneTexts = script.split(/Scene \d+:/i).filter(t => t.trim().length > 0);

                let newScenes;
                if (sceneTexts.length > 1) {
                    newScenes = sceneTexts.map((text, index) => ({
                        id: index + 1,
                        text: text.trim(),
                        audioUrl: '',
                        imageUrl: '',
                        videoUrl: ''
                    }));
                } else {
                    // Fallback to splitting by double newlines if "Scene N:" format not found
                    newScenes = script.split('\n\n').filter(t => t.trim().length > 0).map((text, index) => ({
                        id: index + 1,
                        text: text.trim(),
                        audioUrl: '',
                        imageUrl: '',
                        videoUrl: ''
                    }));
                }

                updateScenes(newScenes);

                // 4. Navigate
                router.push('/audio');
            } else {
                // Fallback: Create new project if none exists (e.g. direct access)
                await createProject({
                    title: projectName,
                    description: script.substring(0, 100) + '...',
                    type: 'audio',
                });
                router.push('/audio');
            }
            onClose();
        } catch (error) {
            console.error('Error moving to audio:', error);
            // Show error toast?
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={projectName}>
            <div className="space-y-4">
                <div className="bg-[#15151e] rounded-lg p-4 text-[#a0a0b0] text-sm leading-relaxed whitespace-pre-wrap border border-[#2a2a35] max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {script}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md border border-[#383845] text-[#a0a0b0] hover:text-white hover:border-white transition-colors text-sm"
                    >
                        닫기
                    </button>
                    <button
                        onClick={handleMoveToAudio}
                        className="px-4 py-2 rounded-md bg-[#5b5ef5] text-white hover:bg-[#4a4ddb] transition-colors text-sm flex items-center gap-2 font-medium"
                    >
                        오디오로 이동
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </Modal>
    );
}
