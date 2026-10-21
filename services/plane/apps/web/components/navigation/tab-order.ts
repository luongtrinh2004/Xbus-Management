export function normalizeTabOrder(order: readonly string[], available: readonly string[]): string[] {
  return [...new Set([...(Array.isArray(order) ? order : []).filter((key) => available.includes(key)), ...available])];
}
export function moveTab(
  order: readonly string[],
  available: readonly string[],
  key: string,
  direction: -1 | 1
): string[] {
  const result = normalizeTabOrder(order, available);
  const index = result.indexOf(key),
    target = index + direction;
  if (index < 0 || target < 0 || target >= result.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
