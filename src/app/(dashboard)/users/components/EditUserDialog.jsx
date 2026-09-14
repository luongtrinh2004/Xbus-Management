"use client";

import { useEffect, useState, useRef } from "react";
import Grid from "@mui/material/Grid2";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { toast } from "react-toastify";
import DialogCloseButton from "./DialogCloseButton";
import CustomTextField from "@core/components/mui/TextField";
import { resolveAvatar } from "@/utils/getDefaultAvatar";

const genderOptions = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
  { value: "unspecified", label: "Chưa xác định" },
];

const categoryOptions = [
  { value: "category_official", label: "Chính thức" },
  { value: "category_probation", label: "Thử việc" },
  { value: "category_intern", label: "Thực tập" },
  { value: "category_collaborator", label: "Cộng tác viên" },
];

const EditUserDialog = ({
  updatingUser,
  setUpdatingUser,
  openUpdate,
  setOpenUpdate,
  setData,
  onUserUpdated,
}) => {
  const [userData, setUserData] = useState({
    id: "",
    name: "",
    email: "",
    code: "",
    phone: "",
    gender: "male",
    role: "user",
    typeId: "",
    categoryId: "category_official",
    status: "able",
    avatarUrl: "",
    schedulingPoints: 0,
    password: "",
  });
  const [departments, setDepartments] = useState([]);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Load departments
  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (openUpdate && updatingUser) {
      setUserData({
        id: updatingUser.id || "",
        name: updatingUser.name || "",
        email: updatingUser.email || "",
        code: updatingUser.code || "",
        phone: updatingUser.phone || "",
        gender: updatingUser.gender || "male",
        role: updatingUser.role || "user",
        typeId: updatingUser.typeId || "",
        categoryId: updatingUser.categoryId || "category_official",
        status: updatingUser.status || "able",
        avatarUrl: updatingUser.avatarUrl || "",
        schedulingPoints: updatingUser.schedulingPoints || 0,
        password: "",
      });
      setAvatarPreview(resolveAvatar(updatingUser));
    }
  }, [updatingUser, openUpdate]);

  const handleClose = () => {
    setUpdatingUser(null);
    setOpenUpdate(false);
  };

  // Khi giới tính hoặc vai trò thay đổi → cập nhật avatar preview nếu chưa có custom avatar
  const handleGenderOrRoleChange = (field, value) => {
    const updated = { ...userData, [field]: value };
    setUserData(updated);
    if (!updated.avatarUrl) {
      setAvatarPreview(resolveAvatar(updated));
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview tức thì
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload lên server
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch(`/api/users/${userData.id}/avatar`, {
        method: "POST",
        body: form,
      });
      const result = await res.json();
      if (res.ok) {
        setUserData((prev) => ({ ...prev, avatarUrl: result.avatarUrl }));
        setAvatarPreview(result.avatarUrl);
        setData((prev) =>
          (prev || []).map((u) =>
            u.id === userData.id ? { ...u, avatarUrl: result.avatarUrl } : u,
          ),
        );
        toast.success("Ảnh đại diện đã được cập nhật");
      } else {
        toast.error(result.error || "Tải ảnh lên thất bại");
        // Rollback preview
        setAvatarPreview(resolveAvatar(userData));
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
      setAvatarPreview(resolveAvatar(userData));
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!userData.name || !userData.email) {
      toast.error("Họ tên và email không được để trống");
      return;
    }

    const { id, ...payload } = userData;
    if (payload.password && payload.password.length < 6) {
      toast.error("Mật khẩu mới cần có ít nhất 6 ký tự");
      return;
    }
    if (!payload.password) delete payload.password;
    const previousUser = updatingUser;
    const optimisticUser = { ...updatingUser, ...userData };
    onUserUpdated?.(optimisticUser, previousUser);
    setData((prev) =>
      (prev || [])
        .filter((user) => optimisticUser.status === "able" || user.id !== id)
        .map((user) => (user.id === id ? optimisticUser : user)),
    );
    handleClose();

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const updated = await response.json();
      if (response.ok) {
        onUserUpdated?.(updated, optimisticUser);
        setData((prev) => (prev || []).map((u) => (u.id === id ? updated : u)));
        toast.success(`Đã cập nhật thông tin ${updated.name}`);
      } else {
        onUserUpdated?.(previousUser, optimisticUser);
        setData((prev) =>
          (prev || []).map((u) => (u.id === id ? previousUser : u)),
        );
        toast.error(updated.error || "Cập nhật thất bại");
      }
    } catch {
      onUserUpdated?.(previousUser, optimisticUser);
      setData((prev) =>
        (prev || []).map((u) => (u.id === id ? previousUser : u)),
      );
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  return (
    <Dialog open={openUpdate} onClose={handleClose} fullWidth maxWidth="md">
      <DialogCloseButton onClick={handleClose} />
      <DialogTitle component="div">
        <Typography
          variant="h5"
          fontWeight={600}
          component="span"
          display="block"
        >
          Chỉnh Sửa Thông Tin Nhân Sự
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          component="span"
          display="block"
        >
          Cập nhật hồ sơ, phân quyền, bộ phận và trạng thái tài khoản
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={4} sx={{ pt: 1 }}>
          {/* Avatar upload */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Tooltip title="Bấm để thay đổi ảnh đại diện">
                <Box
                  onClick={handleAvatarClick}
                  sx={{
                    position: "relative",
                    cursor: "pointer",
                    borderRadius: "50%",
                    "&:hover .avatar-overlay": { opacity: 1 },
                  }}
                >
                  <Avatar
                    src={avatarPreview}
                    sx={{
                      width: 80,
                      height: 80,
                      border: "3px solid",
                      borderColor: "primary.main",
                      fontSize: 28,
                    }}
                  >
                    {(userData.name || "U")[0].toUpperCase()}
                  </Avatar>
                  <Box
                    className="avatar-overlay"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      bgcolor: "rgba(0,0,0,0.45)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {uploadingAvatar ? (
                      <CircularProgress size={20} sx={{ color: "white" }} />
                    ) : (
                      <i className="tabler-camera text-white text-xl" />
                    )}
                  </Box>
                </Box>
              </Tooltip>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Ảnh đại diện
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Bấm vào ảnh để thay đổi. Hỗ trợ JPG, PNG, WebP (tối đa 5MB).
                </Typography>
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </Box>
          </Grid>

          {/* Form fields */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              label="Họ và tên"
              value={userData.name}
              onChange={(e) =>
                setUserData({ ...userData, name: e.target.value })
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              name="staff_email_edit"
              autoComplete="off"
              label="Email"
              value={userData.email}
              disabled
              helperText="Email không thể thay đổi"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              fullWidth
              type="password"
              name="staff_password_edit"
              autoComplete="new-password"
              label="Mật khẩu mới"
              value={userData.password}
              placeholder="Không nhập nếu không đổi"
              helperText="Tối thiểu 6 ký tự"
              onChange={(e) =>
                setUserData({ ...userData, password: e.target.value })
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              fullWidth
              label="Mã nhân sự"
              value={userData.code}
              onChange={(e) =>
                setUserData({ ...userData, code: e.target.value })
              }
              placeholder="HDK181"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              fullWidth
              label="Số điện thoại"
              value={userData.phone}
              onChange={(e) =>
                setUserData({ ...userData, phone: e.target.value })
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              select
              fullWidth
              label="Giới tính"
              value={userData.gender}
              onChange={(e) =>
                handleGenderOrRoleChange("gender", e.target.value)
              }
            >
              {genderOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              select
              fullWidth
              label="Bộ phận chuyên môn"
              value={userData.typeId || ""}
              onChange={(e) =>
                setUserData({ ...userData, typeId: e.target.value })
              }
            >
              <MenuItem value="">— Chưa gán —</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              select
              fullWidth
              label="Hình thức"
              value={userData.categoryId}
              onChange={(e) =>
                setUserData({ ...userData, categoryId: e.target.value })
              }
            >
              {categoryOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              select
              fullWidth
              label="Vai trò"
              value={userData.role}
              onChange={(e) => handleGenderOrRoleChange("role", e.target.value)}
            >
              <MenuItem value="user">Nhân viên</MenuItem>
              <MenuItem value="admin">Quản trị viên</MenuItem>
              <MenuItem value="assistant">Trợ lý</MenuItem>
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              fullWidth
              label="Điểm rèn luyện"
              value={`${userData.schedulingPoints || 0} điểm`}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box sx={{ display: "flex", gap: 0.25 }}>
                        <IconButton
                          aria-label="Giảm 1 điểm rèn luyện"
                          color="primary"
                          size="small"
                          onClick={() =>
                            setUserData((prev) => ({
                              ...prev,
                              schedulingPoints: Math.max(
                                0,
                                (prev.schedulingPoints || 0) - 1,
                              ),
                            }))
                          }
                          disabled={!userData.schedulingPoints}
                        >
                          <i className="tabler-minus" />
                        </IconButton>
                        <IconButton
                          aria-label="Tăng 1 điểm rèn luyện"
                          color="primary"
                          size="small"
                          onClick={() =>
                            setUserData((prev) => ({
                              ...prev,
                              schedulingPoints:
                                (prev.schedulingPoints || 0) + 1,
                            }))
                          }
                        >
                          <i className="tabler-plus" />
                        </IconButton>
                      </Box>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              select
              fullWidth
              label="Trạng thái tài khoản"
              value={userData.status}
              onChange={(e) =>
                setUserData({ ...userData, status: e.target.value })
              }
            >
              <MenuItem value="able">Đang hoạt động</MenuItem>
              <MenuItem value="disabled">Vô hiệu hóa</MenuItem>
            </CustomTextField>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button variant="tonal" color="secondary" onClick={handleClose}>
          Hủy bỏ
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave}>
          Lưu thay đổi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
