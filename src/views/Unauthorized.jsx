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
        bgcolor: "action.hover",
        p: 4,
      }}
    >
      <Box
        sx={{
          width: "min(100%, 460px)",
          borderRadius: 3,
          bgcolor: "background.paper",
          boxShadow: 3,
          p: { xs: 4, sm: 6 },
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Truy Cập Bị Từ Chối
        </Typography>
        <Typography color="text.secondary" mt={2}>
          Bạn không phải người thuộc công ty, chạy ngay đi nếu không thì:
        </Typography>
        <Box
          component="img"
          src="/images/background/access-deny.webp"
          alt="Truy cập bị từ chối"
          sx={{
            display: "block",
            width: "min(100%, 280px)",
            height: "auto",
            mx: "auto",
            my: 3,
          }}
        />
        <Button component={Link} href="/home" variant="contained" fullWidth>
          Về trang chủ
        </Button>
      </Box>
    </Box>
  );
}
