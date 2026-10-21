/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { MembersOutline } from "@makeplane/propel/icons";
import { useTranslation } from "@plane/i18n";
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
import { MemberSelect } from "@/components/dropdowns/member/member-select";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

export const IssueCollaborators = observer(function IssueCollaborators({
  workspaceSlug,
  projectId,
  issueId,
  disabled,
}: {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const { subscription } = useIssueDetail();
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const ids = subscription.collaboratorMap[issueId];

  useEffect(() => {
    let mounted = true;
    const load = () =>
      subscription
        .fetchCollaborators(workspaceSlug, projectId, issueId)
        .then(() => {
          if (mounted) setLoadFailed(false);
        })
        .catch(() => {
          if (mounted) setLoadFailed(true);
        });
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [subscription, workspaceSlug, projectId, issueId]);

  const save = async (nextIds: string[]) => {
    setSaveFailed(false);
    try {
      await subscription.saveCollaborators(workspaceSlug, projectId, issueId, nextIds);
    } catch {
      setSaveFailed(true);
    }
  };

  return (
    <SidebarPropertyListItem icon={MembersOutline} label={t("collaborators.heading")}>
      <div className="min-w-0 grow space-y-1" aria-busy={subscription.savingCollaborators[issueId]}>
        <MemberSelect
          testId="work-item-collaborators-select"
          value={ids ?? []}
          onChange={(nextIds) => void save(nextIds)}
          disabled={disabled || !ids || loadFailed || subscription.savingCollaborators[issueId]}
          projectId={projectId}
          placeholder={!ids && !loadFailed ? t("common.loading") : t("collaborators.add")}
          multiple
          variant="select-ghost-md"
          showLabel={(ids?.length ?? 0) <= 1}
          tooltip={{ heading: t("collaborators.heading") }}
        />
        {(loadFailed || saveFailed) && (
          <p role="alert" className="px-2 text-12 text-danger-primary">
            {t(loadFailed ? "collaborators.load_failed" : "collaborators.save_failed")}
          </p>
        )}
      </div>
    </SidebarPropertyListItem>
  );
});
