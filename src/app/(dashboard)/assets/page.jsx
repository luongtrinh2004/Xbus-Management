"use client";

import { useEffect, useMemo, useState } from "react";
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

const emptyForm = {
  code: "",
  name: "",
  date: new Date().toISOString().slice(0, 10),
  quantity: 1,
  location: "",
  person: "",
  note: "",
};
const columns = {
  import: [
    "Mã",
    "Tên",
    "Ngày nhập",
    "Số lượng",
    "Vị trí",
    "Người nhập",
    "Ghi chú",
  ],
  export: [
    "Mã",
    "Tên",
    "Ngày xuất",
    "Số lượng",
    "Vị trí",
    "Người xuất",
    "Ghi chú",
  ],
  stock: [
    "Mã",
    "Tên",
    "Ngày nhập",
    "Số lượng",
    "Vị trí",
    "Người nhập",
    "Ghi chú",
  ],
};
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`))
    : "—";

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
                <TableCell>
                  <Typography color="primary.main" fontWeight={600}>
                    {row.code}
                  </Typography>
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{row.location}</TableCell>
                <TableCell>{row.person}</TableCell>
                <TableCell>{row.note || "—"}</TableCell>
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
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Xóa ${row.name}`}
                        onClick={() => onDelete(type, row)}
                      >
                        <i className="tabler-trash" />
                      </IconButton>
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={editable && canManage ? 8 : 7} align="center">
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
  currentName,
  editingItem,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open)
      setForm(
        editingItem
          ? { ...emptyForm, ...editingItem }
          : { ...emptyForm, person: currentName || "" },
      );
  }, [open, currentName, editingItem]);
  const selectImport = (code) => {
    const item = imports.find((entry) => entry.code === code);
    setForm((value) => ({
      ...value,
      code,
      name: item?.name || "",
      location: item?.location || "",
    }));
  };
  const assetOptions = [
    ...new Map(imports.map((item) => [item.code, item])).values(),
  ];
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
              onChange={(_, item) => selectImport(item?.code || "")}
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
            <CustomTextField
              label="Mã tài sản *"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          )}
          {type === "import" ? (
            <Autocomplete
              freeSolo
              options={assetOptions}
              inputValue={form.name}
              onInputChange={(_, value, reason) => {
                if (reason !== "reset") {
                  setForm((current) => ({ ...current, name: value }));
                }
              }}
              onChange={(_, item) => {
                if (item && typeof item !== "string") selectImport(item.code);
              }}
              getOptionLabel={(item) =>
                typeof item === "string" ? item : item.name
              }
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
                  label="Tên tài sản *"
                  placeholder=""
                />
              )}
            />
          ) : (
            <CustomTextField label="Tên tài sản *" value={form.name} disabled />
          )}
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
          <CustomTextField
            label="Vị trí *"
            value={form.location}
            disabled={type === "export"}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <CustomTextField
            label={type === "import" ? "Người nhập *" : "Người xuất *"}
            value={form.person}
            onChange={(e) => setForm({ ...form, person: e.target.value })}
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

export default function AssetsPage() {
  const { data: session, status } = useSession();
  const canManage = ["admin", "assistant"].includes(session?.user?.role);
  const [data, setData] = useState({ imports: [], exports: [] });
  const [tab, setTab] = useState("import");
  const [dialog, setDialog] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
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
      const current = rows.get(item.code);
      rows.set(
        item.code,
        current
          ? { ...current, quantity: current.quantity + item.quantity }
          : { ...item },
      );
    });
    data.exports.forEach((item) => {
      const current = rows.get(item.code);
      if (current)
        rows.set(item.code, {
          ...current,
          quantity: current.quantity - item.quantity,
        });
    });
    return [...rows.values()];
  }, [data]);
  const activeRows =
    tab === "import" ? data.imports : tab === "export" ? data.exports : stock;
  const filteredRows = useMemo(
    () =>
      activeRows.filter((row) =>
        normalizeSearchText(
          `${row.code} ${row.name} ${row.location} ${row.person} ${row.note}`,
        ).includes(normalizeSearchText(search)),
      ),
    [activeRows, search],
  );
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
        </Tabs>
        <AssetTable
          type={tab}
          rows={pagedRows}
          canManage={canManage}
          onEdit={(type, item) => {
            setEditingItem(item);
            setDialog(type);
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
          editingItem={editingItem}
          currentName={session?.user?.name}
          onClose={() => {
            setDialog(null);
            setEditingItem(null);
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
      </Card>
    </Box>
  );
}
