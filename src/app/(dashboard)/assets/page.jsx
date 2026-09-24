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
import { assetDocumentCodeFromName } from "@/libs/assetIds";
import { resolveAvatar } from "@/utils/getDefaultAvatar";

const emptyForm = {
  productId: "",
  documentCode: "",
  code: "",
  name: "",
  category: "",
  unit: "",
  description: "",
  date: toVietnamDateKey(),
  quantity: 1,
  location: "",
  person: "",
  issuedTo: "",
  note: "",
};
const makeImportLine = (currentName = "") => ({
  ...emptyForm,
  clientId: `asset_line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  person: currentName || "",
});
export const indexToTicketCode = (n) => {
  const num = Math.max(0, n) % 1000;
  let charIndex = Math.floor(Math.max(0, n) / 1000);
  const c3 = String.fromCharCode(65 + (charIndex % 26));
  charIndex = Math.floor(charIndex / 26);
  const c2 = String.fromCharCode(65 + (charIndex % 26));
  charIndex = Math.floor(charIndex / 26);
  const c1 = String.fromCharCode(65 + (charIndex % 26));
  return `${c1}${c2}${c3}${String(num).padStart(3, "0")}`;
};

export const ticketCodeToIndex = (code) => {
  if (!code || typeof code !== "string" || !/^[A-Z]{3}[0-9]{3}$/.test(code)) {
    return -1;
  }
  const c1 = code.charCodeAt(0) - 65;
  const c2 = code.charCodeAt(1) - 65;
  const c3 = code.charCodeAt(2) - 65;
  const num = parseInt(code.slice(3), 10);
  return (c1 * 26 * 26 + c2 * 26 + c3) * 1000 + num;
};

const columns = {
  import: [
    "STT",
    "Mã phiếu",
    "Mã sản phẩm",
    "Loại SP",
    "Tên sản phẩm",
    "Mô tả sản phẩm",
    "Người nhập kho",
    "Số lượng",
    "Đơn vị tính",
    "Vị trí",
    "Ngày nhập",
    "Trạng thái",
    "Ghi chú",
  ],
  export: [
    "STT",
    "Mã phiếu",
    "Mã sản phẩm",
    "Loại SP",
    "Tên sản phẩm",
    "Người mượn tài sản",
    "Xuất cho",
    "Số lượng",
    "Đơn vị tính",
    "Ngày xuất",
    "Trạng thái",
    "Ghi chú",
  ],
  stock: [
    "STT",
    "Mã sản phẩm",
    "Loại SP",
    "Tên sản phẩm",
    "Đơn vị tính",
    "Vị trí",
    "Tổng nhập",
    "Tổng xuất",
    "Tồn kho",
  ],
  products: [
    "STT",
    "Mã sản phẩm",
    "Loại SP",
    "Tên sản phẩm",
    "Mô tả sản phẩm",
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
  if (!query)
    return [...options].sort((a, b) => a.name.localeCompare(b.name, "vi"));

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
    .map(({ item }) => item);
};

const filterPeopleOptions = (options, inputValue) => {
  const query = normalizeSearchText(inputValue);
  if (!query) return options;
  return options.filter((person) =>
    normalizeSearchText(
      `${person.name} ${person.code || ""} ${person.email || ""}`,
    ).includes(query),
  );
};

function AssetTable({
  rows,
  type,
  canManage,
  currentUserId,
  page = 1,
  limit = 10,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}) {
  const editable = type !== "stock";
  const showActions =
    type === "products" ||
    (editable &&
      (canManage || rows.some((r) => r.performedBy === currentUserId)));

  return (
    <TableContainer>
      <Table className={tableStyles.table}>
        <TableHead>
          <TableRow>
            {columns[type].map((label) => (
              <TableCell
                key={label}
                align={label === "STT" ? "center" : "left"}
              >
                {label}
              </TableCell>
            ))}
            {showActions && <TableCell align="center">Thao tác</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length ? (
            rows.map((row, index) => {
              const stt = row.ticketNumber ?? (page - 1) * limit + index + 1;
              const showTicket = row.ticketRowSpan !== 0;
              const isPending = row.status === "pending";
              const isRejected = row.status === "rejected";
              const isOwner = row.performedBy === currentUserId;

              return (
                <TableRow key={row.id || row.code} hover>
                  {showTicket && (
                    <TableCell
                      align="center"
                      rowSpan={row.ticketRowSpan || 1}
                      sx={{
                        width: 50,
                        fontWeight: 500,
                        color: "text.secondary",
                        verticalAlign: "middle",
                      }}
                    >
                      {stt}
                    </TableCell>
                  )}
                  {type === "import" ? (
                    <>
                      {showTicket && (
                        <TableCell
                          rowSpan={row.ticketRowSpan || 1}
                          sx={{ verticalAlign: "middle" }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "primary.main",
                            }}
                          >
                            {row.ticketId || "—"}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography color="text.primary" fontWeight={600}>
                          {row.code || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.category || "—"}</TableCell>
                      <TableCell>{row.name || "—"}</TableCell>
                      <TableCell>{row.description || "—"}</TableCell>
                      <TableCell>{row.person || "—"}</TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {row.quantity ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.unit || "—"}</TableCell>
                      <TableCell>{row.location || "—"}</TableCell>
                      <TableCell>
                        {row.date ? formatDate(row.date) : "—"}
                      </TableCell>
                      <TableCell>
                        {isPending ? (
                          <Chip
                            size="small"
                            variant="tonal"
                            color="warning"
                            label="Đang chờ"
                          />
                        ) : isRejected ? (
                          <Chip
                            size="small"
                            variant="tonal"
                            color="error"
                            label="Từ chối"
                            title={row.rejectReason || ""}
                          />
                        ) : (
                          <Chip
                            size="small"
                            variant="tonal"
                            color="success"
                            label="Đã duyệt"
                          />
                        )}
                      </TableCell>
                      <TableCell>{row.note || "—"}</TableCell>
                    </>
                  ) : type === "export" ? (
                    <>
                      {showTicket && (
                        <TableCell
                          rowSpan={row.ticketRowSpan || 1}
                          sx={{ verticalAlign: "middle" }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "primary.main",
                            }}
                          >
                            {row.ticketId || "—"}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography color="text.primary" fontWeight={600}>
                          {row.code || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.category || "—"}</TableCell>
                      <TableCell>{row.name || "—"}</TableCell>
                      <TableCell>{row.person || "—"}</TableCell>
                      <TableCell>{row.issuedTo || "—"}</TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {row.quantity ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.unit || "—"}</TableCell>
                      <TableCell>
                        {row.date ? formatDate(row.date) : "—"}
                      </TableCell>
                      <TableCell>
                        {isPending ? (
                          <Chip
                            size="small"
                            variant="tonal"
                            color="warning"
                            label="Đang chờ"
                          />
                        ) : isRejected ? (
                          <Chip
                            size="small"
                            variant="tonal"
                            color="error"
                            label="Từ chối"
                            title={row.rejectReason || ""}
                          />
                        ) : (
                          <Chip
                            size="small"
                            variant="tonal"
                            color="success"
                            label="Đã duyệt"
                          />
                        )}
                      </TableCell>
                      <TableCell>{row.note || "—"}</TableCell>
                    </>
                  ) : type === "stock" ? (
                    <>
                      <TableCell>
                        <Typography color="primary.main" fontWeight={600}>
                          {row.code || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.categoryName || "—"}</TableCell>
                      <TableCell>{row.name}</TableCell>
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
                          {row.code || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.categoryName || "—"}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.description || "—"}</TableCell>
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
                  {showActions && (
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={0.5}>
                        {canManage &&
                          (type === "import" || type === "export") &&
                          isPending && (
                            <>
                              <IconButton
                                size="small"
                                color="success"
                                title="Duyệt phiếu"
                                aria-label={`Duyệt phiếu ${row.ticketId || row.code || ""}`}
                                onClick={() => onApprove(type, row)}
                              >
                                <i className="tabler-check" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                title="Từ chối phiếu"
                                aria-label={`Từ chối phiếu ${row.ticketId || row.code || ""}`}
                                onClick={() => onReject(type, row)}
                              >
                                <i className="tabler-x" />
                              </IconButton>
                            </>
                          )}
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
                        {type !== "products" &&
                          (canManage || (isPending && isOwner)) && (
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
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns[type].length + (showActions ? 1 : 0)}
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
  categories,
  currentName,
  canManage,
  editingItem,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [ticketId, setTicketId] = useState("");
  const [importLines, setImportLines] = useState([makeImportLine()]);
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState([]);
  const [personTouched, setPersonTouched] = useState(false);
  const isBulkTransaction = !editingItem;
  useEffect(() => {
    if (!open) return;
    setPersonTouched(false);
    fetch("/api/users?status=able&limit=500")
      .then((response) => response.json())
      .then((result) => setPeople(result.data || []))
      .catch(() => setPeople([]));
  }, [open]);
  const getNextSequentialCode = () => {
    const all = [...(imports || []), ...(exports || [])];
    let maxIdx = -1;
    for (const item of all) {
      const idx = ticketCodeToIndex(item.ticketId);
      if (idx > maxIdx) maxIdx = idx;
    }
    return indexToTicketCode(maxIdx + 1);
  };

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setTicketId(editingItem.ticketId || getNextSequentialCode());
        setForm({ ...emptyForm, ...editingItem });
      } else {
        setTicketId(getNextSequentialCode());
        setForm({
          ...emptyForm,
          person: currentName || "",
        });
      }
      setImportLines([makeImportLine(currentName)]);
    }
  }, [open, type, currentName, editingItem, imports, exports]);
  const productFields = (productId) => {
    const item = products.find((entry) => entry.id === productId);
    return {
      productId: item?.id || "",
      documentCode: assetDocumentCodeFromName(item?.name),
      code: item?.code || "",
      name: item?.name || "",
      category:
        categories.find((category) => category.id === item?.categoryId)?.name ||
        "",
      unit: item?.unit || "",
      description: item?.description || "",
      location: item?.location || "",
    };
  };
  const selectProduct = (productId) => {
    setForm((value) => ({
      ...value,
      ...productFields(productId),
    }));
  };
  const updateImportLine = (clientId, values) =>
    setImportLines((rows) =>
      rows.map((row) =>
        row.clientId === clientId ? { ...row, ...values } : row,
      ),
    );
  const selectImportLineProduct = (clientId, productId) =>
    updateImportLine(clientId, productFields(productId));
  const addImportLine = () =>
    setImportLines((rows) => [...rows, makeImportLine(currentName)]);
  const removeImportLine = (clientId) =>
    setImportLines((rows) =>
      rows.length > 1 ? rows.filter((row) => row.clientId !== clientId) : rows,
    );
  const assetOptions = products.filter((item) => item.active);
  const isApprovedTx = (item) => !item.status || item.status === "approved";
  const approvedImports = useMemo(
    () => (imports || []).filter(isApprovedTx),
    [imports],
  );
  const approvedExports = useMemo(
    () => (exports || []).filter(isApprovedTx),
    [exports],
  );
  const transactionKey = (item) =>
    item.documentCode || assetDocumentCodeFromName(item.name);
  const productKey = (item) =>
    item.documentCode ||
    assetDocumentCodeFromName(
      products.find((product) => product.id === item.productId)?.name ||
        item.name,
    );
  const selectedKey = productKey(form);
  const selectedStock = selectedKey
    ? approvedImports
        .filter((item) => transactionKey(item) === selectedKey)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0) -
      approvedExports
        .filter((item) => transactionKey(item) === selectedKey)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : 0;
  const availableForExport =
    selectedStock +
    (type === "export" && transactionKey(editingItem || {}) === selectedKey
      ? Number(editingItem?.quantity || 0)
      : 0);
  const quantity = Number(form.quantity);
  const quantityError =
    type === "export" && Boolean(selectedKey) && quantity > availableForExport;
  const stockForProduct = (product) =>
    approvedImports
      .filter((item) => transactionKey(item) === productKey(product))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0) -
    approvedExports
      .filter((item) => transactionKey(item) === productKey(product))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const requestedForProduct = (product) =>
    importLines
      .filter((item) => productKey(item) === productKey(product))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const isPersonValid = Boolean(
    form.person && people.some((p) => p.name === form.person),
  );

  const areLinesValid =
    importLines.length > 0 &&
    importLines.every((row) => {
      const hasProduct = Boolean(
        row.productId && products.some((p) => p.id === row.productId),
      );
      const qty = Number(row.quantity);
      const isQtyValid = Number.isInteger(qty) && qty > 0;
      const isIssuedToValid =
        type !== "export" ||
        Boolean(row.issuedTo && people.some((p) => p.name === row.issuedTo));
      const isStockSufficient =
        type !== "export" ||
        (stockForProduct(row) > 0 &&
          requestedForProduct(row) <= stockForProduct(row));
      return hasProduct && isQtyValid && isIssuedToValid && isStockSufficient;
    });

  const bulkTransactionInvalid =
    isBulkTransaction && (!form.date || !isPersonValid || !areLinesValid);

  const selectedProduct =
    products.find((item) => item.id === form.productId) ||
    products.find(
      (item) =>
        form.code &&
        item.code?.trim().toUpperCase() === form.code.trim().toUpperCase(),
    ) ||
    products.find(
      (item) =>
        selectedKey && assetDocumentCodeFromName(item.name) === selectedKey,
    ) ||
    null;
  const isSingleProductValid = Boolean(selectedProduct?.active);
  const isSingleIssuedToValid =
    type !== "export" ||
    Boolean(form.issuedTo && people.some((p) => p.name === form.issuedTo));

  const singleTransactionInvalid =
    !isBulkTransaction &&
    (!form.date ||
      !isPersonValid ||
      !isSingleProductValid ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantityError ||
      !isSingleIssuedToValid);

  const submit = async () => {
    if (isBulkTransaction ? bulkTransactionInvalid : singleTransactionInvalid) {
      if (!isPersonValid) {
        toast.error(
          `Vui lòng chọn ${type === "import" ? "người nhập kho" : "người mượn tài sản"} từ danh sách nhân viên công ty`,
        );
        return;
      }
      if (type === "export") {
        if (isBulkTransaction) {
          const invalidLine = importLines.find(
            (row) =>
              !row.issuedTo || !people.some((p) => p.name === row.issuedTo),
          );
          if (invalidLine) {
            toast.error(
              "Vui lòng chọn người nhận tài sản (xuất cho) từ danh sách nhân viên cho từng sản phẩm",
            );
            return;
          }
          const outOfStock = importLines.find(
            (row) =>
              stockForProduct(row) <= 0 ||
              requestedForProduct(row) > stockForProduct(row),
          );
          if (outOfStock) {
            toast.error(
              `Số lượng xuất cho ${outOfStock.name || "sản phẩm"} vượt quá tồn kho khả dụng`,
            );
            return;
          }
        } else if (!isSingleIssuedToValid) {
          toast.error(
            "Vui lòng chọn người nhận tài sản từ danh sách nhân viên công ty",
          );
          return;
        }
      }
      return;
    }
    setSaving(true);
    try {
      const activeTicketId = ticketId || getNextSequentialCode();
      if (isBulkTransaction) {
        for (const row of importLines) {
          const { clientId, ...payload } = row;
          const response = await fetch("/api/assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              ticketId: activeTicketId,
              date: form.date,
              person: form.person,
              note: form.note,
              type,
            }),
          });
          const result = await response.json();
          if (!response.ok)
            return toast.error(
              result.error ||
                `Không thể lưu phiếu ${type === "import" ? "nhập" : "xuất"} ${row.code}`,
            );
        }
      } else {
        const response = await fetch("/api/assets", {
          method: editingItem ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            productId: selectedProduct.id,
            ticketId: activeTicketId,
            id: editingItem?.id,
            type,
          }),
        });
        const result = await response.json();
        if (!response.ok)
          return toast.error(result.error || "Không thể lưu giao dịch");
      }
      toast.success(
        isBulkTransaction
          ? canManage
            ? `Đã ghi nhận ${importLines.length} sản phẩm trong phiếu ${type === "import" ? "nhập" : "xuất"}`
            : `Đã gửi phiếu ${type === "import" ? "nhập" : "xuất"} (${activeTicketId}) gồm ${importLines.length} sản phẩm. Đang chờ duyệt.`
          : editingItem
            ? "Đã cập nhật giao dịch tài sản"
            : canManage
              ? type === "import"
                ? "Đã ghi nhận nhập tài sản"
                : "Đã ghi nhận xuất tài sản"
              : `Đã gửi phiếu ${type === "import" ? "nhập" : "xuất"}. Đang chờ duyệt.`,
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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isBulkTransaction ? "lg" : "sm"}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <span>
          {editingItem
            ? `Chỉnh sửa phiếu ${type === "import" ? "nhập" : "xuất"}`
            : type === "import"
              ? "Nhập tài sản"
              : "Xuất tài sản"}
        </span>
        {ticketId && (
          <Chip
            label={`Mã phiếu: ${ticketId}`}
            color="primary"
            variant="tonal"
            size="small"
            sx={{ fontFamily: "monospace", fontWeight: 700 }}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {!canManage && (
          <Box
            sx={{
              p: 1.5,
              mb: 2.5,
              borderRadius: 1.5,
              bgcolor: "warning.lighter",
              color: "warning.darker",
              border: "1px solid",
              borderColor: "warning.light",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <i className="tabler-alert-circle text-xl" />
            <Typography variant="body2" color="inherit">
              Phiếu {type === "import" ? "nhập" : "xuất"} của bạn sẽ được gửi
              tới Quản trị viên / Trợ lý để duyệt. Sau khi được duyệt, số lượng
              mới được tính vào tồn kho.
            </Typography>
          </Box>
        )}
        {isBulkTransaction ? (
          <Box sx={{ display: "grid", gap: 2.5, pt: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "180px minmax(260px, 1.2fr) minmax(280px, 1.8fr)",
                },
                gap: 2,
                p: 2.5,
                bgcolor: "action.hover",
                borderRadius: 2,
              }}
            >
              <CustomTextField
                type="date"
                label={type === "import" ? "Ngày nhập *" : "Ngày xuất *"}
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Autocomplete
                options={people}
                value={
                  people.find((person) => person.name === form.person) || null
                }
                onChange={(_, person) => {
                  setForm((prev) => ({ ...prev, person: person?.name || "" }));
                }}
                getOptionLabel={(person) => {
                  if (!person) return "";
                  if (typeof person === "string") return person;
                  return `${person.name || ""}${person.code ? ` (${person.code})` : ""}`;
                }}
                isOptionEqualToValue={(option, value) =>
                  option.id === value?.id || option.name === value?.name
                }
                filterOptions={(options, state) =>
                  filterPeopleOptions(options, state.inputValue)
                }
                ListboxProps={{
                  style: { maxHeight: 280, overflowY: "auto" },
                }}
                noOptionsText="Không tìm thấy nhân viên trong công ty"
                renderOption={(props, person) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...optionProps}
                      sx={{ display: "flex", gap: 1.5, alignItems: "center" }}
                    >
                      <Avatar
                        src={resolveAvatar(person)}
                        alt={person.name}
                        sx={{ width: 32, height: 32, fontSize: "0.85rem" }}
                      >
                        {person.name?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {person.name}
                          </Typography>
                          {person.code && (
                            <Typography
                              variant="caption"
                              sx={{
                                px: 0.75,
                                py: 0.1,
                                borderRadius: 1,
                                bgcolor: "action.selected",
                                fontFamily: "monospace",
                                fontWeight: 700,
                                lineHeight: 1.6,
                                flexShrink: 0,
                              }}
                            >
                              {person.code}
                            </Typography>
                          )}
                        </Box>
                        {person.email && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {person.email}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <CustomTextField
                    {...params}
                    label={
                      type === "import"
                        ? "Người nhập kho *"
                        : "Người mượn tài sản *"
                    }
                    placeholder="Chọn nhân sự công ty"
                    onBlur={() => setPersonTouched(true)}
                    error={personTouched && !isPersonValid}
                    helperText={
                      personTouched && !isPersonValid
                        ? !form.person
                          ? type === "import"
                            ? "Vui lòng chọn người nhập kho"
                            : "Vui lòng chọn người mượn tài sản"
                          : "Vui lòng chọn từ danh sách nhân viên"
                        : ""
                    }
                  />
                )}
              />
              <CustomTextField
                label="Ghi chú chung"
                value={form.note}
                onChange={(event) =>
                  setForm({ ...form, note: event.target.value })
                }
                placeholder="Áp dụng cho toàn bộ sản phẩm trong phiếu"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Chọn các sản phẩm trong phiếu{" "}
              {type === "import" ? "nhập" : "xuất"}
            </Typography>
            {importLines.map((row, index) => (
              <Box
                key={row.clientId}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md:
                      type === "export"
                        ? "minmax(260px,1.5fr) 135px 120px 120px minmax(240px,1.3fr) 88px"
                        : "minmax(300px,1.8fr) 150px minmax(140px,1fr) minmax(140px,1fr) 88px",
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
                  value={
                    assetOptions.find(
                      (item) =>
                        item.id === row.productId ||
                        assetDocumentCodeFromName(item.name) ===
                          productKey(row),
                    ) || null
                  }
                  onChange={(_, item) =>
                    selectImportLineProduct(row.clientId, item?.id || "")
                  }
                  getOptionLabel={(item) =>
                    `${item.code ? `${item.code} — ` : ""}${item.name}`
                  }
                  isOptionEqualToValue={(option, value) =>
                    option.id === value?.id
                  }
                  filterOptions={(options, state) =>
                    filterAssetOptions(options, state.inputValue)
                  }
                  ListboxProps={{
                    style: { maxHeight: 240, overflowY: "auto" },
                  }}
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
                  type="number"
                  label="Số lượng *"
                  value={row.quantity}
                  onChange={(e) =>
                    updateImportLine(row.clientId, { quantity: e.target.value })
                  }
                  error={
                    type === "export" &&
                    Boolean(productKey(row)) &&
                    requestedForProduct(row) > stockForProduct(row)
                  }
                  helperText={
                    type === "export" && productKey(row)
                      ? `Tồn kho: ${stockForProduct(row)} · Đang xuất: ${requestedForProduct(row)}`
                      : ""
                  }
                  inputProps={{
                    min: 1,
                    ...(type === "export" ? { max: stockForProduct(row) } : {}),
                  }}
                />
                <CustomTextField
                  label="Đơn vị tính"
                  value={row.unit}
                  disabled
                />
                <CustomTextField label="Vị trí" value={row.location} disabled />
                {type === "export" && (
                  <Autocomplete
                    options={people}
                    value={
                      people.find((person) => person.name === row.issuedTo) ||
                      null
                    }
                    onChange={(_, person) =>
                      updateImportLine(row.clientId, {
                        issuedTo: person?.name || "",
                      })
                    }
                    getOptionLabel={(person) =>
                      `${person.name || ""} (${person.code || "—"})`
                    }
                    isOptionEqualToValue={(option, value) =>
                      option.id === value?.id
                    }
                    filterOptions={(options, state) =>
                      filterPeopleOptions(options, state.inputValue)
                    }
                    ListboxProps={{
                      style: { maxHeight: 280, overflowY: "auto" },
                    }}
                    noOptionsText="Không tìm thấy nhân sự"
                    renderOption={(props, person) => {
                      const { key, ...optionProps } = props;
                      return (
                        <Box
                          component="li"
                          key={key}
                          {...optionProps}
                          sx={{ display: "flex", gap: 1.5 }}
                        >
                          <Avatar
                            src={resolveAvatar(person)}
                            alt={person.name}
                            sx={{ width: 36, height: 36 }}
                          />
                          <Typography variant="body2" fontWeight={600}>
                            {person.name}{" "}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              ({person.code || "Chưa có mã"})
                            </Typography>
                          </Typography>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        label="Xuất cho *"
                        placeholder="Tìm tên hoặc mã nhân sự"
                      />
                    )}
                  />
                )}
                <Box display="flex" alignItems="center" sx={{ mt: 0.75 }}>
                  <IconButton
                    color="primary"
                    onClick={addImportLine}
                    aria-label="Thêm sản phẩm"
                  >
                    <i className="tabler-plus" />
                  </IconButton>
                  <IconButton
                    color="error"
                    disabled={importLines.length === 1}
                    onClick={() => removeImportLine(row.clientId)}
                    aria-label="Xóa sản phẩm"
                  >
                    <i className="tabler-trash" />
                  </IconButton>
                </Box>
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
                value={selectedProduct}
                onChange={(_, item) => selectProduct(item?.id || "")}
                getOptionLabel={(item) =>
                  `${item.code ? `${item.code} — ` : ""}${item.name}`
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
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
                value={selectedProduct}
                onChange={(_, item) => selectProduct(item?.id || "")}
                getOptionLabel={(item) =>
                  `${item.code ? `${item.code} — ` : ""}${item.name}`
                }
                isOptionEqualToValue={(option, value) =>
                  option.id === value?.id
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
                    error={!isSingleProductValid}
                    helperText={
                      !isSingleProductValid
                        ? "Vui lòng chọn sản phẩm đang hoạt động"
                        : ""
                    }
                  />
                )}
              />
            )}
            <CustomTextField label="Đơn vị tính" value={form.unit} disabled />
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
              options={people}
              value={
                people.find((person) => person.name === form.person) || null
              }
              onChange={(_, person) => {
                setForm((prev) => ({ ...prev, person: person?.name || "" }));
              }}
              getOptionLabel={(person) => {
                if (!person) return "";
                if (typeof person === "string") return person;
                return `${person.name || ""}${person.code ? ` (${person.code})` : ""}`;
              }}
              isOptionEqualToValue={(option, value) =>
                option.id === value?.id || option.name === value?.name
              }
              filterOptions={(options, state) =>
                filterPeopleOptions(options, state.inputValue)
              }
              ListboxProps={{
                style: { maxHeight: 280, overflowY: "auto" },
              }}
              noOptionsText="Không tìm thấy nhân viên trong công ty"
              renderOption={(props, person) => {
                const { key, ...optionProps } = props;
                return (
                  <Box
                    component="li"
                    key={key}
                    {...optionProps}
                    sx={{ display: "flex", gap: 1.5, alignItems: "center" }}
                  >
                    <Avatar
                      src={resolveAvatar(person)}
                      alt={person.name}
                      sx={{ width: 32, height: 32, fontSize: "0.85rem" }}
                    >
                      {person.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {person.name}
                        </Typography>
                        {person.code && (
                          <Typography
                            variant="caption"
                            sx={{
                              px: 0.75,
                              py: 0.1,
                              borderRadius: 1,
                              bgcolor: "action.selected",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              lineHeight: 1.6,
                              flexShrink: 0,
                            }}
                          >
                            {person.code}
                          </Typography>
                        )}
                      </Box>
                      {person.email && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {person.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  label={
                    type === "import"
                      ? "Người nhập kho *"
                      : "Người mượn tài sản *"
                  }
                  placeholder="Chọn nhân sự công ty"
                  onBlur={() => setPersonTouched(true)}
                  error={personTouched && !isPersonValid}
                  helperText={
                    personTouched && !isPersonValid
                      ? !form.person
                        ? type === "import"
                          ? "Vui lòng chọn người nhập kho"
                          : "Vui lòng chọn người mượn tài sản"
                        : "Vui lòng chọn từ danh sách nhân viên"
                      : ""
                  }
                />
              )}
            />
            {type === "export" && (
              <Autocomplete
                options={people}
                value={
                  people.find((person) => person.name === form.issuedTo) || null
                }
                onChange={(_, person) =>
                  setForm((prev) => ({ ...prev, issuedTo: person?.name || "" }))
                }
                getOptionLabel={(person) => {
                  if (!person) return "";
                  if (typeof person === "string") return person;
                  return `${person.name || ""}${person.code ? ` (${person.code})` : ""}`;
                }}
                isOptionEqualToValue={(option, value) =>
                  option.id === value?.id || option.name === value?.name
                }
                filterOptions={(options, state) =>
                  filterPeopleOptions(options, state.inputValue)
                }
                ListboxProps={{
                  style: { maxHeight: 240, overflowY: "auto" },
                }}
                noOptionsText="Không tìm thấy nhân viên"
                renderOption={(props, person) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...optionProps}
                      sx={{ display: "flex", gap: 1.5, alignItems: "center" }}
                    >
                      <Avatar
                        src={resolveAvatar(person)}
                        alt={person.name}
                        sx={{ width: 32, height: 32, fontSize: "0.85rem" }}
                      >
                        {person.name?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {person.name}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {person.code || "Chưa có mã"}
                          {person.email ? ` · ${person.email}` : ""}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <CustomTextField
                    {...params}
                    label="Xuất cho *"
                    placeholder="Tìm theo tên hoặc mã nhân sự"
                    error={Boolean(
                      form.issuedTo &&
                        !people.some((p) => p.name === form.issuedTo),
                    )}
                    helperText={
                      form.issuedTo &&
                      !people.some((p) => p.name === form.issuedTo)
                        ? "Vui lòng chọn từ danh sách nhân viên"
                        : ""
                    }
                  />
                )}
              />
            )}
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
            (isBulkTransaction
              ? bulkTransactionInvalid
              : singleTransactionInvalid)
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
  units,
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
            label={product ? "Mã sản phẩm" : "Mã sản phẩm *"}
            value={form.code}
            disabled={Boolean(product?.code) || readOnly}
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
            select
            label="Đơn vị tính *"
            value={form.unit}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            {(units || []).map((unit) => (
              <MenuItem key={unit.id} value={unit.name}>
                {unit.name}
              </MenuItem>
            ))}
          </CustomTextField>
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
              (!product && !form.code.trim()) ||
              !form.name.trim() ||
              !form.unit.trim()
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

function ProductConfigurationDialog({
  open,
  categories,
  units,
  onClose,
  onChanged,
}) {
  const [section, setSection] = useState("categories");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const isCategory = section === "categories";
  const items = isCategory ? categories || [] : units || [];
  const visibleItems = items.filter((item) =>
    normalizeSearchText(item.name).includes(normalizeSearchText(search)),
  );
  const resetEditor = () => {
    setEditing(null);
    setName("");
  };
  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(
        isCategory ? "/api/asset-categories" : "/api/asset-units",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing?.id, name }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(
        editing
          ? `Đã cập nhật ${isCategory ? "loại sản phẩm" : "đơn vị tính"}`
          : `Đã thêm ${isCategory ? "loại sản phẩm" : "đơn vị tính"}`,
      );
      resetEditor();
      await onChanged();
    } catch (error) {
      toast.error(
        error.message ||
          `Không thể lưu ${isCategory ? "loại sản phẩm" : "đơn vị tính"}`,
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async (item) => {
    try {
      const response = await fetch(
        isCategory ? "/api/asset-categories" : "/api/asset-units",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(`Đã xóa ${isCategory ? "loại sản phẩm" : "đơn vị tính"}`);
      await onChanged();
    } catch (error) {
      toast.error(
        error.message ||
          `Không thể xóa ${isCategory ? "loại sản phẩm" : "đơn vị tính"}`,
      );
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cấu hình sản phẩm</DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={section}
          onChange={(_, value) => {
            setSection(value);
            setSearch("");
            resetEditor();
          }}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab
            value="categories"
            label={`Loại sản phẩm (${(categories || []).length})`}
          />
          <Tab value="units" label={`Đơn vị tính (${(units || []).length})`} />
        </Tabs>
        <CustomTextField
          fullWidth
          value={search}
          placeholder={isCategory ? "Tìm loại sản phẩm" : "Tìm đơn vị tính"}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: <i className="tabler-search text-gray-400 mr-2" />,
          }}
        />
        <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
          <CustomTextField
            fullWidth
            label={
              editing
                ? `Sửa ${isCategory ? "tên loại" : "đơn vị tính"}`
                : isCategory
                  ? "Tên loại sản phẩm mới"
                  : "Tên đơn vị tính mới"
            }
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
            sx={{ flex: "1 1 240px" }}
          />
          <Button
            variant="contained"
            disabled={saving || !name.trim()}
            onClick={save}
          >
            {editing ? "Lưu" : "Thêm"}
          </Button>
          {editing && (
            <Button
              color="secondary"
              onClick={() => {
                resetEditor();
              }}
            >
              Hủy
            </Button>
          )}
        </Box>
        <Box display="grid" gap={1}>
          {visibleItems.length ? (
            visibleItems.map((item) => (
              <Box
                key={`${item.id}:${item.name}`}
                display="flex"
                alignItems="center"
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                }}
              >
                <Typography sx={{ flex: 1 }} fontWeight={600}>
                  {item.name}
                </Typography>
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => {
                    setEditing(item);
                    setName(item.name);
                  }}
                >
                  <i className="tabler-edit" />
                </IconButton>
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => remove(item)}
                >
                  <i className="tabler-trash" />
                </IconButton>
              </Box>
            ))
          ) : (
            <Typography color="text.secondary" textAlign="center" py={3}>
              {isCategory ? "Chưa có loại sản phẩm" : "Chưa có đơn vị tính"}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}

function RejectDialog({ open, target, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(reason);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Từ chối duyệt phiếu</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Bạn có chắc chắn muốn từ chối phiếu{" "}
          {target?.type === "export" ? "xuất" : "nhập"} kho{" "}
          <strong>{target?.item?.ticketId || target?.item?.code}</strong>?
        </Typography>
        <CustomTextField
          fullWidth
          label="Lý do từ chối (tùy chọn)"
          placeholder="Nhập lý do để người tạo phiếu nắm được"
          multiline
          minRows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          color="secondary"
          variant="tonal"
          disabled={submitting}
          onClick={onClose}
        >
          Hủy bỏ
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={submitting}
          onClick={handleConfirm}
        >
          {submitting ? "Đang xử lý..." : "Từ chối phiếu"}
        </Button>
      </DialogActions>
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
    units: [],
  });
  const [tab, setTab] = useState("import");
  const [dialog, setDialog] = useState(null);
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [productConfigurationOpen, setProductConfigurationOpen] =
    useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productStatus, setProductStatus] = useState("all");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
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
  const handleApproveTransaction = async (type, item) => {
    try {
      const response = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          id: item.id,
          ticketId: item.ticketId,
          action: "approve",
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Không thể duyệt phiếu");
      toast.success(`Đã duyệt phiếu ${item.ticketId || item.code} thành công`);
      await loadData();
    } catch (error) {
      toast.error(error.message || "Không thể duyệt phiếu");
    }
  };
  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return;
    try {
      const response = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: rejectTarget.type,
          id: rejectTarget.item.id,
          ticketId: rejectTarget.item.ticketId,
          action: "reject",
          rejectReason: reason,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Không thể từ chối phiếu");
      toast.success(
        `Đã từ chối phiếu ${rejectTarget.item.ticketId || rejectTarget.item.code}`,
      );
      await loadData();
    } catch (error) {
      toast.error(error.message || "Không thể từ chối phiếu");
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
  const isApprovedTx = (item) => !item.status || item.status === "approved";
  const stockByCode = useMemo(() => {
    const rows = new Map();
    data.imports.forEach((item) => {
      if (!isApprovedTx(item)) return;
      const key =
        item.documentCode || assetDocumentCodeFromName(item.name || "");
      if (!key || item.quantity === null || item.quantity === undefined) return;
      const current = rows.get(key);
      rows.set(
        key,
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
      if (!isApprovedTx(item)) return;
      const key =
        item.documentCode || assetDocumentCodeFromName(item.name || "");
      if (!key || item.quantity === null || item.quantity === undefined) return;
      const current = rows.get(key) || {
        ...item,
        totalImport: 0,
        totalExport: 0,
        quantity: 0,
      };
      rows.set(key, {
        ...current,
        totalExport: current.totalExport + Number(item.quantity),
        quantity: current.quantity - Number(item.quantity),
      });
    });
    return rows;
  }, [data]);
  const products = useMemo(() => {
    const categoryNames = new Map(
      (data.categories || []).map((item) => [item.id, item.name]),
    );
    return (data.products || []).map((item) => {
      const documentCode = assetDocumentCodeFromName(item.name);
      const matchesProduct = (entry) =>
        (entry.documentCode || assetDocumentCodeFromName(entry.name || "")) ===
        documentCode;
      return {
        ...item,
        documentCode,
        categoryName: categoryNames.get(item.categoryId) || "",
        location:
          stockByCode.get(documentCode)?.location || item.location || "",
        quantity: stockByCode.get(documentCode)?.quantity ?? 0,
        totalImport: data.imports
          .filter((entry) => isApprovedTx(entry) && matchesProduct(entry))
          .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
        totalExport: data.exports
          .filter((entry) => isApprovedTx(entry) && matchesProduct(entry))
          .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
      };
    });
  }, [data, stockByCode]);
  const stockProducts = useMemo(
    () =>
      [
        ...new Map(products.map((item) => [item.documentCode, item])).values(),
      ].sort((left, right) =>
        String(left.name || "").localeCompare(String(right.name || ""), "vi"),
      ),
    [products],
  );
  const activeRows =
    tab === "import"
      ? data.imports
      : tab === "export"
        ? data.exports
        : tab === "products"
          ? products
          : stockProducts;
  const filteredRows = useMemo(
    () =>
      activeRows.filter((row) => {
        const matchesSearch = normalizeSearchText(
          tab === "products"
            ? `${row.code} ${row.name}`
            : `${row.ticketId || ""} ${row.documentCode || ""} ${row.code || ""} ${row.name || ""} ${row.location || ""} ${row.person || ""} ${row.issuedTo || ""} ${row.note || ""} ${row.status === "pending" ? "đang chờ pending" : row.status === "rejected" ? "từ chối rejected" : "đã duyệt approved"}`,
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
      const activeSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!activeSheet) throw new Error("File Excel không có sheet dữ liệu");
      if (excelImportType === "products") {
        const products = XLSX.utils
          .sheet_to_json(activeSheet, { defval: "", raw: true })
          .filter((row) =>
            Object.values(row).some((value) => String(value || "").trim()),
          )
          .map((row) => {
            const categoryName = String(
              pick(row, ["loaisanpham", "loaisp", "category"]),
            ).trim();
            const explicitCategoryId = String(
              pick(row, ["maloaisanpham", "categoryid"]),
            ).trim();
            const matchedCategory = (data.categories || []).find(
              (item) =>
                normalizeSearchText(item.name) ===
                normalizeSearchText(categoryName),
            );
            return {
              code: pick(row, ["masanpham", "masp", "ma", "code"]),
              name: pick(row, ["tensanpham", "tensp", "ten", "name"]),
              categoryId: explicitCategoryId || matchedCategory?.id || "",
              categoryName,
              unit: pick(row, ["donvitinh", "donvi", "unit"]) || "Cái",
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
                normalizeSearchText(
                  pick(row, ["trangthai", "status", "active"]),
                ),
              ),
            };
          });
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
      const mapRows = (sheet, type) =>
        XLSX.utils
          .sheet_to_json(sheet, { defval: "", raw: true })
          .filter((row) =>
            Object.values(row).some((value) => String(value || "").trim()),
          )
          .map((row) => ({
            ticketId: String(
              pick(row, [
                "maphieu",
                "sophieu",
                "ticketid",
                "ticket_id",
                "maticket",
              ]) || "",
            )
              .trim()
              .toUpperCase(),
            documentCode: pick(row, ["sochungtu", "machungtu", "documentcode"]),
            code: pick(row, ["masanpham", "masp", "ma", "code"]),
            name: pick(row, ["tensanpham", "tensp", "ten", "name"]),
            category: pick(row, ["loaisp", "loaisanpham", "category"]),
            unit: pick(row, ["donvitinh", "donvi", "unit"]),
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
            issuedTo:
              type === "export"
                ? pick(row, ["xuatchoai", "nguoinhan", "issuedto"])
                : "",
            note: pick(row, ["ghichu", "note"]),
          }));
      const transactionType =
        excelImportType === "export" ? "export" : "import";
      const rows = mapRows(activeSheet, transactionType);
      if (!rows.length) throw new Error("File không có dữ liệu");
      const response = await fetch("/api/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [transactionType === "import" ? "imports" : "exports"]: rows,
          replaceExcelRows: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await loadData();
      setTab(transactionType);
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
      "Số chứng từ": item.documentCode || "",
      "Ngày nhập": item.date,
      "Loại SP": item.category || "",
      "Mã sản phẩm": item.code,
      "Tên sản phẩm": item.name,
      "Mô tả sản phẩm": item.description || "",
      "Người nhập kho": item.person,
      "Số lượng": item.quantity,
      "Đơn vị tính": item.unit || "",
      "Vị trí": item.location,
      "Ghi chú": item.note || "",
    }));
    const exportRows = data.exports.map((item) => ({
      "Số chứng từ": item.documentCode || "",
      "Ngày xuất": item.date,
      "Loại SP": item.category || "",
      "Mã sản phẩm": item.code,
      "Tên sản phẩm": item.name,
      "Người mượn tài sản": item.person,
      "Xuất cho": item.issuedTo || "",
      "Số lượng": item.quantity,
      "Đơn vị tính": item.unit || "",
      "Ghi chú": item.note || "",
    }));
    const stockRows = products.map((item) => ({
      "Mã SP": item.code,
      "Tên SP": item.name,
      "Loại sản phẩm": item.categoryName || "",
      "Đơn vị tính": item.unit || "",
      "Vị trí": item.location || "",
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
    const sheets = {
      import: { rows: importRows, name: "Nhập kho", file: "nhap_kho" },
      export: { rows: exportRows, name: "Xuất kho", file: "xuat_kho" },
      stock: { rows: stockRows, name: "Tồn kho", file: "ton_kho" },
      products: {
        rows: productRows,
        name: "Danh sách sản phẩm",
        file: "danh_sach_san_pham",
      },
    };
    const current = sheets[tab];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(current.rows),
      current.name,
    );
    XLSX.writeFile(workbook, `${current.file}_${toVietnamDateKey()}.xlsx`);
  };
  const groupedTickets = tab === "import" || tab === "export";
  const groups = new Map();
  filteredRows.forEach((row, index) => {
    // Legacy transactions without a ticket remain separate records.
    const key =
      groupedTickets && row.ticketId
        ? `ticket:${row.ticketId}`
        : `row:${index}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  const pageGroups = [...groups.values()].slice(
    (page - 1) * limit,
    page * limit,
  );
  const pagedRows = pageGroups.flatMap((group, groupIndex) =>
    group.map((row, rowIndex) => ({
      ...row,
      ticketNumber: (page - 1) * limit + groupIndex + 1,
      ticketRowSpan: rowIndex === 0 ? group.length : 0,
    })),
  );
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
            <Box
              display="flex"
              gap={2}
              flexWrap="wrap"
              justifyContent="flex-end"
              sx={{
                width: { xs: "100%", sm: "auto" },
                "& .MuiButton-root": {
                  flex: { xs: "1 1 100%", sm: "0 0 auto" },
                },
              }}
            >
              {canManage && (
                <Button
                  variant="outlined"
                  startIcon={<i className="tabler-download" />}
                  onClick={exportCurrentList}
                >
                  Xuất danh sách hiện tại
                </Button>
              )}
              {canManage && tab !== "stock" && (
                <Button
                  variant="tonal"
                  color="warning"
                  startIcon={<i className="tabler-file-upload" />}
                  disabled={importingExcel}
                  onClick={() => {
                    setExcelImportType(tab);
                    excelInputRef.current?.click();
                  }}
                >
                  {importingExcel ? "Đang import…" : "Import danh sách mới"}
                </Button>
              )}
              {canManage && tab === "products" && (
                <Button
                  variant="contained"
                  startIcon={<i className="tabler-plus" />}
                  onClick={() => {
                    setEditingProduct(null);
                    setProductDialog(true);
                  }}
                >
                  Thêm sản phẩm
                </Button>
              )}
              {tab === "import" && (
                <Button
                  variant="contained"
                  startIcon={<i className="tabler-package-import" />}
                  onClick={() => {
                    setEditingItem(null);
                    setDialog("import");
                  }}
                >
                  Nhập tài sản
                </Button>
              )}
              {tab === "export" && (
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
              )}
            </Box>
          }
        />
      </Card>
      <Card>
        <DataTableToolbar
          itemLabel={groupedTickets ? "phiếu" : "dòng"}
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
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ px: { xs: 2, sm: 5 }, mt: 2 }}
        >
          <Tab
            value="import"
            label={`Nhập kho (${data.imports.filter((item) => !item.status || item.status === "approved").length})`}
          />
          <Tab
            value="export"
            label={`Xuất kho (${data.exports.filter((item) => !item.status || item.status === "approved").length})`}
          />
          <Tab value="stock" label={`Tồn kho (${stockProducts.length})`} />
          <Tab
            value="products"
            label={`Danh sách sản phẩm (${products.length})`}
          />
        </Tabs>
        {tab === "products" && (
          <Box
            sx={{
              px: { xs: 2, sm: 5 },
              py: 2,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
              "& .MuiButton-root": { flex: { xs: "1 1 100%", sm: "0 0 auto" } },
            }}
          >
            {canManage && (
              <Button
                variant="tonal"
                startIcon={<i className="tabler-settings" />}
                onClick={() => setProductConfigurationOpen(true)}
              >
                Cấu hình sản phẩm
              </Button>
            )}
            <Box sx={{ minWidth: { xs: "100%", sm: 190 } }}>
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
          currentUserId={session?.user?.id}
          page={page}
          limit={limit}
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
          onApprove={handleApproveTransaction}
          onReject={(type, item) => setRejectTarget({ type, item })}
        />
        <TablePaginationComponent
          page={page}
          total={groups.size}
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
          categories={data.categories || []}
          currentName={session?.user?.name}
          canManage={canManage}
          editingItem={editingItem}
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
          units={data.units || []}
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
          units={data.units || []}
          readOnly
          onClose={() => setViewingProduct(null)}
          onSaved={loadData}
        />
        <ProductConfigurationDialog
          open={productConfigurationOpen}
          categories={data.categories || []}
          units={data.units || []}
          onClose={() => setProductConfigurationOpen(false)}
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
        <RejectDialog
          open={Boolean(rejectTarget)}
          target={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
        />
        <input
          ref={excelInputRef}
          hidden
          type="file"
          accept=".xlsx,.xls"
          onChange={importExcel}
        />
      </Card>
    </Box>
  );
}
