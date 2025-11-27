import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import toast from 'react-hot-toast';

/**
 * Unified poller for SFX and BGM generation tasks
 * Handles both 'pending-sfx:taskId' and 'pending-bgm:taskId' tags
 */
export function useAudioTaskPoller() {
    const { currentProject, updateAsset } = useProjectStore();
    const pollingIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

    useEffect(() => {
        if (!currentProject) return;

        // Find all assets with 'pending-sfx:' or 'pending-bgm:' tag
        const pendingAssets = currentProject.assets.filter(asset =>
            asset.tag && (asset.tag.startsWith('pending-sfx:') || asset.tag.startsWith('pending-bgm:'))
        );

        pendingAssets.forEach(asset => {
            const [type, taskId] = asset.tag!.split(':');
            const assetType = type === 'pending-sfx' ? 'SFX' : 'BGM';

            // If already polling this task, skip
            if (pollingIntervals.current[taskId]) return;

            console.log(`[${assetType}Poller] Starting poll for task: ${taskId}`);

            // Start polling
            pollingIntervals.current[taskId] = setInterval(async () => {
                try {
                    const currentKieKey = useSettingsStore.getState().kieKey;

                    if (!currentKieKey) {
                        console.warn(`[${assetType}Poller] No KIE Key found, skipping poll`);
                        return;
                    }

                    // BGM and SFX use different endpoints
                    const endpoint = type === 'pending-bgm' 
                        ? `/api/bgm-generation/${taskId}`
                        : `/api/sfx-generation/${taskId}`;
                    
                    const response = await fetch(endpoint, {
                        headers: {
                            'x-kie-key': currentKieKey,
                        }
                    });

                    if (response.status === 401) {
                        console.error(`[${assetType}Poller] 401 Unauthorized`);
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];
                        return;
                    }

                    if (response.status === 422 || response.status === 404) {
                        console.warn(`[${assetType}Poller] Task ${taskId} not found`);
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
                    console.log(`[${assetType}Poller] Status for ${taskId}:`, statusData);

                    if (!statusData.data) {
                        console.log(`[${assetType}Poller] No data yet, still pending`);
                        return;
                    }

                    // Handle BGM (Suno AI) special response format
                    if (type === 'pending-bgm') {
                        const status = statusData.data.status;
                        
                        if (status === 'SUCCESS' || status === 'FIRST_SUCCESS') {
                            clearInterval(pollingIntervals.current[taskId]);
                            delete pollingIntervals.current[taskId];

                            const tracks = statusData.data.response?.sunoData;
                            
                            if (tracks && tracks.length > 0) {
                                // Update first track to existing pending asset
                                const firstTrack = tracks[0];
                                await updateAsset(asset.id, {
                                    url: firstTrack.audioUrl,
                                    tag: 'bgm',
                                    title: firstTrack.title || asset.title.replace('(생성 중...)', ''),
                                    duration: firstTrack.duration
                                });

                                // Add remaining tracks as new assets
                                const { addAsset: addNewAsset, saveCurrentProject } = useProjectStore.getState();
                                for (let i = 1; i < tracks.length; i++) {
                                    const track = tracks[i];
                                    await addNewAsset({
                                        type: 'bgm',
                                        title: track.title || `BGM Track ${i + 1}`,
                                        url: track.audioUrl,
                                        tag: 'bgm',
                                        sceneNumber: 0,
                                        duration: track.duration
                                    });
                                }

                                // Save all changes to Supabase
                                await saveCurrentProject();

                                toast.success(`${tracks.length}개의 배경음악이 생성되었습니다!`);
                            } else {
                                await updateAsset(asset.id, {
                                    tag: 'error: No tracks received',
                                    title: `(Failed) ${asset.title}`
                                });
                                toast.error('배경음악 트랙을 받지 못했습니다.');
                            }
                        } else if (status === 'GENERATE_AUDIO_FAILED' || status === 'CREATE_TASK_FAILED') {
                            clearInterval(pollingIntervals.current[taskId]);
                            delete pollingIntervals.current[taskId];

                            await updateAsset(asset.id, {
                                tag: `error: ${statusData.data.errorMessage || 'Generation failed'}`,
                                title: `(Failed) ${asset.title}`
                            });

                            toast.error(`배경음악 생성 실패: ${statusData.data.errorMessage || 'Unknown error'}`);
                        }
                        return;
                    }

                    // Handle SFX (standard KIE API response)
                    const state = statusData.data.state;

                    if (state === 'success') {
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];

                        let audioUrl = null;
                        const resultJsonStr = statusData.data.resultJson;

                        if (resultJsonStr && resultJsonStr.trim() !== '') {
                            try {
                                const resultJson = JSON.parse(resultJsonStr);
                                // Audio URL might be in different fields
                                audioUrl = resultJson.resultUrls?.[0] 
                                    || resultJson.url 
                                    || resultJson.audio_url
                                    || resultJson.audioUrl;
                            } catch (e) {
                                console.error(`[${assetType}Poller] Failed to parse resultJson:`, e);
                            }
                        }

                        if (audioUrl) {
                            await updateAsset(asset.id, {
                                url: audioUrl,
                                tag: 'sfx',
                                title: asset.title.replace('(생성 중...)', '')
                            });
                            toast.success(`${assetType} 생성이 완료되었습니다!`);
                        } else {
                            await updateAsset(asset.id, {
                                tag: 'error: No audio URL received',
                                title: `(Failed) ${asset.title}`
                            });
                            toast.error(`${assetType} URL을 받지 못했습니다.`);
                        }
                    } else if (state === 'fail') {
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];

                        await updateAsset(asset.id, {
                            tag: `error: ${statusData.data.failMsg || 'Generation failed'}`,
                            title: `(Failed) ${asset.title}`
                        });

                        console.error(`[${assetType}Poller] Task ${taskId} failed`);
                        toast.error(`${assetType} 생성 실패: ${statusData.data.failMsg || 'Unknown error'}`);
                    }
                } catch (error) {
                    console.error(`[${assetType}Poller] Error polling task ${taskId}:`, error);
                }
            }, 3000); // Poll every 3 seconds
        });

        // Cleanup function
        return () => {
            Object.values(pollingIntervals.current).forEach(clearInterval);
            pollingIntervals.current = {};
        };
    }, [currentProject?.assets]);
}

