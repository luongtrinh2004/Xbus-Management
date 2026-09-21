import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Định nghĩa kiểu role và quyền truy cập
type Role = "user" | "assistant" | "admin";

const accessControl: Record<Role, string[]> = {
  user: [
    "/home",
    "/users",
    "/water-schedule",
    "/fund",
    "/assets",
    "/afternoon-tea",
  ],
  assistant: [
    "/home",
    "/users",
    "/water-schedule",
    "/fund",
    "/assets",
    "/afternoon-tea",
    "/audit-logs",
    "/edit-database",
  ],
  admin: ["*"], // Admin có thể truy cập tất cả (bao gồm /audit-logs)
};

// Danh sách route công khai không yêu cầu đăng nhập
const publicRoutes = ["/login", "/pending-approval", "/401", "/404"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();

  // Bỏ qua các tài nguyên tĩnh và API auth nội bộ
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Lấy token từ NextAuth
  const token = await getToken({ req });

  // 1. Nếu là route công khai (public)
  if (publicRoutes.includes(pathname)) {
    // Nếu đã đăng nhập rồi mà vẫn vào /login -> chuyển về /home
    if (token && pathname === "/login") {
      url.pathname = token.status === "disabled" ? "/pending-approval" : "/home";
      return NextResponse.redirect(url);
    }
    if (token && pathname === "/pending-approval" && token.status !== "disabled") {
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
    // Cho phép truy cập bình thường (tuyệt đối không chặn 401 tại đây)
    return NextResponse.next();
  }

  // 2. Nếu chưa đăng nhập mà truy cập trang bảo vệ -> chuyển hướng về /login
  if (!token) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (token.status === "disabled") {
    url.pathname = "/pending-approval";
    return NextResponse.redirect(url);
  }

  // 3. Nếu đã đăng nhập, kiểm tra quyền hạn role
  const role = (token?.role as Role) || "user";
  const allowedRoutes = accessControl[role] || accessControl.user;

  // Nếu role không có quyền truy cập trang này (ví dụ user thường vào /audit-logs) -> 401
  if (!allowedRoutes.includes("*") && !allowedRoutes.includes(pathname)) {
    url.pathname = "/401";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Áp dụng middleware cho các route cần kiểm soát
export const config = {
  matcher: [
    "/home",
    "/users",
    "/water-schedule",
    "/fund",
    "/assets",
    "/afternoon-tea",
    "/audit-logs",
    "/login",
    "/pending-approval",
    "/401",
  ],
};
