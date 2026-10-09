"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import CustomTextField from "@core/components/mui/TextField";
import TablePaginationComponent from "@components/TablePaginationComponent";
import OvertimePageHeader from "../OvertimePageHeader";
import Chart from "@/libs/ApexCharts";
import tableStyles from "@core/styles/table.module.css";

const currentYear = () =>
  new Date(Date.now() + 7 * 3600000).getUTCFullYear().toString();
const duration = (minutes) =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}p`;
const types = {
  WEEKDAY: "Ngày thường",
  WEEKEND: "Cuối tuần",
  HOLIDAY: "Ngày lễ",
};
const Field = (props) => <CustomTextField fullWidth size="small" {...props} />;

export default function OvertimeStatistics() {
  const [filters, setFilters] = useState(() => ({
    year: currentYear(),
    month: "",
    userId: "",
    from: "",
    to: "",
  }));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const params = new URLSearchParams(filters).toString();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["overtime-statistics", params],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/overtime/statistics?${params}`, {
        signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Không thể tải thống kê OT");
      return result;
    },
  });
  function change(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
    setPage(1);
  }
  async function download() {
    setExporting(true);
    setExportError("");
    try {
      const response = await fetch(`/api/overtime/export?${params}&scope=all`);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Không thể xuất thống kê");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `thong-ke-OT-${filters.year}${filters.month ? `-${filters.month}` : ""}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }
  const employees = (data?.employees || []).filter((employee) =>
    employee.name
      .toLocaleLowerCase("vi")
      .includes(search.toLocaleLowerCase("vi")),
  );
  const totalPages = Math.max(1, Math.ceil(employees.length / limit));
  const safePage = Math.min(page, totalPages);
  const rows = employees.slice((safePage - 1) * limit, safePage * limit);
  const monthlyMap = new Map(
    (data?.months || []).map((item) => [item.month, item]),
  );
  const months = (
    filters.month
      ? [Number(filters.month)]
      : Array.from({ length: 12 }, (_, index) => index + 1)
  ).map(
    (month) =>
      monthlyMap.get(`${filters.year}-${String(month).padStart(2, "0")}`) || {
        month: `${filters.year}-${String(month).padStart(2, "0")}`,
        registeredMinutes: 0,
        confirmedMinutes: 0,
      },
  );
  const options = {
    chart: { toolbar: { show: false } },
    colors: ["#2092ec", "#28c76f", "#ff9f43"],
    dataLabels: { enabled: false },
    noData: { text: "Chưa có dữ liệu" },
    legend: { position: "bottom" },
    yaxis: {
      title: { text: "Giờ OT" },
      labels: { formatter: (value) => Number(value).toFixed(1) },
    },
    tooltip: { y: { formatter: (value) => `${Number(value).toFixed(2)} giờ` } },
  };
  return (
    <Stack spacing={4}>
      <OvertimePageHeader
        title="Thống kê làm thêm giờ"
        subtitle="Tổng hợp thời gian OT của toàn bộ nhân sự theo tháng và năm"
        icon="tabler-chart-bar"
        actions={
          <>
            <Button
              component={Link}
              href="/overtime"
              variant="outlined"
              startIcon={<i className="tabler-list" />}
            >
              Danh sách OT
            </Button>
            <Button
              variant="contained"
              disabled={!data || isFetching || exporting}
              onClick={download}
              startIcon={<i className="tabler-download" />}
            >
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </Button>
          </>
        }
      />
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(5, 1fr)",
              },
              gap: 3,
            }}
          >
            <Field
              label="Năm"
              type="number"
              value={filters.year}
              inputProps={{ min: 1900, max: 9999 }}
              onChange={(event) => change("year", event.target.value)}
            />
            <Field
              label="Tháng"
              select
              value={filters.month}
              SelectProps={{ displayEmpty: true }}
              onChange={(event) => change("month", event.target.value)}
            >
              <MenuItem value="">Cả năm</MenuItem>
              {Array.from({ length: 12 }, (_, index) => (
                <MenuItem
                  key={index}
                  value={String(index + 1).padStart(2, "0")}
                >
                  Tháng {index + 1}
                </MenuItem>
              ))}
            </Field>
            <Field
              label="Nhân viên"
              select
              value={filters.userId}
              SelectProps={{ displayEmpty: true }}
              onChange={(event) => change("userId", event.target.value)}
            >
              <MenuItem value="">Toàn bộ nhân sự</MenuItem>
              {data?.users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Field>
            <Field
              label="Từ ngày"
              type="date"
              value={filters.from}
              onChange={(event) => change("from", event.target.value)}
            />
            <Field
              label="Đến ngày"
              type="date"
              value={filters.to}
              onChange={(event) => change("to", event.target.value)}
            />
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 3 }}
          >
            Chỉ đơn hoàn thành được cộng vào giờ xác nhận. Đơn từ chối và đã hủy
            không tính vào tổng giờ; OT qua ngày/tháng được phân bổ theo thời
            lượng từng ngày.
          </Typography>
        </CardContent>
      </Card>
      {error && (
        <Alert
          severity="error"
          action={<Button onClick={() => refetch()}>Thử lại</Button>}
        >
          {error.message}
        </Alert>
      )}
      {exportError && (
        <Alert severity="error" onClose={() => setExportError("")}>
          {exportError}
        </Alert>
      )}
      {isPending && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}
      {data && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 3,
            }}
          >
            {[
              [
                "Giờ OT đăng ký",
                duration(data.summary.registeredMinutes),
                "tabler-clock",
              ],
              [
                "Giờ OT đã xác nhận",
                duration(data.summary.confirmedMinutes),
                "tabler-clock-check",
              ],
              ["Đơn chờ duyệt", data.summary.PENDING, "tabler-hourglass"],
              [
                "Đơn chờ xác nhận",
                data.summary.WAITING_CONFIRMATION,
                "tabler-file-check",
              ],
              ["Đơn hoàn thành", data.summary.COMPLETED, "tabler-circle-check"],
              [
                "Nhân sự có OT",
                data.employees.filter(
                  (employee) => employee.registeredMinutes > 0,
                ).length,
                "tabler-users",
              ],
            ].map(([label, value, icon]) => (
              <Card key={label}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography variant="h4" sx={{ mt: 1 }}>
                        {value}
                      </Typography>
                    </Box>
                    <Box sx={{ color: "primary.main", alignSelf: "center" }}>
                      <i className={icon} style={{ fontSize: 30 }} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 4,
            }}
          >
            <Card>
              <CardHeader title="Giờ OT theo tháng" />
              <CardContent>
                <Chart
                  type="line"
                  height={300}
                  options={{
                    ...options,
                    xaxis: {
                      categories: months.map((item) =>
                        item.month.split("-").reverse().join("/"),
                      ),
                    },
                    stroke: { curve: "smooth", width: 3 },
                  }}
                  series={[
                    {
                      name: "Đăng ký",
                      data: months.map((item) => item.registeredMinutes / 60),
                    },
                    {
                      name: "Đã xác nhận",
                      data: months.map((item) => item.confirmedMinutes / 60),
                    },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Phân bổ giờ OT theo loại" />
              <CardContent>
                {Object.values(data.types).some((value) => value > 0) ? (
                  <Chart
                    type="donut"
                    height={300}
                    options={{ ...options, labels: Object.values(types) }}
                    series={Object.keys(types).map(
                      (type) => data.types[type] / 60,
                    )}
                  />
                ) : (
                  <Box sx={{ py: 12, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      Chưa có dữ liệu OT trong kỳ.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
            <Card sx={{ gridColumn: { md: "1 / -1" } }}>
              <CardHeader title="Top 10 nhân sự theo giờ OT đã xác nhận" />
              <CardContent>
                <Chart
                  type="bar"
                  height={300}
                  options={{
                    ...options,
                    xaxis: {
                      categories: data.employees
                        .filter((employee) => employee.confirmedMinutes > 0)
                        .slice(0, 10)
                        .map((employee) => employee.name),
                    },
                  }}
                  series={[
                    {
                      name: "Đã xác nhận",
                      data: data.employees
                        .filter((employee) => employee.confirmedMinutes > 0)
                        .slice(0, 10)
                        .map((employee) => employee.confirmedMinutes / 60),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </Box>
          <Card>
            <CardHeader
              title="Thời gian OT theo nhân sự"
              subheader={`${employees.length} nhân sự · Bao gồm nhân sự chưa có OT trong kỳ`}
              action={
                <CustomTextField
                  placeholder="Tìm nhân viên..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              }
              sx={{
                flexWrap: "wrap",
                gap: 2,
                "& .MuiCardHeader-action": { m: 0 },
              }}
            />
            <Box sx={{ overflowX: "auto", opacity: isFetching ? 0.6 : 1 }}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Nhân viên</th>
                    <th>Giờ đăng ký</th>
                    <th>Giờ đã xác nhận</th>
                    <th>Đơn hoàn thành</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((employee, index) => (
                    <tr key={employee.userId}>
                      <td>{(safePage - 1) * limit + index + 1}</td>
                      <td>{employee.name}</td>
                      <td>{duration(employee.registeredMinutes)}</td>
                      <td>{duration(employee.confirmedMinutes)}</td>
                      <td>{employee.completed}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center" }}>
                        Không có nhân sự phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 3 }}
            >
              <CustomTextField
                select
                size="small"
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50].map((value) => (
                  <MenuItem key={value} value={value}>
                    {value} dòng
                  </MenuItem>
                ))}
              </CustomTextField>
              <TablePaginationComponent
                total={employees.length}
                page={safePage}
                limit={limit}
                onPageChange={(_, index) => setPage(index + 1)}
              />
            </Stack>
          </Card>
        </>
      )}
    </Stack>
  );
}
