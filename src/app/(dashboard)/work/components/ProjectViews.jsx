"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

import AppReactApexCharts from "@/libs/styles/AppReactApexCharts";
import { dashboardProgress } from "@/libs/workUi";
import {
  PRIORITY_LABELS,
  addDaysIso,
  calendarDateKeys,
  daysBetween,
  formatDate,
  isoDate,
  todayIso,
} from "./workConstants";

const STATUS_COLORS = {
  todo: "var(--mui-palette-primary-main)",
  in_progress: "var(--mui-palette-info-main)",
  blocked: "var(--mui-palette-error-main)",
  done: "var(--mui-palette-success-main)",
};

const taskStart = (task) => isoDate(task.startDate) || isoDate(task.createdAt);
const taskEnd = (task) => isoDate(task.dueDate) || taskStart(task);

export function TimelineView({ project, tasks, onOpenTask }) {
  const range = useMemo(() => {
    const starts = tasks.map(taskStart).filter(Boolean);
    const ends = tasks.map(taskEnd).filter(Boolean);
    let start =
      isoDate(project?.startDate) ||
      (starts.length ? starts.slice().sort()[0] : todayIso());
    let end =
      isoDate(project?.dueDate) ||
      (ends.length ? ends.slice().sort().at(-1) : addDaysIso(start, 21));
    start = addDaysIso(start, -2);
    end = addDaysIso(end, 3);
    const total = daysBetween(start, end);
    if (total < 7) end = addDaysIso(start, 7);
    if (total > 180) end = addDaysIso(start, 180);
    return { start, end, days: Math.max(8, daysBetween(start, end) + 1) };
  }, [project, tasks]);

  const days = Array.from({ length: range.days }, (_, index) =>
    addDaysIso(range.start, index),
  );
  const cellPct = 100 / range.days;

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Dòng thời gian
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(range.start)} → {formatDate(range.end)} · {tasks.length}{" "}
            công việc
          </Typography>
        </Box>
        <Box sx={{ overflowX: "auto", pb: 1 }}>
          <Box sx={{ minWidth: 720 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "220px 1fr" }}>
              <Box />
              <Box sx={{ display: "flex" }}>
                {days.map((day) => (
                  <Box
                    key={day}
                    sx={{
                      width: `${cellPct}%`,
                      textAlign: "center",
                      borderLeft: "1px solid",
                      borderColor: "divider",
                      py: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {day.slice(8) === "01"
                        ? new Date(`${day}T00:00:00`).toLocaleDateString(
                            "vi-VN",
                            { month: "short" },
                          )
                        : day.slice(8)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            {tasks.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                Chưa có công việc để hiển thị.
              </Typography>
            )}
            {tasks.map((task) => {
              const startOffset = Math.max(0, daysBetween(range.start, taskStart(task)));
              const endOffset = Math.min(
                range.days - 1,
                daysBetween(range.start, taskEnd(task)),
              );
              const width = Math.max(1, endOffset - startOffset + 1);
              return (
                <Box
                  key={task.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "220px 1fr",
                    alignItems: "center",
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ pr: 1.5, py: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {task.code}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {task.title}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      position: "relative",
                      height: 40,
                      backgroundImage: `repeating-linear-gradient(to right, var(--mui-palette-divider) 0 1px, transparent 1px ${cellPct}%)`,
                    }}
                  >
                    <Box
                      onClick={() => onOpenTask?.(task)}
                      title={`${task.title} (${formatDate(taskStart(task))} → ${formatDate(taskEnd(task))})`}
                      sx={{
                        position: "absolute",
                        top: 8,
                        bottom: 8,
                        left: `${startOffset * cellPct}%`,
                        width: `${width * cellPct}%`,
                        bgcolor:
                          task.completed || task.status === "done"
                            ? STATUS_COLORS.done
                            : STATUS_COLORS[task.status] || STATUS_COLORS.todo,
                        opacity: 0.85,
                        borderRadius: 1.5,
                        px: 1,
                        display: "flex",
                        alignItems: "center",
                        color: "#fff",
                        cursor: "pointer",
                        overflow: "hidden",
                        "&:hover": { opacity: 1 },
                      }}
                    >
                      <Typography variant="caption" noWrap>
                        {task.assignee?.name || task.title}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function CalendarView({ tasks, onOpenTask }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const monthLabel = cursor.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });
  const firstWeekday = (cursor.getDay() + 6) % 7;
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();
  const cells = [];
  for (let index = 0; index < firstWeekday; index += 1) cells.push(null);
  cells.push(...calendarDateKeys(cursor.getFullYear(), cursor.getMonth()));

  const byDay = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      const day = isoDate(task.dueDate);
      if (!day) continue;
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(task);
    }
    return map;
  }, [tasks]);

  const moveMonth = (delta) =>
    setCursor(
      new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1),
    );
  const undated = tasks.filter((task) => !isoDate(task.dueDate));
  const today = todayIso();

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Lịch công việc
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button size="small" variant="tonal" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
              Hôm nay
            </Button>
            <IconButton size="small" onClick={() => moveMonth(-1)}>
              <i className="tabler-chevron-left" />
            </IconButton>
            <Typography fontWeight={700} sx={{ minWidth: 150, textAlign: "center" }}>
              {monthLabel}
            </Typography>
            <IconButton size="small" onClick={() => moveMonth(1)}>
              <i className="tabler-chevron-right" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
            <Typography
              key={label}
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: "center", fontWeight: 700 }}
            >
              {label}
            </Typography>
          ))}
          {cells.map((day, index) => {
            const dayTasks = day ? byDay.get(day) || [] : [];
            return (
              <Box
                key={day || `blank-${index}`}
                sx={{
                  minHeight: 104,
                  p: 0.75,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor:
                    day === today
                      ? "primary.main"
                      : day
                        ? "action.hover"
                        : "transparent",
                  color: day === today ? "#fff" : "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  overflow: "hidden",
                }}
              >
                {day && (
                  <Typography variant="caption" fontWeight={700}>
                    {Number(day.slice(8))}
                  </Typography>
                )}
                {dayTasks.slice(0, 3).map((task) => (
                  <Box
                    key={task.id}
                    onClick={() => onOpenTask?.(task)}
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor:
                        task.completed || task.status === "done"
                          ? "success.main"
                          : task.dueDate < today
                            ? "error.main"
                            : "primary.main",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 11,
                      lineHeight: 1.4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {task.code} {task.title}
                  </Box>
                ))}
                {dayTasks.length > 3 && (
                  <Typography variant="caption">
                    +{dayTasks.length - 3} việc
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>

        {undated.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Chưa có hạn hoàn thành ({undated.length})
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              {undated.slice(0, 12).map((task) => (
                <Chip
                  key={task.id}
                  size="small"
                  label={`${task.code} ${task.title}`}
                  onClick={() => onOpenTask?.(task)}
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardView({ project, tasks, members, activities }) {
  const total = tasks.length;
  const done = tasks.filter(
    (task) => task.completed || task.status === "done",
  ).length;
  const today = todayIso();
  const overdue = tasks.filter(
    (task) => isoDate(task.dueDate) && isoDate(task.dueDate) < today && !task.completed,
  ).length;
  const unassigned = tasks.filter((task) => !task.assigneeId).length;
  const inProgress = tasks.filter(
    (task) => task.status === "in_progress",
  ).length;
  const percent = dashboardProgress(tasks);

  const statusSeries = ["todo", "in_progress", "blocked", "done"].map(
    (status) =>
      tasks.filter((task) =>
        status === "done"
          ? task.completed || task.status === "done"
          : !task.completed && task.status === status,
      ).length,
  );
  const assigneeData = useMemo(() => {
    const counts = new Map();
    for (const task of tasks) {
      const key = task.assigneeId || "unassigned";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({
        name:
          members.find((member) => member.userId === id)?.user?.name ||
          (id === "unassigned" ? "Chưa giao" : id),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tasks, members]);

  const priorityData = ["urgent", "high", "medium", "low"].map((priority) =>
    tasks.filter((task) => task.priority === priority).length,
  );

  const donutOptions = {
    labels: ["Cần làm", "Đang thực hiện", "Bị chặn", "Hoàn thành"],
    stroke: { width: 0 },
    dataLabels: { enabled: true },
    legend: { position: "bottom" },
    colors: ["#7367F0", "#00BAD1", "#FF4C51", "#28C76F"],
    theme: { mode: "light" },
  };
  const barOptions = {
    chart: { toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: assigneeData.map((item) => item.name) },
    colors: ["#7367F0"],
    grid: { borderColor: "transparent" },
  };
  const priorityOptions = {
    chart: { toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Khẩn cấp", "Cao", "Trung bình", "Thấp"],
    },
    colors: ["#FF4C51", "#FF9F43", "#7367F0", "#00BAD1"],
    grid: { borderColor: "transparent" },
    yaxis: { tickAmount: 4 },
  };

  const kpis = [
    { label: "Tổng công việc", value: total, icon: "tabler-list", color: "primary" },
    { label: "Hoàn thành", value: `${percent}%`, icon: "tabler-circle-check", color: "success" },
    { label: "Đang thực hiện", value: inProgress, icon: "tabler-clock", color: "info" },
    { label: "Quá hạn", value: overdue, icon: "tabler-alert-triangle", color: "error" },
    { label: "Chưa giao", value: unassigned, icon: "tabler-user-off", color: "warning" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            xl: "repeat(5, 1fr)",
          },
          gap: 3,
        }}
      >
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: `${kpi.color}.main`,
                  color: "#fff",
                  mb: 1.5,
                }}
              >
                <i className={kpi.icon} />
              </Box>
              <Typography variant="h5" fontWeight={700}>
                {kpi.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {kpi.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>
              Trạng thái công việc
            </Typography>
            <AppReactApexCharts
              type="donut"
              height={280}
              options={donutOptions}
              series={statusSeries}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>
              Khối lượng theo người phụ trách
            </Typography>
            {assigneeData.length ? (
              <AppReactApexCharts
                type="bar"
                height={280}
                options={barOptions}
                series={[{ name: "Công việc", data: assigneeData.map((item) => item.count) }]}
              />
            ) : (
              <Typography color="text.secondary">Chưa có dữ liệu.</Typography>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>
              Mức độ ưu tiên
            </Typography>
            <AppReactApexCharts
              type="bar"
              height={280}
              options={priorityOptions}
              series={[{ name: "Công việc", data: priorityData }]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>
              Tiến độ dự án
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
              <Typography variant="h3" fontWeight={800}>
                {percent}%
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: "action.hover",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${percent}%`,
                      height: "100%",
                      bgcolor: "success.main",
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {done}/{total} công việc hoàn thành
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
              {tasks
                .filter((task) => task.priority === "urgent" || task.priority === "high")
                .slice(0, 6)
                .map((task) => (
                  <Chip
                    key={task.id}
                    size="small"
                    variant="tonal"
                    color={PRIORITY_LABELS[task.priority]?.[1] || "default"}
                    label={`${task.code} ${task.title}`}
                  />
                ))}
            </Box>
            <Typography variant="subtitle2" fontWeight={700} mt={3}>
              Hoạt động gần đây
            </Typography>
            {activities.slice(0, 5).map((item) => (
              <Typography key={item.id} variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {item.details} · {new Date(item.createdAt).toLocaleString("vi-VN")}
              </Typography>
            ))}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
