import React from 'react';
import { FileText, Music, Image as ImageIcon, Video, Speaker, Radio, Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Asset, AssetType } from '@/store/useProjectStore';

interface AssetCardProps {
    asset: Asset;
    onClick: (asset: Asset) => void;
}



export const AssetCard = React.memo(function AssetCard({ asset, onClick }: AssetCardProps) {
    const getIcon = (type: AssetType) => {
        switch (type) {
            case 'script': return <FileText className="w-3 h-3" />;
            case 'audio': return <Music className="w-3 h-3" />;
            case 'image': return <ImageIcon className="w-3 h-3" />;
            case 'video': return <Video className="w-3 h-3" />;
            case 'sfx': return <Speaker className="w-3 h-3" />;
            case 'bgm': return <Radio className="w-3 h-3" />;
            default: return <FileText className="w-3 h-3" />;
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div
            onClick={() => onClick(asset)}
            draggable={asset.type === 'image'} // 이미지만 드래그 가능
            onDragStart={(e) => {
                if (asset.type === 'image') {
                    e.dataTransfer.setData('imageUrl', asset.url);
                    if (asset.sceneNumber) {
                        e.dataTransfer.setData('sceneId', asset.sceneNumber.toString());
                    }
                }
            }}
            className="group relative bg-[#262633] rounded-lg overflow-hidden border border-[#2a2a35] hover:border-[var(--primary-color)] transition-all cursor-pointer"
        >
            {/* Thumbnail Area */}
            <div className="aspect-square bg-[#323242] relative overflow-hidden">
                {asset.type === 'video' && !asset.thumbnail ? (
                    <video
                        src={asset.url}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        muted
                        loop
                        playsInline
                        onMouseOver={e => e.currentTarget.play()}
                        onMouseOut={e => e.currentTarget.pause()}
                    />
                ) : (asset.thumbnail || asset.type === 'image') ? (
                    <img
                        src={asset.thumbnail || asset.url}
                        alt={asset.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-gray)]">
                        {getIcon(asset.type)}
                    </div>
                )}

                {/* Type Badge */}
                <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                    {getIcon(asset.type)}
                    {asset.sceneNumber && <span>#{asset.sceneNumber}</span>}
                </div>

                {/* Duration Badge (Audio/Video) */}
                {asset.duration && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(asset.duration)}
                    </div>
                )}
            </div>

            {/* Info Area */}
            <div className="p-2.5">
                <h4 className="text-xs font-medium text-white truncate mb-1">{asset.title}</h4>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-gray)]">
                    <span className="truncate max-w-[60%]">{asset.tag}</span>
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
});
