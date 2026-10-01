// Only explicit web URLs may be opened from an album description.
export function getAlbumLink(description) {
  const candidates = String(description || '').match(/https?:\/\/[^\s<>"']+/gi) || [];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate.replace(/[),.;!?]+$/, ''));
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch {}
  }
  return '';
}
