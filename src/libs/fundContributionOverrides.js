import { randomUUID } from "node:crypto";

const adjacentPeriod = (period, offset) => {
  const [year, month] = period.split("-").map(Number);
  const index = year * 12 + month - 1 + offset;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
};

// New rates own their interval; preserve the old rate on either side.
export function overrideContributionRules(existingRules, savedRules) {
  const remaining = existingRules.flatMap((existing) => {
    const incoming = savedRules.find(
      (rule) => rule.categoryId === existing.categoryId,
    );
    if (
      !incoming ||
      existing.endPeriod < incoming.startPeriod ||
      existing.startPeriod > incoming.endPeriod
    )
      return [existing];

    const fragments = [];
    if (existing.startPeriod < incoming.startPeriod)
      fragments.push({
        ...existing,
        endPeriod: adjacentPeriod(incoming.startPeriod, -1),
      });
    if (existing.endPeriod > incoming.endPeriod)
      fragments.push({
        ...existing,
        id: fragments.length ? `fund-rule-${randomUUID()}` : existing.id,
        startPeriod: adjacentPeriod(incoming.endPeriod, 1),
      });
    return fragments;
  });
  return [...remaining, ...savedRules];
}
