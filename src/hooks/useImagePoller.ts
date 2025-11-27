import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import toast from 'react-hot-toast';

export function useImagePoller() {
    const { currentProject, updateAsset, updateScene } = useProjectStore();
    const pollingIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

    useEffect(() => {
        if (!currentProject) return;

        // Find all assets with 'pending-image:' tag
        const pendingAssets = currentProject.assets.filter(asset =>
            asset.tag && asset.tag.startsWith('pending-image:')
        );

        pendingAssets.forEach(asset => {
            const taskId = asset.tag!.split(':')[1];

            // If already polling this task, skip
            if (pollingIntervals.current[taskId]) return;

            console.log(`[ImagePoller] Starting poll for task: ${taskId}`);

            // Start polling
            pollingIntervals.current[taskId] = setInterval(async () => {
                try {
                    const currentKieKey = useSettingsStore.getState().kieKey;

                    if (!currentKieKey) {
                        console.warn('[ImagePoller] No KIE Key found, skipping poll');
                        return;
                    }

                    const response = await fetch(`/api/image-generation/${taskId}`, {
                        headers: {
                            'x-kie-key': currentKieKey,
                        }
                    });

                    if (response.status === 401) {
                        console.error('[ImagePoller] 401 Unauthorized. Key might be invalid.');
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];
                        return;
                    }

                    // Stop polling if task not found (404, 422, etc.)
                    if (response.status === 422 || response.status === 404) {
                        console.warn(`[ImagePoller] Task ${taskId} not found, stopping poll`);
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];
                        
                        await updateAsset(asset.id, {
                            tag: 'error: Task expired or not found',
                            title: `(Expired) ${asset.title}`
                        });
                        return;
                    }

                    if (!response.ok) return;

                    const statusData = await response.json();
                    console.log(`[ImagePoller] Status for ${taskId}:`, statusData);

                    // Check if data exists
                    if (!statusData.data) {
                        console.log('[ImagePoller] No data yet, still pending');
                        return;
                    }

                    const state = statusData.data.state;

                    if (state === 'success') {
                        // Clear interval
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];

                        let imageUrl = null;
                        const resultJsonStr = statusData.data.resultJson;

                        if (resultJsonStr && resultJsonStr.trim() !== '') {
                            try {
                                const resultJson = JSON.parse(resultJsonStr);
                                imageUrl = resultJson.resultUrls?.[0] || resultJson.url || resultJson.image_url;
                            } catch (e) {
                                console.error('[ImagePoller] Failed to parse resultJson:', e);
                            }
                        }

                        if (imageUrl) {
                            // Update Asset
                            await updateAsset(asset.id, {
                                url: imageUrl,
                                tag: 'completed',
                                title: asset.title.replace('(생성 중...)', '')
                            });

                            // Update Scene if linked
                            if (asset.sceneNumber !== undefined && asset.sceneNumber !== null) {
                                updateScene(asset.sceneNumber, {
                                    imageUrl: imageUrl
                                });
                            }

                            toast.success('이미지 생성이 완료되었습니다!');
                        } else {
                            await updateAsset(asset.id, {
                                tag: 'error: No image URL received',
                                title: `(Failed) ${asset.title}`
                            });
                            toast.error('이미지 URL을 받지 못했습니다.');
                        }
                    } else if (state === 'fail') {
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];

                        await updateAsset(asset.id, {
                            tag: `error: ${statusData.data.failMsg || 'Generation failed'}`,
                            title: `(Failed) ${asset.title}`
                        });

                        console.error(`[ImagePoller] Task ${taskId} failed`);
                        toast.error(`이미지 생성 실패: ${statusData.data.failMsg || 'Unknown error'}`);
                    }
                    // else: state === 'waiting', continue polling
                } catch (error) {
                    console.error(`[ImagePoller] Error polling task ${taskId}:`, error);
                }
            }, 3000); // Poll every 3 seconds
        });

        // Cleanup function
        return () => {
            Object.values(pollingIntervals.current).forEach(clearInterval);
            pollingIntervals.current = {};
        };
    }, [currentProject?.assets]); // Re-run when assets change
}

