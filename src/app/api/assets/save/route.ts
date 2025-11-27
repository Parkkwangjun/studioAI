import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const { type, content, metadata, projectId } = await request.json();
        // content: base64 string or url
        // type: 'audio' | 'image' | 'video'

        if (!content || !type) {
            return NextResponse.json({ error: 'Missing content or type' }, { status: 400 });
        }
        
        if (!projectId) {
            return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let publicUrl = content;

        // If content is base64, upload to storage
        if (content.startsWith('data:') || !content.startsWith('http')) {
            // Extract base64 data
            const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            let buffer: Buffer;
            let contentType = 'application/octet-stream';

            if (matches && matches.length === 3) {
                contentType = matches[1];
                buffer = Buffer.from(matches[2], 'base64');
            } else {
                // Assume raw base64 if no prefix, or handle as needed
                buffer = Buffer.from(content, 'base64');
                if (type === 'audio') contentType = 'audio/mpeg';
            }

            const ext = type === 'audio' ? 'mp3' : type === 'image' ? 'png' : 'mp4';
            const filename = `${uuidv4()}.${ext}`;
            const path = `${user.id}/${type}/${filename}`;

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(path, buffer, {
                    contentType,
                    upsert: false,
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl: url } } = supabase.storage
                .from('assets')
                .getPublicUrl(path);

            publicUrl = url;
        }

        // Save to 'assets' table
        const { data: asset, error: dbError } = await supabase
            .from('assets')
            .insert({
                user_id: user.id,
                project_id: projectId,  // ✅ project_id 추가!
                type: type,
                url: publicUrl,
                title: metadata?.title || `Generated ${type}`,
                storage_path: metadata?.storagePath || null,
                scene_number: metadata?.sceneNumber || null,
                tag: metadata?.tag || null,
                duration: metadata?.duration || null
            })
            .select()
            .single();

        if (dbError) {
            throw dbError;
        }

        return NextResponse.json({ success: true, asset });

    } catch (error) {
        console.error('Asset save error:', error);
        return NextResponse.json(
            { error: 'Failed to save asset', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
