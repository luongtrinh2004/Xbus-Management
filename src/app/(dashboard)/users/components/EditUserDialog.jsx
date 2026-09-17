"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const canDeleteAvatar = session?.user?.role === "admin";
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
    birthday: "",
    citizenId: "",
    citizenIssuedDate: "",
    address: "",
    position: "",
    jiraAccount: "",
    joinedDate: "",
    avatarUrl: "",
    schedulingPoints: 0,
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
        birthday: updatingUser.birthday || "",
        citizenId: updatingUser.citizenId || "",
        citizenIssuedDate: updatingUser.citizenIssuedDate || "",
        address: updatingUser.address || "",
        position: updatingUser.position || "",
        jiraAccount: updatingUser.jiraAccount || "",
        joinedDate: updatingUser.joinedDate || "",
        avatarUrl: updatingUser.avatarUrl || "",
        schedulingPoints: updatingUser.schedulingPoints || 0,
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
      if (res.ok && result.avatarUrl) {
        setUserData((prev) => ({ ...prev, avatarUrl: result.avatarUrl }));
        setAvatarPreview(result.previewUrl || result.avatarUrl);
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

  const handleDeleteAvatar = async () => {
    if (!userData.avatarUrl || uploadingAvatar) return;

    setUploadingAvatar(true);
    try {
      const res = await fetch(`/api/users/${userData.id}/avatar`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Không thể xóa ảnh đại diện");

      const updatedUser = { ...userData, avatarUrl: "" };
      setUserData(updatedUser);
      setAvatarPreview(resolveAvatar(updatedUser));
      setData((prev) =>
        (prev || []).map((u) =>
          u.id === userData.id ? { ...u, avatarUrl: "" } : u,
        ),
      );
      toast.success("Đã xóa ảnh đại diện");
    } catch (error) {
      toast.error(error.message || "Không thể xóa ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!userData.name || !userData.email || !userData.code?.trim()) {
      toast.error("Họ tên, email và mã nhân sự không được để trống");
      return;
    }

    const { id, ...payload } = userData;
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
                {canDeleteAvatar && userData.avatarUrl && (
                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    onClick={handleDeleteAvatar}
                    disabled={uploadingAvatar}
                    sx={{ display: "block", mt: 0.5, px: 0 }}
                  >
                    Xóa ảnh đại diện
                  </Button>
                )}
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
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              fullWidth
              label="Mã nhân sự *"
              value={userData.code}
              onChange={(e) =>
                setUserData({ ...userData, code: e.target.value })
              }
              placeholder="HDK181"
              required
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
          <Grid size={{ xs: 12, sm: 4 }}>
            <CustomTextField
              fullWidth
              type="date"
              label="Ngày sinh"
              value={userData.birthday}
              onChange={(e) =>
                setUserData({ ...userData, birthday: e.target.value })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          {[
            ["citizenId", "Số CCCD", "text"],
            ["citizenIssuedDate", "Ngày cấp CCCD", "date"],
            ["joinedDate", "Ngày tham gia", "date"],
            ["position", "Chức vụ", "text"],
            ["jiraAccount", "Tài khoản Jira", "text"],
            ["address", "Địa chỉ", "text"],
          ].map(([field, label, type]) => (
            <Grid key={field} size={{ xs: 12, sm: 4 }}>
              <CustomTextField
                fullWidth
                type={type}
                label={label}
                value={userData[field]}
                inputProps={
                  field === "citizenId" ? { inputMode: "numeric" } : undefined
                }
                slotProps={
                  type === "date" ? { inputLabel: { shrink: true } } : undefined
                }
                onChange={(event) =>
                  setUserData({
                    ...userData,
                    [field]:
                      field === "citizenId"
                        ? event.target.value.replace(/\D/g, "")
                        : event.target.value,
                  })
                }
              />
            </Grid>
          ))}
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
