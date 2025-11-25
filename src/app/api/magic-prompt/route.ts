import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const apiKey = request.headers.get('x-openai-key');

    if (!apiKey) {
        return NextResponse.json({ error: 'OpenAI API Key is required' }, { status: 401 });
    }

    try {
        const { prompt, type } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        let systemInstruction = "You are an expert prompt engineer.";

        switch (type) {
            case 'image':
                systemInstruction += " Refine the following prompt for AI image generation (like Midjourney, Flux). Add details about lighting, style, composition, and quality. Keep it in English. Output ONLY the refined prompt.";
                break;
            case 'video':
                systemInstruction += " Refine the following prompt for AI video generation (like Sora, Veo). Describe the motion, camera angle, and atmosphere. Keep it in English. Output ONLY the refined prompt.";
                break;
            case 'audio':
            case 'sfx':
            case 'bgm':
                systemInstruction += " Refine the following prompt for AI audio generation. Describe the sound texture, mood, and instruments/elements. Keep it in English. Output ONLY the refined prompt.";
                break;
            case 'script':
                systemInstruction += " Refine the following topic/idea into a more structured and engaging script outline or description. If the input is Korean, output in Korean. Output ONLY the refined content.";
                break;
            default:
                systemInstruction += " Refine the following prompt to be more clear and descriptive. Output ONLY the refined prompt.";
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o', // or gpt-3.5-turbo
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'OpenAI API request failed');
        }

        const data = await response.json();
        const refinedPrompt = data.choices[0].message.content.trim();

        return NextResponse.json({ refinedPrompt });

    } catch (error) {
        console.error('Magic Prompt Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
