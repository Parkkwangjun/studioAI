import { NextResponse } from 'next/server';
import OpenAI from 'openai';

async function optimizeVideoPrompt(koreanPrompt: string, openaiKey: string): Promise<string> {
    const openai = new OpenAI({ apiKey: openaiKey });

    try {
        console.log('🎬 Optimizing video prompt using JSON Style Guide...');
        console.log('Original Prompt (KR):', koreanPrompt);

        const systemPrompt = `You are an expert AI video generation prompt engineer using JSON Style Guides for image-to-video models.

Your task: Transform Korean prompts into structured JSON format, then convert to optimized English video prompts.

CRITICAL: JSON STYLE GUIDE STRUCTURE FOR VIDEO (Extended with Motion)

CORE PARAMETERS (from Image Guide):
1. **scene**: Overall setting/environment
2. **subjects**: Array with motion attributes
   - type, description, position, pose, expression
   - **motion**: specific movement (walking, turning, gesturing, breathing)
3. **style**: Cinematic style (documentary, narrative, commercial, artistic)
4. **color_palette**: Color grading approach
5. **lighting**: Light source and changes over time
6. **mood**: Emotional atmosphere
7. **background**: Scenery with environmental motion
8. **composition**: Framing and layout

VIDEO-SPECIFIC PARAMETERS:
9. **camera_movement**: Camera motion
   - type: pan, tilt, zoom, dolly, tracking, static, handheld
   - direction: left-to-right, up, down, forward, backward
   - speed: slow, smooth, dynamic, gradual
10. **motion_quality**: Animation characteristics
    - timing: smooth, gradual, natural, cinematic
    - intensity: subtle, moderate, dramatic
11. **environmental_motion**: Background animation
    - wind, water flow, clouds, particles, leaves
12. **temporal_progression**: Changes over time
    - lighting shifts, weather changes, subject movement
13. **effects**: Video-specific treatments
    - motion blur, depth of field changes, rack focus, slow motion
14. **technical_specs**: Video quality
    - resolution: 4K, 1080p
    - frame_rate: cinematic 24fps, smooth 60fps
    - quality: professional cinematography, smooth motion

VISUAL-ONLY RULES:
❌ NO text overlays, captions, typography, subtitles, logos
✅ ONLY visual motion, cinematography, animation

CONVERSION PROCESS:
1. Analyze Korean prompt
2. Structure into JSON with video-specific parameters
3. Convert to natural English prompt
4. Enhance with cinematography terms

EXAMPLE:

INPUT (Korean): "바다에서 노인이 천천히 고개를 돌리며 미소짓는 장면"

INTERNAL JSON STRUCTURE:
{
  "scene": "serene coastal setting during golden hour",
  "subjects": [{
    "type": "Korean elder",
    "description": "dignified person in 60s with gentle expression",
    "position": "center frame",
    "motion": "slowly turning head from left to right, gradual smile forming",
    "expression": "transitioning from contemplative to warm smile"
  }],
  "style": "cinematic documentary",
  "color_palette": ["warm golden tones", "soft blues", "natural earth colors"],
  "lighting": "soft golden hour light, gentle rim lighting on profile",
  "mood": "peaceful, contemplative, uplifting",
  "background": "calm ocean with gentle wave motion, subtle horizon movement",
  "composition": "medium close-up, rule of thirds, portrait orientation",
  "camera_movement": {
    "type": "slow push-in",
    "direction": "forward toward subject",
    "speed": "very slow, gradual, smooth"
  },
  "motion_quality": {
    "timing": "smooth and natural",
    "intensity": "subtle, realistic human movement"
  },
  "environmental_motion": "gentle ocean waves, soft breeze in clothing, natural hair movement",
  "temporal_progression": "light gradually warming, smile slowly emerging",
  "effects": "natural motion blur, shallow depth of field with soft bokeh, subtle rack focus",
  "technical_specs": {
    "resolution": "4K",
    "frame_rate": "cinematic 24fps",
    "quality": "professional cinematography, smooth gradual motion"
  }
}

OUTPUT (Optimized English Prompt):
"A dignified Korean elder in their 60s slowly turning head from left to right with gradual warm smile forming, medium close-up shot with slow camera push-in toward subject, serene coastal setting with calm ocean and gentle wave motion in background, soft golden hour lighting with rim light on profile, peaceful and contemplative mood transitioning to uplifting, cinematic documentary style, color grading with warm golden tones and soft blues, gentle environmental motion with ocean waves and soft breeze, smooth natural human movement, very slow gradual camera movement forward, shallow depth of field with soft bokeh background, natural motion blur, professional cinematography, 4K resolution, cinematic 24fps, smooth gradual motion, no text or captions"

CRITICAL RULES:
- Emphasize MOTION and CAMERA MOVEMENT
- Specify timing (slow, gradual, smooth)
- Include environmental animation
- Add cinematography terms (push-in, rack focus, motion blur)
- Specify frame rate and resolution
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

        console.log('\\n--- JSON Style Guide Video Optimization Result ---');
        console.log('Optimized Prompt (EN):', optimizedPrompt);
        console.log('Character count:', optimizedPrompt.length);
        console.log('✅ Optimization complete\\n');

        return optimizedPrompt;
    } catch (error) {
        console.error('❌ Video prompt optimization failed:', error);
        console.error('Falling back to simple translation...');

        try {
            const fallbackCompletion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Translate Korean to English for video generation. Focus on motion and cinematography."
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
        const { imageUrl, prompt, model, mode, duration, resolution } = await request.json();

        // Get API keys from headers (BYOK)
        // Get API keys from headers (BYOK)
        const userKieKey = request.headers.get('x-kie-key');
        const userOpenAiKey = request.headers.get('x-openai-key');

        if (!userKieKey) {
            return NextResponse.json(
                { error: '설정에서 KIE API 키를 먼저 입력해주세요.' },
                { status: 401 }
            );
        }

        if (!userOpenAiKey) {
            return NextResponse.json(
                { error: '설정에서 OpenAI API 키를 먼저 입력해주세요.' },
                { status: 401 }
            );
        }

        console.log('\\n========================================');
        console.log('=== VIDEO GENERATION REQUEST START ===');
        console.log('========================================');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Image URL:', imageUrl);
        console.log('Original Prompt (KR):', prompt);
        console.log('Model:', model);
        console.log('Mode:', mode);
        console.log('Duration:', duration);
        console.log('Resolution:', resolution);

        // Optimize using JSON Style Guide methodology for video
        const optimizedPrompt = prompt
            ? await optimizeVideoPrompt(prompt, userOpenAiKey)
            : "Animate this image with smooth, cinematic motion, natural movement, professional cinematography, 4K quality, no text or captions";

        let requestBody;

        if (model === 'bytedance') {
            // Bytedance Model Configuration
            requestBody = {
                model: "bytedance/v1-pro-fast-image-to-video",
                input: {
                    image_url: imageUrl, // Note: singular 'image_url' for Bytedance
                    prompt: optimizedPrompt,
                    resolution: resolution || "720p",
                    duration: duration || "5"
                }
            };
        } else {
            // Grok Model Configuration (Default)
            requestBody = {
                model: "grok-imagine/image-to-video",
                input: {
                    image_urls: [imageUrl], // Note: plural 'image_urls' array for Grok
                    prompt: optimizedPrompt,
                    mode: mode || "normal",
                    // Grok doesn't support duration/resolution in this endpoint according to docs
                }
            };
        }

        console.log('\\n--- KIE API Request Payload ---');
        console.log(JSON.stringify(requestBody, null, 2));

        console.log('\\n--- Calling KIE API ---');
        const createTaskResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userKieKey}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response Status:', createTaskResponse.status);

        if (!createTaskResponse.ok) {
            const errorText = await createTaskResponse.text();
            console.error('KIE API Error Response:', errorText);
            throw new Error(`KIE API Error: ${createTaskResponse.status} - ${errorText}`);
        }

        const apiResponse = await createTaskResponse.json();
        console.log('Task Data Response:', JSON.stringify(apiResponse, null, 2));

        if (apiResponse.code !== 200) {
            throw new Error(`KIE API error: ${apiResponse.msg}`);
        }

        const taskId = apiResponse.data?.taskId;
        console.log('Extracted Task ID:', taskId);

        if (!taskId) {
            console.error('No taskId in response. Full response:', apiResponse);
            throw new Error('No taskId returned from KIE');
        }

        console.log('\\n--- Video Generation Success ---');
        console.log('✅ Task ID:', taskId);
        console.log('✅ Model:', model);
        console.log('✅ Optimized Prompt (EN):', optimizedPrompt);
        console.log('========================================\\n');

        return NextResponse.json({
            taskId,
            status: 'pending',
            originalPrompt: prompt,
            optimizedPrompt: optimizedPrompt,
            model: model
        });

    } catch (error) {
        console.error('\\n========================================');
        console.error('❌ VIDEO GENERATION ERROR');
        console.error('========================================');
        console.error('Error:', error);
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        console.error('========================================\\n');

        return NextResponse.json({
            error: 'Failed to start video generation',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
