import { useTranslation } from "@plane/i18n";
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
// ui
import { Button } from "@makeplane/propel/components/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogHeading,
  DialogInfo,
  DialogMain,
  DialogTitle,
} from "@makeplane/propel/components/dialog";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
  onDiscard: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmIssueDiscard(props: Props) {
  const { t } = useTranslation();
  const { isOpen, handleClose, onDiscard, onConfirm } = props;

  const [isLoading, setIsLoading] = useState(false);

  const onClose = () => {
    handleClose();
    setIsLoading(false);
  };

  const handleDeletion = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent size="md">
        <DialogMain>
          <DialogHeader>
            <DialogHeading>
              <DialogTitle>{t("work_item_ui.draft_title")}</DialogTitle>
              <DialogDescription>{t("work_item_ui.draft_hint")}</DialogDescription>
            </DialogHeading>
          </DialogHeader>
        </DialogMain>
        <DialogActions>
          <DialogInfo>
            <Button
              variant="secondary"
              size="sm"
              stretch="auto"
              onClick={onDiscard}
              label={t("work_item_ui.discard")}
            />
          </DialogInfo>
          <Button variant="secondary" size="sm" stretch="auto" onClick={onClose} label={t("work_item_ui.cancel")} />
          <Button
            variant="primary"
            size="sm"
            stretch="auto"
            onClick={() => void handleDeletion()}
            loading={isLoading}
            label={isLoading ? t("work_item_ui.saving") : t("work_item_ui.save_draft")}
          />
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
