import { NextResponse } from 'next/server';
import OpenAI from 'openai';

async function optimizeVideoPrompt(koreanPrompt: string, openaiKey: string): Promise<string> {
    const openai = new OpenAI({ apiKey: openaiKey });

    try {
        const systemPrompt = `You are an expert AI video generation prompt engineer.
Your task: Transform Korean prompts into structured JSON format, then convert to optimized English prompts.

CRITICAL: JSON STYLE GUIDE STRUCTURE (14 Parameters)
1. **scene**: Overall setting/environment
2. **subjects**: Array of key subjects with detailed attributes
3. **style**: Artistic rendering (cinematic, documentary, etc.)
4. **color_palette**: Array of dominant colors
5. **lighting**: Light source and quality
6. **mood**: Emotional atmosphere
7. **background**: Scenery/backdrop details
8. **composition**: Layout rules (rule of thirds, etc.)
9. **camera_movement**: Specific camera moves (pan, tilt, zoom, push-in)
10. **motion_quality**: Smoothness and realism
11. **environmental_motion**: Wind, water, background movement
12. **temporal_progression**: Changes over time
13. **effects**: Visual treatments (bokeh, motion blur)
14. **technical_specs**: Video quality (4K, 24fps)

VISUAL-ONLY RULES:
❌ NO text overlays, captions, typography, subtitles, logos
✅ ONLY visual motion, cinematography, animation

OUTPUT FORMAT:
Return ONLY the optimized English prompt as a single flowing paragraph. Do NOT output JSON.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: koreanPrompt }
            ],
            temperature: 0.7,
        });

        return completion.choices[0].message.content?.trim() || koreanPrompt;
    } catch (error) {
        console.error('❌ Video prompt optimization failed:', error);
        return koreanPrompt;
    }
}

export async function POST(request: Request) {
    try {
        const {
            imageUrl,
            imageUrls,
            startImageUrl,
            endImageUrl,
            prompt,
            model,
            mode,
            duration,
            resolution,
            aspectRatio,
            seed,
            watermark,
            generationType
        } = await request.json();

        const userKieKey = request.headers.get('x-kie-key');
        const userOpenAiKey = request.headers.get('x-openai-key');

        if (!userKieKey) {
            return NextResponse.json({ error: '설정에서 KIE API 키를 먼저 입력해주세요.' }, { status: 401 });
        }

        if (!userOpenAiKey) {
            return NextResponse.json({ error: '설정에서 OpenAI API 키를 먼저 입력해주세요.' }, { status: 401 });
        }

        const optimizedPrompt = prompt
            ? await optimizeVideoPrompt(prompt, userOpenAiKey)
            : "Animate this image with smooth, cinematic motion, natural movement, professional cinematography, 4K quality, no text or captions";

        if (model === 'veo' || model === 'veo3' || model === 'veo3_fast') {
            // Veo 3.1 Logic
            const payload: any = {
                model: model === 'veo' ? 'veo3_fast' : model, // Default to fast if generic 'veo'
                prompt: optimizedPrompt,
                aspectRatio: aspectRatio || "16:9", // Default
                enableTranslation: true
            };

            // Add optional parameters if present
            if (seed) {
                const seedNum = parseInt(seed);
                if (isNaN(seedNum) || seedNum < 10000 || seedNum > 99999) {
                    return NextResponse.json(
                        { error: 'Seed must be a number between 10000 and 99999' },
                        { status: 400 }
                    );
                }
                payload.seeds = seedNum;
            }
            if (watermark) {
                payload.watermark = watermark;
            }

            // Handle images based on generation type or inputs
            let finalImageUrls: string[] = [];

            if (generationType === 'REFERENCE_2_VIDEO') {
                // Reference Mode requires images
                if (!imageUrls || imageUrls.length === 0) {
                    return NextResponse.json(
                        { error: 'Reference mode requires at least one image. Please provide imageUrls.' },
                        { status: 400 }
                    );
                }
                
                // Reference Mode Specifics
                payload.generationType = 'REFERENCE_2_VIDEO';
                payload.model = 'veo3_fast'; // Force fast model for reference
                payload.aspectRatio = '16:9'; // Force 16:9 for reference
                finalImageUrls = imageUrls;
            } else {
                // Standard Modes (Text-to-Video, Image-to-Video, Start-End)
                if (imageUrls && imageUrls.length > 0) {
                    finalImageUrls = imageUrls;
                } else if (startImageUrl && endImageUrl) {
                    finalImageUrls = [startImageUrl, endImageUrl];
                } else if (imageUrl) {
                    finalImageUrls = [imageUrl];
                }
            }

            if (finalImageUrls.length > 0) {
                payload.imageUrls = finalImageUrls;
                // If not reference mode, let API auto-detect or default
                if (generationType !== 'REFERENCE_2_VIDEO') {
                    // payload.generationType = "FIRST_AND_LAST_FRAMES_2_VIDEO"; // Let API auto-detect
                }
            } else {
                payload.generationType = "TEXT_2_VIDEO";
            }

            console.log('Veo Payload:', JSON.stringify(payload, null, 2));

            const veoResponse = await fetch('https://api.kie.ai/api/v1/veo/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userKieKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!veoResponse.ok) {
                const errorText = await veoResponse.text();
                throw new Error(`Veo API Error: ${veoResponse.status} - ${errorText}`);
            }

            const veoData = await veoResponse.json();
            if (veoData.code !== 200) {
                throw new Error(`Veo API error: ${veoData.msg}`);
            }

            return NextResponse.json({
                taskId: veoData.data.taskId,
                status: 'pending',
                originalPrompt: prompt,
                optimizedPrompt: optimizedPrompt,
                model: payload.model
            });

        } else {
            // Other Models (Bytedance, Grok)
            let requestBody;
            if (model === 'bytedance') {
                requestBody = {
                    model: "bytedance/v1-pro-fast-image-to-video",
                    input: {
                        image_url: imageUrl,
                        prompt: optimizedPrompt,
                        resolution: resolution || "720p",
                        duration: duration || "5"
                    }
                };
            } else {
                // Grok
                requestBody = {
                    model: "grok-imagine/image-to-video",
                    input: {
                        image_urls: [imageUrl],
                        prompt: optimizedPrompt,
                        mode: mode || "normal"
                    }
                };
            }

            const createTaskResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userKieKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!createTaskResponse.ok) {
                const errorText = await createTaskResponse.text();
                throw new Error(`KIE API Error: ${createTaskResponse.status} - ${errorText}`);
            }

            const apiResponse = await createTaskResponse.json();
            if (apiResponse.code !== 200) {
                throw new Error(`KIE API error: ${apiResponse.msg}`);
            }

            return NextResponse.json({
                taskId: apiResponse.data?.taskId,
                status: 'pending',
                originalPrompt: prompt,
                optimizedPrompt: optimizedPrompt,
                model: model
            });
        }

    } catch (error) {
        console.error('❌ VIDEO GENERATION ERROR:', error);
        return NextResponse.json({
            error: 'Failed to start video generation',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
