import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { ChevronDown, GripVertical } from "lucide-react";
import { Button } from "@makeplane/propel/elements/button";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { DateSelect } from "@plane/blocks/property-select";
import { Select } from "@plane/blocks/select";
import { setToast } from "@plane/blocks/toast";
import { cn, getDate, renderFormattedPayloadDate, shouldHighlightIssueDueDate } from "@plane/utils";
import type { TIssue } from "@plane/types";
import { PrioritySelect } from "@/components/dropdowns/priority/priority-select";
import { StateSelect } from "@/components/dropdowns/state/state-select";
import { IssueCompletionButton } from "@/components/issues/completion/button";
import { IssueIdentifier } from "@/components/issues/issue-detail/issue-identifier";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useUserPermissions, useUserProfile } from "@/hooks/store/user";
import { PLANNING_BUCKETS } from "@/services/my-task-planning.service";
import type { TPlanningBucket } from "@/services/my-task-planning.service";
import { MyTaskPlanningStore } from "@/store/issue/profile/planning.store";

type MoveTask = (issueId: string, bucket: TPlanningBucket, beforeId?: string) => Promise<void>;
const dragType = "MY_TASK_PLANNING";

function PlanningBucketSelect({
  bucket,
  disabled,
  onChange,
}: {
  bucket: TPlanningBucket;
  disabled: boolean;
  onChange: (bucket: TPlanningBucket) => void;
}) {
  const { t } = useTranslation();
  const label = (value: TPlanningBucket) => t(`my_task_planning.buckets.${value}`);
  return (
    <Select<TPlanningBucket>
      getValues={() => [...PLANNING_BUCKETS]}
      value={bucket}
      onChange={(value) => onChange(value as TPlanningBucket)}
      getOptionValue={(value) => value}
      getOptionLabel={label}
      showSearch={false}
      disabled={disabled}
    >
      <Select.Trigger<TPlanningBucket>
        variant="select-ghost-md"
        disabled={disabled}
        label={(values) => label(values[0] ?? bucket)}
        data-testid="my-task-planning-bucket"
        tooltip={{ heading: t("my_task_planning.move_to") }}
      >
        <span className="truncate text-12">{label(bucket)}</span>
      </Select.Trigger>
    </Select>
  );
}

