import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.kie.ai/api/v1/jobs/getTask';

export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
    const apiKey = request.headers.get('x-kie-key');
    if (!apiKey) {
        return NextResponse.json({ error: 'KIE API key required' }, { status: 401 });
    }

    try {
        const { taskId } = await params;
        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const response = await fetch(`${API_BASE_URL}?taskId=${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[AudioGeneration] KIE API error:', errorText);
            return NextResponse.json({ error: 'Failed to check task status' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('[AudioGeneration] Error fetching task status:', error);
        return NextResponse.json({
            error: 'Failed to check task status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

