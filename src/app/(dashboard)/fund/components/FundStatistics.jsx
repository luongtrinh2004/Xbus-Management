"use client";
import VietnameseDateField from "@/components/VietnameseDateField";
import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Typography,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { currentFundPeriod, periodKey } from "@/libs/fundRules";

export default function FundStatistics({ period, revision }) {
  const initial = period
    ? period.split("/").reverse().join("-")
    : periodKey(currentFundPeriod());
  const [from, setFrom] = useState(initial);
  const [to, setTo] = useState(initial);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const current = periodKey(currentFundPeriod());
  const invalid = !from || !to || from > to || to > current;
  useEffect(() => {
    if (invalid) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/fund-statistics?from=${from}&to=${to}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setMembers(data.members);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error.message || "Không thể tải thống kê");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, invalid, revision]);
  const max = Math.max(
    1000,
    Math.ceil((Math.max(0, ...members.map((m) => m.amount)) * 1.15) / 1000) *
      1000,
  );
  const height = 260;
  return (
    <Card sx={{ mt: 4 }}>
      <CardHeader
        title={
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Avatar
              variant="rounded"
              sx={{ bgcolor: "rgba(115,103,240,.12)", color: "primary.main" }}
            >
              <i className="tabler-chart-bar" />
            </Avatar>
            <Box>
              <Typography variant="h5">Thống kê đóng quỹ</Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng tiền thực đóng theo kỳ trong khoảng tháng, từ cao đến thấp
              </Typography>
            </Box>
          </Box>
        }
      />
      <CardContent>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
          <VietnameseDateField
            type="month"
            label="Từ tháng"
            size="small"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: to || current }}
          />
          <VietnameseDateField
            type="month"
            label="Đến tháng"
            size="small"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: from, max: current }}
          />
        </Box>
        {invalid ? (
          <Alert severity="warning">
            Chọn khoảng tháng hợp lệ, không vượt quá tháng hiện tại.
          </Alert>
        ) : loading ? (
          <Box role="status" sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress />
            <Typography mt={2}>Đang tổng hợp đóng quỹ…</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <Typography variant="body2" mb={3}>
              Tổng đã thu:{" "}
              <strong>
                {members
                  .reduce((sum, m) => sum + m.amount, 0)
                  .toLocaleString("vi-VN")}{" "}
                đ
              </strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Số tiền (VNĐ)
            </Typography>
            <Box sx={{ display: "flex", mt: 3 }}>
              <Box
                sx={{
                  height: `${height}px`,
                  position: "relative",
                  width: 90,
                  flexShrink: 0,
                }}
              >
                {[1, 0.75, 0.5, 0.25, 0].map((r) => (
                  <Typography
                    key={r}
                    variant="caption"
                    sx={{
                      position: "absolute",
                      top: `${(1 - r) * height}px`,
                      transform: "translateY(-50%)",
                    }}
                  >
                    {Math.round(max * r).toLocaleString("vi-VN")}
                  </Typography>
                ))}
              </Box>
              <Box
                tabIndex={0}
                aria-label="Biểu đồ tổng đóng quỹ, cuộn ngang để xem tất cả nhân sự"
                sx={{ overflowX: "auto", minWidth: 0, flex: 1 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    width: `${Math.max(1, members.length) * 120}px`,
                    minWidth: "100%",
                  }}
                >
                  {members.map((m) => (
                    <Box
                      key={m.id}
                      sx={{ width: 120, flexShrink: 0, textAlign: "center" }}
                    >
                      <Box
                        sx={{
                          height: `${height}px`,
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          backgroundImage:
                            "linear-gradient(to top, rgba(128,128,128,.12) 1px, transparent 1px)",
                          backgroundSize: "100% 65px",
                        }}
                      >
                        <Tooltip
                          title={`${m.name}: ${m.amount.toLocaleString("vi-VN")} đ`}
                        >
                          <Box
                            sx={{
                              width: 54,
                              height: `${Math.max(1, (m.amount / max) * height)}px`,
                              flexShrink: 0,
                              bgcolor: m.amount
                                ? "primary.main"
                                : "action.disabledBackground",
                              borderRadius: "6px 6px 0 0",
                              position: "relative",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                position: "absolute",
                                bottom: "100%",
                                left: "50%",
                                transform: "translateX(-50%)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {m.amount.toLocaleString("vi-VN")}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                      <Typography
                        variant="caption"
                        component="div"
                        sx={{ p: 1, minHeight: 60 }}
                      >
                        {m.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
            {!members.length && (
              <Typography textAlign="center">
                Chưa có dữ liệu đóng quỹ trong khoảng tháng này.
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
