"use client";

import { useState } from "react";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid2";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "react-toastify";
import CustomTextField from "@core/components/mui/TextField";
import CustomAvatar from "@core/components/mui/Avatar";
import tableStyles from "@core/styles/table.module.css";
import { getInitials } from "@/utils/getInitials";
import { resolveAvatar } from "@/utils/getDefaultAvatar";

const columnHelper = createColumnHelper();

const typeOptions = [
  { value: "type_web_app", label: "Web/App" },
  { value: "type_ap", label: "AP" },
  { value: "type_peer_admin", label: "Peer Admin" },
];

const categoryOptions = [
  { value: "category_official", label: "Chính thức" },
  { value: "category_probation", label: "Thử việc" },
  { value: "category_intern", label: "Thực tập" },
  { value: "category_collaborator", label: "Cộng tác viên" },
];

const genderOptions = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
  { value: "unspecified", label: "Chưa xác định" },
];

export default function PendingUsersTable({ tableData, onUserUpdated }) {
  const [activateOpen, setActivateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({});

  const openActivateDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      code: user.code || "",
      role: user.role || "user",
      typeId: user.typeId || "type_web_app",
      categoryId: user.categoryId || "category_official",
      gender: user.gender || "male",
      phone: user.phone || "",
    });
    setActivateOpen(true);
  };

  const handleActivate = async () => {
    if (!selectedUser) return;
    const optimisticUser = { ...selectedUser, ...formData, status: "able" };
    onUserUpdated?.(optimisticUser, selectedUser);
    setActivateOpen(false);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status: "able" }),
      });
      const result = await response.json();
      if (response.ok) {
        onUserUpdated?.(result, optimisticUser);
        toast.success(`Đã kích hoạt tài khoản ${result.name}!`);
      } else {
        onUserUpdated?.(selectedUser, optimisticUser);
        toast.error(result.error || "Kích hoạt thất bại");
      }
    } catch (err) {
      onUserUpdated?.(selectedUser, optimisticUser);
      toast.error("Lỗi kết nối");
    }
  };

  const columns = [
    columnHelper.accessor("name", {
      header: "Nhân sự",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CustomAvatar
            src={resolveAvatar(row.original)}
            size={34}
            color="warning"
          >
            {getInitials(row.original.name || row.original.email || "U")}
          </CustomAvatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.original.name || "(Chưa đặt tên)"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.original.email}
            </Typography>
          </Box>
        </Box>
      ),
    }),
    columnHelper.accessor("code", {
      header: "Mã NV",
      cell: ({ row }) => (
        <Typography
          variant="body2"
          color={row.original.code ? "primary.main" : "text.disabled"}
          fontWeight={600}
        >
          {row.original.code || "—"}
        </Typography>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Ngày đăng ký",
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString("vi-VN")
            : "—"}
        </Typography>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Trạng thái",
      cell: () => (
        <Chip
          size="small"
          label="Chờ kích hoạt"
          color="warning"
          variant="tonal"
        />
      ),
    }),
    columnHelper.accessor("action", {
      header: "Thao tác",
      cell: ({ row }) => (
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<i className="tabler-user-check text-sm" />}
          onClick={() => openActivateDialog(row.original)}
        >
          Thiết lập & Kích hoạt
        </Button>
      ),
    }),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CustomAvatar variant="rounded" skin="light" color="warning">
                <i className="tabler-user-pause text-2xl" />
              </CustomAvatar>
              <Box>
                <Typography variant="h5" fontWeight={600}>
                  Tài Khoản Chờ Kích Hoạt
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tableData.length} tài khoản chưa được kích hoạt — Admin thiết
                  lập và phê duyệt
                </Typography>
              </Box>
            </Box>
          }
        />
        <Divider />
        <Box sx={{ overflowX: "auto" }}>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8">
                    <Typography color="text.secondary">
                      Không có tài khoản chờ kích hoạt
                    </Typography>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-actionHover">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Card>

      {/* Dialog thiết lập và kích hoạt */}
      <Dialog
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle component="div">
          <Typography
            variant="h5"
            fontWeight={600}
            component="span"
            display="block"
          >
            Thiết Lập & Kích Hoạt Tài Khoản
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            component="span"
            display="block"
          >
            {selectedUser?.email}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label="Họ và tên"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label="Mã nhân sự"
                value={formData.code || ""}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="VD: PNKX001"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                select
                fullWidth
                label="Vai trò"
                value={formData.role || "user"}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <MenuItem value="user">Nhân viên (User)</MenuItem>
                <MenuItem value="admin">Quản trị viên (Admin)</MenuItem>
                <MenuItem value="assistant">Trợ lý</MenuItem>
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                select
                fullWidth
                label="Giới tính"
                value={formData.gender || "male"}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
              >
                {genderOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                select
                fullWidth
                label="Bộ phận"
                value={formData.typeId || "type_web_app"}
                onChange={(e) =>
                  setFormData({ ...formData, typeId: e.target.value })
                }
              >
                {typeOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                select
                fullWidth
                label="Hình thức"
                value={formData.categoryId || "category_official"}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
              >
                {categoryOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                label="Số điện thoại"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="0987654321"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            variant="tonal"
            color="secondary"
            onClick={() => setActivateOpen(false)}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleActivate}
            startIcon={<i className="tabler-user-check" />}
          >
            Kích hoạt tài khoản
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
