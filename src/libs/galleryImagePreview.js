import sharp from 'sharp';
import convertHeic from 'heic-convert';

export async function createGalleryImagePreview(buffer, mimeType) {
  const input = /^image\/hei[cf]/.test(mimeType)
    ? Buffer.from(await convertHeic({ buffer, format: 'JPEG', quality: 0.9 }))
    : buffer;
  return sharp(input).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
}
