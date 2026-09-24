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
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";
import ConfirmDialog from "@components/ConfirmDialog";
import CustomTextField from "@core/components/mui/TextField";
import TablePaginationComponent from "@components/TablePaginationComponent";

const valueText = (value) => {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
};

const formatFriendlyDate = (val) => {
  if (!val) return "";
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      const secs = String(d.getSeconds()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }
  return str;
};

// Modal xem chi tiết JSON
const JsonPreviewModal = ({ open, jsonContent, title, onClose }) => {
  if (!open) return null;
  let formatted = "";
  try {
    const parsed =
      typeof jsonContent === "string" ? JSON.parse(jsonContent) : jsonContent;
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    formatted = String(jsonContent || "");
  }

  const copy = () => {
    navigator.clipboard.writeText(formatted);
    toast.success("Đã sao chép JSON vào clipboard");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: "rgba(0,186,209,0.12)",
              color: "info.main",
              width: 36,
              height: 36,
            }}
          >
            <i className="tabler-braces" />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {title || "Dữ liệu JSON"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Định dạng JSON có thụt lề
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <i className="tabler-x" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 2.5 }}>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            borderRadius: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "grey.900" : "grey.100",
            border: "1px solid",
            borderColor: "divider",
            fontFamily: "monospace",
            fontSize: "0.825rem",
            lineHeight: 1.6,
            overflow: "auto",
            maxHeight: "60vh",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {formatted}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          variant="tonal"
          startIcon={<i className="tabler-copy" />}
          onClick={copy}
        >
          Sao chép
        </Button>
        <Button variant="contained" onClick={onClose}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Modal xem chi tiết bản ghi kiểu MongoDB Compass
