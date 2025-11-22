import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { prompt, settings } = await request.json();

    const systemInstruction = `You are an expert scriptwriter for short-form video content.
Generate a script based on the user's prompt and settings.
Output MUST be a valid JSON object with a "script" key containing an array of scene objects.
Each scene object must have:
- "text": The narration text for the scene. This text will be used for both TTS and as the basis for image generation.

Make each scene text descriptive and visual, as it will be used to generate images.

Example Output:
{
  "script": [
    { "text": "Welcome to the future of AI. A futuristic city skyline at night with neon lights glows in the background." },
    { "text": "It's closer than you think. A close-up of a robot eye slowly opens, revealing intricate circuitry." }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || '{"script":[]}';
    const parsed = JSON.parse(responseText);

    // Handle both {script: [...]} and direct array formats
    const script = Array.isArray(parsed) ? parsed : (parsed.script || []);

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Script generation error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      apiKey: process.env.OPENAI_API_KEY ? 'Present' : 'Missing'
    });
    return NextResponse.json({
      error: 'Failed to generate script',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
