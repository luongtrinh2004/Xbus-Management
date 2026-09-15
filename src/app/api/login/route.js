import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { getUsers } from "@/libs/dataRepository";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const user = (await getUsers()).find(
      (item) => item.email?.toLowerCase() === email?.trim().toLowerCase(),
    );

    if (!user) {
      return NextResponse.json(
        { error: "Tài khoản không tồn tại" },
        { status: 404 },
      );
    }

    // So sánh mật khẩu đã nhập với mật khẩu được mã hóa trong database
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return NextResponse.json(
        { error: "Thông tin đăng nhập không hợp lệ" },
        { status: 401 },
      );
    }

    // Không trả password về client
    const { password: _, ...userData } = user;

    return NextResponse.json(userData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra, vui lòng thử lại sau" },
      { status: 500 },
    );
  }
}
