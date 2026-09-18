"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Autocomplete from "@mui/material/Autocomplete";
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
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
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
const makeImportLine = (currentName = "") => ({
  ...emptyForm,
  clientId: `asset_line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  person: currentName || "",
});
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
    "Mã SP",
    "Tên SP",
    "Loại sản phẩm",
    "Đơn vị tính",
    "Vị trí",
    "Tổng nhập",
    "Tổng xuất",
    "Tồn kho",
  ],
  products: [
    "Mã SP",
    "Tên SP",
    "Loại sản phẩm",
    "Đơn vị tính",
    "Vị trí",
    "Trạng thái",
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

function AssetTable({ rows, type, canManage, onView, onEdit, onDelete }) {
  const editable = type !== "stock";

  return (
    <TableContainer>
      <Table className={tableStyles.table}>
        <TableHead>
          <TableRow>
            {columns[type].map((label) => (
              <TableCell key={label}>{label}</TableCell>
            ))}
            {(type === "products" || (editable && canManage)) && (
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
                ) : type === "stock" ? (
                  <>
                    <TableCell>
                      <Typography color="primary.main" fontWeight={600}>
                        {row.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.categoryName || "—"}</TableCell>
                    <TableCell>{row.unit || "—"}</TableCell>
                    <TableCell>{row.location || "—"}</TableCell>
                    <TableCell>{row.totalImport}</TableCell>
                    <TableCell>{row.totalExport}</TableCell>
                    <TableCell>
                      <Typography fontWeight={700}>{row.quantity}</Typography>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <Typography color="primary.main" fontWeight={600}>
                        {row.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.categoryName || "—"}</TableCell>
                    <TableCell>{row.unit || "—"}</TableCell>
                    <TableCell>{row.location || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="tonal"
                        color={row.active ? "success" : "secondary"}
                        label={row.active ? "Hoạt động" : "Ngừng sử dụng"}
                      />
                    </TableCell>
                  </>
                )}
                {(type === "products" || (editable && canManage)) && (
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={0.5}>
                      {type === "products" && (
                        <IconButton
                          size="small"
                          color="info"
                          aria-label={`Xem ${row.name}`}
                          onClick={() => onView(row)}
                        >
                          <i className="tabler-eye" />
                        </IconButton>
                      )}
                      {canManage && (
                        <IconButton
                          size="small"
                          color="primary"
                          aria-label={`Chỉnh sửa ${row.name}`}
                          onClick={() => onEdit(type, row)}
                        >
                          <i className="tabler-edit" />
                        </IconButton>
                      )}
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
                colSpan={
                  columns[type].length +
                  (type === "products" || (editable && canManage) ? 1 : 0)
                }
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
  const [importLines, setImportLines] = useState([makeImportLine()]);
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState([]);
  const isBulkImport = type === "import" && !editingItem;
  useEffect(() => {
    if (!open) return;
    fetch("/api/users?status=able&limit=500")
      .then((response) => response.json())
      .then((result) => setPeople(result.data || []))
      .catch(() => setPeople([]));
  }, [open]);
  useEffect(() => {
    if (open) {
      setForm(
        editingItem
          ? { ...emptyForm, ...editingItem }
          : { ...emptyForm, person: currentName || "" },
      );
      setImportLines([makeImportLine(currentName)]);
    }
  }, [open, currentName, editingItem]);
  const productFields = (code) => {
    const item = products.find((entry) => entry.code === code);
    return {
      code,
      name: item?.name || "",
      category: item?.unit || "",
      description: item?.description || "",
      location: item?.location || "",
    };
  };
  const selectProduct = (code) => {
    setForm((value) => ({
      ...value,
      ...productFields(code),
    }));
  };
  const updateImportLine = (clientId, values) =>
    setImportLines((rows) =>
      rows.map((row) => (row.clientId === clientId ? { ...row, ...values } : row)),
    );
  const selectImportLineProduct = (clientId, code) =>
    updateImportLine(clientId, productFields(code));
  const addImportLine = () =>
    setImportLines((rows) => [...rows, makeImportLine(currentName)]);
  const removeImportLine = (clientId) =>
    setImportLines((rows) =>
      rows.length > 1 ? rows.filter((row) => row.clientId !== clientId) : rows,
    );
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
  const validImportLines = importLines.filter(
    (row) =>
      row.code?.trim() &&
      row.date &&
      row.person?.trim() &&
      Number.isInteger(Number(row.quantity)) &&
      Number(row.quantity) > 0,
  );
  const bulkImportInvalid =
    isBulkImport && validImportLines.length !== importLines.length;
  const submit = async () => {
    if (quantityError || bulkImportInvalid) return;
    setSaving(true);
    try {
      if (isBulkImport) {
        for (const row of importLines) {
          const { clientId, ...payload } = row;
          const response = await fetch("/api/assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, type: "import" }),
          });
          const result = await response.json();
          if (!response.ok)
            return toast.error(
              result.error || `Không thể lưu phiếu nhập ${row.code}`,
            );
        }
      } else {
        const response = await fetch("/api/assets", {
          method: editingItem ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, id: editingItem?.id, type }),
        });
        const result = await response.json();
        if (!response.ok)
          return toast.error(result.error || "Không thể lưu giao dịch");
      }
      toast.success(
        isBulkImport
          ? `Đã ghi nhận ${importLines.length} phiếu nhập tài sản`
          : editingItem
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={isBulkImport ? "lg" : "sm"}>
      <DialogTitle>
        {editingItem
          ? `Chỉnh sửa phiếu ${type === "import" ? "nhập" : "xuất"}`
          : type === "import"
            ? "Nhập tài sản"
            : "Xuất tài sản"}
      </DialogTitle>
      <DialogContent dividers>
        {isBulkImport ? (
          <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
              <Typography variant="body2" color="text.secondary">
                Có thể nhập nhiều sản phẩm trong cùng một ngày; mỗi dòng sẽ tạo một phiếu nhập riêng.
              </Typography>
              <Button
                variant="tonal"
                startIcon={<i className="tabler-plus" />}
                onClick={addImportLine}
              >
                Thêm dòng
              </Button>
            </Box>
            {importLines.map((row, index) => (
              <Box
                key={row.clientId}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(220px,1.3fr) 130px 110px minmax(150px,1fr) minmax(150px,1fr) minmax(160px,1fr) 44px",
                  },
                  gap: 2,
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  alignItems: "start",
                }}
              >
                <Autocomplete
                  options={assetOptions}
                  value={assetOptions.find((item) => item.code === row.code) || null}
                  onChange={(_, item) =>
                    selectImportLineProduct(row.clientId, item?.code || "")
                  }
                  getOptionLabel={(item) => `${item.code} — ${item.name}`}
                  isOptionEqualToValue={(option, value) => option.code === value?.code}
                  filterOptions={(options, state) =>
                    filterAssetOptions(options, state.inputValue)
                  }
                  noOptionsText="Không tìm thấy sản phẩm tương tự"
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      label={`Sản phẩm ${index + 1} *`}
                      placeholder="Tìm mã/tên sản phẩm"
                    />
                  )}
                />
                <CustomTextField
                  type="date"
                  label="Ngày nhập *"
                  value={row.date}
                  onChange={(e) =>
                    updateImportLine(row.clientId, { date: e.target.value })
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <CustomTextField
                  type="number"
                  label="Số lượng *"
                  value={row.quantity}
                  onChange={(e) =>
                    updateImportLine(row.clientId, { quantity: e.target.value })
                  }
                  inputProps={{ min: 1 }}
                />
                <CustomTextField label="Đơn vị tính" value={row.category} disabled />
                <CustomTextField label="Vị trí" value={row.location} disabled />
                <Autocomplete
                  freeSolo
                  options={people}
                  inputValue={row.person}
                  onInputChange={(_, value) =>
                    updateImportLine(row.clientId, { person: value })
                  }
                  onChange={(_, person) => {
                    if (person && typeof person !== "string")
                      updateImportLine(row.clientId, { person: person.name });
                  }}
                  getOptionLabel={(person) =>
                    typeof person === "string" ? person : person.name || ""
                  }
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      label="Người nhập kho *"
                      placeholder="Tên nhân sự"
                    />
                  )}
                />
                <IconButton
                  color="error"
                  disabled={importLines.length === 1}
                  onClick={() => removeImportLine(row.clientId)}
                  sx={{ mt: 4 }}
                  aria-label="Xóa dòng nhập"
                >
                  <i className="tabler-trash" />
                </IconButton>
                <CustomTextField
                  sx={{ gridColumn: { md: "1 / -1" } }}
                  label="Ghi chú"
                  value={row.note}
                  onChange={(e) =>
                    updateImportLine(row.clientId, { note: e.target.value })
                  }
                  placeholder="Ghi chú riêng cho phiếu này"
                />
              </Box>
            ))}
          </Box>
        ) : (
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
        )}
      </DialogContent>
      <DialogActions>
        <Button color="secondary" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button
          variant="contained"
          disabled={
            saving ||
            (isBulkImport
              ? bulkImportInvalid
              : quantityError || !Number.isInteger(quantity) || quantity <= 0)
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

function ProductDialog({
  open,
  product,
  categories,
  readOnly = false,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    categoryId: "",
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
          categoryId: "",
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
        {readOnly
          ? "Chi tiết sản phẩm"
          : product
            ? "Chỉnh sửa sản phẩm"
            : "Thêm sản phẩm"}
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
            disabled={Boolean(product) || readOnly}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <CustomTextField
            label="Tên sản phẩm *"
            value={form.name}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <CustomTextField
            select
            label="Loại sản phẩm"
            value={form.categoryId || ""}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <MenuItem value="">Chưa phân loại</MenuItem>
            {(categories || []).map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            label="Đơn vị tính *"
            value={form.unit}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <CustomTextField
            label="Vị trí"
            value={form.location}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <CustomTextField
            sx={{ gridColumn: { sm: "1 / -1" } }}
            label="Mô tả"
            multiline
            minRows={2}
            value={form.description}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={form.active}
              disabled={readOnly}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{" "}
            Đang hoạt động
          </label>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="secondary" onClick={onClose}>
          {readOnly ? "Đóng" : "Hủy"}
        </Button>
        {!readOnly && (
          <Button
            variant="contained"
            disabled={
              !form.code.trim() || !form.name.trim() || !form.unit.trim()
            }
            onClick={save}
          >
            Lưu sản phẩm
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function CategoryManagerDialog({ open, categories, onClose, onChanged }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const visibleCategories = (categories || []).filter((item) =>
    normalizeSearchText(item.name).includes(normalizeSearchText(search)),
  );
  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/asset-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing?.id, name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(editing ? "Đã cập nhật loại sản phẩm" : "Đã thêm loại sản phẩm");
      setEditing(null);
      setName("");
      await onChanged();
    } catch (error) {
      toast.error(error.message || "Không thể lưu loại sản phẩm");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (category) => {
    try {
      const response = await fetch("/api/asset-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("Đã xóa loại sản phẩm");
      await onChanged();
    } catch (error) {
      toast.error(error.message || "Không thể xóa loại sản phẩm");
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Quản lý loại sản phẩm ({(categories || []).length})
      </DialogTitle>
      <DialogContent dividers>
        <CustomTextField
          fullWidth
          value={search}
          placeholder="Tìm loại sản phẩm"
          onChange={(event) => setSearch(event.target.value)}
          sx={{ mb: 3 }}
        />
        <Box display="flex" gap={1.5} mb={3}>
          <CustomTextField
            fullWidth
            label={editing ? "Sửa tên loại" : "Tên loại sản phẩm mới"}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button variant="contained" disabled={saving || !name.trim()} onClick={save}>
            {editing ? "Lưu" : "Thêm"}
          </Button>
          {editing && (
            <Button color="secondary" onClick={() => { setEditing(null); setName(""); }}>
              Hủy
            </Button>
          )}
        </Box>
        <Box display="grid" gap={1}>
          {visibleCategories.length ? visibleCategories.map((category) => (
            <Box key={`${category.id}:${category.name}`} display="flex" alignItems="center" sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
              <Typography sx={{ flex: 1 }} fontWeight={600}>{category.name}</Typography>
              <IconButton color="primary" size="small" onClick={() => { setEditing(category); setName(category.name); }}>
                <i className="tabler-edit" />
              </IconButton>
              <IconButton color="error" size="small" onClick={() => remove(category)}>
                <i className="tabler-trash" />
              </IconButton>
            </Box>
          )) : <Typography color="text.secondary" textAlign="center" py={3}>Chưa có loại sản phẩm</Typography>}
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Đóng</Button></DialogActions>
    </Dialog>
  );
}

export default function AssetsPage() {
  const { data: session, status } = useSession();
  const canManage = ["admin", "assistant"].includes(session?.user?.role);
  const [data, setData] = useState({
    imports: [],
    exports: [],
    products: [],
    categories: [],
  });
  const [tab, setTab] = useState("import");
  const [dialog, setDialog] = useState(null);
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productStatus, setProductStatus] = useState("all");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [excelWarningOpen, setExcelWarningOpen] = useState(false);
  const [excelImportType, setExcelImportType] = useState(null);
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
  const stockByCode = useMemo(() => {
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
    return rows;
  }, [data]);
  const products = useMemo(
    () => {
      const categoryNames = new Map(
        (data.categories || []).map((item) => [item.id, item.name]),
      );
      return (data.products || []).map((item) => ({
        ...item,
        categoryName: categoryNames.get(item.categoryId) || "",
        location: stockByCode.get(item.code)?.location || item.location || "",
        quantity: stockByCode.get(item.code)?.quantity || 0,
        totalImport: data.imports
          .filter((entry) => entry.code === item.code)
          .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
        totalExport: data.exports
          .filter((entry) => entry.code === item.code)
          .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
      }));
    },
    [data, stockByCode],
  );
  const activeRows =
    tab === "import"
      ? data.imports
      : tab === "export"
        ? data.exports
        : tab === "products"
          ? products
          : products;
  const filteredRows = useMemo(
    () =>
      activeRows.filter((row) => {
        const matchesSearch = normalizeSearchText(
          tab === "products"
            ? `${row.code} ${row.name}`
            : `${row.code} ${row.name} ${row.location} ${row.person} ${row.note}`,
        ).includes(normalizeSearchText(search));
        const matchesStatus =
          tab !== "products" ||
          productStatus === "all" ||
          (productStatus === "active" ? row.active : !row.active);
        return matchesSearch && matchesStatus;
      }),
    [activeRows, productStatus, search, tab],
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
      if (excelImportType === "products") {
        const productSheetName = workbook.SheetNames.find(
          (item) =>
            normalizeSearchText(item).replace(/\s+/g, "") === "danhsachsanpham",
        );
        const productSheet =
          workbook.Sheets[productSheetName || workbook.SheetNames[0]];
        const products = XLSX.utils
          .sheet_to_json(productSheet, { defval: "", raw: true })
          .filter((row) =>
            Object.values(row).some((value) => String(value || "").trim()),
          )
          .map((row) => ({
            code: pick(row, ["masanpham", "masp", "ma", "code"]),
            name: pick(row, ["tensanpham", "tensp", "ten", "name"]),
            categoryId: pick(row, ["maloaisanpham", "categoryid"]),
            unit: pick(row, ["donvitinh", "donvi", "loaisp", "unit"]) || "Cái",
            description: pick(row, ["motasanpham", "mota", "description"]),
            location: pick(row, ["vitri", "location"]),
            active: ![
              "inactive",
              "ngung su dung",
              "ngung hoat dong",
              "khong hoat dong",
              "false",
              "0",
            ].includes(
              normalizeSearchText(pick(row, ["trangthai", "status", "active"])),
            ),
          }));
        if (!products.length) throw new Error("File không có dữ liệu sản phẩm");

        const response = await fetch("/api/asset-products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        await loadData();
        setTab("products");
        toast.success(
          `Đã thêm ${result.summary?.added || 0} và cập nhật ${result.summary?.updated || 0} sản phẩm`,
        );
        return;
      }
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
      setExcelImportType(null);
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
      "Mã SP": item.code,
      "Tên SP": item.name,
      "Đơn vị tính": item.unit || "",
      "Tổng nhập": item.totalImport,
      "Tổng xuất": item.totalExport,
      "Tồn kho": item.quantity,
    }));
    const productRows = (data.products || []).map((item) => ({
      "Mã sản phẩm": item.code || "",
      "Tên sản phẩm": item.name || "",
      "Loại sản phẩm":
        (data.categories || []).find((entry) => entry.id === item.categoryId)
          ?.name || "",
      "Đơn vị tính": item.unit || "",
      "Mô tả": item.description || "",
      "Vị trí": item.location || "",
      "Trạng thái": item.active ? "Hoạt động" : "Ngừng sử dụng",
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
              <Box display="flex" gap={2} flexWrap="wrap" justifyContent="flex-end">
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
                {tab === "products" && (
                  <Button variant="contained" startIcon={<i className="tabler-plus" />} onClick={() => { setEditingProduct(null); setProductDialog(true); }}>
                    Thêm sản phẩm
                  </Button>
                )}
                {tab === "import" && (
                  <Button variant="contained" startIcon={<i className="tabler-package-import" />} onClick={() => { setEditingItem(null); setDialog("import"); }}>
                    Nhập tài sản
                  </Button>
                )}
                {tab === "export" && (
                  <Button variant="contained" startIcon={<i className="tabler-package-export" />} onClick={() => { setEditingItem(null); setDialog("export"); }}>
                    Xuất tài sản
                  </Button>
                )}
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
          <Tab value="stock" label={`Tồn kho (${products.length})`} />
          <Tab
            value="products"
            label={`Danh sách sản phẩm (${products.length})`}
          />
        </Tabs>
        {tab === "products" && (
          <Box
            px={5}
            py={2}
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            gap={2}
          >
            {canManage && (
              <Button
                variant="tonal"
                startIcon={<i className="tabler-category-plus" />}
                onClick={() => setCategoryManagerOpen(true)}
              >
                Thêm loại sản phẩm
              </Button>
            )}
            <Box sx={{ minWidth: 190 }}>
              <CustomTextField
                select
                fullWidth
                size="small"
                value={productStatus}
                onChange={(event) => {
                  setProductStatus(event.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">Tất cả trạng thái</MenuItem>
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="inactive">Ngừng sử dụng</MenuItem>
              </CustomTextField>
            </Box>
          </Box>
        )}
        <AssetTable
          type={tab}
          rows={pagedRows}
          canManage={canManage}
          onView={(item) => setViewingProduct(item)}
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
          categories={data.categories || []}
          onClose={() => {
            setProductDialog(false);
            setEditingProduct(null);
          }}
          onSaved={loadData}
        />
        <ProductDialog
          open={Boolean(viewingProduct)}
          product={viewingProduct}
          categories={data.categories || []}
          readOnly
          onClose={() => setViewingProduct(null)}
          onSaved={loadData}
        />
        <CategoryManagerDialog
          open={categoryManagerOpen}
          categories={data.categories || []}
          onClose={() => setCategoryManagerOpen(false)}
          onChanged={loadData}
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
        <Dialog
          open={excelWarningOpen}
          onClose={() => setExcelWarningOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Import dữ liệu tài sản từ Excel</DialogTitle>
          <DialogContent dividers>
            <Typography color="text.secondary" mb={3}>
              Chọn loại dữ liệu bạn muốn import. Dữ liệu trùng sẽ được cập nhật,
              dữ liệu mới sẽ được bổ sung.
            </Typography>
            <Box display="grid" gap={2}>
              <Button
                variant="outlined"
                size="large"
                startIcon={<i className="tabler-list-details" />}
                onClick={() => {
                  setExcelImportType("products");
                  setExcelWarningOpen(false);
                  excelInputRef.current?.click();
                }}
              >
                Import danh sách sản phẩm
              </Button>
              <Typography variant="caption" color="text.secondary">
                Cột hỗ trợ: Mã sản phẩm, Tên sản phẩm, Đơn vị tính, Mô tả, Vị
                trí. Đơn vị mặc định là Cái.
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                size="large"
                startIcon={<i className="tabler-arrows-exchange" />}
                onClick={() => {
                  setExcelImportType("transactions");
                  setExcelWarningOpen(false);
                  excelInputRef.current?.click();
                }}
              >
                Import danh sách nhập / xuất / tồn hiện tại
              </Button>
              <Typography variant="caption" color="text.secondary">
                File cần có đủ 3 sheet: Nhập kho, Xuất kho và Tồn kho.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              color="secondary"
              onClick={() => setExcelWarningOpen(false)}
            >
              Hủy
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Box>
  );
}
