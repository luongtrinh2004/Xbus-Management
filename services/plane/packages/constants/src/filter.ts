/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export enum E_SORT_ORDER {
  ASC = "asc",
  DESC = "desc",
}
export const DATE_AFTER_FILTER_OPTIONS = [
  {
    name: "1 tuần nữa",
    value: "1_weeks;after;fromnow",
  },
  {
    name: "2 tuần nữa",
    value: "2_weeks;after;fromnow",
  },
  {
    name: "1 tháng nữa",
    value: "1_months;after;fromnow",
  },
  {
    name: "2 tháng nữa",
    value: "2_months;after;fromnow",
  },
];

export const DATE_BEFORE_FILTER_OPTIONS = [
  {
    name: "1 tuần trước",
    value: "1_weeks;before;fromnow",
  },
  {
    name: "2 tuần trước",
    value: "2_weeks;before;fromnow",
  },
  {
    name: "1 tháng trước",
    i18n_name: "date_filters.1_month_ago",
    value: "1_months;before;fromnow",
  },
];

export const PROJECT_CREATED_AT_FILTER_OPTIONS = [
  {
    name: "Hôm nay",
    value: "today;custom;custom",
  },
  {
    name: "Hôm qua",
    value: "yesterday;custom;custom",
  },
  {
    name: "7 ngày qua",
    value: "last_7_days;custom;custom",
  },
  {
    name: "30 ngày qua",
    value: "last_30_days;custom;custom",
  },
];
