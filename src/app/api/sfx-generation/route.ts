import { NextResponse } from 'next/server';

const API_URL = 'https://api.kie.ai/api/v1/jobs/createTask';

export async function POST(request: Request) {
    const apiKey = request.headers.get('x-kie-key');

    if (!apiKey) {
        return NextResponse.json({ error: '설정에서 KIE API 키를 먼저 입력해주세요.' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { text, duration, promptInfluence } = body;

        const payload = {
            model: "elevenlabs/sound-effect-v2",
            input: {
                text,
                duration_seconds: duration ? parseFloat(duration) : undefined,
                prompt_influence: 0.3 // Default value
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || 'Failed to create task' }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating SFX generation task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
