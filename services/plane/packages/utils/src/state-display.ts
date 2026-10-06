/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

const DEFAULT_STATE_NAMES: Record<string, { original: string; translated: string }> = {
  backlog: { original: "Backlog", translated: "Chờ lên kế hoạch" },
  unstarted: { original: "Todo", translated: "Cần làm" },
  started: { original: "In Progress", translated: "Đang thực hiện" },
  completed: { original: "Done", translated: "Hoàn thành" },
  cancelled: { original: "Cancelled", translated: "Đã hủy" },
  triage: { original: "Triage", translated: "Chờ phân loại" },
};

type DisplayState = { name?: string | null; group?: string | null };

export function getStateDisplayName(state: DisplayState & { name: string }): string;
export function getStateDisplayName(state: DisplayState | null | undefined): string | undefined;
export function getStateDisplayName(state: DisplayState | null | undefined): string | undefined {
  const defaultName = state?.group ? DEFAULT_STATE_NAMES[state.group] : undefined;
  return defaultName && state?.name === defaultName.original ? defaultName.translated : (state?.name ?? undefined);
}
