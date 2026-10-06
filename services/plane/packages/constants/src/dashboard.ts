/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// types
import type { TIssuesListTypes } from "@plane/types";

export enum EDurationFilters {
  NONE = "none",
  TODAY = "today",
  THIS_WEEK = "this_week",
  THIS_MONTH = "this_month",
  THIS_YEAR = "this_year",
  CUSTOM = "custom",
}

// filter duration options
export const DURATION_FILTER_OPTIONS: {
  key: EDurationFilters;
  label: string;
}[] = [
  {
    key: EDurationFilters.NONE,
    label: "Toàn bộ thời gian",
  },
  {
    key: EDurationFilters.TODAY,
    label: "Đến hạn hôm nay",
  },
  {
    key: EDurationFilters.THIS_WEEK,
    label: "Đến hạn trong tuần này",
  },
  {
    key: EDurationFilters.THIS_MONTH,
    label: "Đến hạn trong tháng này",
  },
  {
    key: EDurationFilters.THIS_YEAR,
    label: "Đến hạn trong năm nay",
  },
  {
    key: EDurationFilters.CUSTOM,
    label: "Tùy chỉnh",
  },
];

// random background colors for project cards
export const PROJECT_BACKGROUND_COLORS = [
  "bg-gray-500/20",
  "bg-success-subtle",
  "bg-danger-subtle",
  "bg-orange-500/20",
  "bg-blue-500/20",
  "bg-yellow-500/20",
  "bg-pink-500/20",
  "bg-purple-500/20",
];

// assigned and created issues widgets tabs list
export const FILTERED_ISSUES_TABS_LIST: {
  key: TIssuesListTypes;
  label: string;
}[] = [
  {
    key: "upcoming",
    label: "Sắp tới",
  },
  {
    key: "overdue",
    label: "Quá hạn",
  },
  {
    key: "completed",
    label: "Đã đánh dấu hoàn thành",
  },
];

// assigned and created issues widgets tabs list
export const UNFILTERED_ISSUES_TABS_LIST: {
  key: TIssuesListTypes;
  label: string;
}[] = [
  {
    key: "pending",
    label: "Đang chờ xử lý",
  },
  {
    key: "completed",
    label: "Đã đánh dấu hoàn thành",
  },
];

export type TLinkOptions = {
  userId: string | undefined;
};
