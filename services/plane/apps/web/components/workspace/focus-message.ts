export function getFocusCommand(
  event: { source: unknown; origin: string; data: unknown },
  parent: unknown,
  trustedOrigin: string | null,
): boolean | undefined {
  if (event.source !== parent || !/^https?:\/\//.test(event.origin)) return;
  if (trustedOrigin && event.origin !== trustedOrigin) return;
  if (!event.data || typeof event.data !== "object") return;
  const data = event.data as { type?: unknown; enabled?: unknown };
  if (data.type === "xbus-work-focus" && typeof data.enabled === "boolean") return data.enabled;
}
