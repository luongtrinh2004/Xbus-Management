/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import type { UseFormRegister } from "react-hook-form";
import { useForm } from "react-hook-form";
// plane imports
import { useTranslation } from "@plane/i18n";
import { AddOutline } from "@makeplane/propel/icons";
import { setPromiseToast } from "@plane/blocks/toast";
import type { IProject, TIssue, EIssueLayoutTypes } from "@plane/types";
import { cn, createIssuePayload } from "@plane/utils";
import { createIssueSubmissionGuard, IssueCreatedWithFollowUpError } from "@/helpers/issue-submission";
// local imports
import { QuickAddIssueFormRoot } from "./form";
import { useCreateIssueToastActions } from "../../create-issue-toast-action-items";

export type TQuickAddIssueForm = {
  ref: React.RefObject<HTMLFormElement | null>;
  isOpen: boolean;
  projectDetail: IProject;
  hasError: boolean;
  register: UseFormRegister<TIssue>;
  onSubmit: () => void;
  isEpic: boolean;
  isSubmitting: boolean;
};

export type TQuickAddIssueButton = {
  isEpic?: boolean;
  onClick: () => void;
};

type TQuickAddIssueRoot = {
  isQuickAddOpen?: boolean;
  layout: EIssueLayoutTypes;
  prePopulatedData?: Partial<TIssue>;
  QuickAddButton?: FC<TQuickAddIssueButton>;
  customQuickAddButton?: React.ReactNode;
  containerClassName?: string;
  setIsQuickAddOpen?: (isOpen: boolean) => void;
  quickAddCallback?: (projectId: string | null | undefined, data: TIssue) => Promise<TIssue | undefined>;
  isEpic?: boolean;
};

const defaultValues: Partial<TIssue> = {
  name: "",
};

export const QuickAddIssueRoot = observer(function QuickAddIssueRoot(props: TQuickAddIssueRoot) {
  const {
    isQuickAddOpen,
    layout,
    prePopulatedData,
    QuickAddButton,
    customQuickAddButton,
    containerClassName = "",
    setIsQuickAddOpen,
    quickAddCallback,
    isEpic = false,
  } = props;
  // i18n
  const { t } = useTranslation();
  // router
  const { workspaceSlug, projectId } = useParams();
  // propel: toast actions cross the boundary as data, never as JSX
  const buildCreateIssueToastActions = useCreateIssueToastActions();
  // states
  const [isOpen, setIsOpen] = useState(isQuickAddOpen ?? false);
  const [isCreating, setIsCreating] = useState(false);
  const submissionGuard = useRef(createIssueSubmissionGuard());
  // form info
  const {
    reset,
    handleSubmit,
    setFocus,
    register,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<TIssue>({ defaultValues });

  useEffect(() => {
    if (isQuickAddOpen !== undefined) {
      setIsOpen(isQuickAddOpen);
    }
  }, [isQuickAddOpen]);

  useEffect(() => {
    if (!isOpen) reset({ ...defaultValues });
  }, [isOpen, reset]);

  // oxlint-disable-next-line no-shadow
  const handleIsOpen = (isOpen: boolean) => {
    if (submissionGuard.current.pending) return;
    if (isQuickAddOpen !== undefined && setIsQuickAddOpen) {
      setIsQuickAddOpen(isOpen);
    } else {
      setIsOpen(isOpen);
    }
  };

  const onSubmitHandler = async (formData: TIssue) => {
    if (!workspaceSlug || !projectId || !quickAddCallback) return;
    const name = formData.name.trim();
    if (!name || name.length > 255) {
      setError("name", {
        message: !name ? t("title_is_required") : t("title_should_be_less_than_255_characters"),
      });
      setFocus("name");
      return;
    }
    await submissionGuard.current.run(async () => {
      setIsCreating(true);
      clearErrors();
      const payload = createIssuePayload(projectId.toString(), { ...prePopulatedData, ...formData, name });
      let createdWithFollowUpError = false;
      // Keep the entered name until the server confirms creation. Returning no issue
      // is a failure too: clearing here would silently lose the user's input.
      const quickAddPromise = Promise.resolve()
        .then(() => quickAddCallback(projectId.toString(), { ...payload }))
        .catch((error: unknown) => {
          if (!(error instanceof IssueCreatedWithFollowUpError)) throw error;
          createdWithFollowUpError = true;
          return error.createdIssue;
        })
        .then((issue) => {
          if (!issue) throw new Error(t("issue_creation_failed"));
          return issue;
        });
      setPromiseToast<TIssue>(quickAddPromise, {
        loading: isEpic ? t("epic.adding") : t("issue.adding"),
        success: {
          title: t("common.success"),
          message: () =>
            createdWithFollowUpError
              ? t("issue_form_draft.created_partial")
              : `${isEpic ? t("epic.create.success") : t("issue.create.success")}`,
          actionItems: (data) =>
            buildCreateIssueToastActions({ workspaceSlug: workspaceSlug.toString(), issueId: data.id, isEpic }),
        },
        error: {
          title: t("common.error.label"),
          message: (err: unknown) => (err instanceof Error ? err.message : t("common.error.message")),
        },
      });

      try {
        await quickAddPromise;
        reset({ ...defaultValues });
      } catch (error) {
        setError("root.server", {
          message: error instanceof Error ? error.message : t("issue_creation_failed"),
        });
      } finally {
        setIsCreating(false);
        setFocus("name");
      }
    });
  };

  if (!projectId) return null;

  return (
    <div
      className={cn(
        containerClassName,
        errors && errors?.name && errors?.name?.message ? `border-danger-strong bg-danger-subtle` : ``
      )}
    >
      {isOpen ? (
        <QuickAddIssueFormRoot
          isOpen={isOpen}
          layout={layout}
          prePopulatedData={prePopulatedData}
          projectId={projectId?.toString()}
          // oxlint-disable-next-line no-unneeded-ternary
          hasError={errors && errors?.name && errors?.name?.message ? true : false}
          setFocus={setFocus}
          register={register}
          onSubmit={handleSubmit(onSubmitHandler)}
          onClose={() => handleIsOpen(false)}
          isEpic={isEpic}
          isSubmitting={isSubmitting || isCreating}
        />
      ) : (
        <>
          {QuickAddButton && <QuickAddButton isEpic={isEpic} onClick={() => handleIsOpen(true)} />}
          {customQuickAddButton && <>{customQuickAddButton}</>}
          {!QuickAddButton && !customQuickAddButton && (
            <button
              className="flex w-full cursor-pointer items-center gap-2 bg-layer-transparent px-2 py-3 hover:bg-layer-transparent-hover"
              onClick={() => handleIsOpen(true)}
            >
              <AddOutline className="h-3.5 w-3.5" />
              <span className="text-13 font-medium">{t(`${isEpic ? "epic.new" : "issue.new"}`)}</span>
            </button>
          )}
        </>
      )}
      {isOpen && (errors.name?.message || errors.root?.server?.message) && (
        <p role="alert" className="px-3 py-2 text-11 text-danger-primary">
          {errors.name?.message || errors.root?.server?.message}
        </p>
      )}
    </div>
  );
});
