"use client";

import { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";
import { exportJsonToExcel } from "@/libs/excelHelper";
import tableStyles from "@core/styles/table.module.css";
import TablePaginationComponent from "@components/TablePaginationComponent";
import { formatVietnamDateTime } from "@/libs/dateTime";

const actionLabels = {
  CREATE_USER: "Thêm nhân sự",
  UPDATE_USER: "Cập nhật nhân sự",
  DELETE_USER: "Xóa nhân sự",
  UPDATE_PROFILE: "Cập nhật hồ sơ",
  UPDATE_SCHEDULE: "Cập nhật lịch",
  COMPLETE_SCHEDULE: "Hoàn thành lịch",
  IMPORT_ASSET: "Nhập tài sản",
  EXPORT_ASSET: "Xuất tài sản",
  UPDATE_ASSET_TRANSACTION: "Cập nhật giao dịch tài sản",
  DELETE_ASSET_TRANSACTION: "Xóa giao dịch tài sản",
  UPDATE_EXTRACURRICULAR_POINTS: "Cập nhật điểm rèn luyện",
  CANCEL_SCHEDULE: "Hủy lịch",
  DELETE_SCHEDULE: "Xóa lịch",
  ACTIVATE_USER: "Kích hoạt nhân sự",
  CREATE_TYPE: "Thêm bộ phận",
  CREATE_FUND_INCOME: "Thêm khoản thu",
  CREATE_FUND_EXPENSE: "Thêm khoản chi",
  UPDATE_FUND_TRANSACTION: "Cập nhật giao dịch quỹ",
  DELETE_FUND_TRANSACTION: "Xóa giao dịch quỹ",
  APPROVE_FUND_PAYMENT: "Duyệt đóng quỹ tháng",
  CANCEL_FUND_PAYMENT: "Hủy duyệt đóng quỹ tháng",
  PAYOS_FUND_PAYMENT: "Đóng quỹ trực tuyến",
  CANCEL_FUND_OBLIGATION: "Hủy nghĩa vụ đóng quỹ",
  RESTORE_FUND_OBLIGATION: "Khôi phục nghĩa vụ đóng quỹ",
  UPDATE_FUND_SETTINGS: "Cài đặt mức đóng quỹ",
};
const actionLabel = (action) =>
  actionLabels[action] || "Thao tác hệ thống chưa phân loại";
const targetLabels = {
  USER: "Nhân sự",
  water_schedules: "Lịch bê nước",
  TYPE: "Bộ phận",
  ASSET: "Tài sản",
  FUND: "Quỹ phòng",
  AFTERNOON_TEA: "Trà chiều",
};
const roleLabel = (role) =>
  ({ admin: "Quản trị viên", assistant: "Trợ lý", user: "Nhân viên" })[role] ||
  "Chưa xác định";
const formatTime = formatVietnamDateTime;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/audit-logs?limit=10&page=${page}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setLogs(result.logs || []);
        setTotal(result.pagination?.total || 0);
      })
      .catch((error) =>
        toast.error(error.message || "Không thể tải lịch sử hoạt động"),
      )
      .finally(() => setLoading(false));
  }, [page]);

  const handleExport = () =>
    exportJsonToExcel(
      logs.map((log) => ({
        "Thời gian": formatTime(log.timestamp || log.createdAt),
        "Người thực hiện": log.adminName,
        "Vai trò": roleLabel(log.actorRole),
        "Hành động": actionLabel(log.action),
        "Đối tượng": targetLabels[log.targetType] || log.targetType,
        "Chi tiết": log.details,
      })),
      "lich_su_hoat_dong.xlsx",
    );

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              variant="rounded"
              sx={{ bgcolor: "rgba(115,103,240,.12)", color: "primary.main" }}
            >
              <i className="tabler-history text-2xl" />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={600}>
                Lịch sử hoạt động
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Theo dõi thao tác quản lý và hoạt động đóng quỹ của thành viên
              </Typography>
            </Box>
          </Box>
        }
        action={
          <Button
            variant="tonal"
            color="secondary"
            startIcon={<i className="tabler-file-spreadsheet" />}
            onClick={handleExport}
          >
            Xuất Excel
          </Button>
        }
      />
      <Divider />
      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table className={tableStyles.table}>
            <TableHead>
              <TableRow>
                <TableCell>THỜI GIAN</TableCell>
                <TableCell>NGƯỜI THỰC HIỆN</TableCell>
                <TableCell>VAI TRÒ</TableCell>
                <TableCell>HÀNH ĐỘNG</TableCell>
                <TableCell>ĐỐI TƯỢNG</TableCell>
                <TableCell>CHI TIẾT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length ? (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="caption">
                        {formatTime(log.timestamp || log.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {log.adminName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={roleLabel(log.actorRole)}
                        color={
                          log.actorRole === "assistant"
                            ? "warning"
                            : log.actorRole === "admin"
                              ? "error"
                              : "secondary"
                        }
                        variant="tonal"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={actionLabel(log.action)}
                        color="primary"
                        variant="tonal"
                      />
                    </TableCell>
                    <TableCell>
                      {targetLabels[log.targetType] || log.targetType || "—"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        title={log.details || ""}
                        onClick={() => setSelectedLog(log)}
                        sx={{
                          cursor: "pointer",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {log.details || "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" py={5}>
                      Chưa có dữ liệu
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {!loading && (
        <TablePaginationComponent
          page={page}
          total={total}
          limit={10}
          onPageChange={(_, newPage) => setPage(newPage + 1)}
        />
      )}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Chi tiết hoạt động</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {selectedLog?.details}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLog(null)}> Đóng</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
