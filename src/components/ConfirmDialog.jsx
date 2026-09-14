"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function ConfirmDialog({
  open,
  title = "Xác nhận thao tác",
  message,
  confirmText = "Xác nhận",
  confirmColor = "error",
  loading = false,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          color="secondary"
          variant="tonal"
          disabled={loading}
          onClick={onClose}
        >
          Hủy bỏ
        </Button>
        <Button
          color={confirmColor}
          variant="contained"
          disabled={loading}
          onClick={onConfirm}
        >
          {loading ? "Đang xử lý..." : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
