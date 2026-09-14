"use client";

import { useEffect, useState, useMemo } from "react";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";

import TablePaginationComponent from "@components/TablePaginationComponent";
import AddUserDrawer from "./AddUserDrawer";
import DialogsConfirmation from "./DialogsConfirmation";
import CustomTextField from "@core/components/mui/TextField";
import CustomAvatar from "@core/components/mui/Avatar";
import EditUserDialog from "./EditUserDialog";
import TableFilters from "./TableFilters";
import { getInitials } from "@/utils/getInitials";
import { resolveAvatar } from "@/utils/getDefaultAvatar";
import tableStyles from "@core/styles/table.module.css";

const typeNameMap = {
  type_web_app: "Web/App",
  type_ap: "AP",
  type_peer_admin: "Peer Admin",
};

const categoryNameMap = {
  category_official: "Chính thức",
  category_probation: "Thử việc",
  category_intern: "Thực tập",
  category_collaborator: "Cộng tác viên",
};

const genderNameMap = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
  unspecified: "—",
};

const columnHelper = createColumnHelper();

const UserListTable = ({
  tableData,
  limit,
  setLimit,
  page,
  setPage,
  total,
  role,
  setRole,
  type,
  setType,
  category,
  setCategory,
  fetchUsers,
  onUserUpdated,
  isLoading,
}) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [data, setData] = useState(tableData || []);
  const [globalFilter, setGlobalFilter] = useState("");
  const [openDelete, setOpenDelete] = useState(false);
  const [openUpdate, setOpenUpdate] = useState(false);
  const [choosingId, setChoosingId] = useState("");
  const [updatingUser, setUpdatingUser] = useState(null);
  const [departments, setDepartments] = useState([]);

  // Load departments dynamically
  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setData(tableData || []);
  }, [tableData]);

  // Lọc client-side kết hợp nếu có filter search
  const filteredData = useMemo(() => {
    let result = [...data];
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase().trim();
      result = result.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.code && u.code.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q)),
      );
    }
    if (type) {
      result = result.filter((u) => u.typeId === type);
    }
    if (category) {
      result = result.filter((u) => u.categoryId === category);
    }
    return result;
  }, [data, globalFilter, type, category]);

  // Kích hoạt tài khoản
  const handleActivate = async (user) => {
    const optimisticUser = { ...user, status: "able" };
    onUserUpdated?.(optimisticUser, user);
    setData((prev) =>
      (prev || []).map((u) => (u.id === user.id ? optimisticUser : u)),
    );
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "able" }),
      });
      const updated = await response.json();
      if (response.ok) {
        onUserUpdated?.(updated, optimisticUser);
        toast.success(`Đã kích hoạt tài khoản ${user.name}!`);
        setData((prev) =>
          (prev || []).map((u) => (u.id === user.id ? updated : u)),
        );
      } else {
        onUserUpdated?.(user, optimisticUser);
        setData((prev) =>
          (prev || []).map((u) => (u.id === user.id ? user : u)),
        );
        toast.error(updated.error || "Kích hoạt thất bại");
      }
    } catch (err) {
      onUserUpdated?.(user, optimisticUser);
      setData((prev) => (prev || []).map((u) => (u.id === user.id ? user : u)));
      console.error(err);
      toast.error("Lỗi kết nối");
    }
  };

  // Xóa tài khoản
  const handleDeleteUser = async (id) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (response.ok) {
        toast.success(result.message || "Xóa thành công");
        setData((prev) => (prev || []).filter((u) => u.id !== id));
        if (fetchUsers) fetchUsers();
      } else {
        toast.error(result.error || "Xóa thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối");
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Nhân sự",
        cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <CustomAvatar
              src={resolveAvatar(row.original)}
              size={36}
              color={row.original.role === "admin" ? "error" : "primary"}
            >
              {getInitials(row.original.name || "User")}
            </CustomAvatar>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography
                color="text.primary"
                fontWeight={600}
                className="hover:text-primary cursor-pointer"
              >
                {row.original.name}
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
          <Typography fontWeight={600} color="primary.main" variant="body2">
            {row.original.code || "—"}
          </Typography>
        ),
      }),
      columnHelper.accessor("gender", {
        header: "Giới tính",
        cell: ({ row }) => (
          <Typography variant="body2">
            {genderNameMap[row.original.gender] || "—"}
          </Typography>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Số điện thoại",
        cell: ({ row }) => (
          <Typography variant="body2">{row.original.phone || "—"}</Typography>
        ),
      }),
      columnHelper.accessor("typeId", {
        header: "Bộ phận",
        cell: ({ row }) => (
          <Chip
            size="small"
            label={(() => {
              const dept = departments.find(
                (d) => d.id === row.original.typeId,
              );
              return dept ? dept.name : row.original.typeId || "Chưa gán";
            })()}
            variant="tonal"
            color="info"
          />
        ),
      }),
      columnHelper.accessor("categoryId", {
        header: "Hình thức",
        cell: ({ row }) => (
          <Typography variant="body2">
            {categoryNameMap[row.original.categoryId] ||
              row.original.categoryId ||
              "—"}
          </Typography>
        ),
      }),
      columnHelper.accessor("role", {
        header: "Vai trò",
        cell: ({ row }) => (
          <Chip
            size="small"
            icon={
              <i
                className={
                  row.original.role === "admin"
                    ? "tabler-crown text-sm"
                    : "tabler-user text-sm"
                }
              />
            }
            label={
              row.original.role === "admin" ? "Quản trị viên" : "Nhân viên"
            }
            color={row.original.role === "admin" ? "error" : "secondary"}
            variant="tonal"
          />
        ),
      }),
      columnHelper.accessor("status", {
        header: "Trạng thái",
        cell: ({ row }) => {
          const isAble = row.original.status === "able";
          return (
            <Chip
              size="small"
              label={isAble ? "Hoạt động" : "Chờ duyệt"}
              color={isAble ? "success" : "warning"}
              variant="tonal"
            />
          );
        },
      }),
      columnHelper.accessor("action", {
        header: isAdmin ? "Thao tác" : "",
        cell: ({ row }) => {
          if (!isAdmin) return null;
          const isAble = row.original.status === "able";
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {!isAble && (
                <Tooltip title="Kích hoạt tài khoản">
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    sx={{ minWidth: "auto", px: 2, py: 0.5, fontSize: 12 }}
                    onClick={() => handleActivate(row.original)}
                  >
                    Kích hoạt
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="Chỉnh sửa">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => {
                    setUpdatingUser(row.original);
                    setOpenUpdate(true);
                  }}
                >
                  <i className="tabler-edit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Xóa">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setChoosingId(row.original.id);
                    setOpenDelete(true);
                  }}
                >
                  <i className="tabler-trash" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, departments, isAdmin],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CustomAvatar variant="rounded" skin="light" color="primary">
                <i className="tabler-users text-2xl" />
              </CustomAvatar>
              <Box>
                <Typography variant="h5" fontWeight={600}>
                  Nhân Sự Đang Hoạt Động
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Quản lý hồ sơ, phân quyền và phân loại bộ phận chuyên môn
                </Typography>
              </Box>
            </Box>
          }
        />
        <Divider />

        {/* Bộ lọc Filter */}
        <TableFilters
          role={role}
          setRole={setRole}
          type={type}
          setType={setType}
          category={category}
          setCategory={setCategory}
        />
        <Divider />

        {/* Thanh công cụ Tìm kiếm & Action */}
        <Box
          sx={{
            p: 4,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Hiển thị
            </Typography>
            <CustomTextField
              select
              size="small"
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              sx={{ width: 80 }}
            >
              <MenuItem value="10">10</MenuItem>
              <MenuItem value="25">25</MenuItem>
              <MenuItem value="50">50</MenuItem>
            </CustomTextField>
            <Typography variant="body2" color="text.secondary">
              dòng
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <CustomTextField
              size="small"
              placeholder="Tìm theo tên, email, mã NV..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              sx={{ minWidth: 260 }}
              InputProps={{
                startAdornment: (
                  <i className="tabler-search text-gray-400 mr-2" />
                ),
              }}
            />

            <Button
              variant="tonal"
              color="secondary"
              startIcon={<i className="tabler-file-spreadsheet" />}
              onClick={() => {
                window.open("/api/users?export=excel", "_blank");
              }}
            >
              Xuất Excel
            </Button>

            {isAdmin && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<i className="tabler-plus" />}
                onClick={() => setAddUserOpen(true)}
              >
                Thêm nhân sự
              </Button>
            )}
          </Box>
        </Box>

        {/* Bảng dữ liệu TanStack Table */}
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
                      Không tìm thấy nhân sự phù hợp
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

        {/* Phân trang */}
        <TablePaginationComponent
          page={page}
          total={total}
          limit={limit}
          onPageChange={(_, newPage) => setPage(newPage + 1)}
        />
      </Card>

      {/* Drawer thêm nhân sự */}
      <AddUserDrawer
        open={addUserOpen}
        handleClose={() => setAddUserOpen(false)}
        setData={setData}
      />

      {/* Dialog sửa nhân sự */}
      <EditUserDialog
        openUpdate={openUpdate}
        setOpenUpdate={setOpenUpdate}
        updatingUser={updatingUser}
        setUpdatingUser={setUpdatingUser}
        setData={setData}
        onUserUpdated={onUserUpdated}
      />

      {/* Confirmation Dialog khi xóa */}
      <DialogsConfirmation
        open={openDelete}
        setOpen={setOpenDelete}
        choosingId={choosingId}
        handleDelete={handleDeleteUser}
      />
    </>
  );
};

export default UserListTable;
