export const trashUserIds = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : [value]).filter(
      (id) => typeof id === "string" && id,
    ),
  ),
];
// Compatibility at the scheduling boundary; persisted schedules are one row per day.
export function trashStateToRecords(state) {
  const overrides = state.trashScheduleOverrides || {};
  const completions = state.trashScheduleCompletions || {};
  return [...new Set([...Object.keys(overrides), ...Object.keys(completions)])]
    .sort()
    .map((dateKey) => ({
      dateKey,
      userId: trashUserIds(overrides[dateKey])[0] || null,
      userIds: trashUserIds(overrides[dateKey]),
      completed: Boolean(completions[dateKey]),
      completedBy: completions[dateKey]?.userId || null,
      completedUserIds: trashUserIds(
        completions[dateKey]?.userIds || completions[dateKey]?.userId,
      ),
      completedAt: completions[dateKey]?.completedAt || null,
    }));
}
export function trashRecordsToState(schedules, metadata = {}) {
  return {
    trashScheduleOverrides: Object.fromEntries(
      schedules.map((row) => [
        row.dateKey,
        trashUserIds(row.userIds || row.userId).length > 1
          ? trashUserIds(row.userIds)
          : row.userId || row.userIds?.[0] || null,
      ]),
    ),
    trashScheduleCompletions: Object.fromEntries(
      schedules
        .filter((row) => row.completed)
        .map((row) => [
          row.dateKey,
          {
            userId: row.completedBy || row.userId,
            userIds: trashUserIds(
              row.completedUserIds?.length
                ? row.completedUserIds
                : row.completedBy || row.userId,
            ),
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
