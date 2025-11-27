import React, { useEffect, useState } from 'react';
import { FileText, Music, Image as ImageIcon, Video, Speaker, Radio, Play, Clock, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Asset, AssetType, useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import toast from 'react-hot-toast';

interface AssetCardProps {
    asset: Asset;
    onClick: (asset: Asset) => void;
}

export const AssetCard = React.memo(function AssetCard({ asset, onClick }: AssetCardProps) {
    const { updateAsset } = useProjectStore();
    const { kieKey } = useSettingsStore();
    const [isPolling, setIsPolling] = useState(false);

    const isPending = asset.tag?.startsWith('pending:');
    const taskId = isPending ? asset.tag?.split(':')[1] : null;

    const [localError, setLocalError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let isMounted = true;

        const checkStatus = async () => {
            if (!taskId || !kieKey) {
                console.log('Missing taskId or kieKey', { taskId, hasKey: !!kieKey });
                return;
            }

            if (retryCount > 100) { // 5 minutes of polling (100 * 3s)
                setLocalError('Timeout');
                setIsPolling(false);
                return;
            }

            try {
                const res = await fetch(`/api/video/status?taskId=${taskId}`, {
                    headers: {
                        'x-kie-key': kieKey
                    }
                });
                const data = await res.json();

                if (!isMounted) return;

                if (data.status === 'completed') {
                    console.log(`[AssetCard] Task ${taskId} completed. URL:`, data.videoUrl); // Debug Log
                    // Update asset with real URL and remove pending tag
                    try {
                        console.log(`[AssetCard] Updating asset ${asset.id} with URL...`); // Debug Log
                        await updateAsset(asset.id, {
                            url: data.videoUrl,
                            // thumbnail: data.videoUrl, // Don't use video URL as thumbnail
                            tag: asset.tag?.replace(`pending:${taskId}`, '').trim() || 'video',
                            duration: data.duration || 5
                        });
                        console.log(`[AssetCard] Asset ${asset.id} updated successfully.`); // Debug Log
                    } catch (updateError) {
                        console.error('[AssetCard] Failed to update asset in DB:', updateError);
                        // If DB update fails, show local error to stop spinner
                        setLocalError('Save Failed');
                        setIsPolling(false);
                    }
                } else if (data.status === 'failed') {
                    console.error('[AssetCard] Video generation failed:', data.error);
                    // Update asset to show error
                    try {
                        await updateAsset(asset.id, {
                            tag: `error:${data.error || 'Failed'}`
                        });
                    } catch (e) {
                        console.error('Failed to update error status:', e);
                        setLocalError(data.error || 'Failed');
                        setIsPolling(false);
                    }
                } else {
                    // Continue polling
                    console.log(`[AssetCard] Task ${taskId} status: pending/generating...`); // Debug Log
                    timeoutId = setTimeout(checkStatus, 3000);
                }
            } catch (error) {
                console.error('Polling error:', error);
                setRetryCount(prev => prev + 1);
                timeoutId = setTimeout(checkStatus, 5000);
            }
        };

        if (isPending && taskId && !isPolling && !localError) {
            setIsPolling(true);
            checkStatus();
        }

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [isPending, taskId, kieKey, asset.id, updateAsset, isPolling, asset.tag, retryCount, localError]);

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

    const isError = asset.tag?.startsWith('error:') || !!localError;

    const handleClick = () => {
        if (isPending) {
            toast('비디오가 아직 생성 중입니다. 잠시만 기다려주세요.', {
                icon: '⏳',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            });
            return;
        }
        if (isError) {
            toast.error('비디오 생성에 실패했습니다.');
            return;
        }
        onClick(asset);
    };

    return (
        <div
            onClick={handleClick}
            draggable={asset.type === 'image' && !isPending && !isError} // 이미지만 드래그 가능
            onDragStart={(e) => {
                if (asset.type === 'image') {
                    e.dataTransfer.setData('imageUrl', asset.url);
                    if (asset.sceneNumber) {
                        e.dataTransfer.setData('sceneId', asset.sceneNumber.toString());
                    }
                }
            }}
            className={cn(
                "group relative bg-[#262633] rounded-lg overflow-hidden border border-[#2a2a35] transition-all",
                !isPending && !isError ? "hover:border-(--primary-color) cursor-pointer" : "cursor-pointer opacity-80"
            )}
        >
            {/* Thumbnail Area */}
            <div className="aspect-square bg-[#323242] relative overflow-hidden flex items-center justify-center">
                {isPending && !localError ? (
                    <div className="flex flex-col items-center gap-2 text-(--primary-color)">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-[11px] font-semibold text-white">생성 중...</span>
                        <span className="text-[9px] text-(--text-gray)">백그라운드에서 진행됩니다</span>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center gap-2 text-red-400 px-2 text-center">
                        <AlertCircle className="w-6 h-6" />
                        <span className="text-[10px] font-medium text-white break-all">
                            {localError || asset.tag?.split('error:')[1]}
                        </span>
                    </div>
                ) : asset.type === 'video' && !asset.thumbnail && asset.url ? (
                    <video
                        src={asset.url}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        muted
                        loop
                        playsInline
                        onMouseOver={e => {
                            const video = e.currentTarget;
                            video.play().catch(err => {
                                if (err.name !== 'AbortError') console.error('Play error:', err);
                            });
                        }}
                        onMouseOut={e => e.currentTarget.pause()}
                    />
                ) : (asset.thumbnail || asset.type === 'image') ? (
                    (asset.thumbnail || asset.url) ? (
                        <img
                            src={asset.thumbnail || asset.url}
                            alt={asset.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-(--text-gray)">
                            {getIcon(asset.type)}
                        </div>
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-(--text-gray)">
                        {getIcon(asset.type)}
                    </div>
                )}

                {/* Type Badge */}
                {!isPending && !isError && (
                    <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                        {getIcon(asset.type)}
                        {asset.sceneNumber && <span>#{asset.sceneNumber}</span>}
                    </div>
                )}

                {/* Duration Badge (Audio/Video) */}
                {asset.duration && !isPending && !isError && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(asset.duration)}
                    </div>
                )}
            </div>

            {/* Info Area */}
            <div className="p-2.5">
                <h4 className="text-xs font-medium text-white truncate mb-1">{asset.title}</h4>
                <div className="flex items-center justify-between text-[10px] text-(--text-gray)">
                    <span className="truncate max-w-[60%]">
                        {isPending ? '처리 중...' : isError ? '실패' : asset.tag}
                    </span>
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
});
