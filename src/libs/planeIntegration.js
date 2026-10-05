import { getUsers, getTypes, getCategories } from "@/libs/dataRepository";
import { resolveAvatar, getDefaultAvatar } from "@/utils/getDefaultAvatar";

export function planeAvatarUrl(
  user,
  publicUrl = process.env.NEXTAUTH_URL || "http://localhost:3000",
) {
  const base = new URL(publicUrl).origin;
  const fallback = new URL(getDefaultAvatar(user?.role, user?.gender), base)
    .href;
  try {
    const url = new URL(resolveAvatar(user), base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

export function planePersonnel(users, departments = [], categories = []) {
  const departmentNames = new Map(
    departments.map((item) => [item.id, item.name]),
  );
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]));
  // Only the work identity is shared. Passwords and private HR fields stay in XBus.
  return users.map((user) => ({
    id: String(user.id),
    name: String(user.name || "").trim(),
    email: String(user.email || "")
      .trim()
      .toLowerCase(),
    code: String(user.code || ""),
    role: user.role === "admin" ? "admin" : "member",
    active: user.status === "able",
    department: departmentNames.get(user.typeId) || "",
    category: categoryNames.get(user.categoryId) || "",
    position: user.position || "",
    avatar: planeAvatarUrl(user),
  }));
}

export async function syncPlanePersonnel(actorId = null) {
  const secret = process.env.PLANE_BRIDGE_SECRET;
  if (!secret) throw new Error("Chưa cấu hình PLANE_BRIDGE_SECRET cho XBus.");
  const [users, departments, categories] = await Promise.all([
    getUsers(),
    getTypes(),
    getCategories(),
  ]);
  const response = await fetch(
    `${(process.env.PLANE_INTERNAL_URL || "http://localhost:3100").replace(/\/$/, "")}/api/xbus/bootstrap/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-XBus-Secret": secret },
      body: JSON.stringify({
        users: planePersonnel(users, departments, categories),
        actorId,
      }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    },
  );
  const responseText = await response.text();
  let data = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Plane trả về dữ liệu không hợp lệ (HTTP ${response.status}).`,
      );
    }
  }
  if (!response.ok)
    throw new Error(
      data.error ||
        `Không thể đồng bộ nhân sự vào Plane (HTTP ${response.status}).`,
    );
  const publicUrl = (
    process.env.NEXT_PUBLIC_PLANE_URL || "http://localhost:3100"
  ).replace(/\/$/, "");
  return {
    ...data,
    loginUrl: data.ticket ? `${publicUrl}/auth/xbus/` : null,
  };
}
