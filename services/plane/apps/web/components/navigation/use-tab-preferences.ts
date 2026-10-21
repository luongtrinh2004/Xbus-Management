import { useTranslation } from "@plane/i18n";
import { moveTab } from "./tab-order";
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo, useRef } from "react";
import { setToast } from "@plane/blocks/toast";
import { useMember } from "@/hooks/store/use-member";
import { useUser } from "@/hooks/store/user";
import { DEFAULT_TAB_KEY } from "./tab-navigation-utils";
import type { TTabPreferences } from "./tab-navigation-utils";

export type TTabPreferencesHook = {
  tabPreferences: TTabPreferences;
  isLoading: boolean;
  handleToggleDefaultTab: (tabKey: string) => void;
  handleHideTab: (tabKey: string) => void;
  handleShowTab: (tabKey: string) => void;
  handleMoveTab: (key: string, direction: -1 | 1, available: string[]) => void;
};

/**
 * Custom hook to manage tab preferences for a project
 * Uses MobX store for state management and API persistence
 *
 * @param workspaceSlug - The workspace slug
 * @param projectId - The project ID
 * @returns Tab preferences state and handlers
 */
export const useTabPreferences = (workspaceSlug: string, projectId: string): TTabPreferencesHook => {
  const { t } = useTranslation();
  const {
    project: { getProjectUserProperties, updateProjectUserProperties },
  } = useMember();
  const { data } = useUser();
  const pending = useRef(false);
  const storePreferences = getProjectUserProperties(projectId);
  const nav = storePreferences?.preferences?.navigation;
  const tabPreferences: TTabPreferences = useMemo(
    () => ({
      defaultTab: nav?.default_tab || DEFAULT_TAB_KEY,
      hiddenTabs: nav?.hide_in_more_menu || [],
      order: nav?.tab_order || [],
    }),
    [nav?.default_tab, nav?.hide_in_more_menu, nav?.tab_order]
  );
  const update = async (next: TTabPreferences) => {
    if (pending.current) return;
    pending.current = true;
    try {
      await updateProjectUserProperties(workspaceSlug, projectId, {
        preferences: {
          ...storePreferences?.preferences,
          pages: storePreferences?.preferences?.pages || { block_display: false },
          navigation: {
            ...nav,
            default_tab: next.defaultTab,
            hide_in_more_menu: next.hiddenTabs,
            tab_order: next.order ?? [],
          },
        },
      });
    } catch {
      setToast({
        type: "error",
        title: t("project_tab_preferences.error"),
        message: t("project_tab_preferences.save_failed"),
      });
    } finally {
      pending.current = false;
    }
  };
  return {
    tabPreferences,
    isLoading: !storePreferences && data?.id != null,
    handleToggleDefaultTab: (key) => {
      void update({ ...tabPreferences, defaultTab: key === tabPreferences.defaultTab ? DEFAULT_TAB_KEY : key });
    },
    handleHideTab: (key) => {
      void update({ ...tabPreferences, hiddenTabs: [...new Set([...tabPreferences.hiddenTabs, key])] });
    },
    handleShowTab: (key) => {
      void update({ ...tabPreferences, hiddenTabs: tabPreferences.hiddenTabs.filter((item) => item !== key) });
    },
    handleMoveTab: (key, direction, available) => {
      void update({ ...tabPreferences, order: moveTab(tabPreferences.order ?? [], available, key, direction) });
    },
  };
};
