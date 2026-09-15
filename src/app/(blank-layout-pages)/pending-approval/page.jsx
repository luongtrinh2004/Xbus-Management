"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const { data, update } = useSession();
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(async () => {
      const session = await update();
      if (session?.user?.status === "able") router.replace("/home");
    }, 10000);
    return () => clearInterval(timer);
  }, [router, update]);
  return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "start center", p: 3, pt: { xs: 6, sm: 10 }, bgcolor: "background.default" }}>
    <Card sx={{ width: "100%", maxWidth: 460, textAlign: "center", boxShadow: 3 }}><CardContent sx={{ p: { xs: 4, sm: 6 } }}>
      <Typography variant="h4" fontWeight={700}>Tài khoản đang chờ duyệt</Typography>
      <Typography color="text.secondary" sx={{ mt: 2 }}>Tài khoản <strong>{data?.user?.email}</strong> đã được ghi nhận. Vui lòng chờ Quản trị viên kích hoạt.</Typography>
      <Box component="img" src="/images/background/pending-approval.png" alt="Tài khoản đang chờ duyệt" sx={{ display: "block", width: "min(100%, 280px)", height: "auto", mx: "auto", my: 3 }} />
      <Button variant="tonal" color="secondary" startIcon={<i className="tabler-logout" />} onClick={() => signOut({ callbackUrl: "/login" })}>Quay lại đăng nhập</Button>
    </CardContent></Card>
  </Box>;
}
