'use client';

import { Settings, ChevronDown, Upload, Filter, Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useProjectStore, AssetType, Asset } from '@/store/useProjectStore';
import { AssetCard } from '@/components/library/AssetCard';
import dynamic from 'next/dynamic';
import { useVideoPoller } from '@/hooks/useVideoPoller';
import { useImagePoller } from '@/hooks/useImagePoller';
import { useAudioTaskPoller } from '@/hooks/useAudioTaskPoller';

const AssetDetailModal = dynamic(() => import('@/components/library/AssetDetailModal').then(mod => mod.AssetDetailModal), { ssr: false });
const ProjectManager = dynamic(() => import('@/components/library/ProjectManager').then(mod => mod.ProjectManager), { ssr: false });
import { Button } from '@/components/ui/Button';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export function LibraryPanel() {
    const { currentProject, loadProjects, addAsset, deleteAsset } = useProjectStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
    const pathname = usePathname();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    // Enable global polling for all asset types
    useVideoPoller();
    useImagePoller();
    useAudioTaskPoller();

    if (pathname === '/login') return null;

    useEffect(() => {
        loadProjects();
    }, []);

    const assets = currentProject?.assets || [];

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || asset.type === filterType;
        return matchesSearch && matchesFilter;
    });

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentProject) return;

        const toastId = toast.loading('파일 업로드 중...');

        try {
            // 1. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${currentProject.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath);

            // 2. Determine Asset Type
            let type: AssetType = 'image';
            if (file.type.startsWith('audio')) type = 'audio';
            else if (file.type.startsWith('video')) type = 'video';
            else if (file.type.startsWith('text')) type = 'script';

            // 3. Add to DB via Store
            await addAsset({
                type,
                title: file.name,
                url: publicUrl,
                storagePath: filePath,
                tag: 'Uploaded'
            });

            toast.success('업로드 완료!', { id: toastId });
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('업로드 실패', { id: toastId });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteAsset = async (id: string) => {
        try {
            await deleteAsset(id);
            toast.success('에셋이 삭제되었습니다.');
            setSelectedAsset(null);
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('삭제 실패');
        }
    };

    return (
        <aside className="w-[320px] bg-(--bg-sidebar) border-l border-[#2a2a35] flex flex-col h-full shrink-0">
            {/* Header */}
            <div className="p-5 border-b border-[#2a2a35]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[1.1rem] font-semibold text-white">Library</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsProjectManagerOpen(true)}
                            className="text-(--text-gray) hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                            title="Manage Projects"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleUploadClick} title="Upload Asset" disabled={!currentProject}>
                            <Upload className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Filter Dropdown */}
                <div className="relative">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="w-full appearance-none bg-transparent border border-[#2a2a35] rounded-lg px-3 py-1.5 text-xs text-(--text-gray) outline-none focus:border-(--primary-color) focus:text-white cursor-pointer"
                    >
                        <option value="all" className="bg-[#15151e]">All Assets</option>
                        <option value="script" className="bg-[#15151e]">Scripts</option>
                        <option value="audio" className="bg-[#15151e]">Audio</option>
                        <option value="image" className="bg-[#15151e]">Images</option>
                        <option value="video" className="bg-[#15151e]">Videos</option>
                        <option value="sfx" className="bg-[#15151e]">SFX</option>
                        <option value="bgm" className="bg-[#15151e]">BGM</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--text-gray) pointer-events-none" />
                </div>
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {!currentProject ? (
                    <div className="flex flex-col items-center justify-center h-full text-(--text-gray) text-center gap-2">
                        <p className="text-sm">프로젝트를 선택하거나 생성해주세요.</p>
                        <Button variant="outline" size="sm" onClick={() => setIsProjectManagerOpen(true)}>
                            프로젝트 관리
                        </Button>
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-(--text-gray) text-center">
                        <p className="text-sm">에셋이 없습니다.</p>
                        <p className="text-xs mt-1">새 에셋을 업로드하거나 생성해보세요.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredAssets.map((asset) => (
                            <AssetCard
                                key={asset.id}
                                asset={asset}
                                onClick={setSelectedAsset}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ProjectManager
                isOpen={isProjectManagerOpen}
                onClose={() => setIsProjectManagerOpen(false)}
            />

            <AssetDetailModal
                isOpen={!!selectedAsset}
                onClose={() => setSelectedAsset(null)}
                asset={selectedAsset}
                onDelete={handleDeleteAsset}
            />
        </aside>
    );
}
