"use client";

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

export default function UserScheduleView({ schedules = [], currentUser }) {
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

  const totalTrips = currentUser?.waterTripCount || 0;
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
              Lịch Bê Nước Của Tôi
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              lineHeight={1.35}
            >
              Theo dõi các ca phân công bê nước sắp tới và điểm rèn luyện cá
              nhân
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* 3 Thẻ Thông Tin Cá Nhân (Mục 2.15) */}
      <Grid size={{ xs: 12, sm: 4 }}>
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
                Tổng Số Lần Đã Đi
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

      <Grid size={{ xs: 12, sm: 4 }}>
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

      <Grid size={{ xs: 12, sm: 4 }}>
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
                {upcomingSchedules.length} lịch
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cần thực hiện
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* BẢNG 1: LỊCH SẮP TỚI CỦA BẠN */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <i className="tabler-clock text-info text-xl" />
                <Typography variant="h6" fontWeight={600}>
                  Ca Bê Nước Sắp Tới Được Phân Công
                </Typography>
              </Box>
            }
          />
          <Divider />
          <CardContent>
            {upcomingSchedules.length > 0 ? (
              <Box sx={{ overflowX: "auto" }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Tuần</th>
                      <th>Ngày thực hiện</th>
                      <th>Giờ</th>
                      <th>Ghi chú</th>
                      <th>Thành viên cùng ca</th>
                      <th style={{ textAlign: "center" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingSchedules.map((s) => {
                      const teammates = (s.participants || []).filter(
                        (p) => (p.userId || p) !== currentUser?.id,
                      );

                      return (
                        <tr key={s.id} className="hover:bg-actionHover">
                          <td>
                            <Typography variant="body2" fontWeight={600}>
                              Tuần {s.weekIndex}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {s.range}
                            </Typography>
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
                                {s.date}
                              </Typography>
                            </Box>
                          </td>
                          <td>{s.time || "09:00"}</td>
                          <td>{s.note || "Lấy nước tại tầng 1"}</td>
                          <td>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {teammates.map((t, idx) => (
                                <Chip
                                  key={idx}
                                  label={t.name || t}
                                  size="small"
                                  variant="tonal"
                                  color="secondary"
                                  sx={{ fontSize: 11 }}
                                />
                              ))}
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
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            ) : (
              <Alert
                severity="info"
                icon={<i className="tabler-info-circle" />}
              >
                Bạn hiện không có lịch bê nước nào sắp tới trong tháng này.
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
                  Lịch Sử Tham Gia & Điểm Nhận Được
                </Typography>
              </Box>
            }
          />
          <Divider />
          <CardContent>
            {historySchedules.length > 0 ? (
              <Box sx={{ overflowX: "auto" }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Lịch tuần</th>
                      <th>Ngày diễn ra</th>
                      <th>Kết quả</th>
                      <th style={{ textAlign: "center" }}>Điểm ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historySchedules.map((s) => {
                      const myParticipantObj = (s.participants || []).find(
                        (p) => (p.userId || p) === currentUser?.id,
                      );
                      const isCompleted = s.status === "completed";
                      const isDone = myParticipantObj?.completed ?? isCompleted;

                      return (
                        <tr key={s.id} className="hover:bg-actionHover">
                          <td>
                            <Typography variant="body2" fontWeight={600}>
                              Tuần {s.weekIndex} ({s.range})
                            </Typography>
                          </td>
                          <td>{s.date}</td>
                          <td>
                            {s.status === "cancelled" ? (
                              <Chip
                                size="small"
                                label="Đã hủy ca"
                                color="error"
                                variant="tonal"
                              />
                            ) : isDone ? (
                              <Chip
                                size="small"
                                label="Đã tham gia"
                                color="success"
                                variant="tonal"
                              />
                            ) : (
                              <Chip
                                size="small"
                                label="Không tham gia"
                                color="secondary"
                                variant="tonal"
                              />
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <Chip
                              size="small"
                              label={isDone ? "+1 điểm" : "0 điểm"}
                              color={isDone ? "success" : "secondary"}
                              variant="tonal"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 2, textAlign: "center" }}
              >
                Chưa có lịch sử bê nước được ghi nhận
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
