export function overviewErrorKey(error: unknown): string {
  const response = (error as { response?: { data?: { code?: string }; status?: number } })?.response;
  if (response?.status === 403 || response?.status === 404) return "project_overview.access_denied";
  const code = response?.data?.code;
  if (code === "overview_conflict") return "project_overview.conflict";
  if (code === "project_archived") return "project_overview.archived";
  if (code === "report_request_conflict") return "project_overview.request_conflict";
  if (response?.status === 400) return "project_overview.invalid_input";
  return "project_overview.save_failed";
}

export function safeProjectLink(url: string): boolean {
  try {
    return ["https:", "http:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
