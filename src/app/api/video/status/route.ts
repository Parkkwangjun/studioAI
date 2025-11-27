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
        const url = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`;

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

        // KIE API response structure: { code: 200, msg: "success", data: { state, resultJson, ... } }
        if (apiResponse.code !== 200) {
            console.warn('KIE API Code not 200:', apiResponse);
            if (apiResponse.msg === 'recordInfo is null') {
                return NextResponse.json({ status: 'failed', error: 'Task not found (recordInfo is null)' });
            }
            throw new Error(`KIE API error: ${apiResponse.msg}`);
        }

        const data = apiResponse.data;
        if (!data) {
            return NextResponse.json({ status: 'failed', error: 'No data received from KIE' });
        }

        const state = data.state; // "waiting", "success", "fail"
        console.log(`[VideoStatus] Task ${taskId} state:`, state); // Debug Log

        if (state === 'success') {
            console.log(`[VideoStatus] Raw resultJson:`, data.resultJson); // Debug Log

            let resultJson;
            try {
                resultJson = JSON.parse(data.resultJson);
            } catch (e) {
                console.error('[VideoStatus] Failed to parse resultJson:', data.resultJson);
                return NextResponse.json({ status: 'failed', error: 'Invalid result JSON from provider' });
            }

            // Extract video URL - try multiple possible fields
            let videoUrl = resultJson.resultUrls?.[0] || resultJson.url || resultJson.video_url;
            console.log(`[VideoStatus] Extracted videoUrl:`, videoUrl); // Debug Log

            if (!videoUrl) {
                console.error('No video URL found in resultJson:', resultJson);
                return NextResponse.json({
                    status: 'failed',
                    error: 'Video generation completed but no URL was returned'
                });
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
                duration: resultJson.duration // Pass duration if available
            });
        } else if (state === 'fail') {
            console.error('Task failed:', data.failMsg);
            return NextResponse.json({
                status: 'failed',
                error: data.failMsg || 'Video generation failed'
            });
        } else {
            // state === 'waiting'
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
