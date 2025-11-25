import { NextResponse } from 'next/server';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const API_BASE_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
    const apiKey = request.headers.get('x-kie-key');
    if (!apiKey) {
        return NextResponse.json({ error: 'API Key not configured' }, { status: 401 });
    }

    try {
        const { taskId } = await params;
        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const response = await fetch(`${API_BASE_URL}?taskId=${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.msg || 'Failed to fetch task status' }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching task status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
