import { NextResponse } from 'next/server';
import * as fal from '@fal-ai/serverless-client';
import OpenAI from 'openai';
import { uploadAssetFromUrl } from '@/lib/supabase/storage';

async function optimizePromptForFlux(koreanPrompt: string, openaiKey: string): Promise<string> {
    const openai = new OpenAI({ apiKey: openaiKey });

    try {



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

        return optimizedPrompt;
    } catch (error) {
        console.error('❌ Prompt optimization failed:', error);
        return koreanPrompt;
    }
}

export async function POST(request: Request) {
    try {
        const { prompt, imageSize, guidanceScale, model, resolution, referenceImages } = await request.json();

        // Get API keys from headers (BYOK)
        const userFalKey = request.headers.get('x-fal-key');
        const userOpenAiKey = request.headers.get('x-openai-key');
        const userKieKey = request.headers.get('x-kie-key');

        if (!userFalKey) {
            return NextResponse.json({ error: '설정에서 FAL API 키를 먼저 입력해주세요.' }, { status: 401 });
        }

        if (!userOpenAiKey) {
            return NextResponse.json({ error: '설정에서 OpenAI API 키를 먼저 입력해주세요.' }, { status: 401 });
        }

        // Configure Fal.ai client with user's key
        fal.config({ credentials: userFalKey });

        if (!prompt || prompt.trim() === '') {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Optimize using JSON Style Guide methodology
        const optimizedEnglishPrompt = await optimizePromptForFlux(prompt.trim(), userOpenAiKey);

        let imageUrl = null;
        let seed = null;
        let generationTime = null;
        let requestId = null;
        let modelId = model;

        if (model === 'nanobanana') {
            if (!userKieKey) {
                return NextResponse.json({ error: '설정에서 KIE API 키를 먼저 입력해주세요.' }, { status: 401 });
            }

            // Map aspect ratio
            let aspectRatio = "16:9";
            if (imageSize === "portrait_16_9") aspectRatio = "9:16";
            if (imageSize === "square_hd") aspectRatio = "1:1";
            if (imageSize === "landscape_4_3") aspectRatio = "4:3";

            const payload: any = {
                model: "nano-banana-pro",
                input: {
                    prompt: optimizedEnglishPrompt,
                    aspect_ratio: aspectRatio,
                    resolution: resolution || "1K",
                    output_format: "png"
                }
            };

            // Only add image_input if there are reference images
            if (referenceImages && referenceImages.length > 0) {
                payload.input.image_input = referenceImages;
                console.log(`[Nano Banana] Using ${referenceImages.length} reference images`);
            } else {
                console.log('[Nano Banana] Text-to-Image mode (no reference images)');
            }

            console.log('[Nano Banana] Payload:', JSON.stringify(payload, null, 2));

            const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userKieKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Kie.ai API failed');
            const apiResponse = await response.json();
            if (apiResponse.code !== 200) throw new Error(apiResponse.msg);

            const taskId = apiResponse.data.taskId;

            // Return taskId immediately for client-side polling
            return NextResponse.json({
                status: 'pending',
                taskId,
                originalPrompt: prompt,
                optimizedPrompt: optimizedEnglishPrompt,
                model: modelId
            });

        } else {
            // FAL.ai Logic
            modelId = model === 'schnell' ? 'fal-ai/flux/schnell' : 'fal-ai/flux/dev';
            const numInferenceSteps = model === 'schnell' ? 4 : 28;

            const falInput = {
                prompt: optimizedEnglishPrompt,
                image_size: imageSize || "landscape_16_9",
                guidance_scale: guidanceScale || 3.5,
                num_inference_steps: numInferenceSteps,
                enable_safety_checker: true
            };

            const startTime = Date.now();

            const result = await fal.subscribe(modelId, {
                input: falInput,
                logs: true,
                onQueueUpdate: (update) => {
                    // Logs removed
                },
            });

            generationTime = ((Date.now() - startTime) / 1000).toFixed(2);

            interface FalResult {
                images: Array<{ url: string }>;
                seed: number;
                requestId: string;
            }
            const data = result as unknown as FalResult;

            if (!data.images || data.images.length === 0) {
                throw new Error('No images generated');
            }

            imageUrl = data.images[0].url;
            seed = data.seed;
            requestId = data.requestId;
        }

        // Upload to Supabase Storage for permanence
        try {
            if (imageUrl) {
                const permanentUrl = await uploadAssetFromUrl(imageUrl, 'images');
                imageUrl = permanentUrl;
            }
        } catch (uploadError) {
            console.error('⚠️ Storage upload failed, using temporary URL:', uploadError);
        }

        return NextResponse.json({
            imageUrl,
            originalPrompt: prompt,
            optimizedPrompt: optimizedEnglishPrompt,
            seed,
            generationTime,
            requestId,
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
