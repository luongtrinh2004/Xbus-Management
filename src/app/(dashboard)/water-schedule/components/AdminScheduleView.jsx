"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";
import CustomTextField from "@core/components/mui/TextField";
import { resolveAvatar } from "@/utils/getDefaultAvatar";
import ConfirmDialog from "@components/ConfirmDialog";

const weekDays = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu"];
const pad = (value) => String(value).padStart(2, "0");
const toDate = (year, month, day) => `${pad(day)}/${pad(month)}/${year}`;
function getWorkWeeks(year, month) {
  const days = new Date(year, month, 0).getDate();
  const weeks = [];
  let row = Array(5).fill(null);
  for (let day = 1; day <= days; day += 1) {
    const weekDay = new Date(year, month - 1, day).getDay();
    if (weekDay === 0 || weekDay === 6) continue;
    const column = weekDay - 1;
    if (column === 0 && row.some(Boolean)) {
      weeks.push(row);
      row = Array(5).fill(null);
    }
    row[column] = { day, date: toDate(year, month, day) };
  }
  if (row.some(Boolean)) weeks.push(row);
  return weeks;
}

export default function AdminScheduleView({
  month,
  setMonth,
  year,
  setYear,
  schedules = [],
  eligibleUsers = [],
  exemptUserIds = [],
  trashSchedules = [],
  onRefresh,
}) {
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [exemptOpen, setExemptOpen] = useState(false);
  const [exemptIds, setExemptIds] = useState(exemptUserIds);
  const [exemptSearch, setExemptSearch] = useState("");
  const [waterScheduleOpen, setWaterScheduleOpen] = useState(true);
  const [trashEdit, setTrashEdit] = useState(null);
  const [trashAssignee, setTrashAssignee] = useState("");
  const [completionTarget, setCompletionTarget] = useState(null);
  useEffect(() => setExemptIds(exemptUserIds), [exemptUserIds]);

  const weeks = useMemo(() => getWorkWeeks(year, month), [year, month]);
  const byDate = useMemo(
    () => new Map(schedules.map((item) => [item.date, item])),
    [schedules],
  );
  const trashByDate = useMemo(
    () => new Map(trashSchedules.map((item) => [item.date, item])),
    [trashSchedules],
  );
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return eligibleUsers
      .filter((user) => !query || user.name?.toLowerCase().includes(query))
      .sort(
        (a, b) =>
          Number(exemptIds.includes(a.id)) - Number(exemptIds.includes(b.id)) ||
          (Number(a.schedulingPoints) || 0) -
            (Number(b.schedulingPoints) || 0) ||
          String(a.name || "").localeCompare(String(b.name || ""), "vi", {
            sensitivity: "base",
          }),
      );
  }, [eligibleUsers, exemptIds, search]);

  const makeSchedule = (date) => {
    const day = Number(date.slice(0, 2));
    return {
      id: `water_${year}${pad(month)}${pad(day)}`,
      year,
      month,
      date,
      time: "14:00",
      requiredPeople: 5,
      participants: [],
      status: "upcoming",
      note: "",
    };
  };

  const saveSchedule = async (schedule, successMessage) => {
    setBusyId(schedule.id);
    try {
      const response = await fetch("/api/water-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          schedule: { ...schedule, time: "14:00" },
        }),
      });
      const result = await response.json();
      if (!response.ok)
        return toast.error(result.error || "Không thể lưu lịch");
      toast.success(successMessage);
      await onRefresh?.();
    } catch {
      toast.error("Không thể kết nối máy chủ");
    } finally {
      setBusyId(null);
    }
  };

  const addUser = async (date, userId) => {
    const user = eligibleUsers.find((item) => item.id === userId);
    const schedule = byDate.get(date) || makeSchedule(date);
    if (!user || schedule.status === "completed") return;
    if (exemptIds.includes(user.id))
      return toast.info(`${user.name} thuộc danh sách miễn bê nước`);
    if (
      (schedule.participants || []).some(
        (item) => (item.userId || item) === user.id,
      )
    )
      return toast.info(`${user.name} đã có trong lịch này`);
    if ((schedule.participants || []).length >= 5)
      return toast.error("Mỗi ngày chỉ phân công tối đa 5 người");
    await saveSchedule(
      {
        ...schedule,
        participants: [
          ...(schedule.participants || []),
          {
            userId: user.id,
            name: user.name,
            code: user.code,
            completed: false,
          },
        ],
      },
      `Đã thêm ${user.name} vào ngày ${date}`,
    );
  };

  const addTrashUser = async (date, userId) => {
    const user = eligibleUsers.find((item) => item.id === userId);
    const existing = trashByDate.get(date);
    if (!user || existing?.completed) return;
    if (existing?.userId) return toast.info("Ngày này đã có người đổ rác");
    const [day, selectedMonth, selectedYear] = date.split("/");
    const response = await fetch("/api/water-schedules/trash", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        dateKey: `${selectedYear}-${selectedMonth}-${day}`,
        userId,
        weekOffset: 0,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      return toast.error(result.error || "Không thể phân công đổ rác");
    toast.success(`Đã thêm ${user.name} vào lịch đổ rác ngày ${date}`);
    await onRefresh?.();
  };

  const removeUser = async (schedule, userId) => {
    if (schedule.status === "completed") return;
    const participants = (schedule.participants || []).filter(
      (item) => (item.userId || item) !== userId,
    );
    if (!participants.length) return deleteSchedule(schedule);
    await saveSchedule(
      { ...schedule, participants },
      "Đã đưa nhân sự ra khỏi lịch",
    );
  };

  const randomFullSchedule = async (date) => {
    const [d, m, y] = date.split("/");
    const dateKey = `${y}-${pad(m)}-${pad(d)}`;
    const schedule = byDate.get(date) || makeSchedule(date);
    setBusyId(date);
    try {
      // 1. Phân công ngẫu nhiên bê nước: từ nhóm không miễn, xét điểm rèn luyện thấp nhất
      const fixedParticipants = (schedule.participants || []).slice(0, 5);
      const response = await fetch("/api/water-schedules/random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          mode: "single_week",
          requiredPeople: 5,
          fixedParticipants,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        return toast.error(
          result.error || "Không thể phân công ngẫu nhiên bê nước",
        );

      await saveSchedule(
        { ...schedule, participants: result.participants || fixedParticipants },
        "Đã phân công ngẫu nhiên bê nước",
      );

      // 2. Phân công ngẫu nhiên đổ rác: từ nhóm trong danh sách miễn, xét điểm thấp nhất
      let trashCandidates = eligibleUsers.filter(
        (user) => exemptIds.includes(user.id) && user.status === "able",
      );
      if (!trashCandidates.length) {
        trashCandidates = eligibleUsers.filter(
          (user) => user.status === "able",
        );
      }
      if (trashCandidates.length > 0) {
        const minPoints = Math.min(
          ...trashCandidates.map((user) => Number(user.schedulingPoints) || 0),
        );
        const pool = trashCandidates.filter(
          (user) => (Number(user.schedulingPoints) || 0) === minPoints,
        );
        const selected = pool[Math.floor(Math.random() * pool.length)];
        if (selected) {
          await fetch("/api/water-schedules/trash", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "assign",
              dateKey,
              userId: selected.id,
              weekOffset: 0,
            }),
          });
        }
      }

      toast.success(
        `Đã phân công ngẫu nhiên cả bê nước và đổ rác ngày ${date}`,
      );
      await onRefresh?.();
    } catch {
      toast.error("Không thể phân công ngẫu nhiên");
    } finally {
      setBusyId(null);
    }
  };

  const deleteFullSchedule = async (date, schedule, trash) => {
    const [d, m, y] = date.split("/");
    const dateKey = `${y}-${pad(m)}-${pad(d)}`;
    setBusyId(date);
    try {
      const promises = [];
      if (schedule?.id) {
        promises.push(
          fetch(`/api/water-schedules/${schedule.id}`, { method: "DELETE" }),
        );
      }
      promises.push(
        fetch("/api/water-schedules/trash", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign",
            dateKey,
            userId: "",
            weekOffset: 0,
          }),
        }),
      );
      await Promise.all(promises);
      toast.success(`Đã xóa toàn bộ lịch bê nước và đổ rác ngày ${date}`);
      await onRefresh?.();
    } catch {
      toast.error("Không thể xóa lịch");
    } finally {
      setBusyId(null);
    }
  };

  const deleteSchedule = async (schedule) => {
    if (!schedule || schedule.status === "completed") return;
    setBusyId(schedule.id);
    try {
      const response = await fetch(`/api/water-schedules/${schedule.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok)
        return toast.error(result.error || "Không thể xóa lịch");
      toast.success(result.message);
      await onRefresh?.();
    } finally {
      setBusyId(null);
    }
  };

  const saveExemptions = async () => {
    const response = await fetch("/api/water-schedules/exemptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: exemptIds }),
    });
    const result = await response.json();
    if (!response.ok)
      return toast.error(result.error || "Không thể lưu danh sách miễn");
    setExemptIds(result.userIds);
    setExemptOpen(false);
    toast.success("Đã cập nhật danh sách miễn bê nước");
    onRefresh?.();
  };

  const changeMonth = (delta) => {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };
  const iconButtonSx = { width: 25, height: 25, borderRadius: 1 };
  const completeTrash = async (trash) => {
    const response = await fetch("/api/water-schedules/trash", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        dateKey: trash.dateKey,
        userId: trash.userId,
        weekOffset: 0,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      return toast.error(result.error || "Không thể xác nhận đổ rác"), false;
    toast.success("Đã xác nhận đổ rác (+1 điểm)");
    await onRefresh?.();
    return true;
  };
  const completeWater = async (schedule) => {
    if (!schedule?.id || schedule.status === "completed") return;
    const response = await fetch(
      `/api/water-schedules/${schedule.id}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedUserIds: (schedule.participants || []).map(
            (person) => person.userId || person,
          ),
        }),
      },
    );
    const result = await response.json();
    if (!response.ok)
      return toast.error(result.error || "Không thể xác nhận bê nước"), false;
    toast.success("Đã xác nhận bê nước hoàn thành");
    await onRefresh?.();
    return true;
  };
  const assignTrash = async (userId = trashAssignee) => {
    if (!trashEdit) return;
    const response = await fetch("/api/water-schedules/trash", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        dateKey: trashEdit.dateKey,
        userId,
        weekOffset: 0,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      return toast.error(result.error || "Không thể đổi người đổ rác");
    setTrashEdit(null);
    toast.success("Đã chỉ định người đổ rác");
    onRefresh?.();
  };

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: "rgba(0,186,209,.12)", color: "info.main" }}
              >
                <i className="tabler-calendar-month" />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Quản lý lịch bê nước và đổ rác
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Nhân sự lưu ý thực hiện bê nước vào đầu giờ sáng/chiều và đi
                  đổ rác trước khi ra về.
                </Typography>
              </Box>
            </Box>
          }
          action={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                variant="tonal"
                color="error"
                startIcon={<i className="tabler-user-off" />}
                onClick={() => setExemptOpen(true)}
              >
                Danh sách miễn bê nước
              </Button>
              <IconButton onClick={() => changeMonth(-1)}>
                <i className="tabler-chevron-left" />
              </IconButton>
              <Button variant="tonal" sx={{ minWidth: 150 }}>
                Tháng {pad(month)}/{year}
              </Button>
              <IconButton onClick={() => changeMonth(1)}>
                <i className="tabler-chevron-right" />
              </IconButton>
              <IconButton
                aria-label={
                  waterScheduleOpen ? "Thu gọn lịch bê nước" : "Mở lịch bê nước"
                }
                onClick={() => setWaterScheduleOpen((value) => !value)}
              >
                <i
                  className={
                    waterScheduleOpen
                      ? "tabler-chevron-up"
                      : "tabler-chevron-down"
                  }
                />
              </IconButton>
            </Box>
          }
        />
        <Collapse in={waterScheduleOpen}>
          <Divider />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "280px minmax(760px, 1fr)",
              },
              minHeight: 620,
            }}
          >
            <Box
              sx={{
                p: 3,
                borderRight: { lg: "1px solid" },
                borderColor: "divider",
                bgcolor: "action.hover",
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Nhân sự
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {eligibleUsers.length} nhân sự
              </Typography>
              <CustomTextField
                fullWidth
                size="small"
                type="search"
                autoComplete="off"
                placeholder="Tìm theo tên nhân sự"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ my: 2 }}
                InputProps={{
                  startAdornment: <i className="tabler-search mr-2" />,
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  maxHeight: `${Math.max(300, weeks.length * 190 - 85)}px`,
                  overflowY: "auto",
                  pr: 0.5,
                }}
              >
                {filteredUsers.map((user) => (
                  <Box
                    key={user.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", user.id);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.25,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      cursor: "grab",
                      userSelect: "none",
                      "&:active": { cursor: "grabbing" },
                      "&:hover": { borderColor: "primary.main", boxShadow: 1 },
                    }}
                  >
                    <Avatar
                      src={resolveAvatar(user)}
                      sx={{ width: 34, height: 34 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {user.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.schedulingPoints || 0} điểm
                        {exemptIds.includes(user.id) ? " · Miễn bê nước" : ""}
                      </Typography>
                    </Box>
                    <i className="tabler-grip-vertical ml-auto text-disabled" />
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ p: 3, overflowX: "auto" }}>
              <Box
                sx={{
                  minWidth: 760,
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                {weekDays.map((label, index) => (
                  <Box
                    key={label}
                    sx={{
                      py: 1.5,
                      textAlign: "center",
                      bgcolor: "action.hover",
                      borderRight: index < 4 ? "1px solid" : 0,
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="caption" fontWeight={700}>
                      {label}
                    </Typography>
                  </Box>
                ))}
                {weeks.flatMap((week, rowIndex) =>
                  week.map((cell, columnIndex) => {
                    const schedule = cell ? byDate.get(cell.date) : null;
                    const trash = cell ? trashByDate.get(cell.date) : null;
                    const waterCompleted = schedule?.status === "completed";
                    const trashCompleted = Boolean(trash?.completed);
                    const completed = waterCompleted && trashCompleted;
                    const hasWater = Boolean(
                      schedule && (schedule.participants || []).length > 0,
                    );
                    const hasTrash = Boolean(
                      trash && (trash.userId || trash.name),
                    );
                    const hasAnySchedule = hasWater || hasTrash;
                    const draggingWater =
                      dragTarget?.date === cell?.date &&
                      dragTarget?.type === "water";
                    const draggingTrash =
                      dragTarget?.date === cell?.date &&
                      dragTarget?.type === "trash";
                    return (
                      <Box
                        key={`${rowIndex}-${columnIndex}`}
                        sx={{
                          minHeight: 190,
                          p: 1.25,
                          display: "flex",
                          flexDirection: "column",
                          bgcolor: !cell ? "action.hover" : "background.paper",
                          borderTop: "1px solid",
                          borderRight: columnIndex < 4 ? "1px solid" : 0,
                          borderColor: "divider",
                          transition: "all .15s",
                        }}
                      >
                        {cell && (
                          <>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mb: 1,
                              }}
                            >
                              <Typography variant="body2" fontWeight={800}>
                                {cell.day}
                              </Typography>
                              {completed && (
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{ color: "#28C76F", ml: "auto" }}
                                >
                                  Hoàn thành
                                </Typography>
                              )}
                              {!completed && <Box sx={{ ml: "auto" }} />}
                              {!completed && (
                                <>
                                  <IconButton
                                    title="Phân công ngẫu nhiên cả bê nước và đổ rác"
                                    color="primary"
                                    size="small"
                                    disabled={busyId === cell.date}
                                    onClick={() =>
                                      randomFullSchedule(cell.date)
                                    }
                                    sx={iconButtonSx}
                                  >
                                    <i className="tabler-arrows-shuffle text-sm" />
                                  </IconButton>
                                  {hasAnySchedule && (
                                    <IconButton
                                      title="Xóa toàn bộ lịch"
                                      color="error"
                                      size="small"
                                      disabled={busyId === cell.date}
                                      onClick={() =>
                                        deleteFullSchedule(
                                          cell.date,
                                          schedule,
                                          trash,
                                        )
                                      }
                                      sx={iconButtonSx}
                                    >
                                      <i className="tabler-trash text-sm" />
                                    </IconButton>
                                  )}
                                </>
                              )}
                            </Box>
                            <Box
                              onDragOver={(event) => {
                                if (!waterCompleted) {
                                  event.preventDefault();
                                  setDragTarget({
                                    date: cell.date,
                                    type: "water",
                                  });
                                }
                              }}
                              onDragLeave={() => setDragTarget(null)}
                              onDrop={(event) => {
                                event.preventDefault();
                                setDragTarget(null);
                                addUser(
                                  cell.date,
                                  event.dataTransfer.getData("text/plain"),
                                );
                              }}
                              onClick={() =>
                                hasWater &&
                                !waterCompleted &&
                                setCompletionTarget({
                                  type: "water",
                                  date: cell.date,
                                  schedule,
                                })
                              }
                              title={
                                hasWater
                                  ? waterCompleted
                                    ? "Bê nước đã hoàn thành"
                                    : "Bấm để xác nhận bê nước"
                                  : "Kéo nhân sự vào đây để phân công bê nước"
                              }
                              sx={{
                                display: "flex",
                                gap: 0.75,
                                alignItems: "stretch",
                                minHeight: 66,
                                cursor:
                                  hasWater && !waterCompleted
                                    ? "pointer"
                                    : "default",
                                borderRadius: 1.5,
                                bgcolor: draggingWater
                                  ? "rgba(0, 186, 209, 0.12)"
                                  : "transparent",
                                "&:hover": !waterCompleted
                                  ? draggingWater
                                    ? {
                                        bgcolor: "rgba(0, 186, 209, 0.16)",
                                        "& .schedule-bracket": {
                                          borderColor: "info.main",
                                        },
                                        "& .schedule-icon": {
                                          color: "#00BAD1 !important",
                                        },
                                      }
                                    : {
                                        bgcolor: "success.lighter",
                                        "& .schedule-bracket": {
                                          borderColor: "success.main",
                                        },
                                        "& .schedule-icon": {
                                          color: "#28C76F !important",
                                        },
                                      }
                                  : {},
                              }}
                            >
                              <Box
                                component="i"
                                className="tabler-droplet text-sm schedule-icon"
                                sx={{
                                  color: waterCompleted ? "#28C76F" : "#00BAD1",
                                  mt: "5px",
                                }}
                              />
                              <Box
                                className="schedule-bracket"
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  px: 0.75,
                                  py: 0.5,
                                  borderRadius: 1.5,
                                  borderLeft: "3px solid",
                                  borderColor: waterCompleted
                                    ? "success.main"
                                    : "info.main",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.25,
                                }}
                              >
                                {hasWater
                                  ? (schedule.participants || []).map(
                                      (person) => (
                                        <Box
                                          key={person.userId || person}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            minWidth: 0,
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            noWrap
                                            sx={{ flex: 1, minWidth: 0 }}
                                          >
                                            • {person.name || person}
                                          </Typography>
                                          {!waterCompleted && (
                                            <IconButton
                                              title="Đưa ra khỏi lịch"
                                              size="small"
                                              color="secondary"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                removeUser(
                                                  schedule,
                                                  person.userId || person,
                                                );
                                              }}
                                              sx={iconButtonSx}
                                            >
                                              <i className="tabler-arrow-left text-xs" />
                                            </IconButton>
                                          )}
                                        </Box>
                                      ),
                                    )
                                  : null}
                              </Box>
                            </Box>
                            <Box
                              onDragOver={(event) => {
                                if (!trashCompleted && !hasTrash) {
                                  event.preventDefault();
                                  setDragTarget({
                                    date: cell.date,
                                    type: "trash",
                                  });
                                }
                              }}
                              onDragLeave={() => setDragTarget(null)}
                              onDrop={(event) => {
                                event.preventDefault();
                                setDragTarget(null);
                                addTrashUser(
                                  cell.date,
                                  event.dataTransfer.getData("text/plain"),
                                );
                              }}
                              onClick={() =>
                                hasTrash &&
                                !trashCompleted &&
                                setCompletionTarget({
                                  type: "trash",
                                  date: cell.date,
                                  trash,
                                })
                              }
                              title={
                                hasTrash
                                  ? trashCompleted
                                    ? "Đổ rác đã hoàn thành"
                                    : "Bấm để xác nhận đổ rác"
                                  : "Kéo nhân sự vào đây để phân công đổ rác"
                              }
                              sx={{
                                mt: "auto",
                                pt: 1.25,
                                display: "flex",
                                alignItems: "stretch",
                                gap: 0.75,
                                minHeight: 42,
                                cursor:
                                  hasTrash && !trashCompleted
                                    ? "pointer"
                                    : "default",
                                borderRadius: 1.5,
                                bgcolor: draggingTrash
                                  ? "rgba(0, 186, 209, 0.12)"
                                  : "transparent",
                                "&:hover": !trashCompleted
                                  ? draggingTrash
                                    ? {
                                        bgcolor: "rgba(0, 186, 209, 0.16)",
                                        "& .schedule-bracket": {
                                          borderColor: "info.main",
                                        },
                                        "& .schedule-icon": {
                                          color: "#00BAD1 !important",
                                        },
                                      }
                                    : {
                                        bgcolor: "success.lighter",
                                        "& .schedule-bracket": {
                                          borderColor: "success.main",
                                        },
                                        "& .schedule-icon": {
                                          color: "#28C76F !important",
                                        },
                                      }
                                  : {},
                              }}
                            >
                              <Box
                                component="i"
                                className="tabler-trash text-sm schedule-icon"
                                sx={{
                                  color: trashCompleted ? "#28C76F" : "#FF9F43",
                                  mt: "5px",
                                }}
                              />
                              <Box
                                className="schedule-bracket"
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  px: 0.75,
                                  py: 0.5,
                                  borderRadius: 1.5,
                                  borderLeft: "3px solid",
                                  borderColor: trashCompleted
                                    ? "success.main"
                                    : "warning.main",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                {hasTrash && (
                                  <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    noWrap
                                    sx={{ flex: 1 }}
                                  >
                                    {trash.name}
                                  </Typography>
                                )}
                                {hasTrash && !trashCompleted && (
                                  <IconButton
                                    title="Đổi người đổ rác"
                                    size="small"
                                    color="warning"
                                    sx={iconButtonSx}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setTrashEdit(trash);
                                      setTrashAssignee(trash.userId || "");
                                    }}
                                  >
                                    <i className="tabler-user-edit text-sm" />
                                  </IconButton>
                                )}
                              </Box>
                            </Box>
                          </>
                        )}
                      </Box>
                    );
                  }),
                )}
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Card>

      <Dialog
        open={exemptOpen}
        onClose={() => setExemptOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Danh sách miễn bê nước</DialogTitle>
        <DialogContent dividers>
          <CustomTextField
            fullWidth
            size="small"
            placeholder="Tìm theo tên hoặc mã nhân sự"
            value={exemptSearch}
            onChange={(event) => setExemptSearch(event.target.value)}
            sx={{ mb: 2 }}
          />
          {eligibleUsers
            .filter((user) => {
              const query = exemptSearch.trim().toLowerCase();
              return (
                !query ||
                user.name?.toLowerCase().includes(query) ||
                user.code?.toLowerCase().includes(query)
              );
            })
            .map((user) => (
              <Box
                key={user.id}
                onClick={() =>
                  setExemptIds((ids) =>
                    ids.includes(user.id)
                      ? ids.filter((id) => id !== user.id)
                      : [...ids, user.id],
                  )
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                }}
              >
                <Checkbox checked={exemptIds.includes(user.id)} />
                <Avatar
                  src={resolveAvatar(user)}
                  sx={{ width: 32, height: 32, mr: 1.5 }}
                />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.code}
                  </Typography>
                </Box>
                {exemptIds.includes(user.id) && (
                  <Chip
                    label="Được miễn"
                    color="error"
                    size="small"
                    variant="tonal"
                    sx={{ ml: "auto" }}
                  />
                )}
              </Box>
            ))}
        </DialogContent>
        <DialogActions>
          <Button color="secondary" onClick={() => setExemptOpen(false)}>
            Hủy bỏ
          </Button>
          <Button variant="contained" onClick={saveExemptions}>
            Lưu danh sách
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={Boolean(completionTarget)}
        title={
          completionTarget?.type === "water"
            ? "Xác nhận hoàn thành bê nước"
            : "Xác nhận hoàn thành đổ rác"
        }
        message={
          completionTarget?.type === "water"
            ? `Bạn có muốn xác nhận danh sách bê nước ngày ${completionTarget.date}: ${(
                completionTarget.schedule?.participants || []
              )
                .map((person) => person.name || person)
                .join(", ")}?`
            : `Bạn có muốn xác nhận ${completionTarget?.trash?.name || "nhân sự được phân công"} đã đổ rác ngày ${completionTarget?.date || ""}?`
        }
        confirmText="Xác nhận hoàn thành"
        confirmColor="success"
        loading={Boolean(busyId)}
        onClose={() => setCompletionTarget(null)}
        onConfirm={async () => {
          const target = completionTarget;
          if (!target) return;
          setBusyId(`complete-${target.type}-${target.date}`);
          try {
            const success =
              target.type === "water"
                ? await completeWater(target.schedule)
                : await completeTrash(target.trash);
            if (success) setCompletionTarget(null);
          } finally {
            setBusyId(null);
          }
        }}
      />
      <Dialog
        open={Boolean(trashEdit)}
        onClose={() => setTrashEdit(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Chỉ định người đổ rác</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Người đang được xếp:{" "}
              <strong>
                {trashAssignee
                  ? eligibleUsers.find((user) => user.id === trashAssignee)
                      ?.name || trashEdit?.name
                  : "Chưa có"}
              </strong>
            </Typography>
            {trashAssignee && (
              <IconButton
                size="small"
                color="error"
                title="Xóa người đang được xếp"
                onClick={() => setTrashAssignee("")}
              >
                <i className="tabler-user-x" />
              </IconButton>
            )}
          </Box>
          {eligibleUsers
            .filter((user) => exemptIds.includes(user.id))
            .sort(
              (a, b) => (a.schedulingPoints || 0) - (b.schedulingPoints || 0),
            )
            .map((user) => (
              <Box
                key={user.id}
                onClick={() => setTrashAssignee(user.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  p: 1,
                  cursor: "pointer",
                  borderRadius: 1,
                  bgcolor:
                    trashAssignee === user.id
                      ? "action.selected"
                      : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Avatar
                  src={resolveAvatar(user)}
                  sx={{ width: 30, height: 30 }}
                />
                <Typography variant="body2" fontWeight={600}>
                  {user.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: "auto" }}
                >
                  {user.schedulingPoints || 0} điểm
                </Typography>
              </Box>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrashEdit(null)}>Hủy</Button>
          <Button variant="contained" onClick={() => assignTrash()}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
