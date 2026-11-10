import type { SupabaseClient } from '@supabase/supabase-js';

export const IMAGE_MAX = 5 * 1024 * 1024;
export const AUDIO_MAX = 10 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/ogg'];

export function validateFile(file: File, kind: 'image' | 'audio'): string | null {
  const types = kind === 'image' ? IMAGE_TYPES : AUDIO_TYPES;
  const max = kind === 'image' ? IMAGE_MAX : AUDIO_MAX;
  if (!types.includes(file.type))
    return kind === 'image' ? 'Use a JPG, PNG or WebP image.' : 'Use an MP3, M4A, AAC, WAV or OGG file.';
  if (file.size > max) return `File is too large. The limit is ${max / 1024 / 1024} MB.`;
  return null;
}

/** Downscale big photos so pages (and WhatsApp previews) load fast. */
export async function compressImage(file: File, maxSide = 1400): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export async function uploadFile(
  supabase: SupabaseClient,
  bucket: 'wish-images' | 'wish-audio',
  userId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
