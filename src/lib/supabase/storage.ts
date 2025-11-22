import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function uploadAssetFromUrl(
    url: string,
    folder: 'images' | 'videos' | 'audio'
): Promise<string> {
    try {
        // 1. Download the file from the external URL
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch asset: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Determine content type and extension
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const extension = contentType.split('/')[1] || 'bin';
        const filename = `${uuidv4()}.${extension}`;

        // 3. Initialize Supabase Client
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        // 4. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 5. Upload to Supabase Storage
        // Path: userId/folder/filename
        const path = `${user.id}/${folder}/${filename}`;

        const { data, error } = await supabase
            .storage
            .from('assets')
            .upload(path, buffer, {
                contentType,
                upsert: false
            });

        if (error) throw error;

        // 6. Get Public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('assets')
            .getPublicUrl(path);

        return publicUrl;

    } catch (error) {
        console.error('Asset upload failed:', error);
        // Fallback: return the original URL if upload fails, 
        // so the app doesn't break immediately (though it won't be permanent)
        return url;
    }
}
