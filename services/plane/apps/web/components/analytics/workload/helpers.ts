export function moveWorkloadWeek(isoDate: string, weeks: number) {
  const day = new Date(`${isoDate}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + weeks * 7);
  return day.toISOString().slice(0, 10);
}

export function workloadLevel(count: number, limit: number) {
  return { overloaded: count > limit, percent: Math.min(100, Math.max(0, (count / limit) * 100)) };
}