const PlanningItem = observer(function PlanningItem({
  store,
  issueId,
  bucket,
  board,
  move,
}: {
  store: MyTaskPlanningStore;
  issueId: string;
  bucket: TPlanningBucket;
  board: boolean;
  move: MoveTask;
}) {
  const { t } = useTranslation();
  const detail = useIssueDetail();
  const { getStateById } = useProjectState();
  const { allowPermissions } = useUserPermissions();
  const { data: profile } = useUserProfile();
  const rowRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const issue = detail.rootIssueStore.issues.getIssueById(issueId);
  const saving = !!store.savingIds[issueId];
  const isLocalSource = useCallback(
    (data: Record<string | symbol, unknown>) =>
      data.type === dragType && data.slug === store.slug && data.userId === store.userId,
    [store]
  );

  useEffect(() => {
    const element = rowRef.current;
    const dragHandle = handleRef.current;
    if (!element || !dragHandle || saving) return;
    return combine(
      draggable({
        element,
        dragHandle,
        getInitialData: () => ({ type: dragType, issueId, slug: store.slug, userId: store.userId }),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => isLocalSource(source.data) && source.data.issueId !== issueId,
        getData: () => ({ type: dragType, bucket }),
        onDragEnter: () => setDragOver(true),
        onDragLeave: () => setDragOver(false),
        onDrop: ({ source, location, self }) => {
          setDragOver(false);
          if (location.current.dropTargets[0]?.element === self.element)
            void move(String(source.data.issueId), bucket, issueId);
        },
      })
    );
  }, [store, issueId, bucket, saving, move, isLocalSource]);
  if (!issue?.project_id) return null;
  const editable = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    store.slug,
    issue.project_id
  );
  const state = getStateById(issue.state_id);
  const completed = state?.group === "completed" || !!issue.completed_at;
  const update = async (data: Partial<TIssue>) => {
    if (!issue.project_id) return;
    try {
      await detail.updateIssue(store.slug, issue.project_id, issue.id, data);
    } catch (error) {
      setToast({
        type: "error",
        title: t("common.error.label"),
        message: t("entity.update.failed", { entity: t("issue.label") }),
      });
      throw error;
    }
  };

  return (
    <div
      ref={rowRef}
      data-testid="my-task-planning-item"
      data-issue-id={issueId}
      className={cn(
        "group/planning relative border-subtle bg-surface-1 text-13",
        board ? "rounded-md border p-3" : "flex min-h-10 items-center gap-3 border-b px-4 hover:bg-layer-1",
        { "ring-2 ring-accent-strong": dragOver }
      )}
    >
      <div className={cn("flex min-w-0 items-center gap-2", board ? "mb-2" : "flex-1")}>
        <button
          type="button"
          ref={handleRef}
          disabled={saving}
          aria-label={t("my_task_planning.drag_task", { name: issue.name })}
          className="size-5 shrink-0 cursor-grab text-tertiary opacity-0 group-hover/planning:opacity-100 focus-visible:opacity-100 active:cursor-grabbing [@media(hover:none)]:opacity-100"
        >
          <GripVertical className="size-4" />
        </button>
        <IssueCompletionButton
          issue={issue}
          workspaceSlug={store.slug}
          disabled={!editable}
          onChange={(id) => update({ state_id: id })}
        />
        <IssueIdentifier
          projectId={issue.project_id}
          projectIdentifier={detail.rootIssueStore.projectMap?.[issue.project_id]?.identifier ?? ""}
          issueSequenceId={issue.sequence_id}
          issueTypeId={issue.type_id}
          variant="tertiary"
          size="xs"
        />
        {!board && (
          <button
            type="button"
            onClick={() => detail.setPeekIssue({ workspaceSlug: store.slug, projectId: issue.project_id!, issueId })}
            className={cn("min-w-0 truncate text-left hover:text-accent-primary focus-visible:outline-2", {
              "text-tertiary line-through": completed,
            })}
          >
            {issue.name}
          </button>
        )}
      </div>
      {board && (
        <button
          type="button"
          onClick={() => detail.setPeekIssue({ workspaceSlug: store.slug, projectId: issue.project_id!, issueId })}
          className={cn("mb-3 block w-full text-left font-medium break-words hover:text-accent-primary", {
            "text-tertiary line-through": completed,
          })}
        >
          {issue.name}
        </button>
      )}
      <div className={cn("flex items-center", board ? "flex-wrap gap-2" : "shrink-0 gap-2")}>
        <div className={cn(!board && "w-30")}>
          <DateSelect
            value={getDate(issue.target_date) ?? null}
            onChange={(date) =>
              void update({ target_date: date ? renderFormattedPayloadDate(date) : null }).catch(() => undefined)
            }
            minDate={getDate(issue.start_date) ?? undefined}
            disabled={!editable}
            clearable
            placeholder={t("issue.add.due_date")}
            variant="select-ghost-md"
            weekStartsOn={profile?.start_of_the_week}
            className={cn({ "text-danger-primary": shouldHighlightIssueDueDate(issue.target_date, state?.group) })}
          />
        </div>
        <div className={cn(!board && "w-24")}>
          <PrioritySelect
            value={issue.priority}
            onChange={(priority) => void update({ priority }).catch(() => undefined)}
            disabled={!editable}
            variant="select-ghost-md"
          />
        </div>
        <div className={cn(!board && "w-32")}>
          <StateSelect
            value={issue.state_id}
            issueId={issue.id}
            onChange={(id) => update({ state_id: id })}
            projectId={issue.project_id}
            disabled={!editable}
            variant="select-ghost-md"
          />
        </div>
        <div className={cn(!board && "w-40")}>
          <PlanningBucketSelect bucket={bucket} disabled={saving} onChange={(next) => void move(issueId, next)} />
        </div>
      </div>
    </div>
  );
});

