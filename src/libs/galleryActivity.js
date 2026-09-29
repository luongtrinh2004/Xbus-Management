// Only explicit viewer actions are reported; media fetches/preloads are not views.
export function trackGalleryActivity(postId, action, fileId) {
  if (!postId) return;
  return fetch(`/api/gallery/${encodeURIComponent(postId)}/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, fileId }),
    keepalive: true,
  }).then(response => {
    if (!response.ok) console.warn("Không thể ghi lịch sử tương tác ảnh/video");
  }).catch(error => console.warn("Không thể ghi lịch sử tương tác ảnh/video", error));
}
