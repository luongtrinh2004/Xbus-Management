"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@core/components/mui/TextField";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) setError("Email hoặc mật khẩu không đúng");
    else router.push("/home");
  };
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 3,
        bgcolor: "background.default",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 6 }}>
          <Typography variant="h4">Đăng nhập</Typography>
          <Typography color="text.secondary" mt={1} mb={4}>
            Xbus Team Management
          </Typography>
          <Box
            component="form"
            onSubmit={submit}
            sx={{ display: "grid", gap: 3 }}
          >
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <Typography variant="body2" color="error.main">
                {error}
              </Typography>
            )}
            <Button type="submit" variant="contained">
              Đăng nhập
            </Button>
            <Button
              variant="tonal"
              onClick={() => signIn("google", { callbackUrl: "/home" })}
            >
              Đăng nhập với Google
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
