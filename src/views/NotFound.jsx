"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function NotFound() {
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
        <Typography variant="h1" color="primary.main">
          404
        </Typography>
        <Typography variant="h4" mt={2}>
          Không tìm thấy trang
        </Typography>
        <Typography color="text.secondary" mt={1} mb={4}>
          Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi.
        </Typography>
        <Button component={Link} href="/home" variant="contained">
          Về trang chủ
        </Button>
      </Box>
    </Box>
  );
}
