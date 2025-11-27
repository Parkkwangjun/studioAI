import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import toast from 'react-hot-toast';

/**
 * Poller for audio generation tasks in scenes
 * Handles scenes with audioUrl starting with 'pending-audio:taskId'
 */
export function useAudioGenerationPoller() {
    const { currentProject, updateScene, saveCurrentProject } = useProjectStore();
    const pollingIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

    useEffect(() => {
        if (!currentProject) return;

        // Find all scenes with pending audio generation
        const pendingScenes = currentProject.scenes.filter(scene =>
            scene.audioUrl && scene.audioUrl.startsWith('pending-audio:')
        );

        pendingScenes.forEach(scene => {
            const taskId = scene.audioUrl!.replace('pending-audio:', '');

            // If already polling this task, skip
            if (pollingIntervals.current[taskId]) return;

            console.log(`[AudioGenerationPoller] Starting poll for task: ${taskId} (scene ${scene.id})`);

            // Start polling
            pollingIntervals.current[taskId] = setInterval(async () => {
                try {
                    const currentKieKey = useSettingsStore.getState().kieKey;

                    if (!currentKieKey) {
                        console.warn('[AudioGenerationPoller] No KIE Key found, skipping poll');
                        return;
                    }

                    const response = await fetch(`/api/audio-generation/${taskId}`, {
                        headers: {
                            'x-kie-key': currentKieKey,
                        }
                    });

                    if (response.status === 401) {
                        console.error('[AudioGenerationPoller] 401 Unauthorized');
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];
                        return;
                    }

                    if (response.status === 422 || response.status === 404) {
                        console.warn(`[AudioGenerationPoller] Task ${taskId} not found`);
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];
                        
                        await updateScene(scene.id, {
                            audioUrl: undefined // Clear pending state
                        });
                        await saveCurrentProject();
                        toast.error('오디오 생성 작업이 만료되었습니다.');
                        return;
                    }

                    if (!response.ok) return;

                    const statusData = await response.json();
                    console.log(`[AudioGenerationPoller] Status for ${taskId}:`, statusData);

                    if (!statusData.data) {
                        console.log('[AudioGenerationPoller] No data yet, still pending');
                        return;
                    }

                    const state = statusData.data.state?.toLowerCase();

                    if (state === 'success') {
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];

                        let audioUrl = null;
                        const resultJsonStr = statusData.data.resultJson;

                        if (resultJsonStr && resultJsonStr.trim() !== '') {
                            try {
                                const resultJson = JSON.parse(resultJsonStr);
                                audioUrl = resultJson.resultUrls?.[0] 
                                    || resultJson.url 
                                    || resultJson.audio_url
                                    || resultJson.audioUrl;
                            } catch (e) {
                                console.error('[AudioGenerationPoller] Failed to parse resultJson:', e);
                            }
                        }

                        if (audioUrl) {
                            // Fetch audio and convert to base64 for consistency
                            try {
                                const audioRes = await fetch(audioUrl);
                                const arrayBuffer = await audioRes.arrayBuffer();
                                
                                // Convert ArrayBuffer to base64 (client-side compatible)
                                const bytes = new Uint8Array(arrayBuffer);
                                let binary = '';
                                for (let i = 0; i < bytes.byteLength; i++) {
                                    binary += String.fromCharCode(bytes[i]);
                                }
                                const base64Audio = btoa(binary);
                                const dataUrl = `data:audio/mp3;base64,${base64Audio}`;

                                await updateScene(scene.id, {
                                    audioUrl: dataUrl
                                });
                                await saveCurrentProject();

                                toast.success('오디오 생성이 완료되었습니다!');
                            } catch (error) {
                                console.error('[AudioGenerationPoller] Failed to fetch audio:', error);
                                // Fallback: use original URL directly
                                await updateScene(scene.id, {
                                    audioUrl: audioUrl
                                });
                                await saveCurrentProject();
                                toast.success('오디오 생성이 완료되었습니다!');
                            }
                        } else {
                            await updateScene(scene.id, {
                                audioUrl: undefined // Clear pending state
                            });
                            await saveCurrentProject();
                            toast.error('오디오 URL을 받지 못했습니다.');
                        }
                    } else if (state === 'fail') {
                        clearInterval(pollingIntervals.current[taskId]);
                        delete pollingIntervals.current[taskId];

                        await updateScene(scene.id, {
                            audioUrl: undefined // Clear pending state
                        });
                        await saveCurrentProject();

                        console.error(`[AudioGenerationPoller] Task ${taskId} failed`);
                        toast.error(`오디오 생성 실패: ${statusData.data.failMsg || 'Unknown error'}`);
                    }
                    // else: state === 'waiting', continue polling
                } catch (error) {
                    console.error(`[AudioGenerationPoller] Error polling task ${taskId}:`, error);
                }
            }, 3000); // Poll every 3 seconds
        });

        // Cleanup function
        return () => {
            Object.values(pollingIntervals.current).forEach(clearInterval);
            pollingIntervals.current = {};
        };
    }, [currentProject?.scenes]); // Re-run when scenes change
}

