import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getUsers,
  saveUsers,
  appendAuditLog,
  getFunds,
  getWaterSchedules,
  getAssets,
} from "@/libs/dataRepository";
import fs from "fs";
import path from "path";

const secret = process.env.NEXTAUTH_SECRET;
const normalizeStaffCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();
const AVATARS_DIR = path.join(process.cwd(), "public", "images", "avatars");
const DEFAULT_AVATAR_FILES = new Set([
  "male-admin.png",
  "female-admin.png",
  "male-user.png",
  "female-user.png",
  "assistant.png",
]);

const moveAvatarToStaffCode = (avatarUrl, previousCode, nextCode) => {
  const prefixes = ["/images/avatars/", "/api/media/avatars/"];
  const prefix = prefixes.find((item) => avatarUrl?.startsWith(item));
  if (!prefix || previousCode === nextCode) return avatarUrl;
  let relativePath;
  try {
    relativePath = decodeURIComponent(
      avatarUrl.split("?")[0].replace(prefix, ""),
    );
  } catch {
    return avatarUrl;
  }
  const fileName = path.basename(relativePath);
  if (DEFAULT_AVATAR_FILES.has(fileName)) return avatarUrl;

  const sourcePath = path.resolve(AVATARS_DIR, relativePath);
  const avatarRoot = path.resolve(AVATARS_DIR);
  if (
    !sourcePath.startsWith(`${avatarRoot}${path.sep}`) ||
    !fs.existsSync(sourcePath)
  )
    return avatarUrl;

  const extension = path.extname(fileName) || ".jpg";
  const targetDir = path.join(AVATARS_DIR, nextCode);
  const targetPath = path.join(targetDir, `${nextCode}${extension}`);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.renameSync(sourcePath, targetPath);
  const sourceDir = path.dirname(sourcePath);
  if (path.dirname(sourceDir) === avatarRoot && fs.existsSync(sourceDir))
    fs.rmSync(sourceDir, { recursive: true, force: true });
  return `/api/media/avatars/${encodeURIComponent(nextCode)}/${encodeURIComponent(`${nextCode}${extension}`)}?v=${Date.now()}`;
};

export async function PATCH(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (token?.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên có quyền cập nhật nhân sự" },
        { status: 403 },
      );
    }
    const { id } = await params;
    const body = await req.json();

    const users = await getUsers();
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 },
      );
    }

    const oldUser = users[index];
    if (body.phone && !/^(\+84|0)\d{9,10}$/.test(body.phone))
      return NextResponse.json(
        { error: "Số điện thoại không hợp lệ" },
        { status: 400 },
      );
    if (body.citizenId && !/^\d{9,12}$/.test(body.citizenId))
      return NextResponse.json(
        { error: "CCCD phải gồm 9 đến 12 chữ số" },
        { status: 400 },
      );
    if (
      body.citizenId &&
      users.some((user) => user.id !== id && user.citizenId === body.citizenId)
    )
      return NextResponse.json(
        { error: "Số CCCD đã được sử dụng" },
        { status: 409 },
      );
    const currentDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date());
    if (
      [body.birthday, body.citizenIssuedDate, body.joinedDate].some(
        (date) => date && date > currentDate,
      )
    )
      return NextResponse.json(
        { error: "Ngày hồ sơ không được lớn hơn ngày hiện tại" },
        { status: 400 },
      );
    if (body.status && body.status !== "able" && oldUser.status === "able") {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date());
      const futureSchedule = (await getWaterSchedules()).find(
        (schedule) =>
          String(schedule.date || "")
            .split("/")
            .reverse()
            .join("-") >= today &&
          schedule.status !== "completed" &&
          (schedule.participants || []).some(
            (participant) => participant.userId === id,
          ),
      );
      if (futureSchedule)
        return NextResponse.json(
          {
            error:
              "Nhân sự đang có lịch phân công trong tương lai. Vui lòng phân công lại trước khi ngừng hoạt động.",
          },
          { status: 409 },
        );
    }
    if (Object.prototype.hasOwnProperty.call(body, "code")) {
      body.code = normalizeStaffCode(body.code);
      if (body.code && !/^[\p{L}\p{N}_-]+$/u.test(body.code)) {
        return NextResponse.json(
          {
            error:
              "Mã nhân sự chỉ gồm chữ cái, số, dấu gạch ngang hoặc gạch dưới",
          },
          { status: 400 },
        );
      }
      if (
        body.code &&
        users.some(
          (user) =>
            user.id !== id && normalizeStaffCode(user.code) === body.code,
        )
      ) {
        return NextResponse.json(
          { error: "Mã nhân sự đã được sử dụng" },
          { status: 409 },
        );
      }
    }
    if (
      Object.prototype.hasOwnProperty.call(body, "email") &&
      String(body.email || "")
        .trim()
        .toLowerCase() !==
        String(oldUser.email || "")
          .trim()
          .toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Email công ty không được phép thay đổi" },
        { status: 400 },
      );
    }
    delete body.email;
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
    delete body.password;
    delete body.currentPassword;
    delete body.newPassword;
    const updatedUser = {
      ...oldUser,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    if (
      updatedUser.status === "able" &&
      !normalizeStaffCode(updatedUser.code)
    ) {
      return NextResponse.json(
        { error: "Phải nhập mã nhân sự trước khi kích hoạt tài khoản" },
        { status: 400 },
      );
    }
    if (updatedUser.code !== normalizeStaffCode(oldUser.code)) {
      updatedUser.avatarUrl = moveAvatarToStaffCode(
        oldUser.avatarUrl,
        normalizeStaffCode(oldUser.code),
        updatedUser.code,
      );
    }

    // Nếu kích hoạt
    if (updatedUser.status === "able" && oldUser.status !== "able") {
      updatedUser.activatedAt = new Date().toISOString();
      updatedUser.activatedBy = token?.id || "admin";
    }

    users[index] = updatedUser;
    await saveUsers(users);

    await appendAuditLog({
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
    if (token?.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên có quyền xóa nhân sự" },
        { status: 403 },
      );
    }
    const { id } = await params;

    const users = await getUsers();
    const userToDelete = users.find((u) => u.id === id);

    if (!userToDelete) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 },
      );
    }

    const [funds, schedules, assets] = await Promise.all([
      getFunds(),
      getWaterSchedules(),
      getAssets(),
    ]);
    const hasFundHistory = funds.some(
      (fund) =>
        fund.members?.some((member) => member.userId === id) ||
        [...(fund.incomes || []), ...(fund.expenses || [])].some(
          (item) => item.userId === id,
        ),
    );
    const hasWaterHistory = schedules.some((schedule) =>
      schedule.participants?.some((participant) => participant.userId === id),
    );
    const hasAssetHistory = [
      ...(assets.imports || []),
      ...(assets.exports || []),
    ].some(
      (item) =>
        item.userId === id ||
        String(item.person || "").trim() === String(userToDelete.name).trim(),
    );
    if (hasFundHistory || hasWaterHistory || hasAssetHistory)
      return NextResponse.json(
        {
          error:
            "Nhân sự đã có dữ liệu nghiệp vụ. Hãy chuyển sang trạng thái ngừng hoạt động thay vì xóa.",
        },
        { status: 409 },
      );

    const filteredUsers = users.filter((u) => u.id !== id);
    await saveUsers(filteredUsers);

    await appendAuditLog({
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
