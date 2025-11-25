import { NextResponse } from 'next/server';

/**
 * POST /api/audio/merge
 * 여러 오디오 파일을 하나로 병합
 * Expects JSON body: { audioUrls: string[], projectTitle: string }
 */
export async function POST(request: Request) {
    try {
        const { audioUrls, projectTitle } = await request.json();

        if (!audioUrls || !Array.isArray(audioUrls) || audioUrls.length === 0) {
            return NextResponse.json({ error: '병합할 오디오 URL이 필요합니다.' }, { status: 400 });
        }

        // 모든 오디오 파일 다운로드
        const audioBuffers: Buffer[] = [];

        for (const url of audioUrls) {
            try {
                // data URL인 경우 직접 디코딩
                if (url.startsWith('data:audio')) {
                    const base64Data = url.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    audioBuffers.push(buffer);
                } else {
                    // 외부 URL인 경우 fetch
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch audio from ${url}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    audioBuffers.push(Buffer.from(arrayBuffer));
                }
            } catch (error) {
                console.error('Error fetching audio:', error);
                throw new Error('오디오 파일을 가져오는데 실패했습니다.');
            }
        }

        // 오디오 파일들을 순차적으로 연결 (간단한 병합)
        // 실제 프로덕션에서는 ffmpeg 같은 도구를 사용해야 합니다
        const mergedBuffer = Buffer.concat(audioBuffers);

        // Supabase Storage에 업로드
        try {
            const { createClient } = await import('@/lib/supabase/server');
            const { cookies } = await import('next/headers');
            const { v4: uuidv4 } = await import('uuid');

            const cookieStore = await cookies();
            const supabase = createClient(cookieStore);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // 사용자가 로그인하지 않은 경우 base64로 반환
                const base64Audio = mergedBuffer.toString('base64');
                return NextResponse.json({
                    audioUrl: `data:audio/mp3;base64,${base64Audio}`,
                    message: '오디오가 병합되었습니다 (임시 저장)'
                });
            }

            // Supabase Storage에 업로드
            const filename = `${uuidv4()}.mp3`;
            const path = `${user.id}/merged-audio/${filename}`;

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(path, mergedBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: false,
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(path);

            return NextResponse.json({
                audioUrl: publicUrl,
                message: '오디오가 병합되어 저장되었습니다.'
            });

        } catch (uploadError) {
            console.error('Storage upload failed:', uploadError);
            // 업로드 실패 시 base64로 폴백
            const base64Audio = mergedBuffer.toString('base64');
            return NextResponse.json({
                audioUrl: `data:audio/mp3;base64,${base64Audio}`,
                message: '오디오가 병합되었습니다 (임시 저장)'
            });
        }

    } catch (error) {
        console.error('Audio merge error:', error);
        return NextResponse.json(
            {
                error: '오디오 병합 실패',
                details: error instanceof Error ? error.message : '알 수 없는 오류',
            },
            { status: 500 }
        );
    }
}
