"use client";

import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import { toast } from "react-toastify";

export default function CompleteScheduleModal({
  open,
  onClose,
  schedule,
  onSuccess,
}) {
  const [completedMap, setCompletedMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (schedule && schedule.participants) {
      const initial = {};
      schedule.participants.forEach((p) => {
        const uid = p.userId || p;
        // Mặc định tích chọn tất cả mọi người được phân công
        initial[uid] = true;
      });
      setCompletedMap(initial);
    }
  }, [schedule]);

  const handleToggle = (userId) => {
    setCompletedMap((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleConfirm = async () => {
    if (!schedule) return;
    setLoading(true);

    const completedUserIds = Object.keys(completedMap).filter(
      (uid) => completedMap[uid],
    );

    try {
      if (schedule.participants?.length > 0 && schedule.id) {
        const res = await fetch(`/api/water-schedules/${schedule.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completedUserIds }),
        });

        const data = await res.json();
        if (!res.ok) {
          return toast.error(data.error || "Có lỗi xảy ra khi xác nhận");
        }
      }

      toast.success("Xác nhận hoàn thành thành công!");
      onClose();
      if (onSuccess) await onSuccess();
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const participants = schedule?.participants || [];
  const trash = schedule?.trash;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle component="div">
        <Typography
          variant="h5"
          fontWeight={600}
          component="span"
          display="block"
        >
          Xác Nhận Hoàn Thành Lịch
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          component="span"
          display="block"
        >
          Ngày {schedule?.date} · {schedule?.time || "09:00"}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Mỗi nhân sự được tích chọn sẽ được <strong>+1 điểm rèn luyện</strong>{" "}
          và <strong>+1 lượt bê nước</strong> vào hồ sơ cá nhân.
        </Alert>

        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          Danh sách người thực sự tham gia (
          {Object.values(completedMap).filter(Boolean).length}/
          {participants.length}):
        </Typography>

        <FormGroup>
          {participants.map((p) => {
            const uid = p.userId || p;
            const name = p.name || p;
            const code = p.code || "";
            const checked = !!completedMap[uid];

            return (
              <Box
                key={uid}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  mb: 1,
                  borderRadius: 1.5,
                  bgcolor: checked
                    ? "rgba(40, 199, 111, 0.08)"
                    : "action.hover",
                  border: "1px solid",
                  borderColor: checked
                    ? "rgba(40, 199, 111, 0.3)"
                    : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: 13,
                      bgcolor: "primary.main",
                    }}
                  >
                    {name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {name}
                    </Typography>
                    {code && (
                      <Typography variant="caption" color="text.secondary">
                        {code}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => handleToggle(uid)}
                      color="success"
                    />
                  }
                  label={checked ? "Đã tham gia" : "Vắng"}
                  sx={{ m: 0 }}
                />
              </Box>
            );
          })}
        </FormGroup>
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{ mt: 2, mb: 1.5 }}
        >
          Đổ rác
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: trash?.userId ? "rgba(255,159,67,.08)" : "action.hover",
            border: "1px solid",
            borderColor: trash?.userId ? "rgba(255,159,67,.3)" : "divider",
          }}
        >
          <i className="tabler-trash text-lg" style={{ color: "#FF9F43" }} />
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {trash?.userId ? trash.name : "Chưa phân công người đổ rác"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {trash?.userId
                ? "Sẽ được xác nhận và cộng +1 điểm cùng lịch này"
                : "Không có điểm đổ rác được cộng"}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          variant="tonal"
          color="secondary"
          onClick={onClose}
          disabled={loading}
        >
          Hủy bỏ
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={loading}
          startIcon={<i className="tabler-check" />}
        >
          {loading ? "Đang lưu..." : "Xác nhận hoàn thành (+1 điểm)"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
