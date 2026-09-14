"use client";

import { useState } from "react";
import Grid from "@mui/material/Grid2";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import UserListTable from "./components/UserListTable";
import PendingUsersTable from "./components/PendingUsersTable";

const Page = () => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const queryClient = useQueryClient();
  // Filters for active users table (status cố định là 'able')
  const [role, setRole] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  // Fetch active users (chỉ status = 'able')
  const fetchUsers = async ({ queryKey }) => {
    const [_key, { role, type, category, page, limit, sortBy, sortOrder }] = queryKey;
    const queryParams = new URLSearchParams({
      status: "able",
      ...(role && { role }),
      ...(type && { type }),
      ...(category && { category }),
      page: page.toString(),
      limit: limit.toString(),
      ...(sortBy && { sortBy, sortOrder }),
    });
    const response = await fetch(`/api/users?${queryParams.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users", { role, type, category, page, limit, sortBy, sortOrder }],
    queryFn: fetchUsers,
    placeholderData: (previousData) => previousData,
    staleTime: 10000,
  });

  // Fetch disabled/pending users (status = 'disabled')
  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ["users-pending"],
    queryFn: async () => {
      const res = await fetch("/api/users?status=disabled&limit=100");
      return res.json();
    },
    staleTime: 10000,
  });

  const usersList = data?.data || [];
  const totalCount = data?.pagination?.totalUsers || usersList.length;
  const pendingList = pendingData?.data || [];

  const handleRefreshAll = () => {
    refetch();
    refetchPending();
  };

  const handleUserUpdated = (user, previousUser) => {
    const updateList = (old, status) => {
      if (!old) return old;
      const current = old.data || [];
      const alreadyInList = current.some((item) => item.id === user.id);
      const withoutUser = current.filter((item) => item.id !== user.id);
      const data =
        user.status === status ? [user, ...withoutUser] : withoutUser;
      const totalDelta =
        user.status === status
          ? alreadyInList
            ? 0
            : 1
          : alreadyInList
            ? -1
            : 0;
      return {
        ...old,
        data,
        pagination: old.pagination
          ? {
              ...old.pagination,
              totalUsers: Math.max(0, old.pagination.totalUsers + totalDelta),
            }
          : old.pagination,
      };
    };

    queryClient.setQueriesData({ queryKey: ["users"] }, (old) =>
      updateList(old, "able"),
    );
    queryClient.setQueryData(["users-pending"], (old) =>
      updateList(old, "disabled"),
    );
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">
          Đang tải danh sách nhân sự...
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={6}>
      {/* Bảng 1: Nhân sự đang hoạt động (status = able) */}
      <Grid size={{ xs: 12 }}>
        <UserListTable
          tableData={usersList}
          role={role}
          setRole={setRole}
          type={type}
          setType={setType}
          category={category}
          setCategory={setCategory}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          total={totalCount}
          fetchUsers={handleRefreshAll}
          onUserUpdated={handleUserUpdated}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(column) => {
            setSortOrder(sortBy === column && sortOrder === "asc" ? "desc" : "asc");
            setSortBy(column);
            setPage(1);
          }}
        />
      </Grid>

      {/* Bảng 2: Tài khoản chờ kích hoạt (status = disabled/pending) */}
      {isAdmin && (
        <Grid size={{ xs: 12 }}>
          <PendingUsersTable
            tableData={pendingList}
            onUserUpdated={handleUserUpdated}
            onRefresh={handleRefreshAll}
          />
        </Grid>
      )}
    </Grid>
  );
};

export default Page;
