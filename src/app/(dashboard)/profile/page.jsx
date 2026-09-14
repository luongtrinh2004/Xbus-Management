"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { resolveAvatar } from "@/utils/getDefaultAvatar";

const CATEGORY_LABEL = {
  category_official: "Chính thức",
  category_probation: "Thử việc",
  category_intern: "Thực tập",
  category_collaborator: "Cộng tác viên",
};

const TYPE_LABEL = {
  type_web_app: "Web/App",
  type_ap: "AP",
  type_peer_admin: "Peer Admin",
};

const STATUS_COLOR = {
  able: "success",
  pending: "warning",
  disabled: "error",
};
const STATUS_LABEL = {
  able: "Đang hoạt động",
  pending: "Chờ kích hoạt",
  disabled: "Vô hiệu hóa",
};

function InfoRow({ icon, label, value, chip, chipColor }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          bgcolor: "rgba(115,103,240,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i className={`${icon} text-primary text-[18px]`} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
          {label}
        </Typography>
        {chip ? (
          <Chip label={value || "—"} size="small" color={chipColor || "default"} variant="tonal" />
        ) : (
          <Typography variant="body2" fontWeight={600} noWrap>
            {value || <span style={{ color: "#aaa", fontWeight: 400 }}>Chưa cập nhật</span>}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  // Form state
  const [form, setForm] = useState({ name: "", phone: "", gender: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const showSnack = (msg, severity = "success") => setSnack({ open: true, msg, severity });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data);
      setForm({ name: data.name || "", phone: data.phone || "", gender: data.gender || "" });
    } catch {
      showSnack("Không thể tải thông tin cá nhân", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveInfo = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật");
      setProfile(data);
      await updateSession({ name: data.name });
      showSnack("Cập nhật thông tin thành công!");
    } catch (err) {
      showSnack(err.message || "Lỗi hệ thống", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async () => {
    setPwError("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError("Mật khẩu mới cần ít nhất 6 ký tự");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi đổi mật khẩu");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showSnack("Đổi mật khẩu thành công!");
    } catch (err) {
      setPwError(err.message || "Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch(`/api/users/${profile.id}/avatar`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi upload");
      setProfile((prev) => ({ ...prev, avatarUrl: data.avatarUrl }));
      await updateSession({ image: data.avatarUrl });
      showSnack("Cập nhật ảnh đại diện thành công!");
    } catch (err) {
      showSnack(err.message || "Lỗi upload ảnh", "error");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <Typography color="text.secondary">Không thể tải thông tin.</Typography>
      </Box>
    );
  }

  const avatarSrc = resolveAvatar(profile);
  const joinDate = profile.activatedAt
    ? new Date(profile.activatedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
  const lastUpdate = profile.updatedAt
    ? new Date(profile.updatedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <>
      {/* HERO BANNER */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #7367F0 0%, #9E95F5 50%, #CE9FFC 100%)",
          borderRadius: 4,
          p: { xs: 3, md: 5 },
          mb: 4,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(115,103,240,0.35)",
        }}
      >
        {/* decorative blobs */}
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, bgcolor: "rgba(255,255,255,0.07)", borderRadius: "50%" }} />
        <Box sx={{ position: "absolute", bottom: -60, right: 80, width: 160, height: 160, bgcolor: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />

        <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, gap: 3, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {/* Avatar with upload */}
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={avatarSrc}
              alt={profile.name}
              sx={{
                width: 96, height: 96,
                border: "4px solid rgba(255,255,255,0.6)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                bgcolor: "rgba(255,255,255,0.2)",
                fontSize: "2rem",
                fontWeight: 700,
              }}
            >
              {profile.name?.[0]}
            </Avatar>
            <Tooltip title="Đổi ảnh đại diện">
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  bgcolor: "white",
                  color: "primary.main",
                  width: 28,
                  height: 28,
                  boxShadow: 2,
                  "&:hover": { bgcolor: "grey.100" },
                }}
              >
                {uploadingAvatar ? <CircularProgress size={14} /> : <i className="tabler-camera text-[14px]" />}
              </IconButton>
            </Tooltip>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarUpload} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={800} color="white" sx={{ mb: 0.5 }}>
              {profile.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mb: 1.5 }}>
              {profile.email} {profile.code && <> &nbsp;·&nbsp; <strong>{profile.code}</strong></>}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                label={profile.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                size="small"
                icon={<i className={`${profile.role === "admin" ? "tabler-shield-check" : "tabler-user"} text-white`} />}
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", backdropFilter: "blur(8px)", fontWeight: 600, "& .MuiChip-icon": { color: "white" } }}
              />
              <Chip
                label={STATUS_LABEL[profile.status] || profile.status}
                size="small"
                icon={<i className="tabler-circle-check text-white" />}
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", backdropFilter: "blur(8px)", fontWeight: 600, "& .MuiChip-icon": { color: "white" } }}
              />
              {TYPE_LABEL[profile.typeId] && (
                <Chip
                  label={TYPE_LABEL[profile.typeId]}
                  size="small"
                  icon={<i className="tabler-building text-white" />}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", backdropFilter: "blur(8px)", fontWeight: 600, "& .MuiChip-icon": { color: "white" } }}
                />
              )}
            </Box>
          </Box>

          {/* Stats mini cards */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {[
              { label: "Điểm rèn luyện", value: profile.schedulingPoints ?? 0, icon: "tabler-trophy" },
              { label: "Lượt bê nước", value: profile.waterTripCount ?? 0, icon: "tabler-droplet" },
            ].map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 3,
                  px: 2.5,
                  py: 1.5,
                  textAlign: "center",
                  minWidth: 90,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <i className={`${stat.icon} text-white text-xl`} />
                <Typography variant="h5" fontWeight={800} color="white" sx={{ my: 0.25 }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" }}>
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* LEFT: Thông tin chi tiết (readonly) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ border: "1px solid", borderColor: "divider", boxShadow: "none", height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "rgba(115,103,240,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="tabler-id text-primary text-lg" />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>Thông tin hệ thống</Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <InfoRow icon="tabler-hash" label="Mã nhân sự" value={profile.code} />
              <Divider />
              <InfoRow icon="tabler-mail" label="Email" value={profile.email} />
              <Divider />
              <InfoRow icon="tabler-building" label="Bộ phận" value={TYPE_LABEL[profile.typeId] || profile.typeId} />
              <Divider />
              <InfoRow icon="tabler-briefcase" label="Hình thức" value={CATEGORY_LABEL[profile.categoryId] || profile.categoryId} />
              <Divider />
              <InfoRow icon="tabler-shield" label="Vai trò" value={profile.role === "admin" ? "Quản trị viên" : "Nhân viên"} chip chipColor={profile.role === "admin" ? "error" : "primary"} />
              <Divider />
              <InfoRow icon="tabler-circle-dot" label="Trạng thái" value={STATUS_LABEL[profile.status] || profile.status} chip chipColor={STATUS_COLOR[profile.status]} />
              {joinDate && (
                <>
                  <Divider />
                  <InfoRow icon="tabler-calendar-check" label="Ngày kích hoạt" value={joinDate} />
                </>
              )}
              {lastUpdate && (
                <>
                  <Divider />
                  <InfoRow icon="tabler-clock-edit" label="Cập nhật lần cuối" value={lastUpdate} />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT: Form chỉnh sửa + đổi mật khẩu */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Card 1: Chỉnh sửa thông tin */}
            <Card sx={{ border: "1px solid", borderColor: "divider", boxShadow: "none" }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "rgba(115,103,240,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="tabler-user-edit text-primary text-lg" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Thông tin cá nhân</Typography>
                    <Typography variant="caption" color="text.secondary">Cập nhật họ tên, số điện thoại và giới tính</Typography>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Họ và tên"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      fullWidth
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <i className="tabler-user text-textSecondary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Số điện thoại"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      fullWidth
                      placeholder="09xxxxxxxx"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <i className="tabler-phone text-textSecondary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      label="Giới tính"
                      value={form.gender}
                      onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <i className="tabler-gender-bigender text-textSecondary" />
                          </InputAdornment>
                        ),
                      }}
                    >
                      <MenuItem value="male">Nam</MenuItem>
                      <MenuItem value="female">Nữ</MenuItem>
                      <MenuItem value="unspecified">Không tiết lộ</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <i className="tabler-device-floppy" />}
                    onClick={handleSaveInfo}
                    disabled={saving || !form.name.trim()}
                    sx={{ px: 4, borderRadius: 2 }}
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Card 2: Đổi mật khẩu */}
            <Card sx={{ border: "1px solid", borderColor: "divider", boxShadow: "none" }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "rgba(255,159,67,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="tabler-lock text-warning text-lg" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Đổi mật khẩu</Typography>
                    <Typography variant="caption" color="text.secondary">Mật khẩu mới phải có ít nhất 6 ký tự</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <TextField
                    label="Mật khẩu hiện tại"
                    type={showCurrentPw ? "text" : "password"}
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><i className="tabler-lock text-textSecondary" /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowCurrentPw((v) => !v)}>
                            <i className={`${showCurrentPw ? "tabler-eye-off" : "tabler-eye"} text-textSecondary`} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Mật khẩu mới"
                        type={showNewPw ? "text" : "password"}
                        value={pwForm.newPassword}
                        onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                        fullWidth
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><i className="tabler-lock-open text-textSecondary" /></InputAdornment>,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={() => setShowNewPw((v) => !v)}>
                                <i className={`${showNewPw ? "tabler-eye-off" : "tabler-eye"} text-textSecondary`} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Xác nhận mật khẩu mới"
                        type="password"
                        value={pwForm.confirmPassword}
                        onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                        fullWidth
                        error={!!pwError && pwForm.confirmPassword !== pwForm.newPassword}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><i className="tabler-lock-check text-textSecondary" /></InputAdornment>,
                        }}
                      />
                    </Grid>
                  </Grid>

                  {/* Strength bar */}
                  {pwForm.newPassword.length > 0 && (
                    <Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Độ mạnh mật khẩu</Typography>
                        <Typography variant="caption" fontWeight={600} color={
                          pwForm.newPassword.length >= 12 ? "success.main" :
                          pwForm.newPassword.length >= 8 ? "warning.main" : "error.main"
                        }>
                          {pwForm.newPassword.length >= 12 ? "Mạnh" : pwForm.newPassword.length >= 8 ? "Trung bình" : "Yếu"}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (pwForm.newPassword.length / 12) * 100)}
                        color={pwForm.newPassword.length >= 12 ? "success" : pwForm.newPassword.length >= 8 ? "warning" : "error"}
                        sx={{ borderRadius: 4, height: 6 }}
                      />
                    </Box>
                  )}

                  {pwError && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>{pwError}</Alert>
                  )}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <i className="tabler-lock-square-rounded" />}
                    onClick={handleChangePw}
                    disabled={saving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                    sx={{ px: 4, borderRadius: 2 }}
                  >
                    {saving ? "Đang xử lý..." : "Đổi mật khẩu"}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Card 3: Upload avatar hướng dẫn */}
            <Card
              sx={{
                border: "1px dashed",
                borderColor: "primary.main",
                boxShadow: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": { bgcolor: "rgba(115,103,240,0.04)", transform: "translateY(-1px)" },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent sx={{ p: 3, textAlign: "center" }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "16px",
                    bgcolor: "rgba(115,103,240,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 1.5,
                  }}
                >
                  {uploadingAvatar ? (
                    <CircularProgress size={24} />
                  ) : (
                    <i className="tabler-photo-up text-primary text-2xl" />
                  )}
                </Box>
                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                  {uploadingAvatar ? "Đang tải ảnh..." : "Tải ảnh đại diện mới"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Hỗ trợ JPG, PNG, WebP · Tối đa 5MB
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((p) => ({ ...p, open: false }))} variant="filled" sx={{ borderRadius: 3 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
