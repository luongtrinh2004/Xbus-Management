import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import path from "path";
import { readdir, rm } from "fs/promises";
import {
  getAfternoonTea,
  getUsers,
  saveAfternoonTea,
  saveUsers,
} from "@/libs/jsonRepository";

const secret = process.env.NEXTAUTH_SECRET;
const vietnamDate = (value = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date(value))
    .reduce((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
const isInvitationClosed = (scheduledAt) => {
  const invitation = vietnamDate(scheduledAt);
  const today = vietnamDate();
  return (
    `${invitation.year}-${invitation.month}-${invitation.day}` <
    `${today.year}-${today.month}-${today.day}`
  );
};
const menuDateFolder = (scheduledAt) => {
  const date = vietnamDate(scheduledAt);
  return `${date.year}-${date.month}-${date.day}`;
};

export async function GET(req) {
  const token = await getToken({ req, secret });
  const data = getAfternoonTea();
  const users = getUsers();
  const currentUser = users.find(
    (user) =>
      user.id === token?.id ||
      user.email?.toLowerCase() === token?.email?.toLowerCase(),
  );
  const expiredInvitations = (data.invitations || []).filter((invitation) =>
    isInvitationClosed(invitation.scheduledAt),
  );
  const activeInvitations = (data.invitations || []).filter(
    (invitation) => !isInvitationClosed(invitation.scheduledAt),
  );
  if (expiredInvitations.length > 0) {
    const users = getUsers();
    expiredInvitations.forEach((invitation) => {
      const creatorIndex = users.findIndex(
        (user) => user.id === invitation.createdBy,
      );
      if (creatorIndex >= 0 && invitation.type !== "happy-hour") {
        users[creatorIndex].schedulingPoints =
          (users[creatorIndex].schedulingPoints || 0) + 10;
        users[creatorIndex].updatedAt = new Date().toISOString();
      }
    });
    saveUsers(users);
    data.invitations = activeInvitations;
    saveAfternoonTea(data);
  }
  const menuRoot = path.resolve(
    process.cwd(),
    "public",
    "images",
    "afternoon-tea",
  );
  const activeMenuDates = new Set(
    activeInvitations.map((item) => menuDateFolder(item.scheduledAt)),
  );
  const folders = await readdir(menuRoot, { withFileTypes: true }).catch(
    () => [],
  );
  await Promise.all(
    folders
      .filter(
        (entry) =>
          entry.isDirectory() &&
          /^\d{4}-\d{2}-\d{2}$/.test(entry.name) &&
          !activeMenuDates.has(entry.name),
      )
      .map((entry) => {
        const target = path.resolve(menuRoot, entry.name);
        return target.startsWith(`${menuRoot}${path.sep}`)
          ? rm(target, { recursive: true, force: true })
          : Promise.resolve();
      }),
  );
  return NextResponse.json({
    ...data,
    invitations: (data.invitations || []).map((invitation) => ({
      ...invitation,
      createdByName:
        users.find((user) => user.id === invitation.createdBy)?.name ||
        "Không xác định",
      canManage:
        token?.role === "admin" ||
        invitation.createdBy === token?.id ||
        invitation.createdBy === currentUser?.id,
    })),
    users: users
      .filter((user) => user.status === "able")
      .map(({ id, name, code, avatarUrl, gender, role, email }) => ({
        id,
        name,
        code,
        avatarUrl,
        gender,
        role,
        email,
      })),
  });
}

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (!token?.id)
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để tạo lời mời" },
      { status: 401 },
    );
  const body = await req.json();
  const invitationType =
    body.type === "happy-hour" ? "happy-hour" : "afternoon-tea";
  if (invitationType === "happy-hour" && token.role !== "admin") {
    return NextResponse.json(
      { error: "Chỉ Admin có quyền tạo Happy Hour" },
      { status: 403 },
    );
  }
  const data = getAfternoonTea();
  const creator = getUsers().find(
    (user) =>
      user.id === token.id ||
      user.email?.toLowerCase() === token.email?.toLowerCase(),
  );
  const scheduledAt = body.scheduledAt || new Date().toISOString();
  const invitationDate = new Date(scheduledAt).toISOString().slice(0, 10);
  if (
    data.invitations.some(
      (item) =>
        item.scheduledAt &&
        new Date(item.scheduledAt).toISOString().slice(0, 10) ===
          invitationDate,
    )
  ) {
    return NextResponse.json(
      {
        error:
          invitationType === "happy-hour"
            ? "Ngày này đã có lời mời; không thể tạo thêm Happy Hour"
            : "Mỗi ngày chỉ được tạo một lời mời",
      },
      { status: 409 },
    );
  }
  const invitation = {
    id: `tea_${Date.now()}`,
    type: invitationType,
    title:
      body.title?.trim() ||
      (invitationType === "happy-hour" ? "Happy Hour" : "Mời trà chiều"),
    scheduledAt,
    note: body.note?.trim() || "",
    createdBy: creator?.id || token.id,
    createdAt: new Date().toISOString(),
    registrations: [],
    menus: [],
  };
  data.invitations.unshift(invitation);
  saveAfternoonTea(data);
  return NextResponse.json(invitation, { status: 201 });
}

