"use client";
import { actionLabel, targetLabels } from "@/libs/auditLabels";

import { useEffect, useState, useMemo, useCallback } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";
import CustomTextField from "@core/components/mui/TextField";
import CustomAvatar from "@core/components/mui/Avatar";
import { resolveAvatar } from "@/utils/getDefaultAvatar";
import { exportJsonToExcel } from "@/libs/excelHelper";
import tableStyles from "@core/styles/table.module.css";
import TablePaginationComponent from "@components/TablePaginationComponent";
import { formatVietnamDateTime } from "@/libs/dateTime";

const getActionColor = (action = "") => {
  if (action.startsWith("REQUEST_")) return "warning";
  if (
    action.includes("COMPLETE") ||
    action.includes("APPROVE") ||
    action === "PAYOS_FUND_PAYMENT"
  )
    return "success";
  if (
    action.includes("DELETE") ||
    action.includes("CANCEL") ||
    action.includes("REJECT")
  )
    return "error";
  if (action.includes("SCHEDULE") || action.includes("TRASH")) return "info";
  if (action.includes("ASSET")) return "warning";
  return "primary";
};

const roleLabel = (role) =>
  ({ admin: "Quản trị viên", assistant: "Trợ lý", user: "Nhân viên" })[role] ||
  "Nhân viên";

