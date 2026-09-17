"use client";
import VietnameseDateField from "@/components/VietnameseDateField";
import { exportJsonToExcel } from "@/libs/excelHelper";
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
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
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
  const [personal, setPersonal] = useState(null);
  const [personalUser, setPersonalUser] = useState(null);
  const [personalYear, setPersonalYear] = useState(
    String(new Date().getFullYear()),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const current = periodKey(currentFundPeriod());
  const invalid = !from || !to || from > to || to > current;
  useEffect(() => {
    if (invalid) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const personalQuery = personalUser
      ? `&userId=${personalUser.id}&year=${personalYear}`
      : "";
    fetch(`/api/fund-statistics?from=${from}&to=${to}${personalQuery}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) {
          setMembers(data.members);
          setPersonal(data.personal);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error.message || "Không thể tải thống kê");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, invalid, personalUser, personalYear, revision]);
  const max = Math.max(
    1000,
    Math.ceil((Math.max(0, ...members.map((m) => m.amount)) * 1.15) / 1000) *
      1000,
  );
  const height = 260;
  const exportTeam = () =>
    exportJsonToExcel(
      members.map((member) => ({
        "Nhân sự": member.name,
        "Tổng thực đóng (VNĐ)": member.amount,
      })),
      `thong_ke_quy_ca_doi_${from}_${to}.xlsx`,
      "Thống kê cả đội",
    );
  const exportPersonal = () =>
    personal &&
    exportJsonToExcel(
      personal.months.map((item) => ({
        Tháng: item.month,
        "Số tiền đã đóng (VNĐ)": item.amount,
      })),
      `thong_ke_quy_${personal.user.name}_${personal.year}.xlsx`,
      "Thống kê cá nhân",
    );
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
      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{ px: 3, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Tab label="Thống kê cả đội" />
        <Tab label="Thống kê cá nhân" />
      </Tabs>
      <CardContent>
        <Box sx={{ display: activeTab === 0 ? "block" : "none" }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Button
              size="small"
              variant="tonal"
              startIcon={<i className="tabler-file-spreadsheet" />}
              onClick={exportTeam}
              disabled={!members.length}
            >
              Xuất Excel
            </Button>
          </Box>
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
        </Box>
        <Box sx={{ display: activeTab === 1 ? "block" : "none" }}>
          {personal ? (
            <Box
              sx={{
                mt: 5,
                pt: 4,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  mb: 3,
                  flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography variant="h6">Lịch sử đóng quỹ cá nhân</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {personal.user.name} · Tổng năm {personal.year}:{" "}
                    {personal.months
                      .reduce((sum, item) => sum + item.amount, 0)
                      .toLocaleString("vi-VN")}{" "}
                    đ
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    variant="tonal"
                    startIcon={<i className="tabler-file-spreadsheet" />}
                    onClick={exportPersonal}
                  >
                    Xuất Excel
                  </Button>
                  <Button
                    size="small"
                    variant="tonal"
                    onClick={() => setPickerOpen(true)}
                  >
                    Đổi nhân sự
                  </Button>
                  <TextField
                    select
                    SelectProps={{ native: true }}
                    label="Năm"
                    size="small"
                    value={personalYear}
                    onChange={(event) => setPersonalYear(event.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    {[0, 1, 2, 3].map((offset) => {
                      const year = new Date().getFullYear() - offset;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </TextField>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "flex-end",
                  minHeight: 190,
                  overflowX: "auto",
                  pb: 1,
                }}
              >
                {personal.months.map((item) => (
                  <Box
                    key={item.month}
                    sx={{ minWidth: 58, flex: 1, textAlign: "center" }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {item.amount ? item.amount.toLocaleString("vi-VN") : "—"}
                    </Typography>
                    <Box
                      sx={{
                        height: 130,
                        mt: 0.5,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Box
                        sx={{
                          width: 30,
                          height: `${Math.max(item.amount ? 8 : 0, (item.amount / Math.max(1, ...personal.months.map((month) => month.amount))) * 120)}px`,
                          bgcolor: item.amount ? "info.main" : "transparent",
                          borderRadius: "5px 5px 0 0",
                        }}
                      />
                    </Box>
                    <Typography variant="caption">T{item.month}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <Typography variant="h6">Chọn nhân sự để truy soát</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, mb: 3 }}
              >
                Xem biểu đồ số tiền đã đóng theo từng tháng trong năm.
              </Typography>
              <Button
                variant="tonal"
                startIcon={<i className="tabler-user-search" />}
                onClick={() => setPickerOpen(true)}
              >
                Chọn nhân sự
              </Button>
            </Box>
          )}
        </Box>
      </CardContent>
      <Dialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Truy soát đóng quỹ cá nhân</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Tìm nhân sự"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <List dense sx={{ maxHeight: 320, overflowY: "auto" }}>
            {members
              .filter((member) =>
                member.name.toLowerCase().includes(search.trim().toLowerCase()),
              )
              .map((member) => (
                <ListItemButton
                  key={member.id}
                  onClick={() => {
                    setPersonalUser(member);
                    setPersonalYear(String(new Date().getFullYear()));
                    setPickerOpen(false);
                    setSearch("");
                  }}
                >
                  <ListItemText primary={member.name} />
                </ListItemButton>
              ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
