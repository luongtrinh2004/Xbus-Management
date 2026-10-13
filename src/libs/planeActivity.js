export async function getPlaneActivityLogs() {
  const secret = process.env.PLANE_BRIDGE_SECRET;
  if (!secret) return [];
  const base = (
    process.env.PLANE_INTERNAL_URL || "http://localhost:3100"
  ).replace(/\/$/, "");
  const response = await fetch(`${base}/api/xbus/activities/`, {
    headers: { "X-XBus-Secret": secret },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Không thể tải nhật ký Plane (HTTP ${response.status}).`);
  const data = await response.json();
  if (!Array.isArray(data.logs)) throw new Error("Nhật ký Plane không hợp lệ.");
  return data.logs;
}