const formatTime = formatVietnamDateTime;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actor, setActor] = useState("");
  const [role, setRole] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [search, setSearch] = useState("");

  // Metadata options from API
  const [filterOptions, setFilterOptions] = useState({
    actors: [],
    actions: [],
    targetTypes: [],
  });

  const fetchLogs = useCallback(
    async (currentPage = page, currentLimit = limit) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(currentLimit),
        });
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (actor) params.append("actor", actor);
        if (role) params.append("role", role);
        if (action) params.append("action", action);
        if (targetType) params.append("targetType", targetType);
        if (search) params.append("search", search);

        const response = await fetch(`/api/audit-logs?${params.toString()}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        setLogs(result.logs || []);
        setTotal(result.pagination?.total || 0);
        if (result.filterOptions) {
          setFilterOptions(result.filterOptions);
        }
      } catch (error) {
        toast.error(error.message || "Không thể tải lịch sử hoạt động");
      } finally {
        setLoading(false);
      }
    },
    [page, limit, startDate, endDate, actor, role, action, targetType, search],
  );

  useEffect(() => {
    fetchLogs(page, limit);
  }, [fetchLogs, page, limit]);

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val && endDate && val > endDate) {
      setEndDate(val);
    }
    setPage(1);
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    if (val && startDate && val < startDate) {
      setStartDate(val);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setActor("");
    setRole("");
    setAction("");
    setTargetType("");
    setSearch("");
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        exportAll: "true",
      });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (actor) params.append("actor", actor);
      if (role) params.append("role", role);
      if (action) params.append("action", action);
      if (targetType) params.append("targetType", targetType);
      if (search) params.append("search", search);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const exportLogs = data.logs || [];
      if (!exportLogs.length) {
        toast.warn("Không có dữ liệu để xuất");
        return;
      }

      exportJsonToExcel(
        exportLogs.map((log) => ({
          "Thời gian": formatTime(log.timestamp || log.createdAt),
          "Người thực hiện": log.adminName,
          "Vai trò": roleLabel(log.actorRole),
          "Hành động": actionLabel(log.action),
          "Đối tượng": targetLabels[log.targetType] || log.targetType,
          "Chi tiết": log.details,
          "Địa chỉ IP": log.ip || "—",
        })),
        "lich_su_hoat_dong.xlsx",
      );
      toast.success(`Đã xuất ${exportLogs.length} dòng lịch sử hoạt động`);
    } catch (err) {
      toast.error(err.message || "Không thể xuất file Excel");
    } finally {
      setExporting(false);
    }
  };

  const actorOptions = useMemo(() => {
    return filterOptions.actors || [];
  }, [filterOptions.actors]);

  const isFiltered =
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(actor) ||
    Boolean(role) ||
    Boolean(action) ||
    Boolean(targetType) ||
    Boolean(search);

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
                Theo dõi đầy đủ thao tác quản trị và hoạt động của toàn thể nhân sự
              </Typography>
            </Box>
          </Box>
        }
        action={
          <Button
            variant="tonal"
            color="secondary"
            startIcon={
              exporting ? (
                <CircularProgress size={16} />
              ) : (
                <i className="tabler-file-spreadsheet" />
              )
            }
            disabled={exporting}
            onClick={handleExport}
          >
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </Button>
        }
      />

      <Divider />

      {/* Bộ Lọc (Filters) gọn gàng, độ ngang nhỏ gọn */}
      <CardContent sx={{ pb: 3, pt: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 2,
          }}
        >
          {/* THỜI GIAN: Từ ngày */}
          <CustomTextField
            size="small"
            type="date"
            label="Từ ngày"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: { xs: "100%", sm: 140 } }}
          />

          {/* THỜI GIAN: Đến ngày */}
          <CustomTextField
            size="small"
            type="date"
            label="Đến ngày"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: { xs: "100%", sm: 140 } }}
          />

          {/* NGƯỜI THỰC HIỆN: Search / Autocomplete có thể gõ tìm tên */}
          <Autocomplete
            size="small"
            freeSolo
            clearOnBlur={false}
            options={actorOptions}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option?.name || ""
            }
            isOptionEqualToValue={(option, val) =>
              (option?.name || option) === (val?.name || val)
            }
            value={
              actor
                ? actorOptions.find((o) => o.name === actor) || actor
                : null
            }
            onChange={(_, newValue) => {
              const val = typeof newValue === "string" ? newValue : newValue?.name || "";
              setActor(val);
              setPage(1);
            }}
            onInputChange={(_, newInputValue, reason) => {
              if (reason === "input") {
                setActor(newInputValue);
                setPage(1);
              } else if (reason === "clear") {
                setActor("");
                setPage(1);
              }
            }}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                size="small"
                label="Người thực hiện"
                placeholder="Tìm / điền tên..."
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.name}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    width: "100%",
                    py: 0.5,
                  }}
                >
                  <CustomAvatar
                    src={option.avatar || resolveAvatar({ role: option.role })}
                    size={28}
                    alt={option.name}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                    {option.name}
                  </Typography>
                  {option.role && (
                    <Chip
                      size="small"
                      label={roleLabel(option.role)}
                      color={
                        option.role === "admin"
                          ? "error"
                          : option.role === "assistant"
                            ? "warning"
                            : "primary"
                      }
                      variant="tonal"
                      sx={{ height: 20, fontSize: "0.6875rem", ml: 1 }}
                    />
                  )}
                </Box>
              </li>
            )}
            sx={{ width: { xs: "100%", sm: 220 } }}
          />

          {/* VAI TRÒ */}
          <CustomTextField
            select
            size="small"
            label="Vai trò"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            slotProps={{ select: { displayEmpty: true } }}
            sx={{ width: { xs: "100%", sm: 135 } }}
          >
            <MenuItem value="">Tất cả vai trò</MenuItem>
            <MenuItem value="admin">Quản trị viên</MenuItem>
            <MenuItem value="assistant">Trợ lý</MenuItem>
            <MenuItem value="user">Nhân viên</MenuItem>
          </CustomTextField>

          {/* ĐỐI TƯỢNG */}
          <CustomTextField
            select
            size="small"
            label="Đối tượng"
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setPage(1);
            }}
            slotProps={{ select: { displayEmpty: true } }}
            sx={{ width: { xs: "100%", sm: 160 } }}
          >
            <MenuItem value="">Tất cả đối tượng</MenuItem>
            {filterOptions.targetTypes.map((t) => (
              <MenuItem key={t} value={t}>
                {targetLabels[t] || t}
              </MenuItem>
            ))}
          </CustomTextField>

          {/* HÀNH ĐỘNG */}
          <CustomTextField
            select
            size="small"
            label="Hành động"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            slotProps={{ select: { displayEmpty: true } }}
            sx={{ width: { xs: "100%", sm: 215 } }}
          >
            <MenuItem value="">Tất cả hành động</MenuItem>
            {filterOptions.actions.map((act) => (
              <MenuItem key={act} value={act}>
                {actionLabel(act)}
              </MenuItem>
            ))}
          </CustomTextField>

          {/* TÌM KIẾM CHI TIẾT TỪ KHÓA */}
          <CustomTextField
            size="small"
            label="Từ khóa"
            placeholder="Tìm chi tiết, mã..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <i className="tabler-search text-base" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: { xs: "100%", sm: 200 } }}
          />

          {/* Cụm nút Đặt lại & Đếm kết quả */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}>
            {isFiltered && (
              <Button
                variant="tonal"
                color="secondary"
                size="small"
                startIcon={<i className="tabler-rotate-clockwise" />}
                onClick={handleResetFilters}
                sx={{ height: 38 }}
              >
                Đặt lại
              </Button>
            )}
            <Chip
              variant="tonal"
              color="primary"
              label={`Tìm thấy: ${total} hoạt động`}
              sx={{ fontWeight: 600, height: 38, px: 1 }}
            />
          </Box>
        </Box>
      </CardContent>

      <Divider />

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={12} gap={2}>
          <CircularProgress size={32} />
          <Typography color="text.secondary">Đang tải lịch sử hoạt động...</Typography>
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
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                        {formatTime(log.timestamp || log.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <CustomAvatar
                          src={
                            log.actorAvatar ||
                            resolveAvatar({
                              role: log.actorRole,
                              avatarUrl: log.adminAvatarUrl,
                              gender: log.adminGender,
                            })
                          }
                          size={34}
                          alt={log.adminName}
                        />
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {log.adminName}
                        </Typography>
                      </Box>
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
                              : "primary"
                        }
                        variant="tonal"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={actionLabel(log.action)}
                        color={getActionColor(log.action)}
                        variant="tonal"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
                        {targetLabels[log.targetType] || log.targetType || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Tooltip title="Nhấn để xem chi tiết đầy đủ" arrow>
                        <Typography
                          variant="body2"
                          noWrap
                          onClick={() => setSelectedLog(log)}
                          sx={{
                            cursor: "pointer",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            "&:hover": { color: "primary.main", textDecoration: "underline" },
                          }}
                        >
                          {log.details || "—"}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box py={8} display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <i className="tabler-clipboard-x text-4xl text-secondary" style={{ opacity: 0.5 }} />
                      <Typography variant="body1" fontWeight={600} color="text.secondary">
                        Không tìm thấy hoạt động nào phù hợp
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Hãy thử điều chỉnh hoặc xóa các điều kiện lọc thời gian, vai trò, hành động
                      </Typography>
                      {isFiltered && (
                        <Button
                          size="small"
                          variant="tonal"
                          color="primary"
                          sx={{ mt: 1 }}
                          onClick={handleResetFilters}
                        >
                          Đặt lại bộ lọc
                        </Button>
                      )}
                    </Box>
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
          limit={limit}
          onPageChange={(_, newPage) => setPage(newPage + 1)}
        />
      )}

      {/* Modal xem chi tiết nhật ký */}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <i className="tabler-file-description text-xl text-primary" />
          Chi tiết hoạt động
        </DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Thời gian:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatTime(selectedLog.timestamp || selectedLog.createdAt)}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Người thực hiện:
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CustomAvatar
                    src={
                      selectedLog.actorAvatar ||
                      resolveAvatar({
                        role: selectedLog.actorRole,
                        avatarUrl: selectedLog.adminAvatarUrl,
                        gender: selectedLog.adminGender,
                      })
                    }
                    size={28}
                    alt={selectedLog.adminName}
                  />
                  <Typography variant="body2" fontWeight={600}>
                    {selectedLog.adminName}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Vai trò:
                </Typography>
                <Chip
                  size="small"
                  label={roleLabel(selectedLog.actorRole)}
                  color={
                    selectedLog.actorRole === "admin"
                      ? "error"
                      : selectedLog.actorRole === "assistant"
                        ? "warning"
                        : "primary"
                  }
                  variant="tonal"
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Hành động:
                </Typography>
                <Chip
                  size="small"
                  label={actionLabel(selectedLog.action)}
                  color={getActionColor(selectedLog.action)}
                  variant="tonal"
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Đối tượng tác động:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {targetLabels[selectedLog.targetType] || selectedLog.targetType || "—"}
                </Typography>
              </Box>

              {selectedLog.ip && (
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary">
                    Địa chỉ IP:
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                    {selectedLog.ip}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 0.5 }} />

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                  Nội dung chi tiết:
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                    maxHeight: 240,
                    overflowY: "auto",
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.6 }}>
                    {selectedLog.details || "Không có chi tiết bổ sung"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="tonal" color="secondary" onClick={() => setSelectedLog(null)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
