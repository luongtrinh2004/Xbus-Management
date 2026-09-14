"use client";

import { useEffect, useState, useMemo } from "react";
import Grid from "@mui/material/Grid2";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { toast } from "react-toastify";
import CustomTextField from "@core/components/mui/TextField";
import tableStyles from "@core/styles/table.module.css";
import { exportJsonToExcel } from "@/libs/excelHelper";
import CompleteScheduleModal from "./CompleteScheduleModal";
import ChangeMemberModal from "./ChangeMemberModal";
import UserWaterHistoryModal from "./UserWaterHistoryModal";
import { resolveAvatar } from "@/utils/getDefaultAvatar";

export default function AdminScheduleView({
  month,
  setMonth,
  year,
  setYear,
  schedules = [],
  weeksMeta = [],
  eligibleUsers = [],
  exemptUserIds = [],
  onRefresh,
}) {
  const [draftSchedules, setDraftSchedules] = useState(schedules);
  const [hasChanges, setHasChanges] = useState(false);
  const [genderFilter, setGenderFilter] = useState("all"); // 'all' | 'female' | 'male'

  // Modals state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedWeekForComplete, setSelectedWeekForComplete] = useState(null);
  const [changeMemberModalOpen, setChangeMemberModalOpen] = useState(false);
  const [selectedWeekForMember, setSelectedWeekForMember] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);
  const [exemptModalOpen, setExemptModalOpen] = useState(false);
  const [exemptIds, setExemptIds] = useState(exemptUserIds);
  const [exemptSearch, setExemptSearch] = useState("");

  // Cập nhật draft khi schedules thay đổi từ server
  useMemo(() => {
    const combined = weeksMeta.map((w) => {
      const existing = schedules.find((s) => s.weekIndex === w.weekIndex);
      if (existing) {
        return {
          ...existing,
          range: existing.range || w.range,
          validDays: w.validDays,
        };
      }
      return {
        id: `water_${year}${String(month).padStart(2, "0")}_week_${w.weekIndex}`,
        year,
        month,
        weekIndex: w.weekIndex,
        range: w.range,
        validDays: w.validDays,
        date: w.defaultDate,
        time: "09:00",
        requiredPeople: 5,
        status: "upcoming",
        note: "",
        participants: [],
      };
    });
    setDraftSchedules(combined);
    setHasChanges(false);
  }, [schedules, weeksMeta, year, month]);

  useEffect(() => setExemptIds(exemptUserIds), [exemptUserIds]);

  const saveExemptions = async (ids) => {
    const res = await fetch("/api/water-schedules/exemptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: ids }),
    });
    const data = await res.json();
    if (!res.ok)
      return toast.error(data.error || "Không thể cập nhật danh sách miễn");
    setExemptIds(data.userIds);
    toast.success("Đã cập nhật danh sách miễn bê nước");
  };

  // Random cho 1 tuần cụ thể
  // Quy tắc: Random tổ hợp những người điểm rèn luyện thấp nhất; nếu thiếu vài người thì lấy random trong nhóm điểm thấp thứ 2
  const handleRandomWeek = async (weekIndex) => {
    const week = draftSchedules.find((w) => w.weekIndex === weekIndex);
    if (!week) return;

    try {
      const res = await fetch("/api/water-schedules/random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          mode: "single_week",
          weekIndex,
          requiredPeople: week.requiredPeople || 5,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDraftSchedules((prev) =>
          prev.map((w) => {
            if (w.weekIndex === weekIndex) {
              return { ...w, participants: data.participants };
            }
            return w;
          }),
        );
        setHasChanges(true);
        toast.success(
          `Đã random lại Tuần ${weekIndex}! Nhớ nhấn "Lưu thay đổi" để xác nhận.`,
        );
      } else {
        toast.error(data.error || "Lỗi khi random tuần");
      }
    } catch (err) {
      toast.error("Lỗi kết nối khi random tuần");
    }
  };

  // Xóa 1 người khỏi tuần
  const handleRemoveMember = (weekIndex, userId) => {
    setDraftSchedules((prev) =>
      prev.map((w) => {
        if (w.weekIndex === weekIndex) {
          const updated = (w.participants || []).filter(
            (p) => (p.userId || p) !== userId,
          );
          return { ...w, participants: updated };
        }
        return w;
      }),
    );
    setHasChanges(true);
  };

  // Thêm người vào tuần
  const handleAddMember = (userObj) => {
    if (!selectedWeekForMember) return;
    const targetWeek = draftSchedules.find(
      (week) => week.weekIndex === selectedWeekForMember.weekIndex,
    );
    if (
      (targetWeek?.participants || []).length >=
      Math.min(5, targetWeek?.requiredPeople || 5)
    ) {
      toast.error(
        `Đã đủ ${Math.min(5, targetWeek?.requiredPeople || 5)} người cho tuần này`,
      );
      return;
    }
    setDraftSchedules((prev) =>
      prev.map((w) => {
        if (w.weekIndex === selectedWeekForMember.weekIndex) {
          const current = w.participants || [];
          if (current.some((p) => (p.userId || p) === userObj.userId)) return w;
          return { ...w, participants: [...current, userObj] };
        }
        return w;
      }),
    );
    setHasChanges(true);
    toast.success(
      `Đã thêm ${userObj.name} vào Tuần ${selectedWeekForMember.weekIndex}`,
    );
  };

  // Thay đổi trường của tuần (ngày, giờ, số người, ghi chú)
  const handleUpdateWeekField = (weekIndex, field, value) => {
    setDraftSchedules((prev) =>
      prev.map((w) => {
        if (w.weekIndex === weekIndex) {
          if (field === "requiredPeople") {
            const requiredPeople = Math.min(5, Math.max(1, Number(value) || 1));
            return {
              ...w,
              requiredPeople,
              participants: (w.participants || []).slice(0, requiredPeople),
            };
          }
          return { ...w, [field]: value };
        }
        return w;
      }),
    );
    setHasChanges(true);
  };

  // Lưu lịch tháng
  const handleSaveMonth = async () => {
    try {
      const res = await fetch("/api/water-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          schedules: draftSchedules,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Đã lưu lịch bê nước tháng thành công!");
        setHasChanges(false);
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || "Lỗi khi lưu lịch");
      }
    } catch (err) {
      toast.error("Lỗi kết nối khi lưu lịch");
    }
  };

  const handleSaveWeek = async (weekIndex) => {
    const week = draftSchedules.find((item) => item.weekIndex === weekIndex);
    if (!week) return;
    try {
      const res = await fetch("/api/water-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, schedule: week }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Đã lưu Tuần ${weekIndex}`);
        setHasChanges(false);
        if (onRefresh) onRefresh();
      } else toast.error(data.error || "Lỗi khi lưu lịch");
    } catch {
      toast.error("Lỗi kết nối khi lưu lịch");
    }
  };

  // Xuất Excel lịch tháng
  const handleExportExcel = () => {
    const exportData = draftSchedules.map((w) => ({
      Tuần: `Tuần ${w.weekIndex}`,
      "Khoảng ngày": w.range,
      "Ngày thực hiện": w.date,
      Giờ: w.time,
      "Trạng thái":
        w.status === "completed"
          ? "Hoàn thành"
          : w.status === "cancelled"
            ? "Đã hủy"
            : "Sắp tới",
      "Số người": (w.participants || []).length,
      "Danh sách phân công": (w.participants || [])
        .map((p) => p.name || p)
        .join(", "),
      "Ghi chú": w.note || "",
    }));
    exportJsonToExcel(
      exportData,
      `lich_be_nuoc_thang_${String(month).padStart(2, "0")}_${year}.xlsx`,
    );
  };

  // Xuất Excel Thống kê lượt lấy nước
  const handleExportStats = () => {
    const exportData = filteredUsers.map((u, i) => ({
      STT: i + 1,
      "Mã NV": u.code || "",
      "Họ và tên": u.name,
      "Giới tính": u.gender === "female" ? "Nữ" : "Nam",
      "Bộ phận":
        u.typeId === "type_web_app"
          ? "Web/App"
          : u.typeId === "type_ap"
            ? "AP"
            : u.typeId === "type_peer_admin"
              ? "Peer Admin"
              : "Chưa gán",
      "Hình thức":
        u.categoryId === "category_official"
          ? "Chính thức"
          : u.categoryId === "category_intern"
            ? "Thực tập"
            : u.categoryId === "category_probation"
              ? "Thử việc"
              : "—",
      "Số lượt lấy nước": u.waterTripCount || 0,
      "Điểm rèn luyện": u.schedulingPoints || 0,
    }));
    exportJsonToExcel(exportData, `thong_ke_luot_lay_nuoc_${year}.xlsx`);
  };

  // Lọc danh sách nhân sự theo giới tính (bao gồm cả nhân sự nữ và nam với role = user)
  const filteredUsers = useMemo(() => {
    if (genderFilter === "female")
      return eligibleUsers.filter((u) => u.gender === "female");
    if (genderFilter === "male")
      return eligibleUsers.filter((u) => u.gender === "male");
    return eligibleUsers;
  }, [eligibleUsers, genderFilter]);

  const femaleCount = useMemo(
    () => eligibleUsers.filter((u) => u.gender === "female").length,
    [eligibleUsers],
  );
  const maleCount = useMemo(
    () => eligibleUsers.filter((u) => u.gender === "male").length,
    [eligibleUsers],
  );
  const exemptUsers = eligibleUsers.filter((user) =>
    exemptIds.includes(user.id),
  );
  const searchResults = exemptSearch.trim()
    ? eligibleUsers.filter((user) => {
        const query = exemptSearch.trim().toLowerCase();
        return (
          !exemptIds.includes(user.id) &&
          (user.name?.toLowerCase().includes(query) ||
            user.code?.toLowerCase().includes(query))
        );
      })
    : [];

  return (
    <Grid container spacing={6}>
      {/* ── PHẦN 1: SET LỊCH BÊ NƯỚC THEO TUẦN ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: "rgba(0, 186, 209, 0.12)",
                    color: "info.main",
                    width: 48,
                    height: 48,
                  }}
                >
                  <i className="tabler-droplet text-xl" />
                </Avatar>
                <Box
                  sx={{
                    minHeight: 48,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h6" fontWeight={700} lineHeight={1.25}>
                    Quản Lý Lịch Bê Nước
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    lineHeight={1.35}
                  >
                    Phân công từng tuần theo thuật toán tổ hợp điểm rèn luyện
                    thấp nhất
                  </Typography>
                </Box>
              </Box>
            }
            action={
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <CustomTextField
                  select
                  size="small"
                  value={`${month}/${year}`}
                  onChange={(e) => {
                    const [m, y] = e.target.value.split("/");
                    setMonth(parseInt(m, 10));
                    setYear(parseInt(y, 10));
                  }}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="9/2026">Tháng 09/2026</MenuItem>
                  <MenuItem value="10/2026">Tháng 10/2026</MenuItem>
                  <MenuItem value="11/2026">Tháng 11/2026</MenuItem>
                  <MenuItem value="12/2026">Tháng 12/2026</MenuItem>
                </CustomTextField>

                <Button
                  variant="tonal"
                  color="error"
                  startIcon={<i className="tabler-user-off" />}
                  onClick={() => setExemptModalOpen(true)}
                >
                  Danh sách miễn bê nước
                </Button>
                <Button
                  variant="tonal"
                  color="secondary"
                  startIcon={<i className="tabler-file-spreadsheet" />}
                  onClick={handleExportExcel}
                >
                  Xuất Excel lịch
                </Button>

                <Button
                  variant="contained"
                  color={hasChanges ? "success" : "primary"}
                  startIcon={<i className="tabler-device-floppy" />}
                  onClick={handleSaveMonth}
                >
                  {hasChanges ? "Lưu thay đổi *" : "Lưu lịch tháng"}
                </Button>
              </Box>
            }
          />
          <Divider />

          <CardContent>
            <Grid container spacing={4}>
              {draftSchedules.map((week) => {
                const isCompleted = week.status === "completed";
                const isCancelled = week.status === "cancelled";
                const isSaved = Boolean(week.savedAt);
                const participants = week.participants || [];

                return (
                  <Grid size={{ xs: 12, md: 6 }} key={week.weekIndex}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        border: isCompleted
                          ? "1px solid rgba(40, 199, 111, 0.4)"
                          : isCancelled
                            ? "1px dashed rgba(255, 76, 81, 0.4)"
                            : "1px solid rgba(115, 103, 240, 0.2)",
                        bgcolor: isCompleted
                          ? "rgba(40, 199, 111, 0.02)"
                          : isCancelled
                            ? "rgba(255, 76, 81, 0.02)"
                            : "inherit",
                      }}
                    >
                      <CardContent>
                        {/* Header tuần */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Typography variant="h6" fontWeight={700}>
                              Tuần {week.weekIndex}
                            </Typography>
                            <Chip
                              size="small"
                              label={week.range}
                              variant="tonal"
                            />
                          </Box>
                          <Box sx={{ display: "flex", gap: 0.75 }}>
                            <Chip
                              size="small"
                              label={
                                isCompleted
                                  ? "Hoàn thành"
                                  : isCancelled
                                    ? "Đã hủy"
                                    : "Sắp tới"
                              }
                              color={
                                isCompleted
                                  ? "success"
                                  : isCancelled
                                    ? "error"
                                    : "info"
                              }
                              variant="tonal"
                            />
                            {isSaved && !isCompleted && (
                              <Chip
                                size="small"
                                label="Đã lưu"
                                color="success"
                                variant="tonal"
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Chọn ngày và giờ */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid size={{ xs: 6 }}>
                            <CustomTextField
                              select
                              fullWidth
                              size="small"
                              label="Ngày bê nước"
                              value={week.date || ""}
                              disabled={isCompleted || isCancelled}
                              onChange={(e) =>
                                handleUpdateWeekField(
                                  week.weekIndex,
                                  "date",
                                  e.target.value,
                                )
                              }
                            >
                              {(week.validDays || [week.date]).map((d) => (
                                <MenuItem key={d} value={d}>
                                  {d}
                                </MenuItem>
                              ))}
                            </CustomTextField>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <CustomTextField
                              select
                              fullWidth
                              size="small"
                              label="Giờ"
                              value={week.time || "09:00"}
                              disabled={isCompleted || isCancelled}
                              onChange={(e) =>
                                handleUpdateWeekField(
                                  week.weekIndex,
                                  "time",
                                  e.target.value,
                                )
                              }
                            >
                              <MenuItem value="08:30">08:30</MenuItem>
                              <MenuItem value="09:00">09:00</MenuItem>
                              <MenuItem value="09:30">09:30</MenuItem>
                              <MenuItem value="14:00">14:00</MenuItem>
                              <MenuItem value="15:00">15:00</MenuItem>
                            </CustomTextField>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <CustomTextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Số người"
                              slotProps={{ htmlInput: { min: 1, max: 5 } }}
                              value={week.requiredPeople || 5}
                              disabled={isCompleted || isCancelled}
                              onChange={(e) =>
                                handleUpdateWeekField(
                                  week.weekIndex,
                                  "requiredPeople",
                                  parseInt(e.target.value, 10) || 5,
                                )
                              }
                            />
                          </Grid>
                        </Grid>

                        {/* Danh sách người được chọn */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            Thành viên ({participants.length}/
                            {week.requiredPeople || 5}):
                          </Typography>
                          {!isCompleted && !isCancelled && (
                            <Button
                              size="small"
                              variant="tonal"
                              color="primary"
                              startIcon={
                                <i className="tabler-user-plus text-xs" />
                              }
                              onClick={() => {
                                setSelectedWeekForMember(week);
                                setChangeMemberModalOpen(true);
                              }}
                            >
                              Thêm / Thay người
                            </Button>
                          )}
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 1,
                            mb: 2,
                            minHeight: 40,
                          }}
                        >
                          {participants.map((p, idx) => {
                            const uid = p.userId || p;
                            const name = p.name || p;
                            const code = p.code || "";

                            return (
                              <Chip
                                key={uid || idx}
                                label={`${name} ${code ? `(${code})` : ""}`}
                                size="small"
                                variant="tonal"
                                color={
                                  isCompleted
                                    ? p.completed
                                      ? "success"
                                      : "secondary"
                                    : "primary"
                                }
                                onDelete={
                                  !isCompleted && !isCancelled
                                    ? () =>
                                        handleRemoveMember(week.weekIndex, uid)
                                    : undefined
                                }
                                sx={{ fontSize: 12 }}
                              />
                            );
                          })}
                          {participants.length === 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ py: 1 }}
                            >
                              Chưa phân công. Bấm "Random tuần này" bên dưới.
                            </Typography>
                          )}
                        </Box>

                        <Divider sx={{ my: 1.5 }} />

                        {/* Footer Actions của tuần */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", gap: 1 }}>
                            {!isCompleted && !isCancelled && (
                              <>
                                <Tooltip title="Random tổ hợp những người điểm rèn luyện thấp nhất; nếu thiếu sẽ lấy ngẫu nhiên trong nhóm điểm thấp thứ 2">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    startIcon={
                                      <i className="tabler-arrows-shuffle text-xs" />
                                    }
                                    onClick={() =>
                                      handleRandomWeek(week.weekIndex)
                                    }
                                  >
                                    Random tuần này
                                  </Button>
                                </Tooltip>
                                <Button
                                  size="small"
                                  variant="tonal"
                                  color="primary"
                                  startIcon={
                                    <i className="tabler-device-floppy text-xs" />
                                  }
                                  onClick={() => handleSaveWeek(week.weekIndex)}
                                >
                                  Lưu tuần này
                                </Button>
                              </>
                            )}
                          </Box>

                          <Box>
                            {week.status === "upcoming" && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                disabled={!isSaved}
                                startIcon={
                                  <i className="tabler-check text-xs" />
                                }
                                onClick={() => {
                                  setSelectedWeekForComplete(week);
                                  setCompleteModalOpen(true);
                                }}
                              >
                                Xác nhận hoàn thành (+1đ)
                              </Button>
                            )}
                            {isCompleted && (
                              <Chip
                                size="small"
                                label="Đã xác nhận (+1đ)"
                                color="success"
                                variant="tonal"
                              />
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* ── PHẦN 2: THỐNG KÊ LƯỢT LẤY NƯỚC (ĐẶT DƯỚI PHẦN SET LỊCH) ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: "rgba(115, 103, 240, 0.12)",
                    color: "primary.main",
                    width: 48,
                    height: 48,
                  }}
                >
                  <i className="tabler-history text-xl" />
                </Avatar>
                <Box
                  sx={{
                    minHeight: 48,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h6" fontWeight={700} lineHeight={1.25}>
                    Thống Kê Lượt Lấy Nước
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    lineHeight={1.35}
                  >
                    Thống kê nhân sự role User (bao gồm cả nhân sự Nữ) — Bấm vào
                    bất kỳ nhân sự nào để xem lịch sử đi lấy nước
                  </Typography>
                </Box>
              </Box>
            }
            action={
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Chip
                    label={`Tất cả (${eligibleUsers.length})`}
                    size="small"
                    color="primary"
                    variant={genderFilter === "all" ? "filled" : "tonal"}
                    onClick={() => setGenderFilter("all")}
                    sx={{ cursor: "pointer" }}
                  />
                  <Chip
                    label={`Nữ (${femaleCount})`}
                    size="small"
                    color="error"
                    variant={genderFilter === "female" ? "filled" : "tonal"}
                    onClick={() => setGenderFilter("female")}
                    sx={{ cursor: "pointer" }}
                  />
                  <Chip
                    label={`Nam (${maleCount})`}
                    size="small"
                    color="info"
                    variant={genderFilter === "male" ? "filled" : "tonal"}
                    onClick={() => setGenderFilter("male")}
                    sx={{ cursor: "pointer" }}
                  />
                </Box>
                <Button
                  variant="tonal"
                  color="secondary"
                  size="small"
                  startIcon={<i className="tabler-file-spreadsheet" />}
                  onClick={handleExportStats}
                >
                  Xuất Excel
                </Button>
              </Box>
            }
          />
          <Divider />

          <CardContent>
            <Box sx={{ overflowX: "auto" }}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Nhân sự</th>
                    <th>Mã NV</th>
                    <th>Giới tính</th>
                    <th>Bộ phận</th>
                    <th>Hình thức</th>
                    <th style={{ textAlign: "center" }}>Số lượt đã đi</th>
                    <th style={{ textAlign: "center" }}>Điểm rèn luyện</th>
                    <th style={{ textAlign: "center" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, index) => {
                    const trips = u.waterTripCount || 0;
                    const points = u.schedulingPoints || 0;
                    const isFemale = u.gender === "female";

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-actionHover cursor-pointer"
                        onClick={() => {
                          setSelectedUserForHistory(u);
                          setHistoryModalOpen(true);
                        }}
                      >
                        <td>{index + 1}</td>
                        <td>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Avatar
                              src={resolveAvatar(u)}
                              alt={u.name}
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: 13,
                                bgcolor: isFemale
                                  ? "rgba(255, 76, 81, 0.15)"
                                  : "rgba(115, 103, 240, 0.15)",
                                color: isFemale ? "error.main" : "primary.main",
                                fontWeight: 600,
                              }}
                            >
                              {u.name?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color="text.primary"
                              >
                                {u.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {u.email}
                              </Typography>
                            </Box>
                          </Box>
                        </td>
                        <td>
                          <Typography
                            variant="body2"
                            color="primary.main"
                            fontWeight={600}
                          >
                            {u.code || "—"}
                          </Typography>
                        </td>
                        <td>
                          <Chip
                            size="small"
                            label={isFemale ? "Nữ" : "Nam"}
                            color={isFemale ? "error" : "info"}
                            variant="tonal"
                            sx={{ height: 22, fontSize: 11 }}
                          />
                        </td>
                        <td>
                          {u.typeId === "type_web_app"
                            ? "Web/App"
                            : u.typeId === "type_ap"
                              ? "AP"
                              : "Peer Admin"}
                        </td>
                        <td>
                          {u.categoryId === "category_official"
                            ? "Chính thức"
                            : u.categoryId === "category_intern"
                              ? "Thực tập"
                              : "Thử việc"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Chip
                            size="small"
                            label={`${trips} lượt`}
                            variant="tonal"
                            color="info"
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Chip
                            size="small"
                            label={`${points} điểm`}
                            variant="tonal"
                            color="primary"
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Button
                            size="small"
                            variant="tonal"
                            color="primary"
                            startIcon={<i className="tabler-history text-xs" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserForHistory(u);
                              setHistoryModalOpen(true);
                            }}
                          >
                            Lịch sử
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        style={{ textAlign: "center", padding: "32px" }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Không có nhân sự nào phù hợp với bộ lọc
                        </Typography>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Modal Xác Nhận Hoàn Thành */}
      {completeModalOpen && selectedWeekForComplete && (
        <CompleteScheduleModal
          open={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          schedule={selectedWeekForComplete}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Modal Thay Đổi Nhân Sự */}
      {changeMemberModalOpen && selectedWeekForMember && (
        <ChangeMemberModal
          open={changeMemberModalOpen}
          onClose={() => setChangeMemberModalOpen(false)}
          currentParticipants={selectedWeekForMember.participants || []}
          eligibleUsers={eligibleUsers.filter(
            (user) => !exemptIds.includes(user.id),
          )}
          onSelectUser={handleAddMember}
        />
      )}

      <Dialog
        open={exemptModalOpen}
        onClose={() => setExemptModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Danh sách miễn bê nước
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Nhân sự trong danh sách này sẽ không xuất hiện khi thêm người hoặc
            random lịch bê nước.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
            Đang miễn ({exemptUsers.length})
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              mb: 3,
              maxHeight: 290,
              overflowY: "auto",
              pr: 0.75,
            }}
          >
            {exemptUsers.length ? (
              exemptUsers.map((user) => (
                <Box
                  key={user.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: "error.50",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.25,
                      minWidth: 0,
                    }}
                  >
                    <Avatar
                      src={resolveAvatar(user)}
                      alt={user.name}
                      sx={{ width: 34, height: 34 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {user.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.code || "Chưa có mã nhân sự"}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    variant="tonal"
                    color="error"
                    onClick={() =>
                      saveExemptions(exemptIds.filter((id) => id !== user.id))
                    }
                  >
                    Bỏ miễn
                  </Button>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                Chưa có nhân sự nào trong danh sách miễn.
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
            Thêm nhân sự miễn bê nước
          </Typography>
          <CustomTextField
            fullWidth
            size="small"
            placeholder="Tìm theo tên hoặc mã nhân sự..."
            value={exemptSearch}
            onChange={(event) => setExemptSearch(event.target.value)}
            sx={{ mb: 1.5 }}
          />
          {exemptSearch.trim() ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {searchResults.length ? (
                searchResults.map((user) => (
                  <Box
                    key={user.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                      p: 1.25,
                      borderRadius: 1.5,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        minWidth: 0,
                      }}
                    >
                      <Avatar
                        src={resolveAvatar(user)}
                        alt={user.name}
                        sx={{ width: 34, height: 34 }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.code || "Chưa có mã nhân sự"}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      variant="tonal"
                      color="primary"
                      onClick={() => saveExemptions([...exemptIds, user.id])}
                    >
                      Thêm miễn
                    </Button>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Không tìm thấy nhân sự phù hợp.
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nhập tên hoặc mã nhân sự để tìm và thêm vào danh sách miễn.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="tonal"
            color="secondary"
            onClick={() => setExemptModalOpen(false)}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Lịch Sử Đi Lấy Nước Của Nhân Sự */}
      {historyModalOpen && selectedUserForHistory && (
        <UserWaterHistoryModal
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          user={selectedUserForHistory}
          allSchedules={schedules}
        />
      )}
    </Grid>
  );
}
