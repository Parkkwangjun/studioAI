import { NextResponse } from 'next/server';
import * as fal from '@fal-ai/serverless-client';
import OpenAI from 'openai';
import { uploadAssetFromUrl } from '@/lib/supabase/storage';

async function optimizePromptForFlux(koreanPrompt: string, openaiKey: string): Promise<string> {
    const openai = new OpenAI({ apiKey: openaiKey });

    try {
        console.log('🎨 Optimizing image prompt using JSON Style Guide...');
        console.log('Original Prompt (KR):', koreanPrompt);

        const systemPrompt = `You are an expert AI image generation prompt engineer using JSON Style Guides for FLUX models.

Your task: Transform Korean prompts into structured JSON format, then convert to optimized English prompts.

CRITICAL: JSON STYLE GUIDE STRUCTURE (15 Parameters)
1. **scene**: Overall setting/environment
2. **subjects**: Array of key subjects with detailed attributes
3. **style**: Artistic rendering
4. **color_palette**: Array of dominant colors
5. **lighting**: Light source and quality
6. **mood**: Emotional atmosphere
7. **background**: Scenery/backdrop details
8. **composition**: Layout rules
9. **camera**: Virtual photography settings
10. **medium**: Simulated format
11. **textures**: Surface qualities
12. **resolution**: Output quality
13. **details**: Fine-tuned attributes
14. **effects**: Visual treatments
15. **inspirations**: Style references

VISUAL-ONLY RULES:
❌ NO text overlays, captions, typography, written words, logos, watermarks
✅ ONLY visual elements, composition, aesthetics

CONVERSION PROCESS:
1. Analyze Korean prompt
2. Structure into JSON format with relevant parameters
3. Convert JSON to natural English prompt
4. Enhance with technical photography/art terms

OUTPUT FORMAT:
Return ONLY the optimized English prompt as a single flowing paragraph. Do NOT output JSON. Do NOT add explanations.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: koreanPrompt }
            ],
            temperature: 0.7,
        });

        const optimizedPrompt = completion.choices[0].message.content?.trim() || koreanPrompt;
        console.log('Optimized Prompt (EN):', optimizedPrompt);
        return optimizedPrompt;
    } catch (error) {
        console.error('❌ Prompt optimization failed:', error);
        return koreanPrompt;
    }
}

export async function POST(request: Request) {
    try {
        const { prompt, imageSize, guidanceScale, model } = await request.json();

        // Get API keys from headers (BYOK) or Fallback to Server Env
        const userFalKey = request.headers.get('x-fal-key') || process.env.FAL_KEY;
        const userOpenAiKey = request.headers.get('x-openai-key') || process.env.OPENAI_API_KEY;

        if (!userFalKey) {
            return NextResponse.json({ error: 'FAL API Key is missing' }, { status: 401 });
        }

        if (!userOpenAiKey) {
            return NextResponse.json({ error: 'OpenAI API Key is missing' }, { status: 401 });
        }

        // Configure Fal.ai client with user's key
        fal.config({ credentials: userFalKey });

        console.log('\n=== IMAGE GENERATION REQUEST START ===');
        console.log('Original Prompt:', prompt);
        console.log('Model:', model);

        if (!prompt || prompt.trim() === '') {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Optimize using JSON Style Guide methodology
        const optimizedEnglishPrompt = await optimizePromptForFlux(prompt.trim(), userOpenAiKey);

        // Determine model ID and parameters based on selection
        const modelId = model === 'schnell' ? 'fal-ai/flux/schnell' : 'fal-ai/flux/dev';
        const numInferenceSteps = model === 'schnell' ? 4 : 28;

        const falInput = {
            prompt: optimizedEnglishPrompt,
            image_size: imageSize || "landscape_16_9",
            guidance_scale: guidanceScale || 3.5,
            num_inference_steps: numInferenceSteps,
            enable_safety_checker: true
        };

        console.log('Calling Fal.ai API:', modelId);
        const startTime = Date.now();

        const result = await fal.subscribe(modelId, {
            input: falInput,
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === 'IN_PROGRESS') {
                    console.log('📊 Progress:', update.logs.map((log) => log.message).join('\n'));
                }
            },
        });

        const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);

        // Fix for TypeScript error: define interface for result
        interface FalResult {
            images: Array<{ url: string }>;
            seed: number;
            requestId: string;
        }
        const data = result as unknown as FalResult;

        if (!data.images || data.images.length === 0) {
            throw new Error('No images generated');
        }

        let imageUrl = data.images[0].url;
        const seed = data.seed;

        // Upload to Supabase Storage for permanence
        try {
            console.log('💾 Uploading image to Supabase Storage...');
            const permanentUrl = await uploadAssetFromUrl(imageUrl, 'images');
            console.log('✅ Upload complete:', permanentUrl);
            imageUrl = permanentUrl;
        } catch (uploadError) {
            console.error('⚠️ Storage upload failed, using temporary URL:', uploadError);
        }

        return NextResponse.json({
            imageUrl,
            originalPrompt: prompt,
            optimizedPrompt: optimizedEnglishPrompt,
            seed: seed,
            generationTime: generationTime,
            requestId: data.requestId,
            model: modelId
        });

    } catch (error) {
        console.error('❌ IMAGE GENERATION ERROR:', error);
        return NextResponse.json({
            error: 'Failed to generate image',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
