/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { initPromise, i18nInstance } from "./instance";
import { LANGUAGE_STORAGE_KEY } from "../constants/language";
import type { TLanguage } from "../types";

export async function setLanguage(lng: TLanguage): Promise<void> {
  // XBus uses one Vietnamese interface, including profiles created before localization.
  if (process.env.VITE_XBUS_EMBEDDED === "true") lng = "vi-VN";
  await initPromise;
  await i18nInstance.changeLanguage(lng);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch {
      // Keep the selected language even when browser storage is unavailable.
    }
    document.documentElement.lang = lng;
  }
}
