/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
// ui
import { ConfirmDialog } from "@plane/blocks/dialog";
import { setToast } from "@plane/blocks/toast";
// hooks
import { useCycle } from "@/hooks/store/use-cycle";
import { useAppRouter } from "@/hooks/use-app-router";

type Props = {
  workspaceSlug: string;
  projectId: string;
  cycleId: string;
  handleClose: () => void;
  isOpen: boolean;
  onSubmit?: () => Promise<void>;
};

export function ArchiveCycleModal(props: Props) {
  const { workspaceSlug, projectId, cycleId, isOpen, handleClose } = props;
  // router
  const router = useAppRouter();
  // states
  const [isArchiving, setIsArchiving] = useState(false);
  // store hooks
  const { getCycleNameById, archiveCycle } = useCycle();

  const cycleName = getCycleNameById(cycleId);

  const onClose = () => {
    setIsArchiving(false);
    handleClose();
  };

  const handleArchiveCycle = async () => {
    setIsArchiving(true);
    await archiveCycle(workspaceSlug, projectId, cycleId)
      .then(() => {
        setToast({
          type: "success",
          title: "Lưu trữ thành công",
          message: "Mục đã lưu trữ của bạn có thể được tìm thấy trong phần lưu trữ của dự án.",
        });
        onClose();
        router.push(`/${workspaceSlug}/projects/${projectId}/cycles`);
        return;
      })
      .catch(() => {
        setToast({
          type: "error",
          title: "Lỗi!",
          message: "Không thể lưu trữ chu kỳ. Vui lòng thử lại.",
        });
      })
      .finally(() => setIsArchiving(false));
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      handleClose={onClose}
      handleSubmit={handleArchiveCycle}
      isSubmitting={isArchiving}
      variant="primary"
      title={`Lưu trữ chu kỳ ${cycleName ?? ""}`}
      content={"Bạn có muốn lưu trữ chu kỳ? Bạn có thể khôi phục sau."}
      primaryButtonText={{ loading: "Archiving", default: "Archive" }}
      secondaryButtonText="Cancel"
    />
  );
}