const DocumentViewerModal = ({ open, row, columns, table, onClose }) => {
  const [tab, setTab] = useState("table");
  if (!open || !row) return null;

  const jsonString = JSON.stringify(row, null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(jsonString);
    toast.success("Đã sao chép JSON vào clipboard");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: "rgba(115,103,240,0.12)",
              color: "primary.main",
              width: 36,
              height: 36,
            }}
          >
            <i className="tabler-file-database" />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Chi tiết bản ghi · {table}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Xem dạng danh sách trường hoặc JSON như MongoDB Compass
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant="tonal"
            startIcon={<i className="tabler-copy" />}
            onClick={copyJson}
          >
            Sao chép JSON
          </Button>
          <IconButton size="small" onClick={onClose}>
            <i className="tabler-x" />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <Box sx={{ px: 3, pt: 1, bgcolor: "action.hover" }}>
        <Tabs value={tab} onChange={(_, val) => setTab(val)}>
          <Tab
            value="table"
            label="Danh sách trường (Fields)"
            icon={<i className="tabler-layout-list" />}
            iconPosition="start"
          />
          <Tab
            value="json"
            label="JSON Document"
            icon={<i className="tabler-braces" />}
            iconPosition="start"
          />
        </Tabs>
      </Box>
      <DialogContent dividers sx={{ p: tab === "json" ? 2.5 : 0 }}>
        {tab === "json" ? (
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              borderRadius: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "grey.900" : "grey.100",
              border: "1px solid",
              borderColor: "divider",
              fontFamily: "monospace",
              fontSize: "0.825rem",
              lineHeight: 1.6,
              overflow: "auto",
              maxHeight: "65vh",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {jsonString}
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ width: "30%", fontWeight: 700 }}>
                  TÊN TRƯỜNG
                </TableCell>
                <TableCell sx={{ width: "22%", fontWeight: 700 }}>
                  KIỂU DỮ LIỆU
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>GIÁ TRỊ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {columns.map((col) => {
                const val = row[col.name];
                return (
                  <TableRow key={col.name} hover>
                    <TableCell
                      sx={{ fontFamily: "monospace", fontWeight: 600 }}
                    >
                      {col.label && col.label !== col.name && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {col.label}
                        </Typography>
                      )}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        {col.columnKey === "PRI" && (
                          <Tooltip title="Khóa chính (PK)">
                            <Box
                              component="span"
                              sx={{
                                color: "warning.main",
                                display: "inline-flex",
                              }}
                            >
                              <i
                                className="tabler-key"
                                style={{ fontSize: 14 }}
                              />
                            </Box>
                          </Tooltip>
                        )}
                        <span>{col.name}</span>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={col.columnType}
                        sx={{
                          fontSize: "0.7rem",
                          height: 22,
                          fontFamily: "monospace",
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        wordBreak: "break-word",
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                      }}
                    >
                      {val === null ? (
                        <Chip
                          size="small"
                          label="null"
                          variant="tonal"
                          color="secondary"
                          sx={{
                            height: 20,
                            fontSize: "0.7rem",
                            fontFamily: "monospace",
                          }}
                        />
                      ) : typeof val === "object" ? (
                        JSON.stringify(val)
                      ) : (
                        String(val)
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="contained" onClick={onClose}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Modal chỉnh sửa / thêm dòng
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
  const [tableSearch, setTableSearch] = useState("");
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

  // States xem chi tiết
  const [documentDetail, setDocumentDetail] = useState(null);
  const [jsonPreview, setJsonPreview] = useState(null);

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

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables;
    const q = tableSearch.toLowerCase().trim();
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q),
    );
  }, [tables, tableSearch]);

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

  // Tính số trang và khoảng hiển thị
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pageCount = Math.ceil(total / limit) || 1;

  // Render từng cell trong bảng
  const renderCellContent = (row, column) => {
    const val = row[column.name];
    if (val === null || val === undefined) {
      return (
        <Chip
          size="small"
          label="null"
          variant="tonal"
          color="secondary"
          sx={{
            height: 20,
            fontSize: "0.725rem",
            fontFamily: "monospace",
            opacity: 0.75,
          }}
        />
      );
    }

    const isJson =
      column.dataType === "json" ||
      (typeof val === "string" &&
        (val.trim().startsWith("{") || val.trim().startsWith("[")));

    if (isJson) {
      const text = typeof val === "string" ? val : JSON.stringify(val);
      return (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setJsonPreview({
              content: text,
              title: `${column.label || column.name} (${column.name})`,
            });
          }}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
            p: "2px 8px",
            borderRadius: 1,
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            maxWidth: "100%",
            transition: "all 0.15s",
            "&:hover": {
              borderColor: "info.main",
              bgcolor: "rgba(0,186,209,0.08)",
            },
          }}
        >
          <Chip
            size="small"
            variant="filled"
            color="info"
            label="{ } JSON"
            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
          />
          <Typography
            variant="body2"
            fontFamily="monospace"
            sx={{
              fontSize: "0.8rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 240,
            }}
          >
            {text}
          </Typography>
        </Box>
      );
    }

    if (
      ["date", "datetime", "timestamp"].includes(column.dataType) ||
      (typeof val === "string" && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(val))
    ) {
      const friendly = formatFriendlyDate(val);
      return (
        <Tooltip title={`Giá trị gốc: ${val}`} arrow placement="top">
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              whiteSpace: "nowrap",
            }}
          >
            <i
              className="tabler-calendar-time"
              style={{ fontSize: 15, opacity: 0.55 }}
            />
            <Typography
              variant="body2"
              fontFamily="monospace"
              sx={{ fontSize: "0.8125rem", fontWeight: 500 }}
            >
              {friendly}
            </Typography>
          </Box>
        </Tooltip>
      );
    }

    if (
      column.dataType === "tinyint" &&
      (val === 0 ||
        val === 1 ||
        val === "0" ||
        val === "1" ||
        typeof val === "boolean")
    ) {
      const isTrue = val === 1 || val === "1" || val === true;
      return (
        <Chip
          size="small"
          variant="tonal"
          color={isTrue ? "success" : "secondary"}
          label={isTrue ? "true" : "false"}
          sx={{
            height: 20,
            fontSize: "0.725rem",
            fontWeight: 600,
            fontFamily: "monospace",
          }}
        />
      );
    }

    const text = valueText(val);
    return (
      <Typography
        variant="body2"
        fontFamily={
          column.columnKey === "PRI" ||
          ["int", "bigint"].includes(column.dataType)
            ? "monospace"
            : "inherit"
        }
        title={text}
        sx={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "0.85rem",
          maxWidth: 320,
        }}
      >
        {text || (
          <Typography component="span" variant="caption" color="text.disabled">
            (rỗng)
          </Typography>
        )}
      </Typography>
    );
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: "rgba(234,84,85,.12)",
                  color: "error.main",
                  width: 42,
                  height: 42,
                }}
              >
                <i className="tabler-database-edit" style={{ fontSize: 24 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Database Editor
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Database: <strong>{database || "đang kết nối…"}</strong> ·
                  Quản lý và kiểm tra dữ liệu trực quan
                </Typography>
              </Box>
            </Box>
          }
        />
      </Card>

      <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
        Thay đổi tại đây tác động trực tiếp lên dữ liệu production và có thể ảnh
        hưởng các chức năng đang chạy. Hãy kiểm tra khóa chính và quan hệ dữ
        liệu trước khi lưu.
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "280px minmax(0, 1fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        {/* SIDEBAR DANH SÁCH BẢNG */}
        <Card
          sx={{ maxHeight: { lg: "calc(100vh - 180px)" }, overflow: "hidden" }}
        >
          <Box sx={{ p: 2, pb: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1.5,
              }}
            >
              <Typography variant="overline" fontWeight={700}>
                Danh sách bảng ({tables.length})
              </Typography>
            </Box>
            <CustomTextField
              size="small"
              fullWidth
              placeholder="Lọc bảng…"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <i className="tabler-filter" style={{ fontSize: 16 }} />
                  </InputAdornment>
                ),
                endAdornment: tableSearch ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setTableSearch("")}>
                      <i className="tabler-x" style={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Box>
          <Divider />
          <List
            dense
            disablePadding
            sx={{
              maxHeight: { lg: "calc(100vh - 270px)" },
              overflowY: "auto",
            }}
          >
            {filteredTables.map((table) => (
              <ListItemButton
                key={table.name}
                selected={selectedTable === table.name}
                onClick={() => {
                  setSelectedTable(table.name);
                  setSearch("");
                  setTransactionFilter("all");
                  setPage(1);
                }}
                sx={{
                  py: 1,
                  px: 2,
                  "&.Mui-selected": {
                    bgcolor: "rgba(115,103,240,0.12) !important",
                    borderLeft: "3px solid",
                    borderColor: "primary.main",
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Typography
                        fontFamily="monospace"
                        fontSize={13}
                        fontWeight={
                          selectedTable === table.name ? 700 : "normal"
                        }
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {table.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={Number(table.total || 0).toLocaleString("vi-VN")}
                        variant={
                          selectedTable === table.name ? "filled" : "tonal"
                        }
                        color={
                          selectedTable === table.name ? "primary" : "secondary"
                        }
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          fontFamily: "monospace",
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        mt: 0.25,
                        fontSize: "0.725rem",
                      }}
                    >
                      {table.description}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
            {!filteredTables.length && (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Không tìm thấy bảng
                </Typography>
              </Box>
            )}
          </List>
        </Card>

        {/* NỘI DUNG BẢNG VÀ TOOLBAR */}
        <Card sx={{ minWidth: 0 }}>
          {/* HEADER BẢNG */}
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              display: "flex",
              gap: 2,
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              flexDirection: { xs: "column", sm: "row" },
              bgcolor: "action.hover",
            }}
          >
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography
                  variant="h6"
                  fontFamily="monospace"
                  fontWeight={700}
                >
                  {selectedTable || "Chọn bảng"}
                </Typography>
                <Chip
                  size="small"
                  color="primary"
                  variant="tonal"
                  label={`${total.toLocaleString("vi-VN")} dòng · ${columns.length} cột`}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {selectedTableInfo?.description ||
                  "Chọn một bảng để xem dữ liệu"}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
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
                Xóa dữ liệu
              </Button>
              <IconButton
                title="Tải lại"
                onClick={loadRows}
                sx={{ border: "1px solid", borderColor: "divider" }}
              >
                <i className="tabler-refresh" />
              </IconButton>
            </Box>
          </Box>

          <Divider />

          {/* TOOLBAR TÌM KIẾM VÀ PHÂN TRANG KIỂU MONGO COMPASS */}
          <Box
            sx={{
              p: 2,
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                flex: 1,
                minWidth: { xs: "100%", md: 350 },
                flexWrap: "wrap",
              }}
            >
              {/* TÌM KIẾM ĐA DẠNG HỖ TRỢ NGÀY THÁNG NĂM */}
              <CustomTextField
                size="small"
                placeholder="Tìm kiếm dữ liệu, ngày tháng năm (dd/mm/yyyy)..."
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
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearch("");
                          setPage(1);
                        }}
                      >
                        <i className="tabler-x" style={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ flex: 1, minWidth: { xs: "100%", sm: 260 } }}
              />

              {/* LỌC IMPORT / EXPORT DÀNH CHO ASSET_TRANSACTIONS */}
              {selectedTable === "asset_transactions" && (
                <CustomTextField
                  select
                  size="small"
                  label="Loại giao dịch"
                  value={transactionFilter}
                  onChange={(event) => {
                    setTransactionFilter(event.target.value);
                    setPage(1);
                  }}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="all">Tất cả giao dịch</MenuItem>
                  <MenuItem value="import">Nhập kho (import)</MenuItem>
                  <MenuItem value="export">Xuất kho (export)</MenuItem>
                </CustomTextField>
              )}
            </Box>

            {/* PHÂN TRANG VÀ CHỌN SỐ DÒNG TƯỜNG MINH KIỂU MONGO COMPASS */}
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {/* THANH ĐIỀU HƯỚNG TÀI LIỆU MONGO COMPASS */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "action.hover",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <i
                  className="tabler-file-database"
                  style={{
                    fontSize: 16,
                    color: "var(--mui-palette-primary-main)",
                  }}
                />
                <Typography
                  variant="body2"
                  fontWeight={600}
                  whiteSpace="nowrap"
                >
                  {total === 0
                    ? "0 bản ghi"
                    : `${from.toLocaleString("vi-VN")} – ${to.toLocaleString("vi-VN")} / ${total.toLocaleString("vi-VN")}`}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    ml: 0.5,
                    borderLeft: "1px solid",
                    borderColor: "divider",
                    pl: 0.5,
                  }}
                >
                  <IconButton
                    size="small"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    title="Trang trước"
                  >
                    <i className="tabler-chevron-left" />
                  </IconButton>
                  <Typography
                    variant="caption"
                    sx={{ px: 0.5, fontWeight: 700 }}
                  >
                    {page} / {pageCount}
                  </Typography>
                  <IconButton
                    size="small"
                    disabled={page >= pageCount || loading}
                    onClick={() => setPage((p) => p + 1)}
                    title="Trang sau"
                  >
                    <i className="tabler-chevron-right" />
                  </IconButton>
                </Box>
              </Box>

              {/* SELECTOR CHỌN SỐ DÒNG RÕ RÀNG */}
              <CustomTextField
                select
                size="small"
                label="Số dòng"
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                sx={{ minWidth: 145 }}
              >
                {[10, 25, 50, 100].map((value) => (
                  <MenuItem key={value} value={value}>
                    {value} dòng / trang
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>
          </Box>

          <Divider />

          {!editable && selectedTable && (
            <Alert severity="info" sx={{ m: 2, borderRadius: 1.5 }}>
              Bảng không có khóa chính nên chỉ hỗ trợ xem và thêm dòng, không
              thể sửa/xóa an toàn.
            </Alert>
          )}

          {/* BẢNG DỮ LIỆU HIỂN THỊ FULL KHÔNG CẦN THANH KÉO DỌC */}
          {loading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 12 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer
              sx={{
                width: "100%",
                overflowX: "auto",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    {columns.map((column) => {
                      const isPri = column.columnKey === "PRI";
                      const isDate = ["date", "datetime", "timestamp"].includes(
                        column.dataType,
                      );
                      const isJson = column.dataType === "json";
                      const isNum = [
                        "int",
                        "bigint",
                        "tinyint",
                        "smallint",
                        "decimal",
                        "float",
                        "double",
                      ].includes(column.dataType);

                      return (
                        <TableCell
                          key={column.name}
                          sx={{ py: 1.5, whiteSpace: "nowrap" }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                              mb: 0.25,
                            }}
                          >
                            {isPri ? (
                              <Tooltip title="Khóa chính (Primary Key)">
                                <Box
                                  component="span"
                                  sx={{
                                    display: "inline-flex",
                                    color: "warning.main",
                                  }}
                                >
                                  <i
                                    className="tabler-key"
                                    style={{ fontSize: 15 }}
                                  />
                                </Box>
                              </Tooltip>
                            ) : isDate ? (
                              <i
                                className="tabler-calendar"
                                style={{ fontSize: 14, opacity: 0.55 }}
                              />
                            ) : isJson ? (
                              <i
                                className="tabler-braces"
                                style={{
                                  fontSize: 14,
                                  color: "var(--mui-palette-info-main)",
                                }}
                              />
                            ) : isNum ? (
                              <i
                                className="tabler-hash"
                                style={{ fontSize: 14, opacity: 0.55 }}
                              />
                            ) : (
                              <i
                                className="tabler-letter-case"
                                style={{ fontSize: 14, opacity: 0.55 }}
                              />
                            )}
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              fontFamily="monospace"
                              fontSize={12}
                            >
                              {column.label || column.name}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              fontFamily="monospace"
                              fontSize={11}
                            >
                              {column.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={column.columnType}
                              variant="outlined"
                              color={isPri ? "warning" : "default"}
                              sx={{
                                height: 16,
                                fontSize: "0.625rem",
                                fontFamily: "monospace",
                                px: 0.25,
                              }}
                            />
                          </Box>
                        </TableCell>
                      );
                    })}
                    <TableCell
                      align="center"
                      sx={{
                        position: "sticky",
                        right: 0,
                        bgcolor: "background.paper",
                        boxShadow: "-3px 0 6px rgba(0,0,0,0.04)",
                        py: 1.5,
                        whiteSpace: "nowrap",
                        fontWeight: 700,
                      }}
                    >
                      THAO TÁC
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length ? (
                    rows.map((row) => (
                      <TableRow
                        key={rowKey(row)}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() => setDocumentDetail(row)}
                      >
                        {columns.map((column) => (
                          <TableCell key={column.name} sx={{ py: 1.25 }}>
                            {renderCellContent(row, column)}
                          </TableCell>
                        ))}
                        <TableCell
                          align="center"
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            position: "sticky",
                            right: 0,
                            bgcolor: "background.paper",
                            boxShadow: "-3px 0 6px rgba(0,0,0,0.04)",
                            py: 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Tooltip title="Xem chi tiết dòng (Document)">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => setDocumentDetail(row)}
                            >
                              <i className="tabler-eye" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Chỉnh sửa dòng">
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={!editable}
                              onClick={() => setEditor({ mode: "edit", row })}
                            >
                              <i className="tabler-edit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa dòng">
                            <IconButton
                              size="small"
                              color="error"
                              disabled={!editable}
                              onClick={() => setDeleteRow(row)}
                            >
                              <i className="tabler-trash" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} align="center">
                        <Box sx={{ py: 8, textAlign: "center" }}>
                          <i
                            className="tabler-database-search"
                            style={{
                              fontSize: 42,
                              color: "var(--mui-palette-text-disabled)",
                              marginBottom: 8,
                              display: "inline-block",
                            }}
                          />
                          <Typography
                            color="text.secondary"
                            fontWeight={500}
                            display="block"
                          >
                            Không có dữ liệu phù hợp
                          </Typography>
                          {search && (
                            <Typography variant="caption" color="text.disabled">
                              Thử thay đổi từ khóa hoặc định dạng tìm kiếm
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Divider />

          {/* FOOTER PHÂN TRANG */}
          <TablePaginationComponent
            page={page}
            total={total}
            limit={limit}
            onPageChange={(_, nextPage) => setPage(nextPage + 1)}
          />
        </Card>
      </Box>

      {/* MODAL XEM CHI TIẾT DOCUMENT KIỂU MONGO COMPASS */}
      <DocumentViewerModal
        open={Boolean(documentDetail)}
        row={documentDetail}
        columns={columns}
        table={selectedTable}
        onClose={() => setDocumentDetail(null)}
      />

      {/* MODAL XEM JSON RIÊNG KHI CLICK VÀO Ô JSON */}
      <JsonPreviewModal
        open={Boolean(jsonPreview)}
        jsonContent={jsonPreview?.content}
        title={jsonPreview?.title}
        onClose={() => setJsonPreview(null)}
      />

      {/* MODAL THÊM / SỬA DÒNG */}
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

      {/* CONFIRM DIALOG XÓA 1 DÒNG */}
      <ConfirmDialog
        open={Boolean(deleteRow)}
        title={`Xóa dòng khỏi ${selectedTable}`}
        message={`Dữ liệu sẽ bị xóa trực tiếp và có thể ảnh hưởng các bảng liên quan. Bạn chắc chắn muốn tiếp tục?`}
        confirmText="Xóa dữ liệu"
        onClose={() => setDeleteRow(null)}
        onConfirm={remove}
      />

      {/* MODAL XÓA DỮ LIỆU BẢNG HÀNG LOẠT */}
      <Dialog
        open={clearOpen}
        onClose={() => !clearing && setClearOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: "rgba(234,84,85,.12)",
              color: "error.main",
              width: 36,
              height: 36,
            }}
          >
            <i className="tabler-alert-triangle" />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Xóa dữ liệu · {selectedTable}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hành động này không thể hoàn tác
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {selectedTable === "asset_transactions" ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Chọn phạm vi dữ liệu cần xóa:
              </Typography>
              <RadioGroup
                value={clearScope}
                onChange={(e) => setClearScope(e.target.value)}
              >
                <FormControlLabel
                  value="import"
                  control={<Radio />}
                  label="Chỉ xóa dữ liệu Nhập kho (import)"
                />
                <FormControlLabel
                  value="export"
                  control={<Radio />}
                  label="Chỉ xóa dữ liệu Xuất kho (export)"
                />
                <FormControlLabel
                  value="all"
                  control={<Radio color="error" />}
                  label="Xóa tất cả giao dịch (import & export)"
                />
              </RadioGroup>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Bạn đang yêu cầu xóa toàn bộ dữ liệu trong bảng{" "}
              <strong>{selectedTable}</strong>.
            </Typography>
          )}
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
            Dữ liệu sẽ bị xóa hoàn toàn khỏi MySQL và không thể khôi phục.
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Nhập chính xác tên bảng <strong>{selectedTable}</strong> để xác
            nhận:
          </Typography>
          <CustomTextField
            fullWidth
            size="small"
            placeholder={selectedTable}
            value={clearConfirm}
            onChange={(e) => setClearConfirm(e.target.value.trim())}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            color="secondary"
            onClick={() => setClearOpen(false)}
            disabled={clearing}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={clearConfirm !== selectedTable || clearing}
            onClick={clearTable}
          >
            {clearing ? "Đang xóa…" : "Xác nhận xóa"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