export async function PATCH(req) {
  const token = await getToken({ req, secret });
  const body = await req.json();
  const {
    invitationId,
    action,
    menuImageUrl,
    userId,
    order,
    foodItem,
    foodItemId,
  } = body;
  const data = getAfternoonTea();
  if (action === "menu") {
    if (token?.role !== "admin")
      return NextResponse.json(
        { error: "Chỉ Admin có quyền cập nhật menu" },
        { status: 403 },
      );
    data.menuImageUrl = menuImageUrl || "";
  } else if (action === "order") {
    const invitation = data.invitations.find(
      (item) => item.id === invitationId,
    );
    if (!invitation)
      return NextResponse.json(
        { error: "Không tìm thấy lời mời" },
        { status: 404 },
      );
    if (isInvitationClosed(invitation.scheduledAt)) {
      return NextResponse.json(
        { error: "Đã hết ngày đặt trà chiều; không thể thay đổi món" },
        { status: 409 },
      );
    }
    const currentUser = getUsers().find(
      (user) =>
        user.id === token?.id ||
        user.email?.toLowerCase() === token?.email?.toLowerCase(),
    );
    const targetUserId =
      token?.role === "admin" && userId ? userId : currentUser?.id || token?.id;
    invitation.orders = invitation.orders || [];
    const existing = invitation.orders.findIndex(
      (item) => item.userId === targetUserId,
    );
    const row = {
      userId: targetUserId,
      ...order,
      updatedAt: new Date().toISOString(),
    };
    if (existing >= 0) invitation.orders[existing] = row;
    else invitation.orders.push(row);
  } else if (action === "addFoodItem") {
    const invitation = data.invitations.find(
      (item) => item.id === invitationId,
    );
    if (!invitation)
      return NextResponse.json(
        { error: "Không tìm thấy lời mời" },
        { status: 404 },
      );
    if (!foodItem?.name?.trim()) {
      return NextResponse.json(
        { error: "Tên món ăn không được để trống" },
        { status: 400 },
      );
    }
    invitation.foodItems = invitation.foodItems || [];
    const newFoodItem = {
      id: `food_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: foodItem.name.trim(),
      category: foodItem.category || "Khác",
      quantity: Math.max(1, parseInt(foodItem.quantity, 10) || 1),
      unit: foodItem.unit || "hộp",
      note: foodItem.note?.trim() || "",
      createdBy: token?.id || "unknown",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    invitation.foodItems.push(newFoodItem);
  } else if (action === "updateFoodItem") {
    const invitation = data.invitations.find(
      (item) => item.id === invitationId,
    );
    if (!invitation)
      return NextResponse.json(
        { error: "Không tìm thấy lời mời" },
        { status: 404 },
      );
    invitation.foodItems = invitation.foodItems || [];
    const target = invitation.foodItems.find((f) => f.id === foodItemId);
    if (!target) {
      return NextResponse.json(
        { error: "Không tìm thấy món ăn" },
        { status: 404 },
      );
    }
    if (foodItem?.name !== undefined) target.name = foodItem.name.trim();
    if (foodItem?.category !== undefined) target.category = foodItem.category;
    if (foodItem?.quantity !== undefined) {
      target.quantity = Math.max(1, parseInt(foodItem.quantity, 10) || 1);
    }
    if (foodItem?.unit !== undefined) target.unit = foodItem.unit;
    if (foodItem?.note !== undefined) target.note = foodItem.note.trim();
    target.updatedAt = new Date().toISOString();
  } else if (action === "deleteFoodItem") {
    const invitation = data.invitations.find(
      (item) => item.id === invitationId,
    );
    if (!invitation)
      return NextResponse.json(
        { error: "Không tìm thấy lời mời" },
        { status: 404 },
      );
    invitation.foodItems = invitation.foodItems || [];
    invitation.foodItems = invitation.foodItems.filter(
      (f) => f.id !== foodItemId,
    );
  } else if (action === "updateInvitation") {
    const invitation = data.invitations.find(
      (item) => item.id === invitationId,
    );
    if (!invitation)
      return NextResponse.json(
        { error: "Không tìm thấy lời mời" },
        { status: 404 },
      );
    const currentUser = getUsers().find(
      (user) =>
        user.id === token?.id ||
        user.email?.toLowerCase() === token?.email?.toLowerCase(),
    );
    if (
      token?.role !== "admin" &&
      invitation.createdBy !== token?.id &&
      invitation.createdBy !== currentUser?.id
    )
      return NextResponse.json(
        { error: "Bạn không có quyền sửa lời mời này" },
        { status: 403 },
      );
    invitation.title = order?.title?.trim() || invitation.title;
    invitation.scheduledAt = order?.scheduledAt || invitation.scheduledAt;
    invitation.note = order?.note?.trim() || "";
    invitation.updatedAt = new Date().toISOString();
  } else if (action === "deleteInvitation") {
    const invitation = data.invitations.find(
      (item) => item.id === invitationId,
    );
    if (!invitation)
      return NextResponse.json(
        { error: "Không tìm thấy lời mời" },
        { status: 404 },
      );
    const currentUser = getUsers().find(
      (user) =>
        user.id === token?.id ||
        user.email?.toLowerCase() === token?.email?.toLowerCase(),
    );
    if (
      token?.role !== "admin" &&
      invitation.createdBy !== token?.id &&
      invitation.createdBy !== currentUser?.id
    ) {
      return NextResponse.json(
        { error: "Chỉ người tạo hoặc Admin có quyền xóa lời mời" },
        { status: 403 },
      );
    }
    data.invitations = data.invitations.filter(
      (item) => item.id !== invitationId,
    );
  }
  saveAfternoonTea(data);
  return NextResponse.json(data);
}
