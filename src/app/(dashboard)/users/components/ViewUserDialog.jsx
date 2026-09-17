"use client";

import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid2";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import CustomTextField from "@core/components/mui/TextField";
import { resolveAvatar } from "@/utils/getDefaultAvatar";

const labels = {
  gender: {
    male: "Nam",
    female: "Nữ",
    other: "Khác",
    unspecified: "Chưa xác định",
  },
  role: { admin: "Quản trị viên", assistant: "Trợ lý", user: "Nhân viên" },
  category: {
    category_official: "Chính thức",
    category_probation: "Thử việc",
    category_intern: "Thực tập",
    category_collaborator: "Cộng tác viên",
  },
  status: { able: "Đang hoạt động", disabled: "Vô hiệu hóa" },
};

export default function ViewUserDialog({ user, open, onClose }) {
  const [departments, setDepartments] = useState([]);
  useEffect(() => {
    if (open)
      fetch("/api/departments")
        .then((r) => r.json())
        .then((data) => setDepartments(Array.isArray(data) ? data : []))
        .catch(() => {});
  }, [open]);
  const department =
    departments.find((item) => item.id === user?.typeId)?.name || "—";
  const field = (label, value, wide = false) => (
    <Grid size={{ xs: 12, sm: wide ? 12 : 6 }}>
      <CustomTextField
        fullWidth
        label={label}
        value={value || "—"}
        slotProps={{ input: { readOnly: true } }}
      />
    </Grid>
  );
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle component="div">
        <Typography variant="h5" fontWeight={600}>
          Thông Tin Nhân Sự
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={4} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Avatar
                src={resolveAvatar(user || {})}
                sx={{ width: 72, height: 72 }}
              >
                {(user?.name || "U")[0]}
              </Avatar>
              <Box>
                <Typography fontWeight={700}>{user?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || "—"}
                </Typography>
              </Box>
            </Box>
          </Grid>
          {field("Mã nhân sự", user?.code)}
          {field("Số điện thoại", user?.phone)}
          {field("Giới tính", labels.gender[user?.gender] || "—")}
          {field("Ngày sinh", user?.birthday)}
          {field("Bộ phận chuyên môn", department)}
          {field("Hình thức", labels.category[user?.categoryId] || "—")}
          {field("Vai trò", labels.role[user?.role] || "—")}
          {field("Trạng thái tài khoản", labels.status[user?.status] || "—")}
          {field("Chức vụ", user?.position)}
          {field("Ngày tham gia", user?.joinedDate)}
          {field("Địa chỉ", user?.address, true)}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
