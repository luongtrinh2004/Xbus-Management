/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// plane imports
import { EStartOfTheWeek } from "@plane/types";

export const PROFILE_VIEWER_TAB = [
  {
    key: "summary",
    route: "",
    i18n_label: "profile.tabs.summary",
    selected: "/",
  },
];

export const PROFILE_ADMINS_TAB = [
  {
    key: "assigned",
    route: "assigned",
    i18n_label: "profile.tabs.assigned",
    selected: "/assigned/",
  },
  {
    key: "created",
    route: "created",
    i18n_label: "profile.tabs.created",
    selected: "/created/",
  },
  {
    key: "subscribed",
    route: "subscribed",
    i18n_label: "profile.tabs.subscribed",
    selected: "/subscribed/",
  },
  {
    key: "activity",
    route: "activity",
    i18n_label: "profile.tabs.activity",
    selected: "/activity/",
  },
];

export const PREFERENCE_OPTIONS: {
  id: string;
  title: string;
  description: string;
}[] = [
  {
    id: "theme",
    title: "Chủ đề",
    description: "select_or_customize_your_interface_color_scheme",
  },
];

/**
 * @description The options for the start of the week
 * @type {Array<{value: EStartOfTheWeek, label: string}>}
 * @constant
 */
export const START_OF_THE_WEEK_OPTIONS = [
  {
    value: EStartOfTheWeek.SUNDAY,
    label: "Chủ nhật",
  },
  {
    value: EStartOfTheWeek.MONDAY,
    label: "Thứ Hai",
  },
  {
    value: EStartOfTheWeek.TUESDAY,
    label: "Thứ Ba",
  },
  {
    value: EStartOfTheWeek.WEDNESDAY,
    label: "Thứ Tư",
  },
  {
    value: EStartOfTheWeek.THURSDAY,
    label: "Thứ Năm",
  },
  {
    value: EStartOfTheWeek.FRIDAY,
    label: "Thứ Sáu",
  },
  {
    value: EStartOfTheWeek.SATURDAY,
    label: "Thứ Bảy",
  },
];
