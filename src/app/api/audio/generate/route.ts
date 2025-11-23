import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

/**
 * Create a TextToSpeech client from Base64‑encoded Google credentials.
 */
function getClient(googleCredsJson: string) {
    try {
        const credentials = JSON.parse(googleCredsJson);
        return new TextToSpeechClient({ credentials });
    } catch (error) {
        console.error('Failed to parse Google credentials:', error);
        throw new Error('Invalid Google credentials format');
    }
}

/**
 * POST /api/audio/generate
 * Expects JSON body: { text, voiceId?, speed? }
 * Header `x-google-credentials` must contain Base64‑encoded Google Cloud JSON credentials.
 */
export async function POST(request: Request) {
    try {
        const { text, voiceId, speed } = await request.json();

        // ----- Validate and decode credentials -----
        let googleCredsJson: string | null = null;
        const encodedCreds = request.headers.get('x-google-credentials');

        if (encodedCreds) {
            try {
                // Decode Base64 safely (compatible with browsers & Node)
                googleCredsJson = decodeURIComponent(escape(atob(encodedCreds)));

                // Validate JSON format immediately
                try {
                    JSON.parse(googleCredsJson);
                } catch (jsonError) {
                    console.error('Invalid JSON structure in credentials:', jsonError);
                    return NextResponse.json({
                        error: 'Google Credentials 형식이 올바르지 않습니다. 파일 경로가 아닌 JSON 내용 전체를 입력했는지 확인해주세요.'
                    }, { status: 400 });
                }
            } catch (e) {
                console.error('Failed to decode Google credentials:', e);
                return NextResponse.json({ error: 'Google Credentials 디코딩 실패' }, { status: 400 });
            }
        }

        // Fallback removed to enforce BYOK
        if (!googleCredsJson) {
            return NextResponse.json({ error: '설정에서 Google Cloud 인증 정보를 먼저 입력해주세요.' }, { status: 401 });
        }

        const client = getClient(googleCredsJson);

        // ----- Call Google TTS -----
        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice: {
                languageCode: 'ko-KR',
                name: voiceId || 'ko-KR-Neural2-A',
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: speed || 1.0,
            },
        });

        const audioContent = response.audioContent;
        if (!audioContent) {
            throw new Error('No audio content returned');
        }

        // ----- Convert to base64 data URL -----
        const buffer = Buffer.from(audioContent as Uint8Array);
        const base64Audio = buffer.toString('base64');
        let audioUrl = `data:audio/mp3;base64,${base64Audio}`;

        // ----- Optional: Upload to Supabase for persistence -----
        try {
            console.log('💾 Uploading audio to Supabase Storage...');
            const { createClient } = await import('@/lib/supabase/server');
            const { cookies } = await import('next/headers');
            const { v4: uuidv4 } = await import('uuid');

            const cookieStore = await cookies();
            const supabase = createClient(cookieStore);
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const filename = `${uuidv4()}.mp3`;
                const path = `${user.id}/audio/${filename}`;
                const { error } = await supabase.storage
                    .from('assets')
                    .upload(path, buffer, {
                        contentType: 'audio/mpeg',
                        upsert: false,
                    });
                if (!error) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('assets')
                        .getPublicUrl(path);
                    audioUrl = publicUrl;
                    console.log('✅ Upload complete:', audioUrl);
                } else {
                    throw error;
                }
            }
        } catch (uploadError) {
            console.error('⚠️ Storage upload failed, using base64 fallback:', uploadError);
        }

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
