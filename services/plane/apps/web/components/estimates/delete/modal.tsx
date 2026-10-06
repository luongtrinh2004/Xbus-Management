/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
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
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useEstimate } from "@/hooks/store/estimates/use-estimate";
import { useProject } from "@/hooks/store/use-project";

type TDeleteEstimateModal = {
  workspaceSlug: string;
  projectId: string;
  estimateId: string | undefined;
  isOpen: boolean;
  handleClose: () => void;
};

export const DeleteEstimateModal = observer(function DeleteEstimateModal(props: TDeleteEstimateModal) {
  // props
  const { workspaceSlug, projectId, estimateId, isOpen, handleClose } = props;
  // hooks
  const { areEstimateEnabledByProjectId, deleteEstimate } = useProjectEstimates();
  const { asJson: estimate } = useEstimate(estimateId);
  const { updateProject } = useProject();
  // states
  const [buttonLoader, setButtonLoader] = useState(false);

  const handleDeleteEstimate = async () => {
    try {
      if (!workspaceSlug || !projectId || !estimateId) return;
      setButtonLoader(true);
      await deleteEstimate(workspaceSlug, projectId, estimateId);
      if (areEstimateEnabledByProjectId(projectId)) {
        await updateProject(workspaceSlug, projectId, { estimate: null });
      }
      setButtonLoader(false);
      setToast({
        type: "success",
        title: "Đã xóa ước lượng",
        message: "Đã xóa ước lượng khỏi dự án.",
      });
      handleClose();
    } catch (_error) {
      setButtonLoader(false);
      setToast({
        type: "error",
        title: "Không thể tạo điểm ước tính",
        message: "Không thể xóa ước lượng. Vui lòng thử lại.",
      });
    }
  };

  return (
    <Dialog
      open={isOpen}
      disablePointerDismissal
      onOpenChange={(open, eventDetails) => {
        if (open) return;
        // The legacy modal took no `handleClose`, so Escape was swallowed: only Cancel closed it.
        if (eventDetails.reason === "escape-key") return;
        handleClose();
      }}
    >
      <DialogContent size="md">
        <DialogMain>
          {/* heading */}
          <DialogHeader>
            <DialogHeading>
              <DialogTitle>Xóa hệ thống ước lượng</DialogTitle>
            </DialogHeading>
          </DialogHeader>

          {/* estimate steps */}
          <DialogBody tabIndex={0}>
            <div className="text-14 text-secondary">
              Đang xóa ước lượng <span className="font-bold text-primary">{estimate?.name}</span>
              hệ thống sẽ xóa vĩnh viễn ước lượng khỏi tất cả công việc. Thao tác này không thể hoàn tác. Nếu thêm lại
              ước lượng, bạn cần cập nhật từng công việc.
            </div>
          </DialogBody>
        </DialogMain>

        <DialogActions>
          <Button
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={buttonLoader}
            stretch="auto"
            label={"Hủy"}
          />
          <Button
            variant="danger"
            size="md"
            onClick={handleDeleteEstimate}
            disabled={buttonLoader}
            stretch="auto"
            label={buttonLoader ? "Đang xóa" : "Xóa ước lượng"}
          />
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
});
