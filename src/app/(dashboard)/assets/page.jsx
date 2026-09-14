"use client";

import { useEffect, useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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

const emptyForm = { code: "", name: "", date: new Date().toISOString().slice(0, 10), quantity: 1, location: "", person: "", note: "" };
const columns = {
  import: ["Mã", "Tên", "Ngày nhập", "Số lượng", "Vị trí", "Người nhập", "Ghi chú"],
  export: ["Mã", "Tên", "Ngày xuất", "Số lượng", "Vị trí", "Người xuất", "Ghi chú"],
  stock: ["Mã", "Tên", "Ngày nhập", "Số lượng", "Vị trí", "Người nhập", "Ghi chú"],
};
const formatDate = (value) => value ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)) : "—";

function AssetTable({ rows, type }) {
  return (
    <TableContainer>
      <Table className={tableStyles.table}>
        <TableHead><TableRow>{columns[type].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.length ? rows.map((row) => (
            <TableRow key={row.id || row.code} hover>
              <TableCell><Typography color="primary.main" fontWeight={600}>{row.code}</Typography></TableCell>
              <TableCell>{row.name}</TableCell><TableCell>{formatDate(row.date)}</TableCell>
              <TableCell>{row.quantity}</TableCell><TableCell>{row.location}</TableCell>
              <TableCell>{row.person}</TableCell><TableCell>{row.note || "—"}</TableCell>
            </TableRow>
          )) : <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={5}>Chưa có dữ liệu</Typography></TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TransactionDialog({ open, type, imports, currentName, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm({ ...emptyForm, person: currentName || "" }); }, [open, currentName]);
  const selectImport = (code) => {
    const item = imports.find((entry) => entry.code === code);
    setForm((value) => ({ ...value, code, name: item?.name || "", location: item?.location || "" }));
  };
  const assetOptions = [...new Map(imports.map((item) => [item.code, item])).values()];
  const submit = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, type }) });
      const result = await response.json();
      if (!response.ok) return toast.error(result.error || "Không thể lưu giao dịch");
      toast.success(type === "import" ? "Đã ghi nhận nhập tài sản" : "Đã ghi nhận xuất tài sản");
      onSaved(); onClose();
    } catch { toast.error("Không thể kết nối máy chủ"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{type === "import" ? "Nhập tài sản" : "Xuất tài sản"}</DialogTitle>
      <DialogContent dividers><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3, pt: 1 }}>
        {type === "export" ? <Autocomplete
          options={assetOptions}
          value={assetOptions.find((item) => item.code === form.code) || null}
          onChange={(_, item) => selectImport(item?.code || "")}
          getOptionLabel={(item) => `${item.code} — ${item.name}`}
          isOptionEqualToValue={(option, value) => option.code === value.code}
          filterOptions={(options, state) => {
            const query = state.inputValue.trim().toLowerCase();
            return options.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(query));
          }}
          noOptionsText="Không tìm thấy tài sản phù hợp"
          renderInput={(params) => <CustomTextField {...params} label="Tìm tài sản *" placeholder="Nhập mã hoặc tên tài sản" />}
        /> : <CustomTextField label="Mã tài sản *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />}
        <CustomTextField label="Tên tài sản *" value={form.name} disabled={type === "export"} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <CustomTextField type="date" label={type === "import" ? "Ngày nhập *" : "Ngày xuất *"} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <CustomTextField type="number" label="Số lượng *" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} inputProps={{ min: 1 }} />
        <CustomTextField label="Vị trí *" value={form.location} disabled={type === "export"} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <CustomTextField label={type === "import" ? "Người nhập *" : "Người xuất *"} value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} />
        <CustomTextField sx={{ gridColumn: { sm: "1 / -1" } }} multiline minRows={3} label="Ghi chú" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Box></DialogContent>
      <DialogActions><Button color="secondary" onClick={onClose}>Hủy bỏ</Button><Button variant="contained" disabled={saving} onClick={submit}>{saving ? "Đang lưu..." : type === "import" ? "Xác nhận nhập" : "Xác nhận xuất"}</Button></DialogActions>
    </Dialog>
  );
}

export default function AssetsPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState({ imports: [], exports: [] });
  const [tab, setTab] = useState("import"); const [dialog, setDialog] = useState(null); const [loading, setLoading] = useState(true);
  const loadData = async () => { setLoading(true); try { const response = await fetch("/api/assets"); const result = await response.json(); if (response.ok) setData(result); else toast.error(result.error); } finally { setLoading(false); } };
  useEffect(() => { if (status === "authenticated") loadData(); }, [status]);
  const stock = useMemo(() => {
    const rows = new Map();
    data.imports.forEach((item) => { const current = rows.get(item.code); rows.set(item.code, current ? { ...current, quantity: current.quantity + item.quantity } : { ...item }); });
    data.exports.forEach((item) => { const current = rows.get(item.code); if (current) rows.set(item.code, { ...current, quantity: current.quantity - item.quantity }); });
    return [...rows.values()];
  }, [data]);
  if (status === "loading" || loading) return <Box display="flex" justifyContent="center" py={12}><CircularProgress /></Box>;
  return <Card>
    <CardHeader title="Quản lý tài sản" subheader="Theo dõi hoạt động nhập, xuất và số lượng tồn kho" action={<Box display="flex" gap={2}><Button variant="tonal" startIcon={<i className="tabler-package-import" />} onClick={() => setDialog("import")}>Nhập tài sản</Button><Button variant="contained" startIcon={<i className="tabler-package-export" />} onClick={() => setDialog("export")}>Xuất tài sản</Button></Box>} />
    <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 5, mt: 2 }}><Tab value="import" label={`Nhập kho (${data.imports.length})`} /><Tab value="export" label={`Xuất kho (${data.exports.length})`} /><Tab value="stock" label={`Tồn kho (${stock.length})`} /></Tabs>
    <AssetTable type={tab} rows={tab === "import" ? data.imports : tab === "export" ? data.exports : stock} />
    <TransactionDialog open={Boolean(dialog)} type={dialog || "import"} imports={data.imports} currentName={session?.user?.name} onClose={() => setDialog(null)} onSaved={loadData} />
  </Card>;
}
