/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
import { isEmpty } from "lodash-es";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// Plane imports
import { useTranslation } from "@plane/i18n";
import { setToast } from "@plane/blocks/toast";
import type { TIssue } from "@plane/types";
import { isEmptyHtmlString } from "@plane/utils";
// hooks
import { useIssueModal } from "@/hooks/context/use-issue-modal";
import { useWorkspaceDraftIssues } from "@/hooks/store/workspace-draft";
import { useUser } from "@/hooks/store/user";
import { createIssueSubmissionGuard } from "@/helpers/issue-submission";
// local imports
import { ConfirmIssueDiscard } from "../confirm-issue-discard";
import { IssueFormRoot } from "./form";
import type { IssueFormProps } from "./form";
import {
  getDraftStorage,
  localIssueDraftKey,
  readLocalIssueDraft,
  removeLocalIssueDraft,
  saveLocalIssueDraft,
} from "./local-draft";

export interface DraftIssueProps extends IssueFormProps {
  changesMade: Partial<TIssue> | null;
  onChange: (formData: Partial<TIssue> | null) => void;
}

export const DraftIssueLayout = observer(function DraftIssueLayout(props: DraftIssueProps) {
  const { changesMade, data, onChange, onClose, projectId } = props;
  // states
  const [issueDiscardModal, setIssueDiscardModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const submissionGuard = useRef(createIssueSubmissionGuard());
  const savedDraftId = useRef<string | null>(null);
  // router params
  const { workspaceSlug } = useParams();
  // store hooks
  const { handleCreateUpdatePropertyValues } = useIssueModal();
  const { createIssue, updateIssue } = useWorkspaceDraftIssues();
  const { data: currentUser } = useUser();
  const { t } = useTranslation();
  const localKey =
    currentUser?.id && workspaceSlug && !data?.id && !data?.sourceIssueId
      ? localIssueDraftKey(currentUser.id, workspaceSlug.toString(), projectId, data?.parent_id ?? "")
      : null;
  const [recoveredDraft, setRecoveredDraft] = useState(() =>
    localKey ? readLocalIssueDraft(getDraftStorage(), localKey) : null
  );
  const hydratedLocalKey = useRef(localKey);
  const [recoveryVersion, setRecoveryVersion] = useState(0);
  const draftValues = changesMade ?? recoveredDraft?.data ?? null;
  const hasLocalChanges = useRef(false);

  useEffect(() => {
    if (hydratedLocalKey.current === localKey) return;
    hydratedLocalKey.current = localKey;
    // Account data can arrive after the form mounts. Do not overwrite edits the
    // user has already made while it was loading.
    if (localKey && !changesMade) {
      const recovered = readLocalIssueDraft(getDraftStorage(), localKey);
      setRecoveredDraft(recovered);
      if (recovered) setRecoveryVersion((version) => version + 1);
    }
  }, [localKey, changesMade]);

  // This is local recovery only. Network writes still require an explicit action.
  useEffect(() => {
    if (!localKey) return;
    if (changesMade) {
      saveLocalIssueDraft(getDraftStorage(), localKey, changesMade);
      hasLocalChanges.current = true;
    } else if (hasLocalChanges.current && !recoveredDraft) {
      removeLocalIssueDraft(getDraftStorage(), localKey);
      hasLocalChanges.current = false;
    }
  }, [changesMade, localKey, recoveredDraft]);

  const clearLocalDraft = () => {
    if (localKey) removeLocalIssueDraft(getDraftStorage(), localKey);
  };

  const sanitizeChanges = (): Partial<TIssue> => {
    const sanitizedChanges = { ...draftValues };
    Object.entries(sanitizedChanges).forEach(([key, value]) => {
      const issueKey = key as keyof TIssue;
      if (value === null || value === undefined || value === "") delete sanitizedChanges[issueKey];
      if (typeof value === "object" && isEmpty(value)) delete sanitizedChanges[issueKey];
      if (Array.isArray(value) && value.length === 0) delete sanitizedChanges[issueKey];
      if (issueKey === "project_id") delete sanitizedChanges.project_id;
      if (issueKey === "priority" && value && value === "none") delete sanitizedChanges.priority;
      if (
        issueKey === "description_html" &&
        draftValues?.description_html &&
        isEmptyHtmlString(draftValues.description_html, ["img"])
      )
        delete sanitizedChanges.description_html;
    });
    return sanitizedChanges;
  };

  const handleClose = () => {
    if (submissionGuard.current.pending) return;
    // If the user is updating an existing work item, we don't need to show the discard modal
    if (data?.id) {
      onClose();
      setIssueDiscardModal(false);
    } else {
      if (draftValues) {
        const sanitizedChanges = sanitizeChanges();
        if (isEmpty(sanitizedChanges)) {
          clearLocalDraft();
          onClose();
          setIssueDiscardModal(false);
        } else setIssueDiscardModal(true);
      } else {
        onClose();
        setIssueDiscardModal(false);
      }
    }
  };

  const handleCreateDraftIssue = async () => {
    if (!draftValues || !workspaceSlug || !projectId) return;

    const payload = {
      ...draftValues,
      name: draftValues.name?.trim() || "Chưa có tên",
      project_id: draftValues.project_id || projectId,
    };
    await submissionGuard.current.run(async () => {
      setIsSavingDraft(true);
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          if (!localKey || !saveLocalIssueDraft(getDraftStorage(), localKey, payload))
            throw new Error("local-draft-unavailable");
          setToast({
            type: "success",
            title: t("issue_form_draft.local_saved_title"),
            message: t("issue_form_draft.local_saved_message"),
          });
          onClose();
          return;
        }
        const response = savedDraftId.current
          ? await updateIssue(workspaceSlug.toString(), savedDraftId.current, payload)
          : await createIssue(workspaceSlug.toString(), payload);
        if (!response) throw new Error("draft-creation-failed");
        // If saving extended properties fails, retry updates this draft instead
        // of creating another server draft.
        savedDraftId.current = response.id;
        await handleCreateUpdatePropertyValues({
          issueId: response.id,
          issueTypeId: response.type_id,
          projectId: payload.project_id,
          workspaceSlug: workspaceSlug.toString(),
          isDraft: true,
        });
        setToast({
          type: "success",
          title: `${t("success")}!`,
          message: t("workspace_draft_issues.toasts.created.success"),
        });
        clearLocalDraft();
        setRecoveredDraft(null);
        onChange(null);
        setIssueDiscardModal(false);
        onClose();
      } catch {
        setToast({
          type: "error",
          title: `${t("error")}!`,
          message: t("workspace_draft_issues.toasts.created.error"),
        });
      } finally {
        setIsSavingDraft(false);
      }
    });
  };

  const handleDraftAndClose = () => {
    const sanitizedChanges = sanitizeChanges();
    if (!data?.id && !isEmpty(sanitizedChanges)) {
      void handleCreateDraftIssue();
      return;
    }
    clearLocalDraft();
    onClose();
  };

  return (
    <>
      <ConfirmIssueDiscard
        isOpen={issueDiscardModal}
        handleClose={() => setIssueDiscardModal(false)}
        onConfirm={handleCreateDraftIssue}
        onDiscard={() => {
          if (submissionGuard.current.pending) return;
          clearLocalDraft();
          onChange(null);
          setIssueDiscardModal(false);
          onClose();
        }}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {recoveredDraft && (
          <p role="status" className="border-b border-subtle px-6 py-3 text-12 text-secondary">
            {t("issue_form_draft.recovered")}
          </p>
        )}
        <IssueFormRoot
          {...props}
          data={recoveredDraft ? { ...data, ...recoveredDraft.data } : data}
          dataResetProperties={[...(props.dataResetProperties ?? []), recoveryVersion]}
          onSubmit={async (...args) => {
            if (submissionGuard.current.pending) throw new Error(t("issue_form_draft.saving_wait"));
            await submissionGuard.current.run(async () => {
              await props.onSubmit(...args);
              clearLocalDraft();
              setRecoveredDraft(null);
            });
          }}
          onClose={handleClose}
          isSavingDraft={isSavingDraft}
          handleDraftAndClose={handleDraftAndClose}
        />
      </div>
    </>
  );
});
