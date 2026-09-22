"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";
import ConfirmDialog from "@components/ConfirmDialog";
import CustomTextField from "@core/components/mui/TextField";
import TablePaginationComponent from "@components/TablePaginationComponent";

const valueText = (value) => {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
};

const RowEditor = ({ open, mode, row, columns, onClose, onSaved, table }) => {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(
      Object.fromEntries(
        columns
          .filter(
            (column) => mode === "edit" || column.extra !== "auto_increment",
          )
          .map((column) => [
            column.name,
            mode === "edit"
              ? valueText(row?.[column.name])
              : valueText(column.defaultValue),
          ]),
      ),
    );
  }, [columns, mode, open, row]);

  const submit = async () => {
    setSaving(true);
    try {
      const primaryKeys = columns.filter(
        (column) => column.columnKey === "PRI",
      );
      const key = Object.fromEntries(
        primaryKeys.map((column) => [column.name, row?.[column.name]]),
      );
      const response = await fetch("/api/database-editor", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, key, values }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(
        mode === "edit" ? "Đã cập nhật dòng dữ liệu" : "Đã thêm dòng dữ liệu",
      );
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error.message || "Không thể lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {mode === "edit" ? "Chỉnh sửa" : "Thêm dòng"} · {table}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2.5,
            pt: 1,
          }}
        >
          {columns
            .filter(
              (column) => mode === "edit" || column.extra !== "auto_increment",
            )
            .map((column) => {
              const multiline = [
                "text",
                "longtext",
                "mediumtext",
                "json",
              ].includes(column.dataType);
              return (
                <CustomTextField
                  key={column.name}
                  label={`${column.label || column.name} (${column.name}) · ${column.columnType}`}
                  value={values[column.name] ?? ""}
                  disabled={mode === "edit" && column.columnKey === "PRI"}
                  multiline={multiline}
                  minRows={multiline ? 3 : undefined}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [column.name]: event.target.value,
                    }))
                  }
                  helperText={
                    column.isNullable === "YES"
                      ? "Để trống sẽ lưu NULL"
                      : column.columnKey === "PRI"
                        ? "Khóa chính"
                        : "Bắt buộc"
                  }
                  sx={multiline ? { gridColumn: { md: "1 / -1" } } : undefined}
                />
              );
            })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="secondary" onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu dữ liệu"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function DatabaseEditorPage() {
  const [database, setDatabase] = useState("");
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [editable, setEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [editor, setEditor] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearScope, setClearScope] = useState("all");
  const [clearConfirm, setClearConfirm] = useState("");
  const [clearing, setClearing] = useState(false);

  const loadTables = useCallback(async () => {
    const response = await fetch("/api/database-editor");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setDatabase(result.database || "");
    setTables(result.tables || []);
    setSelectedTable((current) => current || result.tables?.[0]?.name || "");
  }, []);

  const loadRows = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        table: selectedTable,
        page: String(page),
        limit: String(limit),
        search,
      });
      if (
        selectedTable === "asset_transactions" &&
        transactionFilter !== "all"
      ) {
        params.set("transactionType", transactionFilter);
      }
      const response = await fetch(`/api/database-editor?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setColumns(result.columns || []);
      setRows(result.rows || []);
      setEditable(Boolean(result.editable));
      setTotal(result.pagination?.total || 0);
    } catch (error) {
      toast.error(error.message || "Không thể tải dữ liệu bảng");
    } finally {
      setLoading(false);
    }
  }, [limit, page, search, selectedTable, transactionFilter]);

  useEffect(() => {
    loadTables().catch((error) => {
      toast.error(error.message || "Không thể tải danh sách bảng");
      setLoading(false);
    });
  }, [loadTables]);

  useEffect(() => {
    const timeout = setTimeout(loadRows, 300);
    return () => clearTimeout(timeout);
  }, [loadRows]);

  const primaryKeys = useMemo(
    () => columns.filter((column) => column.columnKey === "PRI"),
    [columns],
  );
  const rowKey = (row) =>
    primaryKeys
      .map((column) => `${column.name}:${row[column.name]}`)
      .join("|") || JSON.stringify(row);
  const selectedTableInfo = tables.find(
    (table) => table.name === selectedTable,
  );

  const remove = async () => {
    if (!deleteRow) return;
    try {
      const key = Object.fromEntries(
        primaryKeys.map((column) => [column.name, deleteRow[column.name]]),
      );
      const response = await fetch("/api/database-editor", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: selectedTable, key }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("Đã xóa dòng dữ liệu");
      setDeleteRow(null);
      await Promise.all([loadRows(), loadTables()]);
    } catch (error) {
      toast.error(error.message || "Không thể xóa dữ liệu");
    }
  };

  const clearTable = async () => {
    if (!selectedTable || clearConfirm !== selectedTable) return;
    setClearing(true);
    try {
      const scope = selectedTable === "asset_transactions" ? clearScope : "all";
      const response = await fetch("/api/database-editor", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: selectedTable,
          clearAll: true,
          scope,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const scopeLabel =
        selectedTable === "asset_transactions"
          ? scope === "import"
            ? " (dữ liệu nhập kho)"
            : scope === "export"
              ? " (dữ liệu xuất kho)"
              : " (tất cả dữ liệu)"
          : "";
      toast.success(
        `Đã xóa ${Number(result.deleted || 0).toLocaleString("vi-VN")} dòng${scopeLabel} khỏi ${selectedTable}`,
      );
      setClearOpen(false);
      setClearConfirm("");
      setPage(1);
      await Promise.all([loadRows(), loadTables()]);
    } catch (error) {
      toast.error(
        error.message ||
          "Không thể xóa dữ liệu; hãy kiểm tra các bảng đang tham chiếu",
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar variant="rounded" color="error">
                <i className="tabler-database-edit" />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Database Editor
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Database: {database || "đang tải…"} · Chỉ dành cho quản trị
                  viên
                </Typography>
              </Box>
            </Box>
          }
        />
      </Card>
      <Alert severity="warning">
        Thay đổi tại đây tác động trực tiếp lên dữ liệu production và có thể ảnh
        hưởng các chức năng đang chạy. Hãy kiểm tra khóa chính và quan hệ dữ
        liệu trước khi lưu.
      </Alert>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "260px minmax(0, 1fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Card
          sx={{ maxHeight: { lg: "calc(100vh - 220px)" }, overflow: "auto" }}
        >
          <Box sx={{ p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">
              Tables ({tables.length})
            </Typography>
          </Box>
          <Divider />
          <List dense disablePadding>
            {tables.map((table) => (
              <ListItemButton
                key={table.name}
                selected={selectedTable === table.name}
                onClick={() => {
                  setSelectedTable(table.name);
                  setSearch("");
                  setTransactionFilter("all");
                  setPage(1);
                }}
              >
                <ListItemText
                  primary={table.name}
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="caption"
                        display="block"
                      >
                        {table.total.toLocaleString("vi-VN")} dòng
                      </Typography>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.disabled"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {table.description}
                      </Typography>
                    </>
                  }
                  primaryTypographyProps={{
                    fontFamily: "monospace",
                    fontSize: 13,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Card>
        <Card sx={{ minWidth: 0 }}>
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              display: "flex",
              gap: 2,
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Box>
              <Typography variant="h6" fontFamily="monospace">
                {selectedTable || "Chọn bảng"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {total.toLocaleString("vi-VN")} dòng · {columns.length} cột
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {selectedTableInfo?.description ||
                  "Chọn một bảng để xem dữ liệu"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <CustomTextField
                size="small"
                placeholder="Tìm trong bảng…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <i className="tabler-search" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: "100%", sm: 260 } }}
              />
              {selectedTable === "asset_transactions" && (
                <CustomTextField
                  select
                  size="small"
                  value={transactionFilter}
                  onChange={(event) => {
                    setTransactionFilter(event.target.value);
                    setPage(1);
                  }}
                  sx={{ width: { xs: "100%", sm: 180 } }}
                >
                  <MenuItem value="all">Tất cả giao dịch</MenuItem>
                  <MenuItem value="import">Nhập kho (import)</MenuItem>
                  <MenuItem value="export">Xuất kho (export)</MenuItem>
                </CustomTextField>
              )}
              <CustomTextField
                select
                size="small"
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                sx={{ width: 90 }}
              >
                {[10, 25, 50, 100].map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </CustomTextField>
              <Button
                variant="contained"
                startIcon={<i className="tabler-plus" />}
                disabled={!selectedTable}
                onClick={() => setEditor({ mode: "create", row: null })}
              >
                Thêm dòng
              </Button>
              <Button
                variant="tonal"
                color="error"
                startIcon={<i className="tabler-trash-x" />}
                disabled={!selectedTable || total === 0}
                onClick={() => {
                  setClearScope("all");
                  setClearConfirm("");
                  setClearOpen(true);
                }}
              >
                Xóa
              </Button>
              <IconButton title="Tải lại" onClick={loadRows}>
                <i className="tabler-refresh" />
              </IconButton>
            </Box>
          </Box>
          <Divider />
          {!editable && selectedTable && (
            <Alert severity="info" sx={{ m: 2 }}>
              Bảng không có khóa chính nên chỉ hỗ trợ xem và thêm dòng, không
              thể sửa/xóa an toàn.
            </Alert>
          )}
          {loading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: "calc(100vh - 360px)" }}>
              <Table
                stickyHeader
                size="small"
                sx={{ minWidth: Math.max(720, columns.length * 170) }}
              >
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell key={column.name}>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          fontFamily="monospace"
                        >
                          {column.label || column.name}
                        </Typography>
                        <Typography
                          display="block"
                          variant="caption"
                          color="text.disabled"
                        >
                          {column.name} · {column.columnType}
                        </Typography>
                      </TableCell>
                    ))}
                    <TableCell
                      align="center"
                      sx={{
                        position: "sticky",
                        right: 0,
                        bgcolor: "background.paper",
                      }}
                    >
                      THAO TÁC
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length ? (
                    rows.map((row) => (
                      <TableRow key={rowKey(row)} hover>
                        {columns.map((column) => (
                          <TableCell key={column.name} sx={{ maxWidth: 260 }}>
                            {row[column.name] === null ? (
                              <Chip
                                size="small"
                                label="NULL"
                                variant="outlined"
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                fontFamily={
                                  ["json", "text", "longtext"].includes(
                                    column.dataType,
                                  )
                                    ? "inherit"
                                    : "monospace"
                                }
                                title={valueText(row[column.name])}
                                sx={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {valueText(row[column.name]) || "(rỗng)"}
                              </Typography>
                            )}
                          </TableCell>
                        ))}
                        <TableCell
                          align="center"
                          sx={{
                            position: "sticky",
                            right: 0,
                            bgcolor: "background.paper",
                          }}
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!editable}
                            onClick={() => setEditor({ mode: "edit", row })}
                          >
                            <i className="tabler-edit" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!editable}
                            onClick={() => setDeleteRow(row)}
                          >
                            <i className="tabler-trash" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} align="center">
                        <Typography color="text.secondary" py={6}>
                          Không có dữ liệu
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Divider />
          <TablePaginationComponent
            page={page}
            total={total}
            limit={limit}
            onPageChange={(_, nextPage) => setPage(nextPage + 1)}
          />
        </Card>
      </Box>
      <RowEditor
        open={Boolean(editor)}
        mode={editor?.mode || "create"}
        row={editor?.row}
        columns={columns}
        table={selectedTable}
        onClose={() => setEditor(null)}
        onSaved={async () => {
          await Promise.all([loadRows(), loadTables()]);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteRow)}
        title={`Xóa dòng khỏi ${selectedTable}`}
        message={`Dữ liệu sẽ bị xóa trực tiếp và có thể ảnh hưởng các bảng liên quan. Bạn chắc chắn muốn tiếp tục?`}
        confirmText="Xóa dữ liệu"
        onClose={() => setDeleteRow(null)}
        onConfirm={remove}
      />
      <Dialog
        open={clearOpen}
        onClose={() => !clearing && setClearOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle color="error.main">
          {selectedTable === "asset_transactions"
            ? "Xóa dữ liệu giao dịch kho"
            : "Xóa toàn bộ dữ liệu bảng"}
        </DialogTitle>
        <DialogContent dividers>
          {selectedTable === "asset_transactions" && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Chọn phạm vi dữ liệu cần xóa:
              </Typography>
              <RadioGroup
                value={clearScope}
                onChange={(event) => setClearScope(event.target.value)}
              >
                <FormControlLabel
                  value="import"
                  control={<Radio color="error" />}
                  label={
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Dữ liệu nhập kho (import)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Chỉ xóa các bản ghi lịch sử nhập kho hàng hóa
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: "flex-start" }}
                />
                <FormControlLabel
                  value="export"
                  control={<Radio color="error" />}
                  label={
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Dữ liệu xuất kho (export)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Chỉ xóa các bản ghi lịch sử xuất kho hàng hóa
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: "flex-start" }}
                />
                <FormControlLabel
                  value="all"
                  control={<Radio color="error" />}
                  label={
                    <Box sx={{ py: 0.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="error.main"
                      >
                        Tất cả dữ liệu (nhập và xuất)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Xóa toàn bộ giao dịch có trong bảng asset_transactions
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: "flex-start" }}
                />
              </RadioGroup>
              <Divider sx={{ my: 2 }} />
            </Box>
          )}
          <Alert severity="error" sx={{ mb: 3 }}>
            {selectedTable === "asset_transactions" ? (
              clearScope === "import" ? (
                <>
                  Thao tác này sẽ xóa vĩnh viễn tất cả các bản ghi{" "}
                  <strong>nhập kho (import)</strong> trong bảng{" "}
                  <strong>asset_transactions</strong>. Dữ liệu xuất kho và danh
                  mục sản phẩm không bị ảnh hưởng.
                </>
              ) : clearScope === "export" ? (
                <>
                  Thao tác này sẽ xóa vĩnh viễn tất cả các bản ghi{" "}
                  <strong>xuất kho (export)</strong> trong bảng{" "}
                  <strong>asset_transactions</strong>. Dữ liệu nhập kho và danh
                  mục sản phẩm không bị ảnh hưởng.
                </>
              ) : (
                <>
                  Thao tác này xóa vĩnh viễn{" "}
                  <strong>toàn bộ dữ liệu giao dịch</strong> trong bảng{" "}
                  <strong>asset_transactions</strong>. Cấu trúc bảng vẫn được
                  giữ nguyên.
                </>
              )
            ) : (
              <>
                Thao tác này xóa vĩnh viễn toàn bộ{" "}
                {total.toLocaleString("vi-VN")} dòng trong bảng{" "}
                <strong>{selectedTable}</strong>. Cấu trúc bảng vẫn được giữ
                nguyên.
              </>
            )}
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Nhập chính xác tên bảng <strong>{selectedTable}</strong> để xác
            nhận:
          </Typography>
          <CustomTextField
            fullWidth
            autoFocus
            value={clearConfirm}
            onChange={(event) => setClearConfirm(event.target.value)}
            placeholder={selectedTable}
            error={Boolean(clearConfirm) && clearConfirm !== selectedTable}
            helperText={
              clearConfirm && clearConfirm !== selectedTable
                ? "Tên bảng chưa chính xác"
                : "Không thể hoàn tác sau khi xóa"
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            color="secondary"
            disabled={clearing}
            onClick={() => setClearOpen(false)}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={clearing || clearConfirm !== selectedTable}
            onClick={clearTable}
          >
            {clearing
              ? "Đang xóa…"
              : selectedTable === "asset_transactions"
                ? clearScope === "import"
                  ? "Xóa dữ liệu nhập kho"
                  : clearScope === "export"
                    ? "Xóa dữ liệu xuất kho"
                    : "Xóa tất cả dữ liệu"
                : "Xóa toàn bộ dữ liệu"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
