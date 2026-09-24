"use client";
import { toVietnamDateKey } from "@/libs/dateTime";

import { useMemo } from "react";
import Grid from "@mui/material/Grid2";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import tableStyles from "@core/styles/table.module.css";

export default function UserScheduleView({
  schedules = [],
  trashSchedules = [],
  currentUser,
}) {
  // Lọc các lịch có phân công mình
  const mySchedules = useMemo(() => {
    if (!currentUser) return [];
    const uid = currentUser.id;
    const email = currentUser.email;
    const name = currentUser.name;

    return schedules.filter((s) =>
      (s.participants || []).some((p) => {
        if (typeof p === "string") return p.includes(name) || p.includes(email);
        return p.userId === uid || (p.code && name && name.includes(p.code));
      }),
    );
  }, [schedules, currentUser]);

  // Lịch sắp tới
  const upcomingSchedules = useMemo(
    () => mySchedules.filter((s) => s.status === "upcoming"),
    [mySchedules],
  );

  // Lịch sử cá nhân đã diễn ra
  const historySchedules = useMemo(
    () =>
      mySchedules.filter(
        (s) => s.status === "completed" || s.status === "cancelled",
      ),
    [mySchedules],
  );

  const todayKey = toVietnamDateKey();
  const dateKeyFromDisplay = (value) => {
    const [day, month, year] = String(value || "").split("/");
    return year && month && day ? `${year}-${month}-${day}` : "";
  };
  const displayDate = (dateKey) =>
    String(dateKey || "")
      .split("-")
      .reverse()
      .join("/");
  const participantId = (participant) =>
    typeof participant === "string" ? participant : participant?.userId;
  const participantName = (participant) =>
    typeof participant === "string" ? participant : participant?.name;

  const upcomingActivities = useMemo(() => {
    const water = upcomingSchedules.map((schedule) => ({
      id: `water-${schedule.id}`,
      activity: "water",
      dateKey: dateKeyFromDisplay(schedule.date),
      time: schedule.time || "09:00",
      note: schedule.note || "Lấy nước tại tầng 11",
      teammates: (schedule.participants || [])
        .filter((person) => participantId(person) !== currentUser?.id)
        .map(participantName)
        .filter(Boolean),
      status: "upcoming",
    }));
    const trash = trashSchedules
      .filter((item) => !item.completed && item.dateKey >= todayKey)
      .map((item) => ({
        id: `trash-${item.dateKey}`,
        activity: "trash",
        dateKey: item.dateKey,
        time: "Trước khi ra về",
        note: "Đổ rác cuối ngày",
        teammates: (item.userIds || [])
          .filter((id) => id !== currentUser?.id)
          .map(
            (id) =>
              trashSchedules
                .find((row) => row.dateKey === item.dateKey)
                ?.name?.split(", ")[(item.userIds || []).indexOf(id)] ||
              "Thành viên cùng ca",
          ),
        status: "upcoming",
      }));
    return [...water, ...trash].sort((a, b) =>
      `${a.dateKey}-${a.time}`.localeCompare(`${b.dateKey}-${b.time}`),
    );
  }, [upcomingSchedules, trashSchedules, todayKey, currentUser?.id]);

  const historyActivities = useMemo(() => {
    const water = historySchedules.map((schedule) => {
      const mine = (schedule.participants || []).find(
        (person) => participantId(person) === currentUser?.id,
      );
      const completed = mine?.completed ?? schedule.status === "completed";
      return {
        id: `water-${schedule.id}`,
        activity: "water",
        dateKey: dateKeyFromDisplay(schedule.date),
        time: schedule.time || "09:00",
        note: schedule.note || "Lấy nước tại tầng 11",
        teammates: (schedule.participants || [])
          .filter((person) => participantId(person) !== currentUser?.id)
          .map(participantName)
          .filter(Boolean),
        status:
          schedule.status === "cancelled"
            ? "cancelled"
            : completed
              ? "completed"
              : "missed",
      };
    });
    const trash = trashSchedules
      .filter((item) => item.completed || item.dateKey < todayKey)
      .map((item) => ({
        id: `trash-${item.dateKey}`,
        activity: "trash",
        dateKey: item.dateKey,
        time: "Trước khi ra về",
        note: "Đổ rác cuối ngày",
        teammates: (item.userIds || [])
          .filter((id) => id !== currentUser?.id)
          .map(
            (id) =>
              item.name?.split(", ")[(item.userIds || []).indexOf(id)] ||
              "Thành viên cùng ca",
          ),
        status: item.completed ? "completed" : "missed",
      }));
    return [...water, ...trash].sort((a, b) =>
      `${b.dateKey}-${b.time}`.localeCompare(`${a.dateKey}-${a.time}`),
    );
  }, [historySchedules, trashSchedules, todayKey, currentUser?.id]);
  const totalTrips = currentUser?.waterTripCount || 0;
  const totalTrashTrips = trashSchedules.filter(
    (item) => item.completed,
  ).length;
  const totalPoints = currentUser?.schedulingPoints || 0;

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
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
              Lịch Sinh Hoạt Đội Của Tôi
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              lineHeight={1.35}
            >
              Theo dõi lịch bê nước, đổ rác và điểm rèn luyện cá nhân
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Thống kê riêng từng hoạt động và tổng lịch sắp tới. */}
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 48,
                height: 48,
                bgcolor: "rgba(40, 199, 111, 0.12)",
                color: "success.main",
              }}
            >
              <i className="tabler-circle-check text-2xl" />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Số Lượt Bê Nước
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {totalTrips} lượt
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Đã hoàn thành
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 48,
                height: 48,
                bgcolor: "rgba(255, 159, 67, 0.12)",
                color: "warning.main",
              }}
            >
              <i className="tabler-trash text-2xl" />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Số Lượt Đổ Rác
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {totalTrashTrips} lượt
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Đã hoàn thành
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 48,
                height: 48,
                bgcolor: "rgba(115, 103, 240, 0.12)",
                color: "primary.main",
              }}
            >
              <i className="tabler-award text-2xl" />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Điểm Rèn Luyện
              </Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                {totalPoints} điểm
              </Typography>
              <Typography variant="caption" color="text.secondary">
                1 lượt = 1 điểm
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 48,
                height: 48,
                bgcolor: "rgba(0, 186, 209, 0.12)",
                color: "info.main",
              }}
            >
              <i className="tabler-calendar-event text-2xl" />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Lịch Sắp Tới
              </Typography>
              <Typography variant="h5" fontWeight={700} color="info.main">
                {upcomingActivities.length} lịch
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cần thực hiện
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Lịch bê nước và đổ rác dùng chung một dòng thời gian. */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <i className="tabler-clock text-info text-xl" />
                <Typography variant="h6" fontWeight={600}>
                  Lịch Hoạt Động Sắp Tới
                </Typography>
              </Box>
            }
          />
          <Divider />
          <CardContent>
            {upcomingActivities.length > 0 ? (
              <Box sx={{ overflowX: "auto" }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Hoạt động</th>
                      <th>Ngày thực hiện</th>
                      <th>Giờ</th>
                      <th>Ghi chú</th>
                      <th>Thành viên cùng ca</th>
                      <th style={{ textAlign: "center" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingActivities.map((item) => (
                      <tr key={item.id} className="hover:bg-actionHover">
                        <td>
                          <Chip
                            size="small"
                            variant="tonal"
                            color={
                              item.activity === "water" ? "info" : "warning"
                            }
                            icon={
                              <i
                                className={
                                  item.activity === "water"
                                    ? "tabler-droplet"
                                    : "tabler-trash"
                                }
                              />
                            }
                            label={
                              item.activity === "water" ? "Bê nước" : "Đổ rác"
                            }
                          />
                        </td>
                        <td>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <i className="tabler-calendar text-primary text-sm" />
                            <Typography variant="body2" fontWeight={600}>
                              {displayDate(item.dateKey)}
                            </Typography>
                          </Box>
                        </td>
                        <td>{item.time}</td>
                        <td>{item.note}</td>
                        <td>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.5,
                            }}
                          >
                            {item.teammates.length ? (
                              item.teammates.map((name, idx) => (
                                <Chip
                                  key={idx}
                                  label={name}
                                  size="small"
                                  variant="tonal"
                                  color="secondary"
                                  sx={{ fontSize: 11 }}
                                />
                              ))
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </Box>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Chip
                            size="small"
                            label="Sắp tới"
                            color="info"
                            variant="tonal"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            ) : (
              <Alert
                severity="info"
                icon={<i className="tabler-info-circle" />}
              >
                Bạn hiện không có lịch bê nước hoặc đổ rác nào sắp tới.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* BẢNG 2: LỊCH SỬ THAM GIA CÁ NHÂN */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <i className="tabler-history text-secondary text-xl" />
                <Typography variant="h6" fontWeight={600}>
                  Lịch Sử Hoạt Động
                </Typography>
              </Box>
            }
          />
          <Divider />
          <CardContent>
            {historyActivities.length > 0 ? (
              <Box sx={{ overflowX: "auto" }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Hoạt động</th>
                      <th>Ngày thực hiện</th>
                      <th>Giờ</th>
                      <th>Ghi chú</th>
                      <th>Thành viên cùng ca</th>
                      <th style={{ textAlign: "center" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyActivities.map((item) => (
                      <tr key={item.id} className="hover:bg-actionHover">
                        <td>
                          <Chip
                            size="small"
                            variant="tonal"
                            color={
                              item.activity === "water" ? "info" : "warning"
                            }
                            icon={
                              <i
                                className={
                                  item.activity === "water"
                                    ? "tabler-droplet"
                                    : "tabler-trash"
                                }
                              />
                            }
                            label={
                              item.activity === "water" ? "Bê nước" : "Đổ rác"
                            }
                          />
                        </td>
                        <td>{displayDate(item.dateKey)}</td>
                        <td>{item.time}</td>
                        <td>{item.note}</td>
                        <td>
                          {item.teammates.length
                            ? item.teammates.join(", ")
                            : "—"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Chip
                            size="small"
                            variant="tonal"
                            color={
                              item.status === "completed"
                                ? "success"
                                : item.status === "cancelled"
                                  ? "error"
                                  : "secondary"
                            }
                            label={
                              item.status === "completed"
                                ? "Đã hoàn thành · +1 điểm"
                                : item.status === "cancelled"
                                  ? "Đã hủy"
                                  : "Chưa xác nhận"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 2, textAlign: "center" }}
              >
                Chưa có lịch sử bê nước hoặc đổ rác được ghi nhận
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
