export type TDependencyDateConflict = {
  blocker_id: string;
  blocker_name: string;
  blocker_target_date: string;
  dependent_id: string;
  dependent_name: string;
  dependent_project_id: string;
  start_date: string;
  target_date: string | null;
  suggested_start_date: string;
  suggested_target_date: string | null;
};

type ConfirmationHandler = (conflicts: TDependencyDateConflict[]) => Promise<boolean>;
let confirmationHandler: ConfirmationHandler | undefined;

export function registerDependencyDateConfirmation(handler: ConfirmationHandler): () => void {
  confirmationHandler = handler;
  return () => {
    if (confirmationHandler === handler) confirmationHandler = undefined;
  };
}

/** When the UI is unavailable, keep the saved dates instead of accepting a conflict silently. */
export async function confirmDependencyDates(
  conflicts: TDependencyDateConflict[],
): Promise<boolean> {
  if (conflicts.length === 0) return true;
  return confirmationHandler?.(conflicts) ?? false;
}
