/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// store hooks
// icons
import { TriangleIcon, SignalMediumIcon } from "lucide-react";
import {
  ArchiveOutline,
  AttachOutline,
  CalendarOutline,
  ChatOutline,
  CyclesOutline,
  DuplicateOfOutline,
  EpicOutline,
  GridOutline,
  IntakeOutline,
  LabelsOutline,
  LinkOutline,
  MembersOutline,
  ModuleOutline,
  RelatesToOutline,
  WorkItemsOutline,
} from "@makeplane/propel/icons";
import { BlockedIcon, BlockerIcon } from "@plane/blocks/icons";
import { Tooltip } from "@makeplane/propel/components/tooltip";
import type { IIssueActivity } from "@plane/types";
import { renderFormattedDate, generateWorkItemLink, capitalizeFirstLetter } from "@plane/utils";
// helpers
import { useLabel } from "@/hooks/store/use-label";
import { usePlatformOS } from "@/hooks/use-platform-os";
// types

export function IssueLink({ activity }: { activity: IIssueActivity }) {
  // router params
  const { workspaceSlug } = useParams();
  const { isMobile } = usePlatformOS();

  const workItemLink = generateWorkItemLink({
    workspaceSlug: workspaceSlug?.toString() ?? activity.workspace_detail?.slug,
    projectId: activity?.project,
    issueId: activity?.issue,
    projectIdentifier: activity?.project_detail?.identifier,
    sequenceId: activity?.issue_detail?.sequence_id,
  });

  return (
    <Tooltip
      label={activity?.issue_detail ? activity.issue_detail.name : "Công việc này đã bị xóa"}
      layout="stacked"
      disabled={isMobile}
    >
      {activity?.issue_detail ? (
        <a
          aria-disabled={activity.issue === null}
          href={workItemLink}
          target={activity.issue === null ? "_self" : "_blank"}
          rel={activity.issue === null ? "" : "noopener noreferrer"}
          className="inline items-center gap-1 font-medium text-primary hover:underline"
        >
          <span className="whitespace-nowrap">{`${activity.project_detail.identifier}-${activity.issue_detail.sequence_id}`}</span>{" "}
          <span className="font-regular break-all">{activity.issue_detail?.name}</span>
        </a>
      ) : (
        <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-primary">
          {"một công việc"}{" "}
        </span>
      )}
    </Tooltip>
  );
}

