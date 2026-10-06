/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { Icon } from "@makeplane/propel/components/icon";
import { IconButton } from "@makeplane/propel/components/icon-button";
import { Tooltip } from "@makeplane/propel/components/tooltip";
import { CloseOutline, LoadingOutline } from "@makeplane/propel/icons";
// plane imports
import { ConfirmDialog } from "@plane/blocks/dialog";
import { setToast } from "@plane/blocks/toast";
import { useTranslation } from "@plane/i18n";
import type { IState, TStateOperationsCallbacks } from "@plane/types";
import { getStateDisplayName, cn } from "@plane/utils";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";

type TStateDelete = {
  totalStates: number;
  state: IState;
  deleteStateCallback: TStateOperationsCallbacks["deleteState"];
};

export const StateDelete = observer(function StateDelete(props: TStateDelete) {
  const { totalStates, state, deleteStateCallback } = props;
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { isMobile } = usePlatformOS();
  // states
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  // derived values
  const isDeleteDisabled = state.default ? true : totalStates === 1 ? true : false;

  const handleDeleteState = async () => {
    if (isDeleteDisabled) return;

    setIsDelete(true);

    try {
      await deleteStateCallback(state.id);
      setIsDelete(false);
    } catch (error) {
      const errorStatus = error as { status: number; data: { error: string } };
      if (errorStatus.status === 400) {
        setToast({
          type: "error",
          title: "Lỗi!",
          message: "Trạng thái này còn công việc. Hãy chuyển công việc sang trạng thái khác trước khi xóa.",
        });
      } else {
        setToast({
          type: "error",
          title: "Lỗi!",
          message: "Không thể xóa trạng thái. Vui lòng thử lại.",
        });
      }
      setIsDelete(false);
    }
  };

  return (
    <>
      <ConfirmDialog
        handleClose={() => setIsDeleteModal(false)}
        handleSubmit={handleDeleteState}
        isSubmitting={isDelete}
        isOpen={isDeleteModal}
        title={"Xóa trạng thái"}
        content={
          <>
            Bạn có chắc muốn xóa trạng thái{" "}
            <span className="font-medium text-primary">{getStateDisplayName(state)}</span>? Toàn bộ dữ liệu của trạng
            thái sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.
          </>
        }
      />

      <Tooltip
        label={
          state.default ? "Không thể xóa trạng thái mặc định." : totalStates === 1 ? "Nhóm không được để trống." : ``
        }
        layout="stacked"
        disabled={!isDeleteDisabled || isMobile}
      >
        {/* Not `disabled`: a disabled button would never show the tooltip that explains why. */}
        <IconButton
          variant="ghost"
          size="xs"
          aria-label={t("common.delete")}
          aria-disabled={isDeleteDisabled}
          icon={
            isDelete ? (
              <Icon icon={<LoadingOutline className="animate-spin text-secondary" />} />
            ) : (
              <Icon icon={<CloseOutline className={cn({ "text-danger-primary": !isDeleteDisabled })} />} />
            )
          }
          onClick={() => {
            if (isDeleteDisabled) return;
            setIsDeleteModal(true);
          }}
        />
      </Tooltip>
    </>
  );
});
