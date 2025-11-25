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



        if (!userKieKey) {
            return NextResponse.json(
                { error: '설정에서 KIE API 키를 먼저 입력해주세요.' },
                { status: 401 }
            );
        }

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



        if (!response.ok) {
            const errorText = await response.text();
            console.error('KIE API Error Response:', errorText);
            throw new Error(`KIE API returned ${response.status}: ${errorText}`);
        }

        const apiResponse = await response.json();


        // KIE API response structure: { code: 200, msg: "success", data: { state, resultJson, ... } }
        if (apiResponse.code !== 200) {
            // If code is not 200, it might be a pending state or an error, but check msg
            console.warn('KIE API Code not 200:', apiResponse);
            if (apiResponse.msg === 'recordInfo is null') {
                // This usually means the task ID is invalid or not found yet. 
                // We can return 'pending' or 'failed' depending on how long it's been.
                // For now, let's return pending to avoid breaking the client loop immediately, 
                // or failed if we want to stop. Given the user's report of infinite loop, 
                // maybe returning 'failed' with a specific error is better if it persists.
                // But if it's just slow propagation, pending is safer. 
                // However, "recordInfo is null" usually means it doesn't exist.
                return NextResponse.json({ status: 'failed', error: 'Task not found (recordInfo is null)' });
            }
            throw new Error(`KIE API error: ${apiResponse.msg}`);
        }

        const data = apiResponse.data;
        if (!data) {
            return NextResponse.json({ status: 'failed', error: 'No data received from KIE' });
        }

        const state = data.state; // "waiting", "success", "fail"



        if (state === 'success') {
            // Parse resultJson to get video URL
            const resultJson = JSON.parse(data.resultJson);
            let videoUrl = resultJson.resultUrls?.[0];



            // Upload to Supabase Storage for permanence
            try {

                const permanentUrl = await uploadAssetFromUrl(videoUrl, 'videos');

                videoUrl = permanentUrl;
            } catch (uploadError) {
                console.error('⚠️ Storage upload failed, using temporary URL:', uploadError);
            }

            return NextResponse.json({
                status: 'completed',
                videoUrl: videoUrl
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
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            taskId,
            hasApiKey: !!userKieKey
        });
        return NextResponse.json({
            error: 'Failed to check status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
