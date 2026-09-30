const imageMimes = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
  heic: 'image/heic', heif: 'image/heif', hif: 'image/heif', tif: 'image/tiff',
  tiff: 'image/tiff', bmp: 'image/bmp', ico: 'image/x-icon', jxl: 'image/jxl',
  psd: 'image/vnd.adobe.photoshop', raw: 'image/x-raw', dng: 'image/x-adobe-dng',
  cr2: 'image/x-canon-cr2', cr3: 'image/x-canon-cr3', nef: 'image/x-nikon-nef',
  arw: 'image/x-sony-arw', orf: 'image/x-olympus-orf', raf: 'image/x-fuji-raf',
  rw2: 'image/x-panasonic-rw2', ppm: 'image/x-portable-pixmap', pgm: 'image/x-portable-graymap',
  pbm: 'image/x-portable-bitmap', tga: 'image/x-tga', eps: 'image/x-eps', ai: 'image/x-adobe-illustrator',
};
export const galleryMediaAccept = `image/*,video/*,.zip,.rar,${Object.keys(imageMimes).map(ext => `.${ext}`).join(',')}`;
export function classifyGalleryMedia(file) {
  const extension = (file.name || '').split('.').pop().toLowerCase();
  const mimeType = imageMimes[extension] || file.type || 'application/octet-stream';
  return { mimeType, isImage: mimeType.startsWith('image/'), isVideo: mimeType.startsWith('video/') };
}
export function galleryImageSource(file) {
  if (file?.thumbnail === '/images/gallery-image-unavailable.svg') return file.thumbnail;
  const extension = (file?.fileName || '').split('.').pop().toLowerCase();
  const needsPreview = extension && !['jpg', 'jpeg', 'jfif', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'].includes(extension);
  return needsPreview ? file.thumbnail || file.url : file.url;
}
