"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";
import { resolveAvatar } from "@/utils/getDefaultAvatar";

const weekdayLabels = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu"];

export default function TrashScheduleCard({ canManage = false }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shiftingDate, setShiftingDate] = useState("");

  const loadWeek = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/water-schedules/trash?weekOffset=${weekOffset}`,
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSchedules(result.schedules || []);
    } catch (error) {
      toast.error(error.message || "Không thể tải lịch đổ rác");
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  const shiftSchedule = async (dateKey) => {
    setShiftingDate(dateKey);
    try {
      const response = await fetch("/api/water-schedules/trash", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey, weekOffset }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSchedules(result.schedules || []);
      toast.success("Đã đôn người ngày sau lên thay lịch nghỉ");
    } catch (error) {
      toast.error(error.message || "Không thể đổi lịch đổ rác");
    } finally {
      setShiftingDate("");
    }
  };

  const range = schedules.length
    ? `${schedules[0].date} - ${schedules[schedules.length - 1].date}`
    : "";

  return (
    <Card>
      <CardHeader
        sx={{ py: 2, "& .MuiCardHeader-action": { alignSelf: "center", m: 0 } }}
        avatar={
          <Avatar
            variant="rounded"
            sx={{
              width: 36,
              height: 36,
              bgcolor: "warning.lighter",
              color: "warning.main",
            }}
          >
            <i className="tabler-trash" />
          </Avatar>
        }
        title={
          <Typography variant="h6" fontWeight={700}>
            Quản lý lịch đổ rác
          </Typography>
        }
        subheader={range}
        action={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              size="small"
              aria-label="Tuần trước"
              onClick={() => setWeekOffset((value) => value - 1)}
            >
              <i className="tabler-chevron-left" />
            </IconButton>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ minWidth: 86, textAlign: "center" }}
            >
              {weekOffset === 0
                ? "Tuần này"
                : weekOffset === 1
                  ? "Tuần sau"
                  : weekOffset > 1
                    ? `Sau ${weekOffset} tuần`
                    : `${Math.abs(weekOffset)} tuần trước`}
            </Typography>
            <IconButton
              size="small"
              aria-label="Tuần tiếp theo"
              onClick={() => setWeekOffset((value) => value + 1)}
            >
              <i className="tabler-chevron-right" />
            </IconButton>
          </Box>
        }
      />
      <Divider />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : schedules.length ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(5, minmax(0, 1fr))" },
          }}
        >
          {schedules.map((schedule, index) => (
            <Box
              key={schedule.id}
              sx={{
                minWidth: 0,
                borderLeft: { md: index ? "1px solid" : 0 },
                borderTop: { xs: index ? "1px solid" : 0, md: 0 },
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.75,
                  bgcolor: "action.hover",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="caption" fontWeight={700}>
                  {weekdayLabels[schedule.weekday - 1]}
                  <Box
                    component="span"
                    sx={{ mx: 0.75, color: "text.disabled" }}
                  >
                    ·
                  </Box>
                  <Box component="span" color="text.secondary" fontWeight={500}>
                    {schedule.date.slice(0, 5)}
                  </Box>
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  minWidth: 0,
                  px: 1.5,
                  py: 1.25,
                }}
              >
                <Avatar
                  src={resolveAvatar(schedule)}
                  alt={schedule.name}
                  sx={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    border: "2px solid",
                    borderColor: "background.paper",
                    boxShadow: 1,
                  }}
                />
                <Typography
                  variant="body2"
                  fontWeight={700}
                  noWrap
                  title={schedule.name}
                  sx={{ flex: 1, minWidth: 0 }}
                >
                  {schedule.name}
                </Typography>
                {canManage && (
                  <IconButton
                    size="small"
                    color="warning"
                    title="Người này nghỉ, đôn lịch từ ngày sau"
                    disabled={Boolean(shiftingDate)}
                    onClick={() => shiftSchedule(schedule.dateKey)}
                    sx={{ width: 28, height: 28, flexShrink: 0 }}
                  >
                    <i
                      className={
                        shiftingDate === schedule.dateKey
                          ? "tabler-loader-2 animate-spin"
                          : "tabler-user-x"
                      }
                    />
                  </IconButton>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ py: 5, textAlign: "center" }}>
          Chưa có nhân sự để xếp lịch đổ rác.
        </Typography>
      )}
    </Card>
  );
}
