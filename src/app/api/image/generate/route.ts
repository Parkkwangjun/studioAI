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
   - type, description, position, pose, size, expression, interaction
3. **style**: Artistic rendering (photorealistic, watercolor, digital painting, etc.)
4. **color_palette**: Array of dominant colors
5. **lighting**: Light source and quality (golden hour, soft studio, dramatic backlight)
6. **mood**: Emotional atmosphere (peaceful, dramatic, heroic, whimsical)
7. **background**: Scenery/backdrop details
8. **composition**: Layout rules (rule of thirds, symmetrical, centered)
9. **camera**: Virtual photography settings
   - angle, distance, lens, focus
10. **medium**: Simulated format (oil painting, 3D render, photography)
11. **textures**: Surface qualities (soft velvet, rusty metal, smooth glass)
12. **resolution**: Output quality (4K, 8K, high resolution)
13. **details**: Fine-tuned attributes (clothing, weather, facial features, materials)
14. **effects**: Visual treatments (bokeh blur, lens flare, film grain)
15. **inspirations**: Style references (Studio Ghibli, Van Gogh, Blade Runner)

VISUAL-ONLY RULES:
❌ NO text overlays, captions, typography, written words, logos, watermarks
✅ ONLY visual elements, composition, aesthetics

CONVERSION PROCESS:
1. Analyze Korean prompt
2. Structure into JSON format with relevant parameters
3. Convert JSON to natural English prompt
4. Enhance with technical photography/art terms

EXAMPLE:

INPUT (Korean): "바다 배경에서 60대 한국 노인이 미소짓는 모습"

INTERNAL JSON STRUCTURE:
{
  "scene": "serene coastal setting at golden hour",
  "subjects": [{
    "type": "Korean elder",
    "description": "dignified person in their 60s with warm smile and wise eyes",
    "pose": "standing gracefully with hands clasped",
    "expression": "gentle, contemplative smile",
    "position": "center-right, rule of thirds"
  }],
  "style": "professional portrait photography",
  "color_palette": ["warm earth tones", "soft blues", "golden highlights"],
  "lighting": "soft natural golden hour light, warm glow on face",
  "mood": "peaceful, contemplative, serene",
  "background": "calm ocean with gentle waves, distant horizon",
  "composition": "rule of thirds, portrait orientation",
  "camera": {
    "angle": "eye-level",
    "distance": "medium close-up",
    "lens": "85mm portrait lens",
    "focus": "shallow depth of field f/2.8, sharp subject, soft bokeh background"
  },
  "medium": "professional photography",
  "textures": "soft skin, flowing fabric, smooth water",
  "resolution": "8K, highly detailed",
  "details": {
    "clothing": "traditional or contemporary Korean attire with subtle patterns",
    "facial_features": "natural wrinkles showing wisdom, kind eyes",
    "cultural_authenticity": "respectful Korean representation"
  },
  "effects": "natural bokeh, subtle vignette",
  "inspirations": "award-winning portrait photography, National Geographic style"
}

OUTPUT (Optimized English Prompt):
"A dignified Korean elder in their 60s with a warm, gentle smile and wise eyes, standing gracefully with hands clasped in center-right composition following rule of thirds, serene coastal setting with calm ocean and gentle waves in background, soft natural golden hour lighting casting warm glow on face, professional portrait photography shot with 85mm lens at f/2.8 for shallow depth of field creating soft bokeh, peaceful and contemplative mood, color palette of warm earth tones and soft blues with golden highlights, traditional Korean attire with subtle patterns, natural facial features showing wisdom and kindness, smooth water textures, 8K resolution, highly detailed, award-winning photography style, photorealistic, sharp focus on subject, no text or captions"

