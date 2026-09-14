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
              variant="outlined"
              onClick={() => signIn("google", { callbackUrl: "/home" })}
              startIcon={
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.715v2.259h2.909c1.703-1.568 2.684-3.879 2.684-6.614Z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.259c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.963 10.709A5.42 5.42 0 0 1 3.682 9c0-.593.102-1.17.281-1.709V4.959H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.041l3.007-2.332Z" />
                  <path fill="#EA4335" d="M9 3.581c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.959l3.007 2.332C4.672 5.165 6.656 3.581 9 3.581Z" />
                </svg>
              }
              sx={{
                bgcolor: "#fff",
                borderColor: "#dadce0",
                color: "#3c4043",
                fontWeight: 600,
                textTransform: "none",
                "&:hover": { bgcolor: "#f8fafd", borderColor: "#c5c9ce" },
              }}
            >
              Tiếp tục với Google
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
