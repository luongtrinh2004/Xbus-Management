"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import CustomTextField from "@core/components/mui/TextField";
import tableStyles from "@core/styles/table.module.css";
import ConfirmDialog from "@components/ConfirmDialog";
import DataTableToolbar from "@components/DataTableToolbar";
import TablePaginationComponent from "@components/TablePaginationComponent";
import { formatVietnamDate, toVietnamDateKey } from "@/libs/dateTime";

const emptyForm = {
  code: "",
  name: "",
  category: "",
  description: "",
  date: toVietnamDateKey(),
  quantity: 1,
  location: "",
  person: "",
  note: "",
};
const columns = {
  import: [
    "Ngày nhập",
    "Loại SP",
    "Mã sản phẩm",
    "Tên sản phẩm",
    "Mô tả sản phẩm",
    "Người nhập kho",
    "Số lượng",
    "Vị trí",
    "Ghi chú",
  ],
  export: [
    "Ngày xuất",
    "Loại SP",
    "Mã sản phẩm",
    "Tên sản phẩm",
    "Người mượn tài sản",
    "Số lượng",
    "Ghi chú",
  ],
  stock: [
    "Loại SP",
    "Mã SP",
    "Tên sản phẩm",
    "Tổng nhập",
    "Tổng xuất",
    "Tồn kho",
    "Vị trí",
  ],
  products: [
    "Mã sản phẩm",
    "Tên sản phẩm",
    "Tổng nhập",
    "Tổng xuất",
    "Tồn kho",
    "Vị trí",
  ],
};
const formatDate = formatVietnamDate;

const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();

const filterAssetOptions = (options, inputValue) => {
  const query = normalizeSearchText(inputValue);
  if (!query) return options.slice(0, 5);

  const queryWords = query.split(/\s+/).filter(Boolean);
  return options
    .map((item) => {
      const name = normalizeSearchText(item.name);
      const code = normalizeSearchText(item.code);
      const searchable = `${name} ${code}`;
      let score = Number.POSITIVE_INFINITY;

      if (name === query || code === query) score = 0;
      else if (name.startsWith(query) || code.startsWith(query)) score = 1;
      else if (name.includes(query) || code.includes(query)) score = 2;
      else if (queryWords.every((word) => searchable.includes(word))) score = 3;
      else if (queryWords.some((word) => searchable.includes(word))) score = 4;

      return { item, score };
    })
    .filter(({ score }) => Number.isFinite(score))
    .sort(
      (a, b) =>
        a.score - b.score || a.item.name.localeCompare(b.item.name, "vi"),
    )
    .slice(0, 5)
    .map(({ item }) => item);
};

