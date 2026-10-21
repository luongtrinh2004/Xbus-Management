/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane constants
import { EIssueFilterType, ISSUE_DISPLAY_FILTERS_BY_PAGE } from "@plane/constants";
// i18n
import { useTranslation } from "@plane/i18n";
// types
import type { IIssueDisplayFilterOptions, IIssueDisplayProperties } from "@plane/types";
import { EIssuesStoreType, EIssueLayoutTypes } from "@plane/types";
// components
import { DisplayFiltersSelection, FiltersDropdown, LayoutSelection } from "@/components/issues/issue-layouts/filters";
import { WorkItemFiltersToggle } from "@/components/work-item-filters/filters-toggle";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
import { useUser } from "@/hooks/store/user";

export const ProfileIssuesFilter = observer(function ProfileIssuesFilter() {
  // i18n
  const { t } = useTranslation();
  // router
  const { workspaceSlug, userId: routeUserId, profileViewId } = useParams();
  const { data: currentUser } = useUser();
  const userId = routeUserId ? routeUserId.toString() : undefined;
  // store hook
  const {
    issues: { showPersonalPlanning },
    issuesFilter: { issueFilters, updateFilters },
  } = useIssues(EIssuesStoreType.PROFILE);
  // derived values
  const activeLayout = issueFilters?.displayFilters?.layout;
  const isPlanning = userId === currentUser?.id && profileViewId === "assigned" && showPersonalPlanning;

  const handleLayoutChange = useCallback(
    (layout: EIssueLayoutTypes) => {
      if (!workspaceSlug || !userId) return;
      updateFilters(workspaceSlug.toString(), undefined, EIssueFilterType.DISPLAY_FILTERS, { layout: layout }, userId);
    },
    [workspaceSlug, updateFilters, userId]
  );

  const handleDisplayFilters = useCallback(
    (updatedDisplayFilter: Partial<IIssueDisplayFilterOptions>) => {
      if (!workspaceSlug || !userId) return;
      updateFilters(
        workspaceSlug.toString(),
        undefined,
        EIssueFilterType.DISPLAY_FILTERS,
        updatedDisplayFilter,
        userId
      );
    },
    [workspaceSlug, updateFilters, userId]
  );

  const handleDisplayProperties = useCallback(
    (property: Partial<IIssueDisplayProperties>) => {
      if (!workspaceSlug || !userId) return;
      updateFilters(workspaceSlug.toString(), undefined, EIssueFilterType.DISPLAY_PROPERTIES, property, userId);
    },
    [workspaceSlug, updateFilters, userId]
  );

  return (
    <div className="relative flex items-center justify-end gap-2">
      <LayoutSelection
        layouts={[EIssueLayoutTypes.LIST, EIssueLayoutTypes.KANBAN]}
        onChange={(layout) => handleLayoutChange(layout)}
        selectedLayout={activeLayout}
      />
      {userId && !isPlanning && <WorkItemFiltersToggle entityType={EIssuesStoreType.PROFILE} entityId={userId} />}
      {!isPlanning && (
        <FiltersDropdown title={t("common.display")} placement="bottom-end">
          <DisplayFiltersSelection
            layoutDisplayFiltersOptions={
              activeLayout ? ISSUE_DISPLAY_FILTERS_BY_PAGE.profile_issues.layoutOptions[activeLayout] : undefined
            }
            displayFilters={issueFilters?.displayFilters ?? {}}
            handleDisplayFiltersUpdate={handleDisplayFilters}
            displayProperties={issueFilters?.displayProperties ?? {}}
            handleDisplayPropertiesUpdate={handleDisplayProperties}
          />
        </FiltersDropdown>
      )}
    </div>
  );
});
