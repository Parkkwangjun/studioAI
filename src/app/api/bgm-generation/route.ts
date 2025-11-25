import { NextResponse } from 'next/server';

const API_URL = 'https://api.kie.ai/api/v1/generate';

export async function POST(request: Request) {
    const apiKey = request.headers.get('x-kie-key');

    if (!apiKey) {
        return NextResponse.json({ error: '설정에서 KIE API 키를 먼저 입력해주세요.' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { prompt, instrumental, style, title, model } = body;

        const useCustomMode = !!(style || title);

        const payload = {
            prompt,
            customMode: useCustomMode,
            instrumental: instrumental ? true : false,
            model: model || "V3_5",
            style: useCustomMode ? (style || "") : undefined,
            title: useCustomMode ? (title || "") : undefined,
            callBackUrl: "https://example.com/callback"
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

        if (!response.ok || data.code !== 200) {
            return NextResponse.json({ error: data.msg || 'Failed to create task' }, { status: response.status || 500 });
        }

        if (!data.data) {
            return NextResponse.json({ error: 'No data received from KIE' }, { status: 500 });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating BGM generation task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