function UserLink({ activity }: { activity: IIssueActivity }) {
  // router params
  const { workspaceSlug } = useParams();

  return (
    <a
      href={`/${workspaceSlug ?? activity.workspace_detail?.slug}/profile/${
        activity.new_identifier ?? activity.old_identifier
      }`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center font-medium text-primary hover:underline"
    >
      {activity.new_value && activity.new_value !== "" ? activity.new_value : activity.old_value}
    </a>
  );
}

const LabelPill = observer(function LabelPill({ labelId, workspaceSlug }: { labelId: string; workspaceSlug: string }) {
  // store hooks
  const { workspaceLabels, fetchWorkspaceLabels } = useLabel();

  useEffect(() => {
    if (!workspaceLabels) fetchWorkspaceLabels(workspaceSlug);
  }, [fetchWorkspaceLabels, workspaceLabels, workspaceSlug]);

  return (
    <span
      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
      style={{
        backgroundColor: workspaceLabels?.find((l) => l.id === labelId)?.color ?? "#000000",
      }}
      aria-hidden="true"
    />
  );
});

const inboxActivityMessage = {
  declined: {
    showIssue: "declined work item",
    noIssue: "declined this work item from intake.",
  },
  snoozed: {
    showIssue: "snoozed work item",
    noIssue: "snoozed this work item.",
  },
  accepted: {
    showIssue: "accepted work item",
    noIssue: "accepted this work item from intake.",
  },
  markedDuplicate: {
    showIssue: "declined work item",
    noIssue: "declined this work item from intake by marking a duplicate work item.",
  },
};

const getInboxUserActivityMessage = (activity: IIssueActivity, showIssue: boolean) => {
  switch (activity.verb) {
    case "-1":
      return showIssue ? inboxActivityMessage.declined.showIssue : inboxActivityMessage.declined.noIssue;
    case "0":
      return showIssue ? inboxActivityMessage.snoozed.showIssue : inboxActivityMessage.snoozed.noIssue;
    case "1":
      return showIssue ? inboxActivityMessage.accepted.showIssue : inboxActivityMessage.accepted.noIssue;
    case "2":
      return showIssue ? inboxActivityMessage.markedDuplicate.showIssue : inboxActivityMessage.markedDuplicate.noIssue;
    default:
      return "updated intake work item status.";
  }
};

const activityDetails: {
  [key: string]: {
    message: (activity: IIssueActivity, showIssue: boolean, workspaceSlug: string) => React.ReactNode;
    icon: React.ReactNode;
  };
} = {
  assignees: {
    message: (activity, showIssue) => {
      if (activity.old_value === "")
        return (
          <>
            đã thêm người phụ trách <UserLink activity={activity} />
            {showIssue && (
              <>
                {" "}
                đến <IssueLink activity={activity} />
              </>
            )}
          </>
        );
      else
        return (
          <>
            đã bỏ người phụ trách <UserLink activity={activity} />
            {showIssue && (
              <>
                {" "}
                từ <IssueLink activity={activity} />
              </>
            )}
          </>
        );
    },
    icon: <MembersOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  archived_at: {
    message: (activity) => {
      if (activity.new_value === "restore")
        return (
          <>
            đã khôi phục <IssueLink activity={activity} />
          </>
        );
      else
        return (
          <>
            Đã lưu trữ <IssueLink activity={activity} />
          </>
        );
    },
    icon: <ArchiveOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  attachment: {
    message: (activity, showIssue) => {
      if (activity.verb === "created")
        return (
          <>
            đã tải lên tệp đính kèm mới
            {showIssue && (
              <>
                {" "}
                đến <IssueLink activity={activity} />
              </>
            )}
          </>
        );
      else
        return (
          <>
            đã xóa tệp đính kèm
            {showIssue && (
              <>
                {" "}
                từ <IssueLink activity={activity} />
              </>
            )}
          </>
        );
    },
    icon: <AttachOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  description: {
    message: (activity, showIssue) => (
      <>
        đã cập nhật mô tả
        {showIssue && (
          <>
            {" "}
            của <IssueLink activity={activity} />
          </>
        )}
      </>
    ),
    icon: <ChatOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  estimate_point: {
    message: (activity, showIssue) => {
      if (!activity.new_value)
        return (
          <>
            đã bỏ điểm ước lượng
            {showIssue && (
              <>
                {" "}
                từ <IssueLink activity={activity} />
              </>
            )}
          </>
        );
      else
        return (
          <>
            đã đặt điểm ước lượng là {activity.new_value}
            {showIssue && (
              <>
                {" "}
                cho <IssueLink activity={activity} />
              </>
            )}
          </>
        );
    },
    icon: <TriangleIcon size={12} className="text-secondary" aria-hidden="true" />,
  },
  issue: {
    message: (activity) => {
      if (activity.verb === "created")
        return (
          <>
            Đã tạo <IssueLink activity={activity} />
          </>
        );
      else if (activity.verb === "converted")
        return (
          <>
            đã chuyển đổi <IssueLink activity={activity} /> thành Epic
          </>
        );
      else
        return (
          <>
            đã xóa <IssueLink activity={activity} />
          </>
        );
    },
    icon: <WorkItemsOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  epic: {
    message: (activity) => {
      if (activity.verb === "created")
        return (
          <>
            Đã tạo <IssueLink activity={activity} />
          </>
        );
      else if (activity.verb === "converted")
        return (
          <>
            đã chuyển đổi <IssueLink activity={activity} /> thành công việc
          </>
        );
      else
        return (
          <>
            đã xóa <IssueLink activity={activity} />
          </>
        );
    },
    icon: <EpicOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  labels: {
    message: (activity, showIssue, workspaceSlug) => {
      if (activity.old_value === "")
        return (
          <span className="overflow-hidden">
            đã thêm nhãn{" "}
            <span className="inline-flex items-center gap-2 rounded-full border border-strong px-2 py-0.5 text-11">
              <LabelPill labelId={activity.new_identifier ?? ""} workspaceSlug={workspaceSlug} />
              <span className="line-clamp-1 flex-shrink font-medium break-all text-primary">{activity.new_value}</span>
            </span>
            {showIssue && (
              <span className="">
                {" "}
                đến <IssueLink activity={activity} />
              </span>
            )}
          </span>
        );
      else
        return (
          <>
            đã bỏ nhãn{" "}
            <span className="inline-flex items-center gap-2 rounded-full border border-strong px-2 py-0.5 text-11">
              <LabelPill labelId={activity.old_identifier ?? ""} workspaceSlug={workspaceSlug} />
              <span className="line-clamp-1 flex-shrink font-medium break-all text-primary">{activity.old_value}</span>
            </span>
            {showIssue && (
              <span>
                {" "}
                từ <IssueLink activity={activity} />
              </span>
            )}
          </>
        );
    },
    icon: <LabelsOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  link: {
    message: (activity, showIssue) => {
      if (activity.verb === "created")
        return (
          <>
            đã thêm mục này{" "}
            <a
              href={`${activity.new_value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Liên kết
            </a>
            {showIssue && (
              <>
                {" "}
                đến <IssueLink activity={activity} />
              </>
            )}
          </>
        );
      else if (activity.verb === "updated")
        return (
          <>
            đã cập nhật{" "}
            <a
              href={`${activity.old_value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Liên kết
            </a>
            {showIssue && (
              <>
                {" "}
                từ <IssueLink activity={activity} />
              </>
            )}
          </>
        );
      else
        return (
          <>
            đã xóa mục này{" "}
            <a
              href={`${activity.old_value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Liên kết
            </a>
            {showIssue && (
              <>
                {" "}
                từ <IssueLink activity={activity} />
              </>
            )}
          </>
        );
    },
    icon: <LinkOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  cycles: {
    message: (activity, showIssue, workspaceSlug) => {
      if (activity.verb === "created")
        return (
          <>
            <span className="flex-shrink-0">
              Đã thêm {showIssue ? <IssueLink activity={activity} /> : "công việc này"}{" "}
              <span className="whitespace-nowrap">vào chu kỳ</span>{" "}
            </span>
            <a
              href={`/${workspaceSlug}/projects/${activity.project}/cycles/${activity.new_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline items-center gap-1 font-medium text-primary hover:underline"
            >
              <span className="break-all">{activity.new_value}</span>
            </a>
          </>
        );
      else if (activity.verb === "updated")
        return (
          <>
            <span className="flex-shrink-0 whitespace-nowrap">đã đặt chu kỳ thành </span>
            <a
              href={`/${workspaceSlug}/projects/${activity.project}/cycles/${activity.new_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline items-center gap-1 font-medium text-primary hover:underline"
            >
              <span className="break-all">{activity.new_value}</span>
            </a>
          </>
        );
      else
        return (
          <>
            đã xóa <IssueLink activity={activity} /> khỏi chu kỳ{" "}
            <a
              href={`/${workspaceSlug}/projects/${activity.project}/cycles/${activity.old_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline items-center gap-1 font-medium text-primary hover:underline"
            >
              <span className="break-all">{activity.old_value}</span>
            </a>
          </>
        );
    },
    icon: <CyclesOutline height={12} width={12} className="text-secondary" aria-hidden="true" />,
  },
  modules: {
    message: (activity, showIssue, workspaceSlug) => {
      if (activity.verb === "created")
        return (
          <>
            Đã thêm {showIssue ? <IssueLink activity={activity} /> : "this work item"} vào nhóm công việc{" "}
            <a
              href={`/${workspaceSlug}/projects/${activity.project}/modules/${activity.new_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline items-center gap-1 font-medium text-primary hover:underline"
            >
              <span className="break-all">{activity.new_value}</span>
            </a>
          </>
        );
      else if (activity.verb === "updated")
        return (
          <>
            đã đặt nhóm công việc thành{" "}
            <a
              href={`/${workspaceSlug}/projects/${activity.project}/modules/${activity.new_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline items-center gap-1 font-medium text-primary hover:underline"
            >
              <span className="break-all">{activity.new_value}</span>
            </a>
          </>
        );
      else
        return (
          <>
            đã xóa <IssueLink activity={activity} /> khỏi nhóm công việc{" "}
            <a
              href={`/${workspaceSlug}/projects/${activity.project}/modules/${activity.old_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline items-center gap-1 font-medium text-primary hover:underline"
            >
              <span className="break-all">{activity.old_value}</span>
            </a>
          </>
        );
    },
    icon: <ModuleOutline className="h-3 w-3 !text-secondary" aria-hidden="true" />,
  },
  name: {
    message: (activity, showIssue) => (
      <>
        đã đổi tiêu đề thành <span className="break-all">{activity.new_value}</span>
        {showIssue && (
          <>
            {" "}
            của <IssueLink activity={activity} />
          </>
        )}
      </>
    ),
    icon: <ChatOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  parent: {
    message: (activity, showIssue) => {
      if (!activity.new_value)
        return (
          <>
            đã bỏ công việc cha <span className="font-medium whitespace-nowrap text-primary">{activity.old_value}</span>
            {showIssue && (
              <>
                {" "}
                từ <IssueLink activity={activity} />
              </>
            )}
          </>
        );
      else
        return (
          <>
            đã đặt công việc cha là{" "}
            <span className="font-medium whitespace-nowrap text-primary">{activity.new_value}</span>
            {showIssue && (
              <>
                {" "}
                cho <IssueLink activity={activity} />
              </>
            )}
          </>
        );
    },
    icon: <MembersOutline className="h-3 w-3 !text-secondary" aria-hidden="true" />,
  },
  priority: {
    message: (activity, showIssue) => (
      <>
        đã đặt độ ưu tiên thành{" "}
        <span className="font-medium text-primary">
          {activity.new_value ? capitalizeFirstLetter(activity.new_value) : "Không có"}
        </span>
        {showIssue && (
          <>
            {" "}
            cho <IssueLink activity={activity} />
          </>
        )}
      </>
    ),
    icon: <SignalMediumIcon size={12} className="text-secondary" aria-hidden="true" />,
  },
  relates_to: {
    message: (activity, showIssue) => {
      if (activity.old_value === "")
        return (
          <>
            đã đánh dấu rằng {showIssue ? <IssueLink activity={activity} /> : "this work item"} liên quan đến{" "}
            <span className="font-medium whitespace-nowrap text-primary">{activity.new_value}</span>.
          </>
        );
      else
        return (
          <>
            đã bỏ liên kết với <span className="font-medium whitespace-nowrap text-primary">{activity.old_value}</span>.
          </>
        );
    },
    icon: <RelatesToOutline height="12" width="12" className="text-secondary" />,
  },
  blocking: {
    message: (activity, showIssue) => {
      if (activity.old_value === "")
        return (
          <>
            đã đánh dấu {showIssue ? <IssueLink activity={activity} /> : "this work item"} đang chặn công việc{" "}
            <span className="font-medium whitespace-nowrap text-primary">{activity.new_value}</span>.
          </>
        );
      else
        return (
          <>
            đã bỏ công việc chặn{" "}
            <span className="font-medium whitespace-nowrap text-primary">{activity.old_value}</span>.
          </>
        );
    },
    icon: <BlockerIcon height="12" width="12" className="text-secondary" />,
  },
  blocked_by: {
    message: (activity, showIssue) => {
      if (activity.old_value === "")
        return (
          <>
            đã đánh dấu {showIssue ? <IssueLink activity={activity} /> : "this work item"} đang bị chặn bởi{" "}
            <span className="font-medium whitespace-nowrap text-primary">{activity.new_value}</span>.
          </>
        );
      else
        return (
          <>
            đã xóa {showIssue ? <IssueLink activity={activity} /> : "this work item"} đang bị chặn bởi công việc{" "}
            <span className="font-medium whitespace-nowrap text-primary">{activity.old_value}</span>.
          </>
        );
    },
    icon: <BlockedIcon height="12" width="12" className="text-secondary" />,
  },
  duplicate: {
    message: (activity, showIssue) => {
      if (activity.old_value === "")
        return (
          <>
            đã đánh dấu {showIssue ? <IssueLink activity={activity} /> : "this work item"} là bản trùng lặp của{" "}
            <span className="font-medium whitespace-nowrap text-primary">{activity.new_value}</span>.
          </>
        );
      else
        return (
          <>
            đã xóa {showIssue ? <IssueLink activity={activity} /> : "this work item"} là bản trùng lặp của{" "}
            <span className="font-medium whitespace-nowrap text-primary">{activity.old_value}</span>.
          </>
        );
    },
    icon: <DuplicateOfOutline width={12} height={12} className="text-secondary" />,
  },
  state: {
    message: (activity, showIssue) => (
      <>
        đã đặt trạng thái thành <span className="font-medium break-all text-primary">{activity.new_value}</span>
        {showIssue && (
          <>
            {" "}
            cho <IssueLink activity={activity} />
          </>
        )}
      </>
    ),
    icon: <GridOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  start_date: {
    message: (activity, showIssue) => {
      if (!activity.new_value)
        return (
          <>
            đã bỏ ngày bắt đầu
            {showIssue && (
              <>
                {" "}
                từ <IssueLink activity={activity} />
              </>
            )}
          </>
        );
      else
        return (
          <>
            đã đặt ngày bắt đầu là{" "}
            <span className="font-medium whitespace-nowrap text-primary">
              {renderFormattedDate(activity.new_value)}
            </span>
            {showIssue && (
              <>
                {" "}
                cho <IssueLink activity={activity} />
              </>
            )}
          </>
        );
    },
    icon: <CalendarOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  target_date: {
    message: (activity, showIssue) => {
      if (!activity.new_value)
        return (
          <>
            đã bỏ hạn hoàn thành
            {showIssue && (
              <>
                {" "}
                từ <IssueLink activity={activity} />
              </>
            )}
          </>
        );
      else
        return (
          <>
            đã đặt hạn hoàn thành là{" "}
            <span className="font-medium whitespace-nowrap text-primary">
              {renderFormattedDate(activity.new_value)}
            </span>
            {showIssue && (
              <>
                <IssueLink activity={activity} />
              </>
            )}
          </>
        );
    },
    icon: <CalendarOutline width={12} height={12} className="text-secondary" aria-hidden="true" />,
  },
  inbox: {
    message: (activity, showIssue) => (
      <>
        {getInboxUserActivityMessage(activity, showIssue)}
        {showIssue && (
          <>
            {" "}
            <IssueLink activity={activity} />
          </>
        )}
        {activity.verb === "2" && ` from intake by marking a duplicate work item.`}
      </>
    ),
    icon: <IntakeOutline className="size-3 text-secondary" aria-hidden="true" />,
  },
};

export function ActivityIcon({ activity }: { activity: IIssueActivity }) {
  return <>{activityDetails[activity.field as keyof typeof activityDetails]?.icon}</>;
}

type ActivityMessageProps = {
  activity: IIssueActivity;
  showIssue?: boolean;
};

export function ActivityMessage({ activity, showIssue = false }: ActivityMessageProps) {
  // router params
  const { workspaceSlug } = useParams();
  const activityField = activity.field ?? "issue";

  return (
    <>
      {activityDetails[activityField as keyof typeof activityDetails]?.message(
        activity,
        showIssue,
        workspaceSlug ? workspaceSlug.toString() : (activity.workspace_detail?.slug ?? "")
      )}
    </>
  );
}
