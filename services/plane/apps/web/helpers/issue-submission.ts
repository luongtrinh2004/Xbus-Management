import type { TIssue } from "@plane/types";

/** Run at most one write at a time, including submissions in the same render. */
export const createIssueSubmissionGuard = () => {
  let pending = false;
  return {
    get pending() {
      return pending;
    },
    async run<T>(submit: () => Promise<T>): Promise<T | undefined> {
      if (pending) return undefined;
      pending = true;
      try {
        return await submit();
      } finally {
        pending = false;
      }
    },
  };
};
/** The primary write succeeded; callers must continue with this ID on retry. */
export class IssueCreatedWithFollowUpError extends Error {
  constructor(
    public readonly createdIssue: TIssue,
    cause: unknown
  ) {
    super("The work item was created but additional properties could not be saved.", { cause });
    this.name = "IssueCreatedWithFollowUpError";
  }
}
