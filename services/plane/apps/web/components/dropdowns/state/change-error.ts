/** IssueService throws the API response body rather than the Axios error. */
export function getStateChangeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const data = error as { error?: unknown; detail?: unknown; message?: unknown };
    for (const value of [data.error, data.detail, data.message]) {
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return fallback;
}
