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
            if (!userKieKey) {
                return NextResponse.json({ error: '설정에서 KIE API 키를 먼저 입력해주세요.' }, { status: 401 });
            }

            const modelId = selectedVoice?.model || 'eleven_turbo_v2_5';

            const payload = {
                model: "elevenlabs/text-to-speech-turbo-2-5",
                input: {
                    text,
                    voice_id: voiceId,
                    model_id: modelId,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                }
            };

            const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userKieKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Kie.ai API failed: ${errorText}`);
            }

            const apiResponse = await response.json();

            if (apiResponse.code !== 200) {
                throw new Error(`Kie.ai error: ${apiResponse.msg}`);
            }

            // Polling for completion
            const taskId = apiResponse.data.taskId;
            let audioUrl = null;

            // Simple polling (max 30 seconds)
            // Adaptive polling
            let attempts = 0;
            const maxAttempts = 30; // 30 attempts

            while (attempts < maxAttempts) {
                attempts++;

                // Adaptive delay: fast at first, then slower
                const delay = attempts <= 5 ? 1000 : attempts <= 10 ? 2000 : 4000;
                await new Promise(resolve => setTimeout(resolve, delay));

                const statusRes = await fetch(`https://api.kie.ai/api/v1/jobs/getTask?taskId=${taskId}`, {
                    headers: { 'Authorization': `Bearer ${userKieKey}` }
                });

                if (!statusRes.ok) continue;

                const statusData = await statusRes.json();

                if (statusData.data?.status === 'SUCCESS') {
                    audioUrl = statusData.data.result.audio_url || statusData.data.result.url;
                    break;
                } else if (statusData.data?.status === 'FAILED') {
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
        let audioUrl = `data:audio/mp3;base64,${base64Audio}`;

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
