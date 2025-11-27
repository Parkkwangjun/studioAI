import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;
        const kieKey = request.headers.get('x-kie-key');

        if (!kieKey) {
            return NextResponse.json({ error: 'KIE API key required' }, { status: 401 });
        }

        const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
            headers: {
                'Authorization': `Bearer ${kieKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('KIE API error:', errorText);
            return NextResponse.json({ error: 'Failed to check task status' }, { status: response.status });
        }

        const data = await response.json();
        console.log('[Image-Generation Status] Raw KIE Response:', JSON.stringify(data, null, 2));
        return NextResponse.json(data);

    } catch (error) {
        console.error('Task status check error:', error);
        return NextResponse.json({
            error: 'Failed to check task status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
