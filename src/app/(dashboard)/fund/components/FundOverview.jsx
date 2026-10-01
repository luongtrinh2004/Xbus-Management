"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import LinearProgress from "@mui/material/LinearProgress";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import CustomTextField from "@core/components/mui/TextField";
import AppReactApexCharts from "@/libs/styles/AppReactApexCharts";
import { exportJsonToExcel } from "@/libs/excelHelper";
import { toast } from "react-toastify";

const money = (val) => `${new Intl.NumberFormat("vi-VN").format(Math.round(val || 0))} đ`;
const moneyShort = (val) => {
  const num = Math.abs(val || 0);
  if (num >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return String(val);
};

export default function FundOverview({ onNavigateSection }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Filter state
  const [isAll, setIsAll] = useState(true);
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");

  // Chế độ xem biểu đồ chính: 'compare' (Thu vs Chi) | 'balance' (Tồn quỹ) | 'net' (Dòng tiền ròng)
  const [chartViewMode, setChartViewMode] = useState("compare");

  const currentPeriodLabel = useMemo(() => {
    if (isAll) return "Tất cả các kỳ";
    const fromObj = data?.availablePeriods?.find((p) => p.key === fromMonth);
    const toObj = data?.availablePeriods?.find((p) => p.key === toMonth);
    const fromTxt = fromObj?.label || (fromMonth ? `Kỳ ${fromMonth}` : "");
    const toTxt = toObj?.label || (toMonth ? `Kỳ ${toMonth}` : "");
    if (!fromTxt && !toTxt) return "Tất cả các kỳ";
    if (fromTxt === toTxt) return fromTxt;
    return `${fromTxt} — ${toTxt}`;
  }, [isAll, fromMonth, toMonth, data?.availablePeriods]);

  const loadData = async (mode = "all", opts = {}) => {
    setLoading(true);
    try {
      let url = `/api/funds/overview?mode=${mode}`;
      if (mode === "range") {
        const from = opts.from || fromMonth;
        const to = opts.to || toMonth;
        if (from && to) {
          url += `&from=${from}&to=${to}`;
        }
      }

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Không thể tải báo cáo tài chính");
      const json = await res.json();
      setData(json);

      if (!fromMonth && json.availablePeriods?.length > 0) {
        const reversed = [...json.availablePeriods].reverse();
        setFromMonth(reversed[0].key);
        setToMonth(json.availablePeriods[0].key);
      }
    } catch (err) {
      toast.error(err.message || "Lỗi khi tải dữ liệu tổng quan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData("all");
  }, []);

  const handleSelectAll = () => {
    setIsAll(true);
    loadData("all");
  };

  const handleFromChange = (val) => {
    if (val === "all") {
      handleSelectAll();
      return;
    }
    const currentTo = toMonth || data?.availablePeriods?.[0]?.key || val;
    const finalTo = currentTo < val ? val : currentTo;
    setIsAll(false);
    setFromMonth(val);
    setToMonth(finalTo);
    loadData("range", { from: val, to: finalTo });
  };

  const handleToChange = (val) => {
    if (val === "all") {
      handleSelectAll();
      return;
    }
    const currentFrom = fromMonth || data?.availablePeriods?.[data.availablePeriods.length - 1]?.key || val;
    const finalFrom = currentFrom > val ? val : currentFrom;
    setIsAll(false);
    setFromMonth(finalFrom);
    setToMonth(val);
    loadData("range", { from: finalFrom, to: val });
  };

  const exportExcel = () => {
    const tableItems = data?.monthlyTimeline || data?.timelineData || [];
    if (!tableItems.length) return;
    const rows = tableItems.map((item) => ({
      "Kỳ quỹ": item.label,
      "Số dư đầu kỳ (VNĐ)": item.openingBalance,
      "Quỹ thành viên đóng (VNĐ)": item.memberIncome,
      "Nguồn thu khác (VNĐ)": item.otherIncome,
      "Tổng thu (VNĐ)": item.totalIncome,
      "Tổng chi (VNĐ)": item.totalExpense,
      "Chênh lệch thu chi (VNĐ)": item.netCashFlow,
      "Số dư cuối kỳ (VNĐ)": item.closingBalance,
      "Tỷ lệ đóng quỹ (%)": `${item.paymentRate || 0}%`,
    }));
    exportJsonToExcel(rows, `bao_cao_tai_chinh_${Date.now()}.xlsx`, "Tổng quan tài chính");
  };

  // Cấu hình Biểu đồ dòng tiền chính theo chế độ xem
  const mainChartConfig = useMemo(() => {
    const chartItems = data?.chartTimeline || data?.timelineData || [];
    const categories = chartItems.map((item) => item.label);

    const baseOptions = {
      chart: {
        toolbar: { show: false },
        parentHeightOffset: 0,
        zoom: { enabled: false },
        fontFamily: "Public Sans, sans-serif",
      },
      dataLabels: { enabled: false },
      legend: {
        position: "top",
        horizontalAlign: "right",
        labels: { colors: isDark ? "#b4b7bd" : "#5d596c" },
        markers: { radius: 12 },
      },
      grid: {
        borderColor: isDark ? "rgba(225, 222, 245, 0.08)" : "rgba(47, 43, 61, 0.08)",
        strokeDashArray: 5,
        padding: { left: 10, right: 10 },
      },
      xaxis: {
        categories,
        tickAmount: categories.length > 20 ? 15 : undefined,
        labels: {
          rotate: categories.length > 15 ? -45 : 0,
          rotateAlways: false,
          hideOverlappingLabels: true,
          style: {
            colors: isDark ? "#808390" : "#737682",
            fontSize: categories.length > 20 ? "11px" : "12px",
            fontWeight: 500,
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: isDark ? "#808390" : "#737682", fontSize: "12px" },
          formatter: (val) => moneyShort(val),
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: isDark ? "dark" : "light",
        x: {
          formatter: (val, { dataPointIndex }) => {
            return chartItems[dataPointIndex]?.fullLabel || chartItems[dataPointIndex]?.label || val;
          },
        },
        y: { formatter: (val) => money(val) },
      },
    };

    // Chế độ 'compare': Biểu đồ đường kép Thu (Xanh) và Chi (Đỏ) có chấm tròn marker nổi bật
    if (chartViewMode === "compare") {
      return {
        type: "line",
        options: {
          ...baseOptions,
          colors: ["#28C76F", "#FF4C51"],
          stroke: {
            curve: "smooth",
            width: 3.5,
          },
          markers: {
            size: categories.length > 20 ? 3.5 : 6,
            colors: ["#28C76F", "#FF4C51"],
            strokeColors: isDark ? "#2F3349" : "#ffffff",
            strokeWidth: 2,
            strokeOpacity: 1,
            hover: {
              size: 8,
              sizeOffset: 3,
            },
          },
          dropShadow: {
            enabled: true,
            top: 4,
            left: 0,
            blur: 8,
            opacity: isDark ? 0.35 : 0.15,
          },
        },
        series: [
          { name: "Tổng thu (Xanh)", data: chartItems.map((d) => d.totalIncome) },
          { name: "Tổng chi (Đỏ)", data: chartItems.map((d) => d.totalExpense) },
        ],
      };
    }

    // Chế độ 'all_lines': Thu (Xanh), Chi (Đỏ), và Số dư quỹ (Tím)
    if (chartViewMode === "all_lines") {
      return {
        type: "line",
        options: {
          ...baseOptions,
          colors: ["#28C76F", "#FF4C51", "#7367F0"],
          stroke: {
            curve: "smooth",
            width: 3,
          },
          markers: {
            size: categories.length > 20 ? 3 : 5,
            colors: ["#28C76F", "#FF4C51", "#7367F0"],
            strokeColors: isDark ? "#2F3349" : "#ffffff",
            strokeWidth: 2,
            hover: { size: 7 },
          },
        },
        series: [
          { name: "Tổng thu", data: chartItems.map((d) => d.totalIncome) },
          { name: "Tổng chi", data: chartItems.map((d) => d.totalExpense) },
          { name: "Số dư quỹ", data: chartItems.map((d) => d.closingBalance) },
        ],
      };
    }

    // Chế độ 'bar': Dạng cột so sánh
    return {
      type: "bar",
      options: {
        ...baseOptions,
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "38%",
            borderRadius: 6,
            borderRadiusApplication: "end",
          },
        },
        colors: ["#28C76F", "#FF4C51"],
      },
      series: [
        { name: "Tổng thu", data: chartItems.map((d) => d.totalIncome) },
        { name: "Tổng chi", data: chartItems.map((d) => d.totalExpense) },
      ],
    };
  }, [data?.chartTimeline, data?.timelineData, chartViewMode, isDark]);

  // Cấu hình Donut: Nguồn thu
  const validIncomes = useMemo(() => {
    return (data?.incomeCategories || []).filter((c) => c.amount > 0);
  }, [data?.incomeCategories]);

  const incomeTotal = data?.summary?.totalIncome || 1;

  const incomePieOptions = useMemo(() => {
    return {
      chart: { type: "donut" },
      labels: validIncomes.map((c) => c.label),
      colors: validIncomes.map((c) => c.color),
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 2, colors: [isDark ? "#2F3349" : "#fff"] },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              name: { show: false },
              value: {
                fontSize: "18px",
                fontWeight: 700,
                color: isDark ? "#fff" : "#2f2b3d",
                formatter: (val) => moneyShort(Number(val)),
              },
              total: {
                show: true,
                label: "Tổng",
                fontSize: "12px",
                color: isDark ? "#808390" : "#737682",
                formatter: () => moneyShort(data?.summary?.totalIncome || 0),
              },
            },
          },
        },
      },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: { formatter: (val) => money(val) },
      },
    };
  }, [validIncomes, data?.summary?.totalIncome, isDark]);

  // Cấu hình Donut: Tiền chi
  const validExpenses = useMemo(() => {
    return (data?.expenseCategories || []).filter((c) => c.amount > 0);
  }, [data?.expenseCategories]);

  const expenseTotal = data?.summary?.totalExpense || 1;

  const expensePieOptions = useMemo(() => {
    return {
      chart: { type: "donut" },
      labels: validExpenses.map((c) => c.label),
      colors: validExpenses.map((c) => c.color),
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 2, colors: [isDark ? "#2F3349" : "#fff"] },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              name: { show: false },
              value: {
                fontSize: "18px",
                fontWeight: 700,
                color: isDark ? "#fff" : "#2f2b3d",
                formatter: (val) => moneyShort(Number(val)),
              },
              total: {
                show: true,
                label: "Tổng chi",
                fontSize: "12px",
                color: isDark ? "#808390" : "#737682",
                formatter: () => moneyShort(data?.summary?.totalExpense || 0),
              },
            },
          },
        },
      },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: { formatter: (val) => money(val) },
      },
    };
  }, [validExpenses, data?.summary?.totalExpense, isDark]);

  return (
    <Box>
      {/* Thanh điều khiển bộ lọc thời gian duy nhất */}
      <Card sx={{ mb: 4, border: "1px solid", borderColor: "divider", boxShadow: "none" }}>
        <CardContent sx={{ py: "12px !important", px: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            {/* Cụm lọc thời gian */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              {/* Nút Tất cả */}
              <Button
                variant={isAll ? "contained" : "tonal"}
                color="primary"
                startIcon={<i className="tabler-calendar-stats" />}
                onClick={handleSelectAll}
                sx={{ height: 38, textTransform: "none", fontWeight: 600, px: 2.5 }}
              >
                Tất cả
              </Button>

              {/* Lọc khoảng thời gian Từ kỳ - Đến kỳ */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CustomTextField
                  select
                  size="small"
                  label="Từ kỳ"
                  value={isAll ? "all" : fromMonth}
                  onChange={(e) => handleFromChange(e.target.value)}
                  sx={{ width: 160 }}
                >
                  <MenuItem value="all">
                    <Typography variant="body2" color="text.secondary">
                      — —
                    </Typography>
                  </MenuItem>
                  {[...(data?.availablePeriods || [])].reverse().map((p) => (
                    <MenuItem key={p.key} value={p.key}>
                      {p.label}
                    </MenuItem>
                  ))}
                </CustomTextField>

                <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
                  đến
                </Typography>

                <CustomTextField
                  select
                  size="small"
                  label="Đến kỳ"
                  value={isAll ? "all" : toMonth}
                  onChange={(e) => handleToChange(e.target.value)}
                  sx={{ width: 160 }}
                >
                  <MenuItem value="all">
                    <Typography variant="body2" color="text.secondary">
                      — —
                    </Typography>
                  </MenuItem>
                  {(data?.availablePeriods || []).map((p) => (
                    <MenuItem key={p.key} value={p.key}>
                      {p.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Box>
            </Box>

            {/* Nút Xuất Excel */}
            <Button
              size="small"
              variant="tonal"
              startIcon={<i className="tabler-file-spreadsheet" />}
              onClick={exportExcel}
              disabled={!data?.timelineData?.length}
            >
              Xuất Excel
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ minHeight: 320, display: "grid", placeItems: "center" }}>
          <Box textAlign="center">
            <CircularProgress />
            <Typography color="text.secondary" mt={2}>
              Đang tổng hợp báo cáo tài chính...
            </Typography>
          </Box>
        </Box>
      ) : (
        <>
          {/* 4 Thẻ KPI Stat Cards */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {/* Tổng nguồn thu */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: isDark ? "0 4px 18px rgba(0,0,0,.3)" : "0 4px 18px rgba(47,43,61,.08)" },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5}>
                      TỔNG NGUỒN THU
                    </Typography>
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 38,
                        height: 38,
                        bgcolor: "rgba(40, 199, 111, 0.12)",
                        color: "success.main",
                      }}
                    >
                      <i className="tabler-trending-up" style={{ fontSize: 22 }} />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {money(data?.summary?.totalIncome)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Tổng tiền chi */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: isDark ? "0 4px 18px rgba(0,0,0,.3)" : "0 4px 18px rgba(47,43,61,.08)" },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5}>
                      TỔNG TIỀN CHI
                    </Typography>
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 38,
                        height: 38,
                        bgcolor: "rgba(255, 76, 81, 0.12)",
                        color: "error.main",
                      }}
                    >
                      <i className="tabler-trending-down" style={{ fontSize: 22 }} />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {money(data?.summary?.totalExpense)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Dòng tiền ròng */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: isDark ? "0 4px 18px rgba(0,0,0,.3)" : "0 4px 18px rgba(47,43,61,.08)" },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5}>
                      DÒNG TIỀN THU - CHI
                    </Typography>
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 38,
                        height: 38,
                        bgcolor:
                          data?.summary?.netCashFlow >= 0
                            ? "rgba(40, 199, 111, 0.12)"
                            : "rgba(255, 76, 81, 0.12)",
                        color: data?.summary?.netCashFlow >= 0 ? "success.main" : "error.main",
                      }}
                    >
                      <i className="tabler-arrows-diff" style={{ fontSize: 22 }} />
                    </Avatar>
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={data?.summary?.netCashFlow >= 0 ? "success.main" : "error.main"}
                  >
                    {data?.summary?.netCashFlow > 0 ? "+" : ""}
                    {money(data?.summary?.netCashFlow)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Số dư quỹ hiện tại */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: isDark ? "0 4px 18px rgba(0,0,0,.3)" : "0 4px 18px rgba(47,43,61,.08)" },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5}>
                      SỐ DƯ QUỸ HIỆN TẠI
                    </Typography>
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 38,
                        height: 38,
                        bgcolor: "rgba(115, 103, 240, 0.12)",
                        color: "primary.main",
                      }}
                    >
                      <i className="tabler-wallet" style={{ fontSize: 22 }} />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {money(data?.summary?.currentFundBalance)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Biểu đồ Diễn biến Dòng tiền & Tồn quỹ */}
          <Card sx={{ mb: 4, border: "1px solid", borderColor: "divider", boxShadow: "none" }}>
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    variant="rounded"
                    sx={{ bgcolor: "rgba(115, 103, 240, 0.12)", color: "primary.main" }}
                  >
                    <i className="tabler-chart-bar" />
                  </Avatar>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                      <Typography variant="h5" fontWeight={700}>
                        Diễn biến Dòng tiền & Tồn quỹ
                      </Typography>
                      {data?.granularityLabel && (
                        <Chip
                          size="small"
                          variant="tonal"
                          color={data?.granularity === "day" ? "primary" : "secondary"}
                          label={data.granularityLabel}
                          sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600 }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {chartViewMode === "compare"
                        ? `So sánh tương quan giữa Tổng thu (màu xanh) và Tổng chi (màu đỏ) ${data?.granularity === "day" ? "theo từng ngày" : "qua các kỳ"}`
                        : chartViewMode === "all_lines"
                          ? `Bao gồm Tổng thu (xanh), Tổng chi (đỏ) và Số dư quỹ tích lũy (tím) ${data?.granularity === "day" ? "theo từng ngày" : "qua các kỳ"}`
                          : `Biểu đồ cột so sánh tương quan giữa Thu và Chi ${data?.granularity === "day" ? "theo từng ngày" : "qua các kỳ"}`}
                    </Typography>
                  </Box>
                </Box>
              }
              action={
                <ToggleButtonGroup
                  size="small"
                  value={chartViewMode}
                  exclusive
                  onChange={(_, val) => val && setChartViewMode(val)}
                  sx={{
                    bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(47,43,61,0.04)",
                    p: 0.5,
                    borderRadius: 2,
                    "& .MuiToggleButton-root": {
                      border: "none",
                      borderRadius: 1.5,
                      px: 1.75,
                      py: 0.5,
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      "&.Mui-selected": {
                        bgcolor: "background.paper",
                        color: "primary.main",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                      },
                    },
                  }}
                >
                  <ToggleButton value="compare">Đường Thu & Chi</ToggleButton>
                  <ToggleButton value="all_lines">Gồm cả Tồn quỹ</ToggleButton>
                  <ToggleButton value="bar">Dạng cột</ToggleButton>
                </ToggleButtonGroup>
              }
            />
            <CardContent sx={{ pt: 1 }}>
              {data?.timelineData?.length > 0 ? (
                <AppReactApexCharts
                  type={mainChartConfig.type}
                  height={320}
                  width="100%"
                  options={mainChartConfig.options}
                  series={mainChartConfig.series}
                />
              ) : (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <Typography color="text.secondary">Không có dữ liệu trong khoảng thời gian này</Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* 2 Biểu đồ Tròn: Phân bổ Nguồn thu & Khoản chi (Thiết kế ngang 2 cột cao cấp) */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {/* Cơ cấu Nguồn thu */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider", boxShadow: "none" }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        variant="rounded"
                        sx={{ bgcolor: "rgba(40, 199, 111, 0.12)", color: "success.main" }}
                      >
                        <i className="tabler-chart-pie" />
                      </Avatar>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                          <Typography variant="h5" fontWeight={700}>
                            Cơ cấu Nguồn thu
                          </Typography>
                          <Chip
                            size="small"
                            variant="tonal"
                            color="success"
                            label={currentPeriodLabel}
                            sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600 }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Tỷ lệ đóng góp từ các nguồn tiền ({currentPeriodLabel})
                        </Typography>
                      </Box>
                    </Box>
                  }
                  action={
                    onNavigateSection && (
                      <Button
                        size="small"
                        color="success"
                        variant="tonal"
                        onClick={() => onNavigateSection("income")}
                        endIcon={<i className="tabler-arrow-right" />}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        Chi tiết
                      </Button>
                    )
                  }
                />
                <Divider />
                <CardContent sx={{ pt: 3 }}>
                  {validIncomes.length > 0 ? (
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 5 }}>
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                          <AppReactApexCharts
                            key={`income-donut-${currentPeriodLabel}-${validIncomes.map((c) => c.key + c.amount).join("-")}`}
                            type="donut"
                            height={200}
                            width={200}
                            options={incomePieOptions}
                            series={validIncomes.map((c) => c.amount)}
                          />
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 7 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                          {validIncomes.map((cat) => {
                            const percent = Math.round((cat.amount / incomeTotal) * 100);
                            return (
                              <Box key={cat.key}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: cat.color }} />
                                    <Typography variant="body2" fontWeight={500}>
                                      {cat.label}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>
                                      {money(cat.amount)}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={`${percent}%`}
                                      sx={{
                                        height: 20,
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        bgcolor: `${cat.color}1F`,
                                        color: cat.color,
                                      }}
                                    />
                                  </Box>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={percent}
                                  sx={{
                                    height: 5,
                                    borderRadius: 3,
                                    bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(47,43,61,0.06)",
                                    "& .MuiLinearProgress-bar": { bgcolor: cat.color, borderRadius: 3 },
                                  }}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <Typography color="text.secondary">Chưa có nguồn thu nào được ghi nhận</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Cơ cấu Khoản chi */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider", boxShadow: "none" }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        variant="rounded"
                        sx={{ bgcolor: "rgba(255, 76, 81, 0.12)", color: "error.main" }}
                      >
                        <i className="tabler-chart-donut" />
                      </Avatar>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                          <Typography variant="h5" fontWeight={700}>
                            Cơ cấu Khoản chi
                          </Typography>
                          <Chip
                            size="small"
                            variant="tonal"
                            color="error"
                            label={currentPeriodLabel}
                            sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600 }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Phân bổ chi tiêu quỹ theo các mục đích sử dụng ({currentPeriodLabel})
                        </Typography>
                      </Box>
                    </Box>
                  }
                  action={
                    onNavigateSection && (
                      <Button
                        size="small"
                        color="error"
                        variant="tonal"
                        onClick={() => onNavigateSection("expense")}
                        endIcon={<i className="tabler-arrow-right" />}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        Chi tiết
                      </Button>
                    )
                  }
                />
                <Divider />
                <CardContent sx={{ pt: 3 }}>
                  {validExpenses.length > 0 ? (
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 5 }}>
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                          <AppReactApexCharts
                            key={`expense-donut-${currentPeriodLabel}-${validExpenses.map((c) => c.key + c.amount).join("-")}`}
                            type="donut"
                            height={200}
                            width={200}
                            options={expensePieOptions}
                            series={validExpenses.map((c) => c.amount)}
                          />
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 7 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                          {validExpenses.map((cat) => {
                            const percent = Math.round((cat.amount / expenseTotal) * 100);
                            return (
                              <Box key={cat.key}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: cat.color }} />
                                    <Typography variant="body2" fontWeight={500}>
                                      {cat.label}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>
                                      {money(cat.amount)}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={`${percent}%`}
                                      sx={{
                                        height: 20,
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        bgcolor: `${cat.color}1F`,
                                        color: cat.color,
                                      }}
                                    />
                                  </Box>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={percent}
                                  sx={{
                                    height: 5,
                                    borderRadius: 3,
                                    bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(47,43,61,0.06)",
                                    "& .MuiLinearProgress-bar": { bgcolor: cat.color, borderRadius: 3 },
                                  }}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <Typography color="text.secondary">Chưa có khoản chi nào được ghi nhận</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Bảng Dòng tiền chi tiết từng kỳ */}
          <Card sx={{ mb: 4, border: "1px solid", borderColor: "divider", boxShadow: "none" }}>
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    variant="rounded"
                    sx={{ bgcolor: "rgba(0, 186, 209, 0.12)", color: "info.main" }}
                  >
                    <i className="tabler-table" />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      Bảng tổng hợp dòng tiền từng kỳ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Chi tiết thu chi, tồn quỹ đầu/cuối kỳ và tỷ lệ đóng góp của thành viên
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <Divider />
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(47, 43, 61, 0.04)" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>KỲ QUỸ</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>SỐ DƯ ĐẦU</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>QUỸ THÀNH VIÊN</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>THU KHÁC</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>TỔNG THU</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>TỔNG CHI</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>CHÊNH LỆCH</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>SỐ DƯ CUỐI</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>TIẾN ĐỘ ĐÓNG QUỸ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.monthlyTimeline || data?.timelineData || []).map((row) => (
                    <TableRow key={row.periodKey} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {row.label}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {money(row.openingBalance)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="primary.main" fontWeight={500}>
                          {money(row.memberIncome)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {money(row.otherIncome)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main" fontWeight={600}>
                          {money(row.totalIncome)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="error.main" fontWeight={600}>
                          {money(row.totalExpense)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${row.netCashFlow > 0 ? "+" : ""}${money(row.netCashFlow)}`}
                          color={row.netCashFlow >= 0 ? "success" : "error"}
                          variant="tonal"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}>
                          {money(row.closingBalance)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 120, justifyContent: "center" }}>
                          <Box sx={{ width: 80 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, row.paymentRate)}
                              color={row.paymentRate >= 80 ? "success" : row.paymentRate >= 50 ? "warning" : "error"}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ minWidth: 45, fontWeight: 600 }}>
                            {row.paidMembers}/{row.totalMembers}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </>
      )}
    </Box>
  );
}
