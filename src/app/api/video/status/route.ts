import { NextResponse } from 'next/server';
import { uploadAssetFromUrl } from '@/lib/supabase/storage';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const userKieKey = request.headers.get('x-kie-key');

    if (!userKieKey) {
        return NextResponse.json({ error: 'KIE API key missing' }, { status: 401 });
    }

    if (!taskId) {
        return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    }

    try {
        // Determine endpoint based on taskId format
        // Veo tasks usually start with "veo_task_", others (Bytedance/Grok) are typically hex strings
        const isVeoTask = taskId.startsWith('veo_task_');
        const url = isVeoTask
            ? `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`
            : `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`;

        console.log(`[VideoStatus] Checking status for ${taskId} (Is Veo: ${isVeoTask})`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${userKieKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('KIE Status Error Body:', errorText);
            throw new Error(`KIE Status API Error: ${response.status} - ${errorText}`);
        }

        const apiResponse = await response.json();
        console.log('[VideoStatus] Raw KIE Response:', JSON.stringify(apiResponse, null, 2));

        if (apiResponse.code !== 200) {
            console.warn('KIE API Code not 200:', apiResponse);
            if (apiResponse.msg?.includes('record is null')) {
                return NextResponse.json({ status: 'failed', error: 'Task not found (record is null)' });
            }
            throw new Error(`KIE API error: ${apiResponse.msg}`);
        }

        const data = apiResponse.data;
        if (!data) {
            console.log('[VideoStatus] Data is null, returning pending status');
            return NextResponse.json({ status: 'pending', message: 'Task initializing' });
        }

        let status = 'pending';
        let videoUrl: string | null = null;
        let errorMsg: string | null = null;
        let duration: number | undefined = undefined;

        if (isVeoTask) {
            // Veo Logic
            const successFlag = data.successFlag; // 0: Generating, 1: Success, 2: Failed, 3: Generation Failed
            if (successFlag === 1) {
                status = 'completed';
                videoUrl = data.response?.resultUrls?.[0] || null;
                duration = data.response?.duration;
            } else if (successFlag === 2 || successFlag === 3) {
                status = 'failed';
                errorMsg = data.errorMessage || 'Veo generation failed';
            }
        } else {
            // Jobs Logic (Bytedance/Grok)
            const state = data.state; // "waiting", "success", "fail"
            if (state === 'success') {
                status = 'completed';
                try {
                    const resultData = JSON.parse(data.resultJson);
                    videoUrl = resultData.resultUrls?.[0] || null;
                } catch (e) {
                    console.error('Failed to parse resultJson:', e);
                    status = 'failed';
                    errorMsg = 'Failed to parse video result';
                }
            } else if (state === 'fail') {
                status = 'failed';
                errorMsg = data.failMsg || 'Job generation failed';
            }
        }

        if (status === 'completed') {
            if (!videoUrl) {
                return NextResponse.json({ status: 'failed', error: 'Video completed but URL missing' });
            }

            // Upload to Supabase Storage for permanence
            try {
                const permanentUrl = await uploadAssetFromUrl(videoUrl, 'videos');
                videoUrl = permanentUrl;
            } catch (uploadError) {
                console.error('⚠️ Storage upload failed, using temporary URL:', uploadError);
            }

            return NextResponse.json({
                status: 'completed',
                videoUrl: videoUrl,
                duration: duration
            });
        } else if (status === 'failed') {
            return NextResponse.json({ status: 'failed', error: errorMsg });
        } else {
            return NextResponse.json({ status: 'pending' });
        }

    } catch (error) {
        console.error('Video status check error:', error);
        return NextResponse.json({
            error: 'Failed to check status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
