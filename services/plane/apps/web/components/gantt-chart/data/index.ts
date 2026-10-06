/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// types
import type { WeekMonthDataType, ChartDataType, TGanttViews } from "@plane/types";
import { EStartOfTheWeek } from "@plane/types";

// constants
export const generateWeeks = (startOfWeek: EStartOfTheWeek = EStartOfTheWeek.SUNDAY): WeekMonthDataType[] => [
  ...weeks.slice(startOfWeek),
  ...weeks.slice(0, startOfWeek),
];

export const weeks: WeekMonthDataType[] = [
  { key: 0, shortTitle: "sun", title: "Chủ nhật", abbreviation: "CN" },
  { key: 1, shortTitle: "mon", title: "Thứ Hai", abbreviation: "T2" },
  { key: 2, shortTitle: "tue", title: "Thứ Ba", abbreviation: "T3" },
  { key: 3, shortTitle: "wed", title: "Thứ Tư", abbreviation: "T4" },
  { key: 4, shortTitle: "thurs", title: "Thứ Năm", abbreviation: "T5" },
  { key: 5, shortTitle: "fri", title: "Thứ Sáu", abbreviation: "T6" },
  { key: 6, shortTitle: "sat", title: "Thứ Bảy", abbreviation: "T7" },
];

export const months: WeekMonthDataType[] = [
  { key: 0, shortTitle: "jan", title: "Tháng 1", abbreviation: "Th1" },
  { key: 1, shortTitle: "feb", title: "Tháng 2", abbreviation: "Th2" },
  { key: 2, shortTitle: "mar", title: "Tháng 3", abbreviation: "Th3" },
  { key: 3, shortTitle: "apr", title: "Tháng 4", abbreviation: "Th4" },
  { key: 4, shortTitle: "may", title: "Tháng 5", abbreviation: "Th5" },
  { key: 5, shortTitle: "jun", title: "Tháng 6", abbreviation: "Th6" },
  { key: 6, shortTitle: "jul", title: "Tháng 7", abbreviation: "Th7" },
  { key: 7, shortTitle: "aug", title: "Tháng 8", abbreviation: "Th8" },
  { key: 8, shortTitle: "sept", title: "Tháng 9", abbreviation: "Th9" },
  { key: 9, shortTitle: "oct", title: "Tháng 10", abbreviation: "Th10" },
  { key: 10, shortTitle: "nov", title: "Tháng 11", abbreviation: "Th11" },
  { key: 11, shortTitle: "dec", title: "Tháng 12", abbreviation: "Th12" },
];

export const quarters: WeekMonthDataType[] = [
  { key: 0, shortTitle: "Q1", title: "Tháng 1 - Tháng 3", abbreviation: "Q1" },
  { key: 1, shortTitle: "Q2", title: "Tháng 4 - Tháng 6", abbreviation: "Q2" },
  { key: 2, shortTitle: "Q3", title: "Tháng 7 - Tháng 9", abbreviation: "Q3" },
  { key: 3, shortTitle: "Q4", title: "Tháng 10 - Tháng 12", abbreviation: "Q4" },
];

export const charCapitalize = (word: string) => `${word.charAt(0).toUpperCase()}${word.substring(1)}`;

export const bindZero = (value: number) => (value > 9 ? `${value}` : `0${value}`);

export const timePreview = (date: Date) => {
  let hours = date.getHours();
  const amPm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;

  let minutes: number | string = date.getMinutes();
  minutes = bindZero(minutes);

  return `${bindZero(hours)}:${minutes} ${amPm}`;
};

export const datePreview = (date: Date, includeTime: boolean = false) => {
  const day = date.getDate();
  let month: number | WeekMonthDataType = date.getMonth();
  month = months[month];
  const year = date.getFullYear();

  return `${charCapitalize(month?.shortTitle)} ${day}, ${year}${includeTime ? `, ${timePreview(date)}` : ``}`;
};

// context data
export const VIEWS_LIST: ChartDataType[] = [
  {
    key: "week",
    i18n_title: "common.week",
    data: {
      startDate: new Date(),
      currentDate: new Date(),
      endDate: new Date(),
      approxFilterRange: 4, // it will preview week dates with weekends highlighted with 1 week limitations ex: title (Wed 1, Thu 2, Fri 3)
      dayWidth: 60,
    },
  },
  {
    key: "month",
    i18n_title: "common.month",
    data: {
      startDate: new Date(),
      currentDate: new Date(),
      endDate: new Date(),
      approxFilterRange: 6, // it will preview monthly all dates with weekends highlighted with no limitations ex: title (1, 2, 3)
      dayWidth: 20,
    },
  },
  {
    key: "quarter",
    i18n_title: "common.quarter",
    data: {
      startDate: new Date(),
      currentDate: new Date(),
      endDate: new Date(),
      approxFilterRange: 24, // it will preview week starting dates all months data and there is 3 months limitation for preview ex: title (2, 9, 16, 23, 30)
      dayWidth: 5,
    },
  },
];

export const currentViewDataWithView = (view: TGanttViews = "month") =>
  VIEWS_LIST.find((_viewData) => _viewData.key === view);
