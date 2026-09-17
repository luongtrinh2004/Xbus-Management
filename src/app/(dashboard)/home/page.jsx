"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Grid from "@mui/material/Grid2";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { useSession } from "next-auth/react";
import { resolveAvatar } from "@/utils/getDefaultAvatar";
import { formatVietnamDate } from "@/libs/dateTime";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});
const PRIMARY = "#7367F0";
const fmt = (value) => new Intl.NumberFormat("vi-VN").format(value || 0);
const parseWaterDate = (value) => {
  const [day, month, year] = String(value || "")
    .split("/")
    .map(Number);
  return new Date(year, month - 1, day);
};

const departmentLabel = {
  type_web_app: "Web/App",
  type_ap: "AP",
  type_peer_admin: "Peer Admin",
};

function getFridayCountdown() {
  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
  target.setHours(15, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 7);
  const totalHours = Math.floor((target.getTime() - now.getTime()) / 3600000);
  return totalHours >= 24
    ? `${Math.floor(totalHours / 24)} ngày ${totalHours % 24} giờ`
    : `${totalHours} giờ`;
}

function SectionTitle({ icon, children }) {
  return (
    <Typography
      variant="h6"
      fontWeight={700}
      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
    >
      <i className={`${icon} text-xl`} style={{ color: PRIMARY }} />
      {children}
    </Typography>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <Card sx={{ minHeight: 104, height: "100%" }}>
      <CardContent
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 3,
          py: "16px !important",
        }}
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 50,
            height: 50,
            bgcolor: "rgba(115,103,240,.12)",
            color: "primary.main",
          }}
        >
          <i className={`${icon} text-2xl`} />
        </Avatar>
        <Box
          sx={{
            minWidth: 0,
            display: "grid",
            height: 50,
            gridTemplateRows: "1fr 1fr",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary" noWrap>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700} noWrap>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

const trashWeekdays = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu"];

function WaterSchedule({ schedules, trashSchedules, isAdmin }) {
  const next = schedules[0];
  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        title={
          <SectionTitle icon="tabler-droplet">
            Lịch Bê Nước Sắp Tới
          </SectionTitle>
        }
        action={
          <Button
            component={Link}
            href="/water-schedule"
            size="small"
            color="primary"
          >
            Xem tất cả
          </Button>
        }
      />
      <Divider />
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {next ? (
          <Box
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              {next.date}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Tuần {next.weekIndex} · {(next.participants || []).length}/
              {next.requiredPeople || 0} người
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 2 }}>
              {(next.participants || []).slice(0, 5).map((person, index) => (
                <Chip
                  key={person.userId || index}
                  size="small"
                  label={typeof person === "string" ? person : person.name}
                  variant="tonal"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        ) : (
          <Typography color="text.secondary" textAlign="center" py={4}>
            Chưa có lịch sắp tới
          </Typography>
        )}
        {isAdmin && (
          <Button
            component={Link}
            href="/water-schedule"
            variant="tonal"
            color="primary"
            startIcon={<i className="tabler-calendar-plus" />}
          >
            Xếp lịch tháng
          </Button>
        )}
      </CardContent>
      <Divider />
      <CardHeader
        title={<SectionTitle icon="tabler-trash">Lịch Đổ Rác</SectionTitle>}
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 1 }}>
        {trashSchedules.length ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {trashSchedules.map((schedule, index) => (
              <Box
                key={schedule.id}
                sx={{
                  minWidth: 0,
                  borderLeft: index ? "1px solid" : 0,
                  borderColor: "divider",
                }}
              >
                <Box
                  sx={{
                    px: 1,
                    py: 1,
                    bgcolor: "action.hover",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="caption" fontWeight={700} noWrap>
                    {trashWeekdays[schedule.weekday - 1]}
                    <Box
                      component="span"
                      sx={{ mx: 0.5, color: "text.disabled" }}
                    >
                      ·
                    </Box>
                    <Box
                      component="span"
                      color="text.secondary"
                      fontWeight={500}
                    >
                      {schedule.date.slice(0, 5)}
                    </Box>
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 1.25,
                    py: 1.5,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    noWrap
                    title={schedule.name}
                  >
                    {schedule.name}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary" textAlign="center" py={2}>
            Chưa có lịch đổ rác trong tuần
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [waterSchedules, setWaterSchedules] = useState([]);
  const [trashSchedules, setTrashSchedules] = useState([]);
  const [fund, setFund] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/users?limit=200"),
      fetch("/api/water-schedules"),
      fetch("/api/funds"),
      fetch("/api/water-schedules/trash?weekOffset=0"),
    ])
      .then(async ([usersRes, waterRes, fundRes, trashRes]) => {
        const [usersData, waterData, fundData, trashData] = await Promise.all([
          usersRes.json(),
          waterRes.json(),
          fundRes.json(),
          trashRes.json(),
        ]);
        setUsers(usersData.data || []);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setWaterSchedules(
          (waterData.schedules || waterData.data || [])
            .filter(
              (item) =>
                item.status === "upcoming" &&
                item.savedAt &&
                parseWaterDate(item.date) >= today,
            )
            .sort((a, b) => parseWaterDate(a.date) - parseWaterDate(b.date)),
        );
        setFund(fundData);
        setTrashSchedules(trashData.schedules || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeUsers = useMemo(
    () => users.filter((user) => user.status === "able"),
    [users],
  );
  const topUsers = useMemo(
    () =>
      [...activeUsers]
        .sort((a, b) => (b.schedulingPoints || 0) - (a.schedulingPoints || 0))
        .slice(0, 5),
    [activeUsers],
  );
  const maxPoints = topUsers[0]?.schedulingPoints || 1;
  const departmentStats = useMemo(
    () =>
      activeUsers.reduce((stats, user) => {
        const label = departmentLabel[user.typeId] || "Chưa phân bộ phận";
        stats[label] = (stats[label] || 0) + 1;
        return stats;
      }, {}),
    [activeUsers],
  );
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activeUsers
      .filter((user) => /^\d{4}-\d{2}-\d{2}$/.test(user.birthday || ""))
      .map((user) => {
        const [, month, day] = user.birthday.split("-").map(Number);
        let nextBirthday = new Date(today.getFullYear(), month - 1, day);
        if (nextBirthday < today)
          nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
        return {
          ...user,
          nextBirthday,
          daysUntil: Math.round((nextBirthday - today) / 86400000),
        };
      })
      .sort(
        (a, b) =>
          a.nextBirthday - b.nextBirthday || a.name.localeCompare(b.name, "vi"),
      )
      .slice(0, 5);
  }, [activeUsers]);
  const fundEvents = useMemo(
    () =>
      [
        ...(fund?.members || [])
          .filter((member) => member.paid && member.paidAt)
          .map((member) => ({
            date: member.paidAt,
            amount: member.amount || 0,
          })),
        ...(fund?.expenses || []).map((expense) => ({
          date: expense.spentAt || expense.createdAt,
          amount: -(expense.amount || 0),
        })),
      ]
        .filter((event) => event.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [fund],
  );

  const fundChart = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (period === "week") start.setDate(now.getDate() - 6);
    if (period === "month") start.setDate(1);
    if (period === "year") start.setMonth(0, 1);
    let balance = fund?.openingBalance || 0;
    const points = fundEvents
      .filter((event) => new Date(event.date) <= now)
      .map((event) => {
        balance += event.amount;
        return { x: new Date(event.date).getTime(), y: balance };
      });
    const beforeStart = fundEvents
      .filter((event) => new Date(event.date) < start)
      .reduce((sum, event) => sum + event.amount, fund?.openingBalance || 0);
    const inRange = points.filter((point) => point.x >= start.getTime());
    return [{ x: start.getTime(), y: beforeStart }, ...inRange];
  }, [fund?.openingBalance, fundEvents, period]);

  const isAdmin = ["admin", "assistant"].includes(session?.user?.role);
  const teaCountdown = getFridayCountdown();
  const balance = fund?.balance || 0;

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">
          Đang tải dữ liệu trang chủ...
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={5}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          icon="tabler-users"
          title="Tổng Nhân Sự"
          value={activeUsers.length}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          icon="tabler-droplet"
          title="Lịch Bê Nước Sắp Tới"
          value={waterSchedules[0]?.date || "Chưa có lịch"}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          icon="tabler-wallet"
          title="Quỹ Còn Lại"
          value={`${fmt(balance)} đ`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          icon="tabler-mug"
          title="Trà Chiều Thứ Sáu"
          value={`Còn ${teaCountdown}`}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ height: "100%" }}>
          <CardHeader
            title={
              <SectionTitle icon="tabler-award">
                Top 5 Điểm Rèn Luyện
              </SectionTitle>
            }
          />
          <Divider />
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}
          >
            {topUsers.map((user) => (
              <Box
                key={user.id}
                sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
              >
                <Avatar
                  src={resolveAvatar({
                    avatarUrl: user.avatarUrl,
                    role: user.role,
                    gender: user.gender,
                  })}
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: "rgba(115,103,240,.12)",
                    color: "primary.main",
                  }}
                >
                  {user.name?.[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {user.name}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={((user.schedulingPoints || 0) / maxPoints) * 100}
                    sx={{
                      mt: 0.75,
                      height: 5,
                      borderRadius: 5,
                      bgcolor: "action.hover",
                    }}
                  />
                </Box>
                <Chip
                  size="small"
                  color="primary"
                  variant="tonal"
                  label={`${user.schedulingPoints || 0} đ`}
                />
              </Box>
            ))}
            {!topUsers.length && (
              <Typography color="text.secondary" textAlign="center" py={3}>
                Chưa có dữ liệu điểm
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <WaterSchedule
          schedules={waterSchedules}
          trashSchedules={trashSchedules}
          isAdmin={isAdmin}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={{ height: "100%" }}>
          <CardHeader
            title={
              <SectionTitle icon="tabler-chart-line">
                Biến Động Quỹ Phòng
              </SectionTitle>
            }
            action={
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {[
                  ["week", "7 ngày"],
                  ["month", "Tháng này"],
                  ["year", "Năm nay"],
                ].map(([key, label]) => (
                  <Button
                    key={key}
                    size="small"
                    variant={period === key ? "contained" : "text"}
                    onClick={() => setPeriod(key)}
                  >
                    {label}
                  </Button>
                ))}
              </Box>
            }
          />
          <Divider />
          <CardContent>
            <Box
              sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}
            >
              <Typography variant="h5" fontWeight={700}>
                {fmt(balance)} đ
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Số dư hiện tại
              </Typography>
            </Box>
            <ReactApexChart
              type="area"
              height={245}
              options={{
                chart: { toolbar: { show: false }, zoom: { enabled: false } },
                colors: [PRIMARY],
                stroke: { curve: "smooth", width: 3 },
                fill: {
                  type: "gradient",
                  gradient: { opacityFrom: 0.32, opacityTo: 0.03 },
                },
                xaxis: { type: "datetime" },
                yaxis: { labels: { formatter: (value) => `${fmt(value)} đ` } },
                dataLabels: { enabled: false },
                tooltip: {
                  x: { format: "dd/MM/yyyy" },
                  y: { formatter: (value) => `${fmt(value)} đ` },
                },
              }}
              series={[{ name: "Số dư quỹ", data: fundChart }]}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ height: "100%" }}>
          <CardHeader
            title={
              <SectionTitle icon="tabler-building-community">
                Số Lượng Thành Viên Theo Bộ Phận
              </SectionTitle>
            }
          />
          <Divider />
          <CardContent>
            <ReactApexChart
              type="bar"
              height={245}
              options={{
                chart: { toolbar: { show: false } },
                colors: [PRIMARY],
                plotOptions: { bar: { borderRadius: 5, columnWidth: "45%" } },
                xaxis: { categories: Object.keys(departmentStats) },
                dataLabels: { enabled: false },
                legend: { show: false },
                tooltip: { y: { formatter: (value) => `${value} thành viên` } },
              }}
              series={[
                { name: "Thành viên", data: Object.values(departmentStats) },
              ]}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <SectionTitle icon="tabler-cake">
                Sinh Nhật Thành Viên Sắp Tới
              </SectionTitle>
            }
          />
          <Divider />
          <CardContent>
            {upcomingBirthdays.length ? (
              <Grid container spacing={2}>
                {upcomingBirthdays.map((user) => (
                  <Grid key={user.id} size={{ xs: 12, sm: 6, lg: 2.4 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.5,
                        height: "100%",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2.5,
                      }}
                    >
                      <Avatar
                        src={resolveAvatar(user)}
                        alt={user.name}
                        sx={{ width: 44, height: 44 }}
                      >
                        {user.name?.[0]}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {user.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          {formatVietnamDate(user.birthday)}
                        </Typography>
                        <Chip
                          size="small"
                          variant="tonal"
                          color={user.daysUntil === 0 ? "success" : "primary"}
                          label={
                            user.daysUntil === 0
                              ? "Hôm nay"
                              : `Còn ${user.daysUntil} ngày`
                          }
                          sx={{ mt: 0.75 }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <i className="tabler-cake-off text-3xl text-textSecondary" />
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Chưa có thông tin sinh nhật
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
