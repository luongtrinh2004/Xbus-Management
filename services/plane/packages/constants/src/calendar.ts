/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TCalendarLayouts } from "@plane/types";
import { EStartOfTheWeek } from "@plane/types";

export const MONTHS_LIST: {
  [monthNumber: number]: {
    shortTitle: string;
    title: string;
  };
} = {
  1: {
    shortTitle: "Th1",
    title: "Tháng 1",
  },
  2: {
    shortTitle: "Th2",
    title: "Tháng 2",
  },
  3: {
    shortTitle: "Th3",
    title: "Tháng 3",
  },
  4: {
    shortTitle: "Th4",
    title: "Tháng 4",
  },
  5: {
    shortTitle: "Th5",
    title: "Tháng 5",
  },
  6: {
    shortTitle: "Th6",
    title: "Tháng 6",
  },
  7: {
    shortTitle: "Th7",
    title: "Tháng 7",
  },
  8: {
    shortTitle: "Th8",
    title: "Tháng 8",
  },
  9: {
    shortTitle: "Th9",
    title: "Tháng 9",
  },
  10: {
    shortTitle: "Th10",
    title: "Tháng 10",
  },
  11: {
    shortTitle: "Th11",
    title: "Tháng 11",
  },
  12: {
    shortTitle: "Th12",
    title: "Tháng 12",
  },
};

export const DAYS_LIST: {
  [dayIndex: number]: {
    shortTitle: string;
    title: string;
    value: EStartOfTheWeek;
  };
} = {
  1: {
    shortTitle: "CN",
    title: "Chủ nhật",
    value: EStartOfTheWeek.SUNDAY,
  },
  2: {
    shortTitle: "T2",
    title: "Thứ Hai",
    value: EStartOfTheWeek.MONDAY,
  },
  3: {
    shortTitle: "T3",
    title: "Thứ Ba",
    value: EStartOfTheWeek.TUESDAY,
  },
  4: {
    shortTitle: "T4",
    title: "Thứ Tư",
    value: EStartOfTheWeek.WEDNESDAY,
  },
  5: {
    shortTitle: "T5",
    title: "Thứ Năm",
    value: EStartOfTheWeek.THURSDAY,
  },
  6: {
    shortTitle: "T6",
    title: "Thứ Sáu",
    value: EStartOfTheWeek.FRIDAY,
  },
  7: {
    shortTitle: "T7",
    title: "Thứ Bảy",
    value: EStartOfTheWeek.SATURDAY,
  },
};

export const CALENDAR_LAYOUTS: {
  [layout in TCalendarLayouts]: {
    key: TCalendarLayouts;
    title: string;
  };
} = {
  month: {
    key: "month",
    title: "Bố cục theo tháng",
  },
  week: {
    key: "week",
    title: "Bố cục theo tuần",
  },
};
