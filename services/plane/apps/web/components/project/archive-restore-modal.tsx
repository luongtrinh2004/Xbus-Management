/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
// ui
import { Button } from "@makeplane/propel/components/button";
import { setToast } from "@plane/blocks/toast";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogHeading,
  DialogMain,
  DialogTitle,
} from "@makeplane/propel/components/dialog";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useAppRouter } from "@/hooks/use-app-router";

type Props = {
  workspaceSlug: string;

  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  archive: boolean;
};

export function ArchiveRestoreProjectModal(props: Props) {
  const { workspaceSlug, projectId, isOpen, onClose, archive } = props;
  // router
  const router = useAppRouter();
  // states
  const [isLoading, setIsLoading] = useState(false);
  // store hooks
  const { getProjectById, archiveProject, restoreProject } = useProject();

  const projectDetails = getProjectById(projectId);
  if (!projectDetails) return null;

  const handleClose = () => {
    setIsLoading(false);
    onClose();
  };

  const handleArchiveProject = async () => {
    setIsLoading(true);
    await archiveProject(workspaceSlug, projectId)
      .then(() => {
        setToast({
          type: "success",
          title: "Lưu trữ thành công",
          message: `Đã lưu trữ dự án ${projectDetails.name}`,
        });
        onClose();
        router.push(`/${workspaceSlug}/projects/`);
        return;
      })
      .catch(() =>
        setToast({
          type: "error",
          title: "Lỗi!",
          message: "Không thể lưu trữ dự án. Vui lòng thử lại.",
        })
      )
      .finally(() => setIsLoading(false));
  };

  const handleRestoreProject = async () => {
    setIsLoading(true);
    await restoreProject(workspaceSlug, projectId)
      .then(() => {
        setToast({
          type: "success",
          title: "Khôi phục thành công",
          message: `Bạn có thể tìm ${projectDetails.name} trong danh sách dự án.`,
        });
        onClose();
        router.push(`/${workspaceSlug}/projects/`);
        return;
      })
      .catch(() =>
        setToast({
          type: "error",
          title: "Lỗi!",
          message: "Không thể khôi phục dự án. Vui lòng thử lại.",
        })
      )
      .finally(() => setIsLoading(false));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent size="sm">
        <DialogMain>
          <DialogHeader>
            <DialogHeading>
              <DialogTitle>
                {archive ? "Lưu trữ" : "Khôi phục"} {projectDetails.name}
              </DialogTitle>
            </DialogHeading>
          </DialogHeader>
          <DialogBody>
            <p className="text-13 text-secondary">
              {archive
                ? "Dự án cùng công việc, chu kỳ, nhóm công việc và trang sẽ được lưu trữ. Công việc sẽ không xuất hiện trong kết quả tìm kiếm. Chỉ quản trị viên dự án có thể khôi phục."
                : "Khôi phục sẽ kích hoạt lại dự án và hiển thị với tất cả thành viên. Bạn có muốn tiếp tục?"}
            </p>
          </DialogBody>
        </DialogMain>
        <DialogActions>
          <Button variant="secondary" size="md" stretch="auto" label={"Hủy"} onClick={onClose} />
          <Button
            variant="primary"
            size="md"
            stretch="auto"
            label={archive ? (isLoading ? "Đang lưu trữ" : "Lưu trữ") : isLoading ? "Đang khôi phục" : "Khôi phục"}
            onClick={archive ? handleArchiveProject : handleRestoreProject}
            loading={isLoading}
          />
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
