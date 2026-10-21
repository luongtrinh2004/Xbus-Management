import { getStateChangeError } from "@/components/dropdowns/state/change-error";

type ErrorKey =
  | "issue_dependencies.cycle"
  | "issue_dependencies.self"
  | "issue_dependencies.unavailable"
  | "issue_dependencies.conflict"
  | "issue_dependencies.save_failed";

export function getDependencyError(error: unknown, translate: (key: ErrorKey) => string): string {
  const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  if (code === "dependency_cycle") return translate("issue_dependencies.cycle");
  if (code === "self_dependency") return translate("issue_dependencies.self");
  if (code === "invalid_related_issue") return translate("issue_dependencies.unavailable");
  if (code === "relation_conflict") return translate("issue_dependencies.conflict");
  return getStateChangeError(error, translate("issue_dependencies.save_failed"));
}
