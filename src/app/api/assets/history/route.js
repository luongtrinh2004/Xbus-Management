import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  appendAssetHistory,
  appendAuditLog,
  createAssetTransaction,
  deleteAssetTransaction,
  getAssetHistory,
  getAssets,
  markAssetHistoryRolledBack,
  updateAssetTransaction,
} from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const canManage = (token) => ["admin", "assistant"].includes(token?.role);

export async function GET(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 },
    );
  return NextResponse.json({ history: await getAssetHistory() });
}

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json(
      { error: "Không có quyền hoàn tác" },
      { status: 403 },
    );

  const { historyId } = await req.json();
  const history = await getAssetHistory();
  const entry = history.find((item) => item.id === historyId);
  if (!entry)
    return NextResponse.json(
      { error: "Không tìm thấy lịch sử" },
      { status: 404 },
    );
  if (entry.rolledBackAt)
    return NextResponse.json(
      { error: "Thao tác này đã được hoàn tác" },
      { status: 409 },
    );
  if (!entry.before && !entry.after)
    return NextResponse.json(
      { error: "Lịch sử không có dữ liệu để hoàn tác" },
      { status: 400 },
    );

  const data = await getAssets();
  const collection =
    entry.type === "export" ? data.exports || [] : data.imports || [];
  const current = collection.find((item) => item.id === entry.targetId);
  const versionOf = (item) =>
    item
      ? JSON.stringify({
          status: item.status || "approved",
          quantity: Number(item.quantity),
          date: item.date,
          code: item.code || "",
          productName: item.name,
          category: item.category || "",
          unit: item.unit || "",
          description: item.description || "",
          location: item.location || "",
          person: item.person || "",
          issuedTo: item.issuedTo || "",
          note: item.note || "",
          approvedBy: item.approvedBy || null,
          rejectedBy: item.rejectedBy || null,
          rejectReason: item.rejectReason || "",
        })
      : null;

  if (
    entry.action !== "delete" &&
    current &&
    versionOf(current) !== versionOf(entry.after)
  )
    return NextResponse.json(
      {
        error:
          "Giao dịch đã có thay đổi mới hơn. Hãy hoàn tác thay đổi mới nhất trước.",
      },
      { status: 409 },
    );

  if (entry.action === "create") {
    if (!current)
      return NextResponse.json(
        { error: "Giao dịch đã không còn tồn tại" },
        { status: 409 },
      );
    await deleteAssetTransaction(entry.type, entry.targetId);
  } else if (entry.action === "delete") {
    if (current)
      return NextResponse.json(
        { error: "Giao dịch đã tồn tại trở lại" },
        { status: 409 },
      );
    await createAssetTransaction(entry.type, entry.before);
  } else {
    if (!current)
      return NextResponse.json(
        { error: "Giao dịch cần hoàn tác không còn tồn tại" },
        { status: 409 },
      );
    await updateAssetTransaction(entry.type, entry.before);
  }

  await markAssetHistoryRolledBack(entry.id, token.id);
  await appendAssetHistory({
    action: "rollback",
    type: entry.type,
    targetId: entry.targetId,
    ticketId: entry.ticketId,
    productName: entry.productName,
    actorId: token.id,
    actorName: token.name || "Người dùng",
    note: `Hoàn tác thao tác ${entry.action}`,
    before: entry.after,
    after: entry.before,
    sourceHistoryId: entry.id,
  });
  await appendAuditLog({
    adminId: token.id,
    adminName: token.name || "Người dùng",
    adminEmail: token.email || "",
    action: "ROLLBACK_ASSET_TRANSACTION",
    targetType: "ASSET",
    targetId: entry.targetId,
    details: `Hoàn tác thay đổi ${entry.action} của phiếu ${entry.ticketId || entry.targetId}`,
  });
  return NextResponse.json({ success: true });
}
