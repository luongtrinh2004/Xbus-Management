import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUsers, saveUsers, appendAuditLog } from "@/libs/jsonRepository";
import bcrypt from "bcryptjs";

const secret = process.env.NEXTAUTH_SECRET;

export async function PATCH(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    const { id } = await params;
    const body = await req.json();

    const users = getUsers();
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 },
      );
    }

    const oldUser = users[index];
    const hasPointChange =
      Object.prototype.hasOwnProperty.call(body, "schedulingPoints") &&
      body.schedulingPoints !== oldUser.schedulingPoints;
    const pointDelta =
      Number(body.schedulingPoints) - Number(oldUser.schedulingPoints || 0);

    if (hasPointChange) {
      if (token?.role !== "admin") {
        return NextResponse.json(
          { error: "Chỉ quản trị viên được điều chỉnh điểm rèn luyện" },
          { status: 403 },
        );
      }
      if (!Number.isInteger(pointDelta) || body.schedulingPoints < 0) {
        return NextResponse.json(
          { error: "Điểm rèn luyện phải là số nguyên không âm" },
          { status: 400 },
        );
      }
    }
    if (body.password) {
      if (typeof body.password !== "string" || body.password.length < 6) {
        return NextResponse.json(
          { error: "Mật khẩu mới cần có ít nhất 6 ký tự" },
          { status: 400 },
        );
      }
      body.password = await bcrypt.hash(body.password, 10);
    }
    const updatedUser = {
      ...oldUser,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Nếu kích hoạt
    if (body.status === "able" && oldUser.status !== "able") {
      updatedUser.activatedAt = new Date().toISOString();
      updatedUser.activatedBy = token?.id || "admin";
    }

    users[index] = updatedUser;
    saveUsers(users);

    appendAuditLog({
      adminId: token?.id || "admin",
      adminName: token?.name || "Admin",
      adminEmail: token?.email || "admin@phenikaa-x.com",
      action: hasPointChange ? "UPDATE_EXTRACURRICULAR_POINTS" : "UPDATE_USER",
      targetType: "USER",
      targetId: id,
      details: hasPointChange
        ? `${token?.name || "Quản trị viên"} đã ${pointDelta > 0 ? "tăng" : "giảm"} ${Math.abs(pointDelta)} điểm rèn luyện cho ${updatedUser.name} (${updatedUser.code}).`
        : `Cập nhật thông tin nhân sự ${updatedUser.name} (${updatedUser.code}): ${Object.keys(body).join(", ")}`,
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("[API Users ID] Lỗi PATCH:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    const { id } = await params;

    const users = getUsers();
    const userToDelete = users.find((u) => u.id === id);

    if (!userToDelete) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 },
      );
    }

    const filteredUsers = users.filter((u) => u.id !== id);
    saveUsers(filteredUsers);

    appendAuditLog({
      adminId: token?.id || "admin",
      adminName: token?.name || "Admin",
      adminEmail: token?.email || "admin@phenikaa-x.com",
      action: "DELETE_USER",
      targetType: "USER",
      targetId: id,
      details: `Xóa nhân sự ${userToDelete.name} (${userToDelete.code} - ${userToDelete.email})`,
    });

    return NextResponse.json(
      { message: "Người dùng đã được xóa thành công" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API Users ID] Lỗi DELETE:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
