import { NextResponse } from 'next/server';

const API_KEY = process.env.NANOBANANA_API_KEY;
const API_URL = 'https://api.kie.ai/api/v1/jobs/createTask';

export async function POST(request: Request) {
    if (!API_KEY) {
        return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { prompt, aspectRatio, resolution, model } = body;

        const payload = {
            model: model || "nano-banana-pro",
            input: {
                prompt,
                aspect_ratio: aspectRatio || "1:1",
                resolution: resolution || "1K",
                output_format: "png"
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || 'Failed to create task' }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating image generation task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
