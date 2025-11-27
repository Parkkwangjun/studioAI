import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

let cachedClient: TextToSpeechClient | null = null;
let cachedCreds: string | null = null;

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

export async function POST(request: Request) {
    try {
        const { text, voiceId, speed, pitch, googleCredentials } = await request.json();

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
        const textBytes = Buffer.from(text, 'utf-8').length;
        const MAX_BYTES = 4500;

        let audioBuffer: Buffer;

        if (textBytes <= MAX_BYTES) {
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
        } else {
            console.log(`[Audio Generate] Text too long (${textBytes} bytes), splitting into chunks...`);
            
            const sentences = text.split(/([.!?。！？]\s*)/);
            const chunks: string[] = [];
            let currentChunk = '';

            for (let i = 0; i < sentences.length; i++) {
                const sentence = sentences[i];
                const testChunk = currentChunk + sentence;
                const testBytes = Buffer.from(testChunk, 'utf-8').length;

                if (testBytes <= MAX_BYTES) {
                    currentChunk = testChunk;
                } else {
                    if (currentChunk) {
                        chunks.push(currentChunk.trim());
                    }
                    if (Buffer.from(sentence, 'utf-8').length > MAX_BYTES) {
                        const sentenceBytes = Buffer.from(sentence, 'utf-8');
                        for (let j = 0; j < sentenceBytes.length; j += MAX_BYTES) {
                            const charChunk = Buffer.from(sentenceBytes.slice(j, j + MAX_BYTES)).toString('utf-8');
                            chunks.push(charChunk);
                        }
                        currentChunk = '';
                    } else {
                        currentChunk = sentence;
                    }
                }
            }

            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }

            console.log(`[Audio Generate] Split into ${chunks.length} chunks`);

            const audioChunks: Buffer[] = [];
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (!chunk.trim()) continue;

                console.log(`[Audio Generate] Generating chunk ${i + 1}/${chunks.length} (${Buffer.from(chunk, 'utf-8').length} bytes)...`);

                const [response] = await client.synthesizeSpeech({
                    input: { text: chunk },
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
                    throw new Error(`No audio content returned for chunk ${i + 1}`);
                }

                audioChunks.push(Buffer.from(audioContent as Uint8Array));
            }

            console.log(`[Audio Generate] Merging ${audioChunks.length} audio chunks...`);
            audioBuffer = Buffer.concat(audioChunks);
            console.log(`[Audio Generate] Merged audio size: ${audioBuffer.length} bytes`);
        }

        const base64Audio = audioBuffer.toString('base64');
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

        return NextResponse.json({
            audioUrl,
            message: 'Audio generated successfully',
        });

    } catch (error) {
        console.error('Audio generation error:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('5000 bytes')) {
                return NextResponse.json(
                    {
                        error: '텍스트가 너무 깁니다 (5000 바이트 제한)',
                        details: '텍스트를 더 짧게 분할해주세요.',
                    },
                    { status: 400 }
                );
            }
            
            if (error.message.includes('INVALID_ARGUMENT')) {
                return NextResponse.json(
                    {
                        error: 'Google TTS 오류: 잘못된 입력',
                        details: error.message,
                    },
                    { status: 400 }
                );
            }
        }
        
        return NextResponse.json(
            {
                error: '오디오 생성 실패',
                details: error instanceof Error ? error.message : '알 수 없는 오류',
            },
            { status: 500 }
        );
    }
}
