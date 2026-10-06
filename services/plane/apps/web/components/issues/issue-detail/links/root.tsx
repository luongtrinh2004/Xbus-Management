/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useMemo, useState } from "react";

import { AddOutline } from "@makeplane/propel/icons";
// plane imports
import { setToast } from "@plane/blocks/toast";
import type { TIssueLink } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// local imports
import { IssueLinkCreateUpdateModal } from "./create-update-link-modal";
import { IssueLinkList } from "./links";

export type TLinkOperations = {
  create: (data: Partial<TIssueLink>) => Promise<void>;
  update: (linkId: string, data: Partial<TIssueLink>) => Promise<void>;
  remove: (linkId: string) => Promise<void>;
};

export type TIssueLinkRoot = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
};

export function IssueLinkRoot(props: TIssueLinkRoot) {
  // props
  const { workspaceSlug, projectId, issueId, disabled = false } = props;
  // hooks
  const { toggleIssueLinkModal: toggleIssueLinkModalStore, createLink, updateLink, removeLink } = useIssueDetail();
  // state
  const [isIssueLinkModal, setIsIssueLinkModal] = useState(false);
  const toggleIssueLinkModal = useCallback(
    (modalToggle: boolean) => {
      toggleIssueLinkModalStore(modalToggle);
      setIsIssueLinkModal(modalToggle);
    },
    [toggleIssueLinkModalStore]
  );

  const handleLinkOperations: TLinkOperations = useMemo(
    () => ({
      create: async (data: Partial<TIssueLink>) => {
        try {
          if (!workspaceSlug || !projectId || !issueId) throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc");
          await createLink(workspaceSlug, projectId, issueId, data);
          setToast({
            message: "Liên kết đã được tạo thành công",
            type: "success",
            title: "Đã tạo liên kết",
          });
          toggleIssueLinkModal(false);
        } catch (error: any) {
          setToast({
            message: error?.data?.error ?? "Không thể tạo liên kết",
            type: "error",
            title: "Chưa tạo liên kết",
          });
          throw error;
        }
      },
      update: async (linkId: string, data: Partial<TIssueLink>) => {
        try {
          if (!workspaceSlug || !projectId || !issueId) throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc");
          await updateLink(workspaceSlug, projectId, issueId, linkId, data);
          setToast({
            message: "Liên kết đã được cập nhật thành công",
            type: "success",
            title: "Đã cập nhật liên kết",
          });
          toggleIssueLinkModal(false);
        } catch (error) {
          setToast({
            message: "Không thể cập nhật liên kết",
            type: "error",
            title: "Chưa cập nhật liên kết",
          });
          throw error;
        }
      },
      remove: async (linkId: string) => {
        try {
          if (!workspaceSlug || !projectId || !issueId) throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc");
          await removeLink(workspaceSlug, projectId, issueId, linkId);
          setToast({
            message: "Liên kết đã được xóa thành công",
            type: "success",
            title: "Đã xóa liên kết",
          });
          toggleIssueLinkModal(false);
        } catch {
          setToast({
            message: "Không thể xóa liên kết",
            type: "error",
            title: "Chưa xóa liên kết",
          });
        }
      },
    }),
    [workspaceSlug, projectId, issueId, createLink, updateLink, removeLink, toggleIssueLinkModal]
  );

  const handleOnClose = () => {
    toggleIssueLinkModal(false);
  };

  return (
    <>
      <IssueLinkCreateUpdateModal
        isModalOpen={isIssueLinkModal}
        handleOnClose={handleOnClose}
        linkOperations={handleLinkOperations}
        issueServiceType={EIssueServiceType.ISSUES}
      />

      <div className="py-1 text-11">
        <div className="flex items-center justify-between gap-2">
          <h4>Liên kết</h4>
          {!disabled && (
            <button
              type="button"
              className={`grid h-7 w-7 place-items-center rounded-sm p-1 duration-300 outline-none hover:bg-surface-2 ${
                disabled ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              onClick={() => toggleIssueLinkModal(true)}
              disabled={disabled}
            >
              <AddOutline className="h-4 w-4" />
            </button>
          )}
        </div>

        <div>
          <IssueLinkList issueId={issueId} linkOperations={handleLinkOperations} disabled={disabled} />
        </div>
      </div>
    </>
  );
}
