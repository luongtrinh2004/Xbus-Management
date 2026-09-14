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
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid2";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { resolveAvatar } from "@/utils/getDefaultAvatar";
import { toast } from "react-toastify";

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
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 0.25 }}
        >
          {label}
        </Typography>
        {chip ? (
          <Chip
            label={value || "—"}
            size="small"
            color={chipColor || "default"}
            variant="tonal"
          />
        ) : (
          <Typography variant="body2" fontWeight={600} noWrap>
            {value || (
              <span style={{ color: "#aaa", fontWeight: 400 }}>
                Chưa cập nhật
              </span>
            )}
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
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState("");
  const [cropImageSize, setCropImageSize] = useState({ width: 1, height: 1 });
  const [crop, setCrop] = useState({ zoom: 1, x: 0, y: 0 });
  const fileInputRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    gender: "",
    birthday: "",
  });

  const showSnack = (msg, severity = "success") =>
    severity === "error" ? toast.error(msg) : toast.success(msg);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data);
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        gender: data.gender || "",
        birthday: data.birthday || "",
      });
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

  const handleAvatarFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return showSnack("Vui lòng chọn một tệp ảnh", "error");
    if (file.size > 5 * 1024 * 1024)
      return showSnack("Ảnh không được vượt quá 5 MB", "error");
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        setCropImageSize({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
        setCrop({ zoom: 1, x: 0, y: 0 });
        setCropSource(String(reader.result));
        setCropOpen(true);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    try {
      setUploadingAvatar(true);
      const image = new Image();
      image.src = cropSource;
      await image.decode();
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      const scale =
        Math.max(size / image.naturalWidth, size / image.naturalHeight) *
        crop.zoom;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const x =
        (size - width) / 2 + (crop.x / 100) * Math.max(0, (width - size) / 2);
      const y =
        (size - height) / 2 + (crop.y / 100) * Math.max(0, (height - size) / 2);
      context.drawImage(image, x, y, width, height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Không thể xử lý ảnh");
      const payload = new FormData();
      payload.append("avatar", blob, "avatar.jpg");
      const response = await fetch(`/api/users/${profile.id}/avatar`, {
        method: "POST",
        body: payload,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Không thể cập nhật ảnh đại diện");
      setProfile((current) => ({ ...current, avatarUrl: data.avatarUrl }));
      await updateSession({ image: data.avatarUrl });
      setCropOpen(false);
      showSnack("Đã cập nhật ảnh đại diện");
    } catch (error) {
      showSnack(error.message || "Không thể cập nhật ảnh đại diện", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
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
    ? new Date(profile.activatedAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;
  const lastUpdate = profile.updatedAt
    ? new Date(profile.updatedAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <>
      {/* HERO BANNER */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, #7367F0 0%, #9E95F5 50%, #CE9FFC 100%)",
          borderRadius: 4,
          p: { xs: 3, md: 5 },
          mb: 4,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(115,103,240,0.35)",
        }}
      >
        {/* decorative blobs */}
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            bgcolor: "rgba(255,255,255,0.07)",
            borderRadius: "50%",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -60,
            right: 80,
            width: 160,
            height: 160,
            bgcolor: "rgba(255,255,255,0.05)",
            borderRadius: "50%",
          }}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 3,
            flexWrap: "wrap",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            role="button"
            tabIndex={0}
            aria-label="Thay đổi ảnh đại diện"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) =>
              event.key === "Enter" && fileInputRef.current?.click()
            }
            sx={{
              flexShrink: 0,
              position: "relative",
              cursor: "pointer",
              borderRadius: "50%",
              "&:hover .avatar-overlay, &:focus-visible .avatar-overlay": {
                opacity: 1,
              },
            }}
          >
            <Avatar
              src={avatarSrc}
              alt={profile.name}
              sx={{
                width: 96,
                height: 96,
                border: "4px solid rgba(255,255,255,0.6)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                bgcolor: "rgba(255,255,255,0.2)",
                fontSize: "2rem",
                fontWeight: 700,
              }}
            >
              {profile.name?.[0]}
            </Avatar>
            <Box
              className="avatar-overlay"
              sx={{
                position: "absolute",
                inset: 4,
                borderRadius: "50%",
                bgcolor: "rgba(15,23,42,.58)",
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "opacity .2s",
              }}
            >
              <i className="tabler-camera text-xl" />
              <Typography variant="caption" color="inherit">
                Đổi ảnh
              </Typography>
            </Box>
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFile}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h5"
              fontWeight={800}
              color="white"
              sx={{ mb: 0.5 }}
            >
              {profile.name}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.8)", mb: 1.5 }}
            >
              {profile.email}{" "}
              {profile.code && (
                <>
                  {" "}
                  &nbsp;·&nbsp; <strong>{profile.code}</strong>
                </>
              )}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                label={
                  profile.role === "admin"
                    ? "Quản trị viên"
                    : profile.role === "assistant"
                      ? "Trợ lý"
                      : "Nhân viên"
                }
                size="small"
                icon={
                  <i
                    className={`${profile.role === "admin" ? "tabler-shield-check" : "tabler-user"} text-white`}
                  />
                }
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  backdropFilter: "blur(8px)",
                  fontWeight: 600,
                  "& .MuiChip-icon": { color: "white" },
                }}
              />
              <Chip
                label={STATUS_LABEL[profile.status] || profile.status}
                size="small"
                icon={<i className="tabler-circle-check text-white" />}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  backdropFilter: "blur(8px)",
                  fontWeight: 600,
                  "& .MuiChip-icon": { color: "white" },
                }}
              />
              {TYPE_LABEL[profile.typeId] && (
                <Chip
                  label={TYPE_LABEL[profile.typeId]}
                  size="small"
                  icon={<i className="tabler-building text-white" />}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                    fontWeight: 600,
                    "& .MuiChip-icon": { color: "white" },
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Stats mini cards */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {[
              {
                label: "Điểm rèn luyện",
                value: profile.schedulingPoints ?? 0,
                icon: "tabler-trophy",
              },
              {
                label: "Lượt bê nước",
                value: profile.waterTripCount ?? 0,
                icon: "tabler-droplet",
              },
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
                <Typography
                  variant="h5"
                  fontWeight={800}
                  color="white"
                  sx={{ my: 0.25 }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" }}
                >
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
          <Card
            sx={{
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "none",
              height: "100%",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 2.5,
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    bgcolor: "rgba(115,103,240,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className="tabler-id text-primary text-lg" />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Thông tin hệ thống
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <InfoRow
                icon="tabler-hash"
                label="Mã nhân sự"
                value={profile.code}
              />
              <Divider />
              <InfoRow icon="tabler-mail" label="Email" value={profile.email} />
              <Divider />
              <InfoRow
                icon="tabler-building"
                label="Bộ phận"
                value={TYPE_LABEL[profile.typeId] || profile.typeId}
              />
              <Divider />
              <InfoRow
                icon="tabler-briefcase"
                label="Hình thức"
                value={CATEGORY_LABEL[profile.categoryId] || profile.categoryId}
              />
              <Divider />
              <InfoRow
                icon="tabler-shield"
                label="Vai trò"
                value={
                  profile.role === "admin"
                    ? "Quản trị viên"
                    : profile.role === "assistant"
                      ? "Trợ lý"
                      : "Nhân viên"
                }
                chip
                chipColor={profile.role === "admin" ? "error" : "primary"}
              />
              <Divider />
              <InfoRow
                icon="tabler-circle-dot"
                label="Trạng thái"
                value={STATUS_LABEL[profile.status] || profile.status}
                chip
                chipColor={STATUS_COLOR[profile.status]}
              />
              {joinDate && (
                <>
                  <Divider />
                  <InfoRow
                    icon="tabler-calendar-check"
                    label="Ngày kích hoạt"
                    value={joinDate}
                  />
                </>
              )}
              {lastUpdate && (
                <>
                  <Divider />
                  <InfoRow
                    icon="tabler-clock-edit"
                    label="Cập nhật lần cuối"
                    value={lastUpdate}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT: Form chỉnh sửa thông tin cá nhân */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Card 1: Chỉnh sửa thông tin */}
            <Card
              sx={{
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "none",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 3,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      bgcolor: "rgba(115,103,240,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className="tabler-user-edit text-primary text-lg" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Thông tin cá nhân
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cập nhật họ tên, ngày sinh và thông tin liên hệ
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Họ và tên"
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setForm((p) => ({ ...p, phone: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setForm((p) => ({ ...p, gender: e.target.value }))
                      }
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
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Ngày sinh"
                      type="date"
                      value={form.birthday}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, birthday: e.target.value }))
                      }
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <i className="tabler-cake text-textSecondary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={
                      saving ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <i className="tabler-device-floppy" />
                      )
                    }
                    onClick={handleSaveInfo}
                    disabled={saving || !form.name.trim()}
                    sx={{ px: 4, borderRadius: 2 }}
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      <Dialog
        open={cropOpen}
        onClose={() => !uploadingAvatar && setCropOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pb: 1 }}>Căn chỉnh ảnh đại diện</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Thu phóng và di chuyển ảnh để chọn vùng hiển thị phù hợp.
          </Typography>
          <Box
            sx={{
              width: 280,
              height: 280,
              maxWidth: "100%",
              mx: "auto",
              overflow: "hidden",
              borderRadius: "50%",
              bgcolor: "action.hover",
              position: "relative",
              boxShadow: "inset 0 0 0 2px rgba(115,103,240,.45)",
            }}
          >
            {cropSource &&
              (() => {
                const previewSize = 280;
                const baseScale = Math.max(
                  previewSize / cropImageSize.width,
                  previewSize / cropImageSize.height,
                );
                const width = cropImageSize.width * baseScale * crop.zoom;
                const height = cropImageSize.height * baseScale * crop.zoom;
                return (
                  <Box
                    component="img"
                    src={cropSource}
                    alt="Xem trước ảnh đại diện"
                    sx={{
                      position: "absolute",
                      width,
                      height,
                      maxWidth: "none",
                      left:
                        (previewSize - width) / 2 +
                        (crop.x / 100) * Math.max(0, (width - previewSize) / 2),
                      top:
                        (previewSize - height) / 2 +
                        (crop.y / 100) *
                          Math.max(0, (height - previewSize) / 2),
                      userSelect: "none",
                    }}
                  />
                );
              })()}
          </Box>
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Thu phóng
            </Typography>
            <Slider
              value={crop.zoom}
              min={1}
              max={3}
              step={0.05}
              onChange={(_, value) =>
                setCrop((current) => ({ ...current, zoom: value }))
              }
              aria-label="Thu phóng ảnh"
            />
            <Typography variant="caption" color="text.secondary">
              Vị trí ngang
            </Typography>
            <Slider
              value={crop.x}
              min={-100}
              max={100}
              onChange={(_, value) =>
                setCrop((current) => ({ ...current, x: value }))
              }
              aria-label="Vị trí ngang"
            />
            <Typography variant="caption" color="text.secondary">
              Vị trí dọc
            </Typography>
            <Slider
              value={crop.y}
              min={-100}
              max={100}
              onChange={(_, value) =>
                setCrop((current) => ({ ...current, y: value }))
              }
              aria-label="Vị trí dọc"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCropOpen(false)} disabled={uploadingAvatar}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAvatar}
            disabled={uploadingAvatar}
            startIcon={
              uploadingAvatar ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <i className="tabler-check" />
              )
            }
          >
            {uploadingAvatar ? "Đang lưu..." : "Lưu ảnh"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
