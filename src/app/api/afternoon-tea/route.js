import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getAfternoonTea,
  getUsers,
  saveAfternoonTea,
  saveUsers,
} from "@/libs/dataRepository";
import { publishAfternoonTeaEvent } from "@/libs/afternoonTeaRealtime";

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
const vietnamDateKey = (value) => {
  const date = vietnamDate(value);
  return `${date.year}-${date.month}-${date.day}`;
};
const isInvitationClosed = (scheduledAt) => {
  const invitation = vietnamDate(scheduledAt);
  const today = vietnamDate();
  return (
    `${invitation.year}-${invitation.month}-${invitation.day}` <
    `${today.year}-${today.month}-${today.day}`
  );
};

export async function GET(req) {
  const token = await getToken({ req, secret });
  const data = await getAfternoonTea();
  const users = await getUsers();
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
    const users = await getUsers();
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
    await saveUsers(users);
    data.invitations = activeInvitations;
    await saveAfternoonTea(data);
  }
  return NextResponse.json({
    ...data,
    invitations: (data.invitations || []).map((invitation) => ({
      ...invitation,
      menus: (invitation.menus || []).map((menu) => {
        const catalog = (data.menuCatalog || []).find(
          (item) => item.id === menu.catalogId,
        );
        return {
          ...menu,
          items: catalog?.items || [],
          menuStatus: catalog?.status || "pending_review",
        };
      }),
      createdByName:
        users.find((user) => user.id === invitation.createdBy)?.name ||
        "Không xác định",
      canManage:
        ["admin", "assistant"].includes(token?.role) ||
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
  if (
    invitationType === "happy-hour" &&
    !["admin", "assistant"].includes(token.role)
  ) {
    return NextResponse.json(
      { error: "Chỉ Admin có quyền tạo Happy Hour" },
      { status: 403 },
    );
  }
  const data = await getAfternoonTea();
  const creator = (await getUsers()).find(
    (user) =>
      user.id === token.id ||
      user.email?.toLowerCase() === token.email?.toLowerCase(),
  );
  const scheduledAt = body.scheduledAt || new Date().toISOString();
  const invitationDate = vietnamDateKey(scheduledAt);
  if (
    data.invitations.some(
      (item) =>
        item.scheduledAt && vietnamDateKey(item.scheduledAt) === invitationDate,
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
  await saveAfternoonTea(data);
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
    menuId,
    menuItems,
  } = body;
  const data = await getAfternoonTea();
  if (action === "updateMenuItems" || action === "updateMenu") {
    const invitation = data.invitations.find(
      (item) => item.id === invitationId,
    );
    const menu = invitation?.menus?.find((item) => item.id === menuId);
    const currentUser = (await getUsers()).find(
      (user) =>
        user.id === token?.id ||
        user.email?.toLowerCase() === token?.email?.toLowerCase(),
    );
    if (!invitation || !menu)
      return NextResponse.json(
        { error: "Không tìm thấy menu" },
        { status: 404 },
      );
    if (
      !["admin", "assistant"].includes(token?.role) &&
      invitation.createdBy !== token?.id &&
      invitation.createdBy !== currentUser?.id
    )
      return NextResponse.json(
        { error: "Bạn không có quyền chỉnh sửa menu này" },
        { status: 403 },
      );
    data.menuCatalog = data.menuCatalog || [];
    const catalog = data.menuCatalog.find((item) => item.id === menu.catalogId);
    if (!catalog)
      return NextResponse.json(
        { error: "Không tìm thấy dữ liệu menu" },
        { status: 404 },
      );
    const nextShop = String(order?.shop || menu.shop).trim();
    if (!nextShop)
      return NextResponse.json(
        { error: "Tên quán không được để trống" },
        { status: 400 },
      );
    const duplicatedShop = (invitation.menus || []).some(
      (item) =>
        item.id !== menu.id &&
        item.shop?.trim().toLocaleLowerCase("vi-VN") ===
          nextShop.toLocaleLowerCase("vi-VN"),
    );
    if (duplicatedShop)
      return NextResponse.json(
        { error: "Tên quán này đã tồn tại trong lời mời" },
        { status: 400 },
      );
    const items = (Array.isArray(menuItems) ? menuItems : [])
      .map((item, index) => ({
        id: String(item?.id || `menu_item_${Date.now()}_${index}`),
        name: String(item?.name || "").trim(),
        category: String(item?.category || "").trim(),
        variants: (Array.isArray(item?.variants) && item.variants.length
          ? item.variants
          : [{ size: "Mặc định", price: 0 }]
        ).map((variant) => ({
          size: String(variant?.size || "Mặc định").trim() || "Mặc định",
          price: Math.max(0, Number(variant?.price) || 0),
        })),
      }))
      .filter((item) => item.name);
    menu.shop = nextShop;
    catalog.items = items;
    catalog.status = "approved";
    catalog.updatedAt = new Date().toISOString();
  } else if (action === "menu") {
    if (!["admin", "assistant"].includes(token?.role))
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
    if (
      invitation.ordersLocked &&
      !["admin", "assistant"].includes(token?.role)
    ) {
      return NextResponse.json(
        { error: "Danh sách món đã được chốt; không thể thay đổi" },
        { status: 409 },
      );
    }
    const currentUser = (await getUsers()).find(
      (user) =>
        user.id === token?.id ||
        user.email?.toLowerCase() === token?.email?.toLowerCase(),
    );
    const targetUserId =
      ["admin", "assistant"].includes(token?.role) && userId
        ? userId
        : currentUser?.id || token?.id;
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
  } else if (action === "lockOrders") {
    const invitation = data.invitations.find(
      (item) => item.id === invitationId,
    );
    if (!invitation)
      return NextResponse.json(
        { error: "Không tìm thấy lời mời" },
        { status: 404 },
      );
    if (!["admin", "assistant"].includes(token?.role))
      return NextResponse.json(
        { error: "Chỉ Admin hoặc Trợ lý được chốt món" },
        { status: 403 },
      );
    invitation.ordersLocked = Boolean(order?.locked);
    if (invitation.ordersLocked) {
      invitation.ordersLockedAt = new Date().toISOString();
      invitation.ordersLockedBy = token.id;
    } else {
      delete invitation.ordersLockedAt;
      delete invitation.ordersLockedBy;
    }
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
    const currentUser = (await getUsers()).find(
      (user) =>
        user.id === token?.id ||
        user.email?.toLowerCase() === token?.email?.toLowerCase(),
    );
    if (
      !["admin", "assistant"].includes(token?.role) &&
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
    const currentUser = (await getUsers()).find(
      (user) =>
        user.id === token?.id ||
        user.email?.toLowerCase() === token?.email?.toLowerCase(),
    );
    if (
      !["admin", "assistant"].includes(token?.role) &&
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
  await saveAfternoonTea(data);
  publishAfternoonTeaEvent({ type: "data" });
  return NextResponse.json(data);
}
