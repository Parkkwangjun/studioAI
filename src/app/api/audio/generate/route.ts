import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

function getClient(googleCredsJson: string) {
    try {
        const credentials = JSON.parse(googleCredsJson);
        return new TextToSpeechClient({ credentials });
    } catch (error) {
        console.error('Failed to parse Google credentials:', error);
        throw new Error('Invalid Google credentials format');
    }
}

export async function POST(request: Request) {
    try {
        const { text, voiceId, speed } = await request.json();

        // Get API key from header (BYOK)
        const userGoogleCreds = request.headers.get('x-google-credentials');

        if (!userGoogleCreds) {
            return NextResponse.json(
                { error: '설정에서 Google Credentials를 먼저 입력해주세요.' },
                { status: 401 }
            );
        }

        const client = getClient(userGoogleCreds);

        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice: {
                languageCode: 'ko-KR',
                name: voiceId || 'ko-KR-Neural2-A'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: speed || 1.0
            },
        });

        const audioContent = response.audioContent;
        if (!audioContent) {
            throw new Error('No audio content returned');
        }

        // Convert Uint8Array to base64 string
        const buffer = Buffer.from(audioContent as Uint8Array);
        const base64Audio = buffer.toString('base64');
        let audioUrl = `data:audio/mp3;base64,${base64Audio}`;

        // Upload to Supabase Storage for permanence
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
                        upsert: false
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
            console.error('⚠️ Storage upload failed, using base64:', uploadError);
        }

        return NextResponse.json({
            audioUrl: audioUrl,
            message: "Audio generated successfully"
        });

    } catch (error) {
        console.error('Audio generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate audio',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
