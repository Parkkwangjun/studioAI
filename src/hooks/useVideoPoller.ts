import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import toast from 'react-hot-toast';

export function useVideoPoller() {
    const { currentProject, updateAsset, updateScene } = useProjectStore();
    const pollingIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

    useEffect(() => {
        if (!currentProject) return;

        // Find all assets with 'pending:' tag
        const pendingAssets = currentProject.assets.filter(asset =>
            asset.tag && asset.tag.startsWith('pending:')
        );

        pendingAssets.forEach(asset => {
            const taskId = asset.tag!.split(':')[1];

            // If already polling this task, skip
            if (pollingIntervals.current[taskId]) return;

            console.log(`[VideoPoller] Starting poll for task: ${taskId}`);

            // Start polling
            pollingIntervals.current[taskId] = setInterval(async () => {
                try {
                    // Use the key from the store, or fallback to localStorage if store is empty (though store should be populated)
                    // Note: accessing store state inside interval might be stale if not careful, 
                    // but since we use the hook's scope, we should use a ref or getState if we want the absolute latest.
                    // However, useSettingsStore.getState().kieKey is safer for intervals.
                    const currentKieKey = useSettingsStore.getState().kieKey;

                    if (!currentKieKey) {
                        console.warn('[VideoPoller] No KIE Key found, skipping poll');
                        return;
                    }

                    const response = await fetch(`/api/video/status?taskId=${taskId}`, {
                        headers: {
                            'x-kie-key': currentKieKey,
                        }
                    });

                    if (response.status === 401) {
                        console.error('[VideoPoller] 401 Unauthorized. Key might be invalid.');
                        // Stop polling if key is invalid
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];
                        return;
                    }

                    // Stop polling if task not found (404, 422, etc.)
                    if (response.status === 422 || response.status === 404) {
                        console.warn(`[VideoPoller] Task ${taskId} not found, stopping poll`);
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];
                        
                        // Mark asset as failed
                        await updateAsset(asset.id, {
                            tag: 'error: Task expired or not found',
                            title: `(Expired) ${asset.title}`
                        });
                        return;
                    }

                    if (!response.ok) return;

                    const data = await response.json();
                    console.log(`[VideoPoller] Status for ${taskId}:`, data.status);

                    if (data.status === 'completed') {
                        // Clear interval
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];

                        // Update Asset
                        await updateAsset(asset.id, {
                            url: data.videoUrl,
                            // thumbnail: data.videoUrl, // Removed as column missing in DB
                            tag: 'completed', // Remove pending tag
                            duration: data.duration
                        });

                        // Update Scene if linked
                        if (asset.sceneNumber !== undefined && asset.sceneNumber !== null) {
                            updateScene(asset.sceneNumber, {
                                videoUrl: data.videoUrl
                            });
                        }

                        toast.success('비디오 생성이 완료되었습니다!');
                    } else if (data.status === 'failed') {
                        // Clear interval
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];

                        // Update Asset to failed state
                        await updateAsset(asset.id, {
                            tag: 'failed',
                            title: `(Failed) ${asset.title}`
                        });

                        console.error(`[VideoPoller] Task ${taskId} failed. Error:`, data.error);
                        toast.error(`비디오 생성 실패: ${data.error}`);
                    }
                } catch (error) {
                    console.error(`[VideoPoller] Error polling task ${taskId}:`, error);
                }
            }, 5000); // Poll every 5 seconds
        });

        // Cleanup function
        return () => {
            Object.values(pollingIntervals.current).forEach(clearInterval);
            pollingIntervals.current = {};
        };
    }, [currentProject?.assets]); // Re-run when assets change
}
