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
        console.log('=== Video Status Check ===');
        console.log('Task ID:', taskId);

        if (!userKieKey) {
            return NextResponse.json(
                { error: '설정에서 KIE API 키를 먼저 입력해주세요.' },
                { status: 401 }
            );
        }

        // CORRECT ENDPOINT: /recordInfo not /getTask
        const url = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`;
        console.log('Requesting:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${userKieKey}`
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('KIE API Error Response:', errorText);
            throw new Error(`KIE API returned ${response.status}: ${errorText}`);
        }

        const apiResponse = await response.json();
        console.log('KIE API Response:', JSON.stringify(apiResponse, null, 2));

        // KIE API response structure: { code: 200, msg: "success", data: { state, resultJson, ... } }
        if (apiResponse.code !== 200) {
            throw new Error(`KIE API error: ${apiResponse.msg}`);
        }

        const data = apiResponse.data;
        const state = data.state; // "waiting", "success", "fail"

        console.log('Task state:', state);

        if (state === 'success') {
            // Parse resultJson to get video URL
            const resultJson = JSON.parse(data.resultJson);
            let videoUrl = resultJson.resultUrls?.[0];

            console.log('Video URL:', videoUrl);

            // Upload to Supabase Storage for permanence
            try {
                console.log('💾 Uploading video to Supabase Storage...');
                const permanentUrl = await uploadAssetFromUrl(videoUrl, 'videos');
                console.log('✅ Upload complete:', permanentUrl);
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
