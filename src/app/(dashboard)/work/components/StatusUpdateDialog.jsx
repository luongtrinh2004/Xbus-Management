"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";

import { HEALTH_META } from "./workConstants";

export default function StatusUpdateDialog({
  open,
  project,
  statusUpdates = [],
  canManage,
  onClose,
  onSaved,
}) {
  const [health, setHealth] = useState(project?.health || "on_track");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/work/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusUpdate: { health, note } }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      toast.success("Đã cập nhật tình trạng dự án");
      setNote("");
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Tình trạng dự án</DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {canManage && (
          <>
            <TextField
              select
              fullWidth
              size="small"
              label="Tình trạng"
              value={health}
              onChange={(e) => setHealth(e.target.value)}
              sx={{ mb: 2 }}
            >
              {Object.entries(HEALTH_META).map(([value, meta]) => (
                <MenuItem key={value} value={value}>
                  <Chip
                    size="small"
                    color={meta.color}
                    variant="tonal"
                    icon={<i className={meta.icon} />}
                    label={meta.label}
                    sx={{ mr: 1 }}
                  />
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Cập nhật cho đội"
              placeholder="Điều đang tốt, rủi ro và hành động tiếp theo..."
              value={note}
              inputProps={{ maxLength: 1000 }}
              onChange={(e) => setNote(e.target.value)}
            />
            <Typography variant="caption" color="text.secondary">
              {note.length}/1000 ký tự
            </Typography>
          </>
        )}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Lịch sử cập nhật
          </Typography>
          {statusUpdates.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Chưa có cập nhật tình trạng nào.
            </Typography>
          )}
          {statusUpdates.map((item) => (
            <Box
              key={item.id}
              sx={{
                mt: 1.5,
                pl: 1.5,
                borderLeft: "2px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Chip
                  size="small"
                  variant="tonal"
                  color={HEALTH_META[item.health]?.color || "default"}
                  label={HEALTH_META[item.health]?.label || item.health}
                />
                <Typography variant="caption" color="text.secondary">
                  {item.authorName} ·{" "}
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </Typography>
              </Box>
              {item.note && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {item.note}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="tonal" onClick={onClose}>
          Đóng
        </Button>
        {canManage && (
          <Button
            variant="contained"
            disabled={saving}
            onClick={submit}
          >
            Đăng cập nhật
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