const PlanningGroup = observer(function PlanningGroup({
  store,
  bucket,
  board,
  move,
}: {
  store: MyTaskPlanningStore;
  bucket: TPlanningBucket;
  board: boolean;
  move: MoveTask;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    return dropTargetForElements({
      element: ref.current,
      canDrop: ({ source }) =>
        source.data.type === dragType && source.data.slug === store.slug && source.data.userId === store.userId,
      getData: () => ({ type: dragType, bucket }),
      onDragEnter: () => {
        setDragOver(true);
        setCollapsed(false);
      },
      onDragLeave: () => setDragOver(false),
      onDrop: ({ source, location, self }) => {
        setDragOver(false);
        if (location.current.dropTargets[0]?.element === self.element) void move(String(source.data.issueId), bucket);
      },
    });
  }, [store, bucket, move]);
  const ids = store.groups[bucket];
  return (
    <div
      ref={ref}
      data-testid={`my-task-planning-group-${bucket}`}
      className={cn("min-w-0", board ? "w-80 shrink-0 rounded-lg bg-layer-1 p-2" : "border-b border-subtle", {
        "bg-accent-subtle": dragOver,
      })}
    >
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
        className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-13 font-semibold"
      >
        <ChevronDown className={cn("size-4 text-tertiary transition-transform", { "-rotate-90": collapsed })} />
        <span>{t(`my_task_planning.buckets.${bucket}`)}</span>
        <span className="text-12 text-tertiary">{ids.length}</span>
      </button>
      {!collapsed && (
        <div className={cn(board && "space-y-2")}>
          {ids.map((id) => (
            <PlanningItem key={id} store={store} issueId={id} bucket={bucket} board={board} move={move} />
          ))}
          {ids.length === 0 && (
            <p className="min-h-14 px-8 py-4 text-12 text-tertiary">{t("my_task_planning.empty_group")}</p>
          )}
        </div>
      )}
    </div>
  );
});

export const MyTaskPlanning = observer(function MyTaskPlanning({
  workspaceSlug,
  userId,
  layout,
}: {
  workspaceSlug: string;
  userId: string;
  layout: string | undefined;
}) {
  const { t } = useTranslation();
  const { rootIssueStore } = useIssueDetail();
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const store = useMemo(
    () => new MyTaskPlanningStore(rootIssueStore, workspaceSlug, userId, includeCompleted),
    [rootIssueStore, workspaceSlug, userId, includeCompleted]
  );
  const board = layout === "kanban";
  useEffect(() => {
    void store.load();
    const timer = setInterval(() => void store.load(), 30000);
    return () => clearInterval(timer);
  }, [store]);
  const move = useCallback<MoveTask>(
    async (issueId, bucket, beforeId) => {
      try {
        await store.move(issueId, bucket, beforeId);
      } catch {
        setToast({ type: "error", title: t("common.error.label"), message: t("my_task_planning.save_failed") });
      }
    },
    [store, t]
  );
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-1">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle px-5 py-3">
        <p className="text-12 text-tertiary">{t("my_task_planning.hint")}</p>
        <label className="flex items-center gap-2 text-12 text-secondary">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(event) => setIncludeCompleted(event.target.checked)}
          />
          {t("my_task_planning.show_completed")}
        </label>
      </div>
      {store.error && (
        <p role="alert" className="flex items-center gap-2 px-5 py-3 text-12 text-danger-primary">
          {t("my_task_planning.load_failed")}
          <button type="button" className="underline" onClick={() => void store.load()}>
            {t("my_task_planning.retry")}
          </button>
        </p>
      )}
      {store.isLoading && Object.keys(store.placements).length === 0 ? (
        <p role="status" className="p-6 text-13 text-tertiary">
          {t("common.loading")}
        </p>
      ) : (
        <div className={cn("min-h-0 flex-1 overflow-auto", board ? "flex items-start gap-4 p-4" : "min-w-full")}>
          <div className={cn(board ? "contents" : "min-w-[900px]")}>
            {!board && (
              <div className="flex h-9 items-center gap-3 border-b border-subtle px-4 text-12 text-tertiary">
                <span className="flex-1">{t("common.name")}</span>
                <span className="w-30">{t("common.order_by.due_date")}</span>
                <span className="w-24">{t("common.priority")}</span>
                <span className="w-32">{t("common.state")}</span>
                <span className="w-40">{t("my_task_planning.plan")}</span>
              </div>
            )}
            {PLANNING_BUCKETS.map((bucket) => (
              <PlanningGroup key={bucket} store={store} bucket={bucket} board={board} move={move} />
            ))}
            {store.nextCursor && (
              <div className="p-4">
                <Button
                  variant="secondary"
                  size="sm"
                  stretch="auto"
                  disabled={store.isLoading}
                  onClick={() => void store.load(true)}
                >
                  {t("my_task_planning.load_more")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
