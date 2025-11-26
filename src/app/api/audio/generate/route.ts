import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { getVoiceById } from '@/lib/tts-voices';

let cachedClient: TextToSpeechClient | null = null;
let cachedCreds: string | null = null;

/**
 * Create or retrieve a cached TextToSpeech client.
 * Recreates the client only if credentials change.
 */
function getClient(googleCredsJson: string) {
    if (cachedClient && cachedCreds === googleCredsJson) {
        return cachedClient;
    }

    try {
        const credentials = JSON.parse(googleCredsJson);
        cachedClient = new TextToSpeechClient({ credentials });
        cachedCreds = googleCredsJson;
        return cachedClient;
    } catch (error) {
        console.error('Failed to parse Google credentials:', error);
        throw new Error('Invalid Google credentials format');
    }
}

/**
 * POST /api/audio/generate
 * Expects JSON body: { text, voiceId?, speed?, pitch?, googleCredentials }
 * Supports both Google Cloud TTS and ElevenLabs (via Kie.ai)
 */
export async function POST(request: Request) {
    try {
        const { text, voiceId, speed, pitch, googleCredentials } = await request.json();
        const userKieKey = request.headers.get('x-kie-key');

        // Check voice provider
        const selectedVoice = voiceId ? getVoiceById(voiceId) : null;
        const provider = selectedVoice?.provider || 'google'; // Default to google if not found (fallback)

        let audioBuffer: Buffer;

        if (provider === 'elevenlabs') {
            // ----- ElevenLabs Logic via Kie.ai -----
            console.log('[DEBUG] ElevenLabs provider detected');
            console.log('[DEBUG] userKieKey:', userKieKey ? 'Present (length: ' + userKieKey.length + ')' : 'MISSING');
            console.log('[DEBUG] selectedVoice:', selectedVoice);

            if (!userKieKey) {
                return NextResponse.json({ error: '설정에서 KIE API 키를 먼저 입력해주세요.' }, { status: 401 });
            }

            const payload = {
                model: "elevenlabs/text-to-speech-turbo-2-5",
                input: {
                    text,
                    voice: selectedVoice?.name || 'George', // Use voice name (e.g., "George", "Alice")
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0,
                    speed: speed || 1,
                    timestamps: false
                }
            };

            console.log('[DEBUG] Sending payload to Kie.ai:', JSON.stringify(payload, null, 2));

            const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userKieKey}`
                },
                body: JSON.stringify(payload)
            });

            console.log('[DEBUG] Kie.ai response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[DEBUG] Kie.ai error response:', errorText);
                throw new Error(`Kie.ai API failed: ${errorText}`);
            }

            const apiResponse = await response.json();
            console.log('[DEBUG] Kie.ai createTask response:', JSON.stringify(apiResponse, null, 2));

            if (apiResponse.code !== 200) {
                throw new Error(`Kie.ai error: ${apiResponse.msg || apiResponse.message}`);
            }

            // Polling for completion
            const taskId = apiResponse.data.taskId;
            let audioUrl = null;

            // Adaptive polling
            let attempts = 0;
            const maxAttempts = 120; // 120 attempts (approx 4-5 minutes)

            while (attempts < maxAttempts) {
                attempts++;

                // Adaptive delay: faster polling
                const delay = attempts <= 3 ? 500 : attempts <= 10 ? 1000 : 2000;
                await new Promise(resolve => setTimeout(resolve, delay));

                const statusRes = await fetch(`https://api.kie.ai/api/v1/jobs/getTask?taskId=${taskId}`, {
                    headers: { 'Authorization': `Bearer ${userKieKey}` }
                });

                if (!statusRes.ok) continue;

                const statusData = await statusRes.json();

                // Force immediate console output
                process.stdout.write(`[Kie.ai] Poll attempt ${attempts}\n`);
                console.log(`[Kie.ai] Poll attempt ${attempts}:`, JSON.stringify(statusData, null, 2));

                const state = statusData.data?.state?.toLowerCase();

                if (state === 'success') {
                    // Parse resultJson to get audio URL
                    try {
                        const resultJson = JSON.parse(statusData.data.resultJson);
                        audioUrl = resultJson.resultUrls?.[0];
                        console.log('[Kie.ai] Success! Audio URL:', audioUrl);
                    } catch (e) {
                        console.error('[Kie.ai] Failed to parse resultJson:', e);
                    }
                    break;
                } else if (state === 'fail') {
                    console.error('[Kie.ai] Task Failed:', statusData);
                    throw new Error(`Task failed: ${statusData.data.failMsg || 'Unknown error'}`);
                }
            }

            if (!audioUrl) throw new Error('Timeout waiting for audio generation');

            // Fetch the audio content from the URL
            const audioRes = await fetch(audioUrl);
            const arrayBuffer = await audioRes.arrayBuffer();
            audioBuffer = Buffer.from(arrayBuffer);

        } else {
            // ----- Google Cloud TTS Logic -----

            // Validate credentials
            let googleCredsJson: string | null = null;
            if (googleCredentials) {
                googleCredsJson = googleCredentials;
            }

            if (!googleCredsJson) {
                return NextResponse.json({ error: '설정에서 Google Cloud 인증 정보를 먼저 입력해주세요.' }, { status: 401 });
            }

            try {
                JSON.parse(googleCredsJson);
            } catch (jsonError) {
                console.error('Invalid JSON structure in credentials:', jsonError);
                return NextResponse.json({
                    error: 'Google Credentials 형식이 올바르지 않습니다. 파일 경로가 아닌 JSON 내용 전체를 입력했는지 확인해주세요.'
                }, { status: 400 });
            }

            const client = getClient(googleCredsJson);

            const [response] = await client.synthesizeSpeech({
                input: { text },
                voice: {
                    languageCode: 'ko-KR',
                    name: voiceId || 'ko-KR-Neural2-A',
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: speed || 1.0,
                    pitch: pitch || 0,
                },
            });

            const audioContent = response.audioContent;
            if (!audioContent) {
                throw new Error('No audio content returned');
            }

            audioBuffer = Buffer.from(audioContent as Uint8Array);
        }

        // ----- Convert to base64 data URL -----
        const base64Audio = audioBuffer.toString('base64');
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

        // ----- Return Base64 immediately for fast playback -----
        // The client will handle saving to Supabase in the background via /api/assets/save

        return NextResponse.json({
            audioUrl,
            message: 'Audio generated successfully',
        });

    } catch (error) {
        console.error('Audio generation error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate audio',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
