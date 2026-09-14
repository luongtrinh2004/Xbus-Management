"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function Unauthorized() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        p: 4,
      }}
    >
      <Box>
        <Typography variant="h1" color="error.main">
          401
        </Typography>
        <Typography variant="h4" mt={2}>
          Bạn không có quyền truy cập
        </Typography>
        <Typography color="text.secondary" mt={1} mb={4}>
          Vui lòng quay lại trang phù hợp với quyền tài khoản của bạn.
        </Typography>
        <Button component={Link} href="/home" variant="contained">
          Về trang chủ
        </Button>
      </Box>
    </Box>
  );
}
