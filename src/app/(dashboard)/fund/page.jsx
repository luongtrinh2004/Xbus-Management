"use client";

import { useEffect, useMemo, useState } from "react";
import Grid from "@mui/material/Grid2";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CustomTextField from "@core/components/mui/TextField";
import MenuItem from "@mui/material/MenuItem";
import tableStyles from "@core/styles/table.module.css";
import { exportJsonToExcel } from "@/libs/excelHelper";
import CircularProgress from "@mui/material/CircularProgress";
import { resolveAvatar } from "@/utils/getDefaultAvatar";

const departmentLabels = {
  type_web_app: "Web/App",
  type_ap: "AP",
  type_peer_admin: "Peer Admin",
};

const categoryLabels = {
  category_official: "Chính thức",
  category_probation: "Thử việc",
  category_intern: "Thực tập",
  category_collaborator: "Cộng tác viên",
};

export default function FundPage() {
  const [selectedMonth, setSelectedMonth] = useState("09/2026");
  const [fund, setFund] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/funds"), fetch("/api/users?limit=200")])
      .then(async ([fundRes, usersRes]) => {
        setFund(await fundRes.json());
        setUsers((await usersRes.json()).data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const members = useMemo(
    () =>
      users.map((user) => {
        const payment = (fund?.members || []).find(
          (item) => item.userId === user.id,
        );
        return {
          ...user,
          paid: Boolean(payment?.paid),
          amount: payment?.amount || 0,
          paidAt: payment?.paidAt,
        };
      }),
    [users, fund],
  );
  const totalIncome = fund?.totalIncome || 0;
  const openingBalance = fund?.openingBalance || 0;
  const totalExpense = fund?.totalExpense || 0;
  const remainingBalance = fund?.balance || 0;

  const handleExportExcel = () => {
    const exportData = members.map((m) => ({
      "Mã nhân sự": m.code,
      "Họ và tên": m.name,
      "Bộ phận": m.type,
      "Hình thức": m.category,
      "Trạng thái": m.paid ? "Đã đóng" : "Chưa đóng",
      "Số tiền": m.amount,
      "Thời gian đóng": m.paidAt,
    }));
    exportJsonToExcel(
      exportData,
      `quy_phong_${selectedMonth.replace("/", "_")}.xlsx`,
    );
  };

  if (loading)
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
        <Typography color="text.secondary">Đang tải dữ liệu quỹ...</Typography>
      </Box>
    );

  return (
    <Grid container spacing={6}>
      {/* 4 Chỉ số Tổng quan */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Số Người Đã Đóng
            </Typography>
            <Typography variant="h5" fontWeight={600} sx={{ my: 0.5 }}>
              {fund?.paidCount || 0} / {members.length} người
            </Typography>
            <Chip
              size="small"
              label={`${members.length ? Math.round(((fund?.paidCount || 0) / members.length) * 100) : 0}% hoàn thành`}
              color="success"
              variant="tonal"
            />
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Tổng Quỹ Thu Tháng
            </Typography>
            <Typography
              variant="h5"
              fontWeight={600}
              color="primary.main"
              sx={{ my: 0.5 }}
            >
              {new Intl.NumberFormat("vi-VN").format(totalIncome)} đ
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Đầu kỳ: {new Intl.NumberFormat("vi-VN").format(openingBalance)} đ
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Tổng Khoản Đã Chi
            </Typography>
            <Typography
              variant="h5"
              fontWeight={600}
              color="error.main"
              sx={{ my: 0.5 }}
            >
              {new Intl.NumberFormat("vi-VN").format(totalExpense)} đ
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fund?.expenses?.length || 0} khoản chi trong tháng
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Quỹ Còn Lại
            </Typography>
            <Typography
              variant="h5"
              fontWeight={600}
              color="success.main"
              sx={{ my: 0.5 }}
            >
              {new Intl.NumberFormat("vi-VN").format(remainingBalance)} đ
            </Typography>
            <Chip
              size="small"
              label="Số dư an toàn"
              color="success"
              variant="tonal"
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Bảng Đóng Quỹ Tháng */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            sx={{
              alignItems: { xs: "flex-start", lg: "center" },
              flexDirection: { xs: "column", lg: "row" },
              gap: 2,
              "& .MuiCardHeader-action": {
                m: 0,
                width: { xs: "100%", lg: "auto" },
              },
            }}
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: "rgba(40, 199, 111, 0.12)",
                    color: "success.main",
                  }}
                >
                  <i className="tabler-wallet text-2xl" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    Danh Sách Đóng Quỹ
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bảng theo dõi đóng quỹ thành viên theo từng tháng
                  </Typography>
                </Box>
              </Box>
            }
            action={
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  maxWidth: { xs: "100%", sm: 500 },
                }}
              >
                <CustomTextField
                  select
                  size="small"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="09/2026">Tháng 09/2026</MenuItem>
                  <MenuItem value="10/2026">Tháng 10/2026</MenuItem>
                </CustomTextField>
                <Button
                  variant="tonal"
                  color="secondary"
                  startIcon={<i className="tabler-file-spreadsheet" />}
                  onClick={handleExportExcel}
                >
                  Xuất Excel
                </Button>
                <Button
                  variant="tonal"
                  color="primary"
                  startIcon={<i className="tabler-plus" />}
                >
                  Khoản chi
                </Button>
              </Box>
            }
          />
          <Divider />
          <TableContainer>
            <Table className={tableStyles.table}>
              <TableHead>
                <TableRow>
                  <TableCell>MÃ</TableCell>
                  <TableCell>NHÂN SỰ</TableCell>
                  <TableCell>BỘ PHẬN</TableCell>
                  <TableCell>HÌNH THỨC</TableCell>
                  <TableCell align="center">TRẠNG THÁI</TableCell>
                  <TableCell align="right">SỐ TIỀN</TableCell>
                  <TableCell>THỜI GIAN ĐÓNG</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.code} hover>
                    <TableCell>
                      <Typography fontWeight={500}>{member.code}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Avatar
                          src={resolveAvatar({
                            avatarUrl: member.avatarUrl,
                            role: member.role,
                            gender: member.gender,
                          })}
                          sx={{ width: 30, height: 30 }}
                        />
                        <Typography fontWeight={500}>{member.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={departmentLabels[member.typeId] || "Chưa gán"}
                        variant="tonal"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {categoryLabels[member.categoryId] || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={member.paid ? "Đã đóng" : "Chưa đóng"}
                        color={member.paid ? "success" : "secondary"}
                        variant="tonal"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight={600}
                        color={member.paid ? "text.primary" : "text.disabled"}
                      >
                        {new Intl.NumberFormat("vi-VN").format(member.amount)} đ
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {member.paidAt
                          ? new Date(member.paidAt).toLocaleString("vi-VN")
                          : "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>
    </Grid>
  );
}