function AssetTable({ rows, type, canManage, onEdit, onDelete }) {
  const editable = type !== "stock";

  return (
    <TableContainer>
      <Table className={tableStyles.table}>
        <TableHead>
          <TableRow>
            {columns[type].map((label) => (
              <TableCell key={label}>{label}</TableCell>
            ))}
            {editable && canManage && (
              <TableCell align="center">Thao tác</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={row.id || row.code} hover>
                {type === "import" ? (
                  <>
                    <TableCell>
                      {row.date ? formatDate(row.date) : "—"}
                    </TableCell>
                    <TableCell>{row.category || "—"}</TableCell>
                    <TableCell>
                      <Typography color="primary.main" fontWeight={600}>
                        {row.code || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell>{row.description || "—"}</TableCell>
                    <TableCell>{row.person || "—"}</TableCell>
                    <TableCell>{row.quantity ?? "—"}</TableCell>
                    <TableCell>{row.location || "—"}</TableCell>
                    <TableCell>{row.note || "—"}</TableCell>
                  </>
                ) : type === "export" ? (
                  <>
                    <TableCell>
                      {row.date ? formatDate(row.date) : "—"}
                    </TableCell>
                    <TableCell>{row.category || "—"}</TableCell>
                    <TableCell>
                      <Typography color="primary.main" fontWeight={600}>
                        {row.code || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell>{row.person || "—"}</TableCell>
                    <TableCell>{row.quantity ?? "—"}</TableCell>
                    <TableCell>{row.note || "—"}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{row.category || "—"}</TableCell>
                    <TableCell>
                      <Typography color="primary.main" fontWeight={600}>
                        {row.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.totalImport}</TableCell>
                    <TableCell>{row.totalExport}</TableCell>
                    <TableCell>
                      <Typography fontWeight={700}>{row.quantity}</Typography>
                    </TableCell>
                    <TableCell>{row.location || "—"}</TableCell>
                  </>
                )}
                {editable && canManage && (
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={0.5}>
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label={`Chỉnh sửa ${row.name}`}
                        onClick={() => onEdit(type, row)}
                      >
                        <i className="tabler-edit" />
                      </IconButton>
                      {type !== "products" && (
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Xóa ${row.name}`}
                          onClick={() => onDelete(type, row)}
                        >
                          <i className="tabler-trash" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns[type].length + (editable && canManage ? 1 : 0)}
                align="center"
              >
                <Typography color="text.secondary" py={5}>
                  Chưa có dữ liệu
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TransactionDialog({
  open,
  type,
  imports,
  exports,
  products,
  currentName,
  editingItem,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState([]);
  useEffect(() => {
    if (!open) return;
    fetch("/api/users?status=able&limit=500")
      .then((response) => response.json())
      .then((result) => setPeople(result.data || []))
      .catch(() => setPeople([]));
  }, [open]);
  useEffect(() => {
    if (open)
      setForm(
        editingItem
          ? { ...emptyForm, ...editingItem }
          : { ...emptyForm, person: currentName || "" },
      );
  }, [open, currentName, editingItem]);
  const selectProduct = (code) => {
    const item = products.find((entry) => entry.code === code);
    setForm((value) => ({
      ...value,
      code,
      name: item?.name || "",
      category: item?.unit || "",
      description: item?.description || "",
      location: item?.location || "",
    }));
  };
  const assetOptions = products.filter((item) => item.active);
  const selectedStock = form.code
    ? imports
        .filter((item) => item.code === form.code)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0) -
      exports
        .filter((item) => item.code === form.code)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : 0;
  const availableForExport =
    selectedStock +
    (type === "export" && editingItem?.code === form.code
      ? Number(editingItem.quantity || 0)
      : 0);
  const quantity = Number(form.quantity);
  const quantityError =
    type === "export" && Boolean(form.code) && quantity > availableForExport;
  const submit = async () => {
    if (quantityError) return;
    setSaving(true);
    try {
      const response = await fetch("/api/assets", {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editingItem?.id, type }),
      });
      const result = await response.json();
      if (!response.ok)
        return toast.error(result.error || "Không thể lưu giao dịch");
      toast.success(
        editingItem
          ? "Đã cập nhật giao dịch tài sản"
          : type === "import"
            ? "Đã ghi nhận nhập tài sản"
            : "Đã ghi nhận xuất tài sản",
      );
      onSaved();
      onClose();
    } catch {
      toast.error("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {editingItem
          ? `Chỉnh sửa phiếu ${type === "import" ? "nhập" : "xuất"}`
          : type === "import"
            ? "Nhập tài sản"
            : "Xuất tài sản"}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 3,
            pt: 1,
          }}
        >
          {type === "export" ? (
            <Autocomplete
              options={assetOptions}
              value={
                assetOptions.find((item) => item.code === form.code) || null
              }
              onChange={(_, item) => selectProduct(item?.code || "")}
              getOptionLabel={(item) => `${item.code} — ${item.name}`}
              isOptionEqualToValue={(option, value) =>
                option.code === value.code
              }
              filterOptions={(options, state) => {
                const query = state.inputValue.trim().toLowerCase();
                return options.filter((item) =>
                  `${item.code} ${item.name}`.toLowerCase().includes(query),
                );
              }}
              noOptionsText="Không tìm thấy tài sản phù hợp"
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  label="Tìm tài sản *"
                  placeholder="Nhập mã hoặc tên tài sản"
                />
              )}
            />
          ) : (
            <Autocomplete
              options={assetOptions}
              value={
                assetOptions.find((item) => item.code === form.code) || null
              }
              onChange={(_, item) => selectProduct(item?.code || "")}
              getOptionLabel={(item) => `${item.code} — ${item.name}`}
              isOptionEqualToValue={(option, value) =>
                option.code === value?.code
              }
              filterOptions={(options, state) =>
                filterAssetOptions(options, state.inputValue)
              }
              noOptionsText="Không tìm thấy tài sản tương tự"
              renderOption={(props, item) => {
                const { key, ...optionProps } = props;

                return (
                  <Box component="li" key={key} {...optionProps}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.code} · {item.location}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  label="Chọn sản phẩm *"
                  placeholder="Tìm mã/tên; chưa có thì thêm sản phẩm trước"
                />
              )}
            />
          )}
          <CustomTextField label="Đơn vị tính" value={form.category} disabled />
          <CustomTextField
            label="Mô tả sản phẩm"
            value={form.description}
            disabled
          />
          <CustomTextField
            type="date"
            label={type === "import" ? "Ngày nhập *" : "Ngày xuất *"}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <CustomTextField
            type="number"
            label="Số lượng *"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            error={quantityError}
            helperText={
              type === "export" && form.code
                ? quantityError
                  ? `Số lượng vượt quá tồn kho (${availableForExport})`
                  : `Có thể xuất tối đa ${availableForExport}`
                : ""
            }
            inputProps={{
              min: 1,
              ...(type === "export" ? { max: availableForExport } : {}),
            }}
          />
          <CustomTextField label="Vị trí *" value={form.location} disabled />
          <Autocomplete
            freeSolo
            options={people}
            inputValue={form.person}
            onInputChange={(_, value) => setForm({ ...form, person: value })}
            onChange={(_, person) => {
              if (person && typeof person !== "string")
                setForm({ ...form, person: person.name });
            }}
            getOptionLabel={(person) =>
              typeof person === "string" ? person : person.name || ""
            }
            renderOption={(props, person) => (
              <Box component="li" {...props} key={person.id}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {person.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {person.code || "—"} · {person.email || "—"}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                label={type === "import" ? "Người nhận *" : "Người nhận *"}
                placeholder="Gõ tên hoặc chọn nhân sự"
              />
            )}
          />
          <CustomTextField
            sx={{ gridColumn: { sm: "1 / -1" } }}
            multiline
            minRows={3}
            label="Ghi chú"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="secondary" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button
          variant="contained"
          disabled={
            saving ||
            quantityError ||
            !Number.isInteger(quantity) ||
            quantity <= 0
          }
          onClick={submit}
        >
          {saving
            ? "Đang lưu..."
            : editingItem
              ? "Lưu thay đổi"
              : type === "import"
                ? "Xác nhận nhập"
                : "Xác nhận xuất"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ProductDialog({ open, product, onClose, onSaved }) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    unit: "Cái",
    description: "",
    location: "",
    active: true,
  });
  useEffect(() => {
    if (open)
      setForm(
        product || {
          code: "",
          name: "",
          unit: "Cái",
          description: "",
          location: "",
          active: true,
        },
      );
  }, [open, product]);
  const save = async () => {
    const response = await fetch("/api/asset-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok)
      return toast.error(result.error || "Không thể lưu sản phẩm");
    toast.success(product ? "Đã cập nhật sản phẩm" : "Đã tạo sản phẩm");
    onSaved();
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 3,
            pt: 1,
          }}
        >
          <CustomTextField
            label="Mã sản phẩm *"
            value={form.code}
            disabled={Boolean(product)}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <CustomTextField
            label="Tên sản phẩm *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <CustomTextField
            label="Đơn vị tính *"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <CustomTextField
            label="Vị trí"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <CustomTextField
            sx={{ gridColumn: { sm: "1 / -1" } }}
            label="Mô tả"
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{" "}
            Đang hoạt động
          </label>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button
          variant="contained"
          disabled={!form.code.trim() || !form.name.trim() || !form.unit.trim()}
          onClick={save}
        >
          Lưu sản phẩm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AssetsPage() {
  const { data: session, status } = useSession();
  const canManage = ["admin", "assistant"].includes(session?.user?.role);
  const [data, setData] = useState({ imports: [], exports: [], products: [] });
  const [tab, setTab] = useState("import");
  const [dialog, setDialog] = useState(null);
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [excelWarningOpen, setExcelWarningOpen] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const excelInputRef = useRef(null);
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/assets");
      const result = await response.json();
      if (response.ok) setData(result);
      else toast.error(result.error);
    } finally {
      setLoading(false);
    }
  };
  const deleteTransaction = async (type, item) => {
    try {
      const response = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id: item.id }),
      });
      const result = await response.json();
      if (!response.ok)
        return toast.error(result.error || "Không thể xóa phiếu tài sản");
      toast.success("Đã xóa phiếu tài sản");
      setDeleteTarget(null);
      await loadData();
    } catch {
      toast.error("Không thể kết nối máy chủ");
    }
  };
  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [status]);
  const stock = useMemo(() => {
    const rows = new Map();
    data.imports.forEach((item) => {
      if (!item.code || item.quantity === null || item.quantity === undefined)
        return;
      const current = rows.get(item.code);
      rows.set(
        item.code,
        current
          ? {
              ...current,
              totalImport: current.totalImport + Number(item.quantity),
              quantity: current.quantity + Number(item.quantity),
            }
          : { ...item, totalImport: Number(item.quantity), totalExport: 0 },
      );
    });
    data.exports.forEach((item) => {
      if (!item.code || item.quantity === null || item.quantity === undefined)
        return;
      const current = rows.get(item.code) || {
        ...item,
        totalImport: 0,
        totalExport: 0,
        quantity: 0,
      };
      rows.set(item.code, {
        ...current,
        totalExport: current.totalExport + Number(item.quantity),
        quantity: current.quantity - Number(item.quantity),
      });
    });
    return [...rows.values()];
  }, [data]);
  const products = useMemo(
    () =>
      (data.products || []).map((item) => ({
        ...item,
        quantity:
          stock.find((entry) => entry.code === item.code)?.quantity || 0,
        totalImport: data.imports
          .filter((entry) => entry.code === item.code)
          .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
        totalExport: data.exports
          .filter((entry) => entry.code === item.code)
          .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
      })),
    [data, stock],
  );
  const activeRows =
    tab === "import"
      ? data.imports
      : tab === "export"
        ? data.exports
        : tab === "products"
          ? products
          : stock;
  const filteredRows = useMemo(
    () =>
      activeRows.filter((row) =>
        normalizeSearchText(
          `${row.code} ${row.name} ${row.location} ${row.person} ${row.note}`,
        ).includes(normalizeSearchText(search)),
      ),
    [activeRows, search],
  );
  const normalizeExcelDate = (value) => {
    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed)
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (match)
      return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    const shortMatch = text.match(/^(\d{1,2})[/-](\d{1,2})$/);
    return shortMatch
      ? `${new Date().getFullYear()}-${shortMatch[2].padStart(2, "0")}-${shortMatch[1].padStart(2, "0")}`
      : "";
  };
  const pick = (row, names) => {
    const key = Object.keys(row).find((item) =>
      names.includes(normalizeSearchText(item).replace(/\s+/g, "")),
    );
    return key ? row[key] : "";
  };
  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportingExcel(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: false,
      });
      const findSheet = (expected) => {
        const name = workbook.SheetNames.find(
          (item) => normalizeSearchText(item).replace(/\s+/g, "") === expected,
        );
        return name ? workbook.Sheets[name] : null;
      };
      const importSheet = findSheet("nhapkho");
      const exportSheet = findSheet("xuatkho");
      const stockSheet = findSheet("tonkho");
      if (!importSheet || !exportSheet || !stockSheet)
        throw new Error(
          "File phải có đủ 3 sheet: Nhập kho, Xuất kho và Tồn kho",
        );
      const mapRows = (sheet, type) =>
        XLSX.utils
          .sheet_to_json(sheet, { defval: "", raw: true })
          .filter((row) =>
            Object.values(row).some((value) => String(value || "").trim()),
          )
          .map((row) => ({
            code: pick(row, ["masanpham", "masp", "ma", "code"]),
            name: pick(row, ["tensanpham", "tensp", "ten", "name"]),
            category: pick(row, ["loaisp", "loaisanpham", "category"]),
            description: pick(row, ["motasanpham", "mota", "description"]),
            date: normalizeExcelDate(
              pick(row, [
                type === "import" ? "f" : "cot1",
                type === "import" ? "ngaynhap" : "ngayxuat",
                "ngay",
                "date",
              ]),
            ),
            quantity: Number(pick(row, ["soluong", "quantity"])),
            location: pick(row, ["vitri", "location"]),
            person: pick(row, [
              type === "import" ? "nguoinhapkho" : "nguoimuontaisan",
              type === "import" ? "nguoinhap" : "nguoixuat",
              "nguoithuchien",
              "person",
            ]),
            note: pick(row, ["ghichu", "note"]),
          }));
      const imports = mapRows(importSheet, "import");
      const exports = mapRows(exportSheet, "export");
      const response = await fetch("/api/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imports, exports }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setTab("products");
      toast.success(
        `Đã thêm ${result.summary?.added || 0} và cập nhật ${result.summary?.updated || 0} giao dịch từ Excel`,
      );
    } catch (error) {
      toast.error(error.message || "Không thể đọc file Excel");
    } finally {
      setImportingExcel(false);
    }
  };
  const exportCurrentList = () => {
    const workbook = XLSX.utils.book_new();
    const importRows = data.imports.map((item) => ({
      "Ngày nhập": item.date,
      "Loại SP": item.category || "",
      "Mã sản phẩm": item.code,
      "Tên sản phẩm": item.name,
      "Mô tả sản phẩm": item.description || "",
      "Người nhập kho": item.person,
      "Số lượng": item.quantity,
      "Vị trí": item.location,
      "Ghi chú": item.note || "",
    }));
    const exportRows = data.exports.map((item) => ({
      "Ngày xuất": item.date,
      "Loại SP": item.category || "",
      "Mã sản phẩm": item.code,
      "Tên sản phẩm": item.name,
      "Người mượn tài sản": item.person,
      "Số lượng": item.quantity,
      "Ghi chú": item.note || "",
    }));
    const stockRows = products.map((item) => ({
      "Loại SP": item.category || "",
      "Mã SP": item.code,
      "Tên sản phẩm": item.name,
      "Tổng số lượng nhập kho": item.totalImport,
      "Tổng số lượng xuất kho": item.totalExport,
      "Tồn kho": item.quantity,
      "Vị trí": item.location || "",
    }));
    const productRows = (data.products || []).map((item) => ({
      "Mã sản phẩm": item.code || "",
      "Tên sản phẩm": item.name || "",
      "Đơn vị tính": item.unit || "",
      "Mô tả": item.description || "",
      "Vị trí": item.location || "",
      "Trạng thái": item.active ? "Đang hoạt động" : "Ngừng sử dụng",
    }));
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(importRows),
      "Nhập kho",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(exportRows),
      "Xuất kho",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(stockRows),
      "Tồn kho",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(productRows),
      "Danh sách sản phẩm",
    );
    XLSX.writeFile(workbook, `danh_sach_tai_san_${toVietnamDateKey()}.xlsx`);
  };
  const pagedRows = filteredRows.slice((page - 1) * limit, page * limit);
  if (status === "loading" || loading)
    return (
      <Box display="flex" justifyContent="center" py={12}>
        <CircularProgress />
      </Box>
    );
  return (
    <Box>
      <Card sx={{ mb: 4 }}>
        <CardHeader
          sx={{ alignItems: "center", "& .MuiCardHeader-action": { m: 0 } }}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: "rgba(32,146,236,.12)", color: "primary.main" }}
              >
                <i className="tabler-package" />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Quản lý tài sản
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Theo dõi hoạt động nhập, xuất và số lượng tồn kho
                </Typography>
              </Box>
            </Box>
          }
          action={
            canManage ? (
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<i className="tabler-download" />}
                  onClick={exportCurrentList}
                >
                  Xuất danh sách hiện tại
                </Button>
                <Button
                  variant="tonal"
                  color="warning"
                  startIcon={<i className="tabler-file-upload" />}
                  disabled={importingExcel}
                  onClick={() => setExcelWarningOpen(true)}
                >
                  {importingExcel ? "Đang import…" : "Import Excel"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<i className="tabler-plus" />}
                  onClick={() => {
                    setEditingProduct(null);
                    setProductDialog(true);
                  }}
                >
                  Thêm sản phẩm
                </Button>
                <Button
                  variant="tonal"
                  startIcon={<i className="tabler-package-import" />}
                  onClick={() => {
                    setEditingItem(null);
                    setDialog("import");
                  }}
                >
                  Nhập tài sản
                </Button>
                <Button
                  variant="contained"
                  startIcon={<i className="tabler-package-export" />}
                  onClick={() => {
                    setEditingItem(null);
                    setDialog("export");
                  }}
                >
                  Xuất tài sản
                </Button>
              </Box>
            ) : null
          }
        />
      </Card>
      <Card>
        <DataTableToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          limit={limit}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          placeholder="Tìm mã, tên, vị trí, người thực hiện..."
        />
        <Divider />
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{ px: 5, mt: 2 }}
        >
          <Tab value="import" label={`Nhập kho (${data.imports.length})`} />
          <Tab value="export" label={`Xuất kho (${data.exports.length})`} />
          <Tab value="stock" label={`Tồn kho (${stock.length})`} />
          <Tab
            value="products"
            label={`Danh sách sản phẩm (${products.length})`}
          />
        </Tabs>
        <AssetTable
          type={tab}
          rows={pagedRows}
          canManage={canManage}
          onEdit={(type, item) => {
            if (type === "products") {
              setEditingProduct(item);
              setProductDialog(true);
            } else {
              setEditingItem(item);
              setDialog(type);
            }
          }}
          onDelete={(type, item) => setDeleteTarget({ type, item })}
        />
        <TablePaginationComponent
          page={page}
          total={filteredRows.length}
          limit={limit}
          onPageChange={(_, nextPage) => setPage(nextPage + 1)}
        />
        <Divider />
        <TransactionDialog
          open={Boolean(dialog)}
          type={dialog || "import"}
          imports={data.imports}
          exports={data.exports}
          products={data.products || []}
          editingItem={editingItem}
          currentName={session?.user?.name}
          onClose={() => {
            setDialog(null);
            setEditingItem(null);
          }}
          onSaved={loadData}
        />
        <ProductDialog
          open={productDialog}
          product={editingProduct}
          onClose={() => {
            setProductDialog(false);
            setEditingProduct(null);
          }}
          onSaved={loadData}
        />
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Xác nhận xóa phiếu tài sản"
          message={
            deleteTarget
              ? `Bạn có chắc muốn xóa phiếu ${deleteTarget.type === "import" ? "nhập" : "xuất"} ${deleteTarget.item.code}?`
              : ""
          }
          confirmText="Xóa phiếu"
          onClose={() => setDeleteTarget(null)}
          onConfirm={() =>
            deleteTransaction(deleteTarget.type, deleteTarget.item)
          }
        />
        <input
          ref={excelInputRef}
          hidden
          type="file"
          accept=".xlsx,.xls"
          onChange={importExcel}
        />
        <ConfirmDialog
          open={excelWarningOpen}
          title="Import dữ liệu tài sản từ Excel"
          message="File cần có đủ 3 sheet Nhập kho, Xuất kho và Tồn kho. Dòng trùng mã sản phẩm, ngày và người thực hiện sẽ được cập nhật toàn bộ theo file; dòng mới sẽ được thêm vào danh sách hiện tại."
          confirmText="Chọn file để import"
          confirmColor="warning"
          onClose={() => setExcelWarningOpen(false)}
          onConfirm={() => {
            setExcelWarningOpen(false);
            excelInputRef.current?.click();
          }}
        />
      </Card>
    </Box>
  );
}
