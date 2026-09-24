// Compatibility at the scheduling boundary; persisted schedules are one row per day.
export function trashStateToRecords(state) {
  const overrides = state.trashScheduleOverrides || {};
  const completions = state.trashScheduleCompletions || {};
  return [...new Set([...Object.keys(overrides), ...Object.keys(completions)])]
    .sort()
    .map((dateKey) => ({
      dateKey,
      userId: overrides[dateKey] || null,
      completed: Boolean(completions[dateKey]),
      completedBy: completions[dateKey]?.userId || null,
      completedAt: completions[dateKey]?.completedAt || null,
    }));
}
export function trashRecordsToState(schedules, metadata = {}) {
  return {
    trashScheduleOverrides: Object.fromEntries(
      schedules.map((row) => [row.dateKey, row.userId || null]),
    ),
    trashScheduleCompletions: Object.fromEntries(
      schedules
        .filter((row) => row.completed)
        .map((row) => [
          row.dateKey,
          {
            userId: row.completedBy || row.userId,
            completedAt: row.completedAt,
          },
        ]),
    ),
    trashScheduleRevision: metadata.revision || 0,
    trashScheduleGenerationMeta: metadata.generationMeta || {},
  };
}
export function trashStateMetadata(state) {
  return {
    revision: state.trashScheduleRevision || 0,
    generationMeta: state.trashScheduleGenerationMeta || {},
  };
}
