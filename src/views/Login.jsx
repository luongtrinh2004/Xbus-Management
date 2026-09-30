"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import InputBase from "@mui/material/InputBase";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import XMobilityLogo from "@/components/XMobilityLogo";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isTransitioned, setIsTransitioned] = useState(false);

  // Khi logo chạy xong full XMobility: dừng nhẹ 280ms rồi thu nhỏ và đẩy lên trên
  const handleLogoComplete = useCallback(() => {
    setTimeout(() => {
      setIsTransitioned(true);
    }, 280);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || googleLoading) return;

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email hoặc mật khẩu không chính xác");
        setLoading(false);
      } else {
        router.push("/home");
      }
    } catch (err) {
      setError("Có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) return;
    setError("");
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/home" });
    } catch (err) {
      setError("Không thể kết nối với dịch vụ Google. Vui lòng thử lại.");
      setGoogleLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f8fafd",
        p: { xs: 2.5, sm: 4 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Container bọc Logo và Popup Login */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: 420,
          position: "relative",
        }}
      >
        {/* VÙNG LOGO XMOBILITY:
            - Mới đầu: to rõ ràng, căn chính giữa màn hình.
            - Load xong hết: mượt mà thu nhỏ và trượt lên phía trên.
            - Giữ nguyên full XMobility không bị co lại.
        */}
        <Box
          sx={{
            width: "100%",
            maxWidth: isTransitioned
              ? { xs: 260, sm: 290 }
              : { xs: 340, sm: 520, md: 560 },
            transform: isTransitioned
              ? "translateY(0) scale(1)"
              : {
                  xs: "translateY(190px) scale(1.35)",
                  sm: "translateY(225px) scale(1.45)",
                  md: "translateY(235px) scale(1.5)",
                },
            transformOrigin: "center center",
            transition:
              "transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.85s cubic-bezier(0.16, 1, 0.3, 1)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: isTransitioned ? { xs: 2.5, sm: 3 } : 0,
            zIndex: 2,
          }}
        >
          <XMobilityLogo
            onComplete={handleLogoComplete}
            style={{ width: "100%" }}
          />
        </Box>

        {/* POPUP / CARD ĐĂNG NHẬP:
            - Xuất hiện mượt mà sau khi logo thu nhỏ và trượt lên.
            - Nổi bật với shadow và viền hiện đại, nút primary rực rỡ.
        */}
        <Box
          sx={{
            width: "100%",
            opacity: isTransitioned ? 1 : 0,
            transform: isTransitioned
              ? "translateY(0) scale(1)"
              : "translateY(35px) scale(0.95)",
            pointerEvents: isTransitioned ? "auto" : "none",
            transition:
              "opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
            zIndex: 1,
          }}
        >
          <Card
            elevation={0}
            sx={{
              borderRadius: { xs: "20px", sm: "24px" },
              bgcolor: "#ffffff",
              border: "1px solid rgba(226, 232, 240, 0.85)",
              boxShadow:
                "0 25px 50px -12px rgba(32, 146, 236, 0.12), 0 10px 20px -5px rgba(36, 57, 114, 0.05), 0 0 1px 1px rgba(226, 232, 240, 0.7)",
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: { xs: 3.5, sm: 4.5 } }}>
              {/* Tiêu đề Đăng nhập */}
              <Typography
                component="h1"
                sx={{
                  textAlign: "center",
                  color: "#243972",
                  fontWeight: 700,
                  fontSize: { xs: "1.35rem", sm: "1.5rem" },
                  letterSpacing: "-0.01em",
                  mb: 3.5,
                }}
              >
                Đăng nhập
              </Typography>

              {/* Thông báo lỗi nếu có */}
              {error && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    p: 1.5,
                    mb: 3,
                    bgcolor: "#fef2f2",
                    border: "1px solid #fee2e2",
                    borderRadius: "12px",
                    color: "#b91c1c",
                    fontSize: "13px",
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </Box>
              )}

              {/* Form đăng nhập */}
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}
              >
                {/* Field Email */}
                <Box>
                  <Typography
                    component="label"
                    htmlFor="login-email"
                    sx={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#475569",
                      mb: 0.75,
                    }}
                  >
                    Email
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      bgcolor: "#f8fafd",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      px: 1.75,
                      height: 46,
                      transition: "all 0.2s ease",
                      "&:focus-within": {
                        borderColor: "var(--mui-palette-primary-main, #2092EC)",
                        bgcolor: "#ffffff",
                        boxShadow: "0 0 0 3px rgba(32, 146, 236, 0.15)",
                      },
                    }}
                  >
                    <InputBase
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      fullWidth
                      sx={{
                        fontSize: "14px",
                        color: "#1e293b",
                        "& input": {
                          p: 0,
                          "&::placeholder": {
                            color: "#94a3b8",
                            opacity: 1,
                          },
                        },
                      }}
                    />
                  </Box>
                </Box>

                {/* Field Mật khẩu */}
                <Box>
                  <Typography
                    component="label"
                    htmlFor="login-password"
                    sx={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#475569",
                      mb: 0.75,
                    }}
                  >
                    Mật khẩu
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      bgcolor: "#f8fafd",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      px: 1.75,
                      height: 46,
                      transition: "all 0.2s ease",
                      "&:focus-within": {
                        borderColor: "var(--mui-palette-primary-main, #2092EC)",
                        bgcolor: "#ffffff",
                        boxShadow: "0 0 0 3px rgba(32, 146, 236, 0.15)",
                      },
                    }}
                  >
                    <InputBase
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      required
                      fullWidth
                      sx={{
                        fontSize: "14px",
                        color: "#1e293b",
                        "& input": {
                          p: 0,
                          "&::placeholder": {
                            color: "#94a3b8",
                            opacity: 1,
                          },
                        },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      sx={{ color: "#64748b", p: 0.5 }}
                    >
                      {showPassword ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </IconButton>
                  </Box>
                </Box>

                {/* Nút Đăng nhập: Màu xanh Primary chuẩn */}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || googleLoading}
                  sx={{
                    bgcolor: "var(--mui-palette-primary-main, #2092EC)",
                    color: "#ffffff",
                    height: 46,
                    borderRadius: "12px",
                    fontSize: "14.5px",
                    fontWeight: 600,
                    textTransform: "none",
                    mt: 1,
                    boxShadow: "0 4px 14px rgba(32, 146, 236, 0.35)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: "var(--mui-palette-primary-dark, #176BAC)",
                      boxShadow: "0 6px 18px rgba(32, 146, 236, 0.45)",
                    },
                    "&:active": {
                      transform: "scale(0.99)",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} sx={{ color: "#ffffff" }} />
                  ) : (
                    "Đăng nhập"
                  )}
                </Button>

                {/* Dòng phân cách "hoặc" */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    my: 0.5,
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1, height: "1px", bgcolor: "#e2e8f0" }} />
                  <Typography
                    variant="caption"
                    sx={{ color: "#94a3b8", fontWeight: 500, fontSize: "12px" }}
                  >
                    hoặc
                  </Typography>
                  <Box sx={{ flex: 1, height: "1px", bgcolor: "#e2e8f0" }} />
                </Box>

                {/* Nút Đăng nhập bằng Google */}
                <Button
                  type="button"
                  variant="outlined"
                  disabled={loading || googleLoading}
                  onClick={handleGoogleSignIn}
                  startIcon={
                    googleLoading ? (
                      <CircularProgress
                        size={18}
                        sx={{ color: "var(--mui-palette-primary-main, #2092EC)" }}
                      />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        aria-hidden="true"
                      >
                        <path
                          fill="#4285F4"
                          d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.715v2.259h2.909c1.703-1.568 2.684-3.879 2.684-6.614Z"
                        />
                        <path
                          fill="#34A853"
                          d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.259c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M3.963 10.709A5.42 5.42 0 0 1 3.682 9c0-.593.102-1.17.281-1.709V4.959H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.041l3.007-2.332Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M9 3.581c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.959l3.007 2.332C4.672 5.165 6.656 3.581 9 3.581Z"
                        />
                      </svg>
                    )
                  }
                  sx={{
                    bgcolor: "#ffffff",
                    borderColor: "#dce3ef",
                    color: "#374151",
                    height: 46,
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    textTransform: "none",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: "#f8fafd",
                      borderColor: "var(--mui-palette-primary-main, #2092EC)",
                      color: "var(--mui-palette-primary-main, #2092EC)",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    },
                    "&:active": {
                      transform: "scale(0.99)",
                    },
                  }}
                >
                  {googleLoading ? "Đang kết nối..." : "Đăng nhập bằng Google"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