CRITICAL RULES:
- Use ALL relevant JSON parameters
- Convert to natural flowing English (not JSON output)
- Include technical photography terms
- Specify camera settings, lighting, composition
- Add quality markers (8K, professional, award-winning)
- Always end with "no text or captions"

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

        console.log('\n--- JSON Style Guide Optimization Result ---');
        console.log('Optimized Prompt (EN):', optimizedPrompt);
        console.log('Character count:', optimizedPrompt.length);
        console.log('✅ Optimization complete\n');

        return optimizedPrompt;
    } catch (error) {
        console.error('❌ Prompt optimization failed:', error);
        console.error('Falling back to simple translation...');

        try {
            const fallbackCompletion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Translate Korean to English for professional image generation. Focus on visual details."
                    },
                    { role: "user", content: koreanPrompt }
                ],
                temperature: 0.3,
            });
            return fallbackCompletion.choices[0].message.content?.trim() || koreanPrompt;
        } catch (fallbackError) {
            console.error('❌ Fallback failed, using original:', fallbackError);
            return koreanPrompt;
        }
    }
}

export async function POST(request: Request) {
    try {
        const { prompt, imageSize, guidanceScale, model } = await request.json();

        // Get API keys from headers (BYOK)
        const userFalKey = request.headers.get('x-fal-key');
        const userOpenAiKey = request.headers.get('x-openai-key');

        if (!userFalKey) {
            return NextResponse.json(
                { error: '설정에서 FAL API 키를 먼저 입력해주세요.' },
                { status: 401 }
            );
        }

        if (!userOpenAiKey) {
            return NextResponse.json(
                { error: '설정에서 OpenAI API 키를 먼저 입력해주세요.' },
                { status: 401 }
            );
        }

        // Configure Fal.ai client with user's key
        fal.config({ credentials: userFalKey });

        console.log('\\n========================================');
        console.log('=== IMAGE GENERATION REQUEST START ===');
        console.log('========================================');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Original Prompt (KR):', prompt);
        console.log('Image Size:', imageSize);
        console.log('Guidance Scale:', guidanceScale);
        console.log('Model:', model);

        if (!prompt || prompt.trim() === '') {
            console.error('❌ ERROR: Empty prompt received');
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Optimize using JSON Style Guide methodology
        const optimizedEnglishPrompt = await optimizePromptForFlux(prompt.trim(), userOpenAiKey);

        // Determine model ID and parameters based on selection
        const modelId = model === 'schnell' ? 'fal-ai/flux/schnell' : 'fal-ai/flux/dev';
        const numInferenceSteps = model === 'schnell' ? 4 : 28; // Schnell uses 4, Dev uses 28

        const falInput = {
            prompt: optimizedEnglishPrompt,
            image_size: imageSize || "landscape_16_9",
            guidance_scale: guidanceScale || 3.5,
            num_inference_steps: numInferenceSteps,
            enable_safety_checker: true
        };

        console.log('\n--- Fal.ai Request Payload ---');
        console.log('Model ID:', modelId);
        console.log(JSON.stringify(falInput, null, 2));

        console.log('\n--- Calling Fal.ai FLUX API ---');
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

        console.log('\n--- Fal.ai Response ---');
        console.log('Generation time:', generationTime, 'seconds');

        interface FalResult {
            images: Array<{
                url: string;
            }>;
            seed: number;
            requestId: string;
        }

        const data = result as unknown as FalResult;

        if (!data.images || data.images.length === 0) {
            console.error('❌ ERROR: No images in response');
            return NextResponse.json({ error: 'No images generated' }, { status: 500 });
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

        console.log('\n--- Generation Success ---');
        console.log('✅ Image URL:', imageUrl);
        console.log('✅ Seed:', seed);
        console.log('✅ Model:', modelId);
        console.log('✅ Original Prompt (KR):', prompt);
        console.log('✅ Optimized Prompt (EN):', optimizedEnglishPrompt);
        console.log('========================================\n');

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
        console.error('\n========================================');
        console.error('❌ IMAGE GENERATION ERROR');
        console.error('========================================');
        console.error('Error:', error);
        console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('Error stack:', error instanceof Error ? error.stack : undefined);
        console.error('========================================\n');

        return NextResponse.json({
            error: 'Failed to generate image',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
