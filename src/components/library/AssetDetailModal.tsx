// Dialog imports removed as we are using a custom implementation for now
// Since I haven't created a generic Dialog component yet, I'll implement a simple modal here or use the one from SettingsModal pattern.
// Actually, I should probably create a reusable Dialog component first if I want to be clean, but for speed, I'll adapt the pattern.

import * as React from 'react';
import { X, Trash2, Video, Download, ExternalLink, FileText } from 'lucide-react';
import { Asset } from '@/store/useProjectStore';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface AssetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onDelete: (id: string) => void;
}

export const AssetDetailModal = React.memo(function AssetDetailModal({ isOpen, onClose, asset, onDelete }: AssetDetailModalProps) {
    const router = useRouter();

    if (!isOpen || !asset) return null;

    const handleGenerateVideo = () => {
        router.push(`/video?sourceImage=${encodeURIComponent(asset.url)}`);
        onClose();
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(asset.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Extract filename from URL or use title
            const extension = asset.type === 'image' ? 'png' : asset.type === 'video' ? 'mp4' : asset.type === 'audio' ? 'mp3' : 'txt';
            link.download = `${asset.title || 'download'}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(asset.url, '_blank'); // Fallback
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
                    <h3 className="text-lg font-semibold text-white">{asset.title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col md:flex-row h-[500px]">
                    {/* Preview Section */}
                    <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
                        {asset.type === 'image' && (
                            <img src={asset.url} alt={asset.title} className="max-w-full max-h-full object-contain" />
                        )}
                        {asset.type === 'video' && (
                            <video src={asset.url} controls className="max-w-full max-h-full" />
                        )}
                        {(asset.type === 'audio' || asset.type === 'sfx' || asset.type === 'bgm') && (
                            <div className="w-full max-w-md">
                                <div className="bg-[#27272a] p-6 rounded-lg flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                                        <Video className="w-8 h-8" /> {/* Placeholder icon */}
                                    </div>
                                    <audio src={asset.url} controls className="w-full" />
                                </div>
                            </div>
                        )}
                        {asset.type === 'script' && (
                            <div className="flex flex-col items-center gap-4 text-gray-400">
                                <FileText className="w-24 h-24" />
                                <p className="text-sm">스크립트 파일 미리보기는 지원하지 않습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="w-full md:w-80 border-l border-[#27272a] bg-[#18181b] p-6 flex flex-col overflow-y-auto">
                        <div className="space-y-6 flex-1">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</label>
                                <p className="text-sm text-white mt-1 capitalize">{asset.type}</p>
                            </div>

                            {asset.sceneNumber && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Source Scene</label>
                                    <p className="text-sm text-white mt-1">Scene #{asset.sceneNumber}</p>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</label>
                                <p className="text-sm text-white mt-1">{new Date(asset.createdAt).toLocaleString()}</p>
                            </div>

                            {asset.tag && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Generation Tag</label>
                                    <div className="mt-1">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                                            {asset.tag}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-6 space-y-3 pt-6 border-t border-[#27272a]">
                            {asset.type === 'image' && (
                                <Button className="w-full justify-center" variant="primary" onClick={handleGenerateVideo}>
                                    <Video className="w-4 h-4 mr-2" />
                                    비디오로 생성
                                </Button>
                            )}

                            <Button className="w-full justify-center" variant="outline" onClick={handleDownload}>
                                <Download className="w-4 h-4 mr-2" />
                                다운로드
                            </Button>

                            <Button
                                className="w-full justify-center text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-400/20"
                                variant="outline"
                                onClick={() => {
                                    if (confirm('정말 삭제하시겠습니까?')) {
                                        onDelete(asset.id);
                                        onClose();
                                    }
                                }}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
