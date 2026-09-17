import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { appendAuditLog, getAssets, saveAssets } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const canManageAssets = (token) =>
  token?.role === "admin" || token?.role === "assistant";
const normalizeData = (data) => ({
  imports: Array.isArray(data.imports) ? data.imports : [],
  exports: Array.isArray(data.exports) ? data.exports : [],
});

const normalizeText = (value) => String(value || "").trim();
const transactionBaseKey = (item) =>
  [
    normalizeText(item.code).toUpperCase(),
    normalizeText(item.date),
    normalizeText(item.person).toLocaleLowerCase("vi"),
  ].join("|");

const mergeTransactions = (current, incoming, type, token) => {
  const currentGroups = new Map();
  current.forEach((item) => {
    const key = transactionBaseKey(item);
    currentGroups.set(key, [...(currentGroups.get(key) || []), item]);
  });
  const occurrences = new Map();
  let added = 0;
  let updated = 0;
  const now = new Date().toISOString();
  const replacements = new Map();

  incoming.forEach((item, index) => {
    const code = normalizeText(item.code).toUpperCase();
    const name = normalizeText(item.name);
    const quantity = Number(item.quantity);
    if (
      !code ||
      !name ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date || "") ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    )
      throw new Error(
        `Sheet ${type === "import" ? "Nhập kho" : "Xuất kho"}, dòng ${index + 2}: mã, tên, ngày hoặc số lượng không hợp lệ`,
      );

    const normalized = {
      code,
      name,
      category: normalizeText(item.category),
      description: normalizeText(item.description),
      date: item.date,
      quantity,
      location: normalizeText(item.location),
      person: normalizeText(item.person) || token.name || "Import Excel",
      note: normalizeText(item.note),
    };
    const baseKey = transactionBaseKey(normalized);
    const occurrence = occurrences.get(baseKey) || 0;
    occurrences.set(baseKey, occurrence + 1);
    const existing = currentGroups.get(baseKey)?.[occurrence];
    if (existing) {
      replacements.set(existing.id, {
        ...normalized,
        id: existing.id,
        createdAt: existing.createdAt || now,
        updatedAt: now,
      });
      updated += 1;
    } else {
      const id = `${type}_excel_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
      replacements.set(id, { ...normalized, id, createdAt: now });
      added += 1;
    }
  });

  const merged = current.map((item) => replacements.get(item.id) || item);
  replacements.forEach((item, id) => {
    if (!current.some((currentItem) => currentItem.id === id))
      merged.push(item);
  });
  return { records: merged, added, updated };
};

export async function GET(req) {
  const token = await getToken({ req, secret });
  if (!canManageAssets(token))
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 },
    );
  return NextResponse.json(normalizeData(await getAssets()));
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!canManageAssets(token))
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );
    const body = await req.json();
    const data = normalizeData(await getAssets());
    const type = body.type === "export" ? "export" : "import";
    const quantity = Number(body.quantity);
    const normalizedCode = body.code?.trim().toUpperCase();
    if (
      !body.code?.trim() ||
      !body.name?.trim() ||
      !body.date ||
      !body.location?.trim() ||
      !body.person?.trim()
    ) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ các trường bắt buộc" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Số lượng phải là số nguyên lớn hơn 0" },
        { status: 400 },
      );
    }
    const source = data.imports.find(
      (item) => item.code?.trim().toUpperCase() === normalizedCode,
    );
    if (type === "export") {
      if (!source)
        return NextResponse.json(
          { error: "Mã tài sản không tồn tại trong bảng nhập" },
          { status: 400 },
        );
      const imported = data.imports
        .filter((item) => item.code?.trim().toUpperCase() === normalizedCode)
        .reduce((sum, item) => sum + item.quantity, 0);
      const exported = data.exports
        .filter((item) => item.code?.trim().toUpperCase() === normalizedCode)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (quantity > imported - exported)
        return NextResponse.json(
          { error: `Số lượng tồn kho chỉ còn ${imported - exported}` },
          { status: 400 },
        );
    }
    const record = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code: normalizedCode,
      name: type === "export" ? source.name : body.name.trim(),
      category:
        type === "export"
          ? source.category || ""
          : normalizeText(body.category),
      description:
        type === "export"
          ? source.description || ""
          : normalizeText(body.description),
      date: body.date,
      quantity,
      location: type === "export" ? source.location : body.location.trim(),
      person: body.person.trim(),
      note: body.note?.trim() || "",
      createdAt: new Date().toISOString(),
    };
    data[type === "export" ? "exports" : "imports"].unshift(record);
    await saveAssets(data);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || "Người dùng",
      adminEmail: token.email || "",
      action: type === "export" ? "EXPORT_ASSET" : "IMPORT_ASSET",
      targetType: "ASSET",
      targetId: record.id,
      details: `${type === "export" ? "Xuất" : "Nhập"} ${quantity} ${record.name} (${record.code})`,
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[API Assets] POST:", error);
    return NextResponse.json(
      { error: "Không thể lưu giao dịch tài sản" },
      { status: 500 },
    );
  }
}

export async function PUT(req) {
  try {
    const token = await getToken({ req, secret });
    if (!canManageAssets(token))
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );
    const body = await req.json();
    if (
      (!Array.isArray(body.imports) || !body.imports.length) &&
      (!Array.isArray(body.exports) || !body.exports.length)
    )
      return NextResponse.json(
        { error: "File Excel không có dữ liệu nhập kho" },
        { status: 400 },
      );
    const current = normalizeData(await getAssets());
    const importResult = mergeTransactions(
      current.imports,
      body.imports || [],
      "import",
      token,
    );
    const exportResult = mergeTransactions(
      current.exports,
      body.exports || [],
      "export",
      token,
    );
    const merged = {
      imports: importResult.records,
      exports: exportResult.records,
    };
    await saveAssets(merged);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || "Người dùng",
      adminEmail: token.email || "",
      action: "UPSERT_ASSETS_FROM_EXCEL",
      targetType: "ASSET",
      details: `Import Excel: thêm ${importResult.added + exportResult.added}, cập nhật ${importResult.updated + exportResult.updated} giao dịch`,
    });
    return NextResponse.json({
      ...merged,
      summary: {
        added: importResult.added + exportResult.added,
        updated: importResult.updated + exportResult.updated,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Không thể import Excel" },
      { status: 400 },
    );
  }
}

export async function PATCH(req) {
  try {
    const token = await getToken({ req, secret });
    if (!canManageAssets(token))
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );

    const body = await req.json();
    const data = normalizeData(await getAssets());
    const type = body.type === "export" ? "export" : "import";
    const collection = type === "export" ? data.exports : data.imports;
    const index = collection.findIndex((item) => item.id === body.id);
    const quantity = Number(body.quantity);
    const normalizedCode = body.code?.trim().toUpperCase();

    if (index < 0)
      return NextResponse.json(
        { error: "Không tìm thấy phiếu tài sản" },
        { status: 404 },
      );
    if (
      !normalizedCode ||
      !body.name?.trim() ||
      !body.date ||
      !body.location?.trim() ||
      !body.person?.trim()
    )
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ các trường bắt buộc" },
        { status: 400 },
      );
    if (!Number.isInteger(quantity) || quantity <= 0)
      return NextResponse.json(
        { error: "Số lượng phải là số nguyên lớn hơn 0" },
        { status: 400 },
      );

    const source = data.imports.find(
      (item) => item.code?.trim().toUpperCase() === normalizedCode,
    );
    if (type === "export" && !source)
      return NextResponse.json(
        { error: "Mã tài sản không tồn tại trong bảng nhập" },
        { status: 400 },
      );

    const previous = collection[index];
    const updated = {
      ...previous,
      code: normalizedCode,
      name: type === "export" ? source.name : body.name.trim(),
      category:
        type === "export"
          ? source.category || ""
          : normalizeText(body.category),
      description:
        type === "export"
          ? source.description || ""
          : normalizeText(body.description),
      date: body.date,
      quantity,
      location: type === "export" ? source.location : body.location.trim(),
      person: body.person.trim(),
      note: body.note?.trim() || "",
      updatedAt: new Date().toISOString(),
    };
    collection[index] = updated;

    const balances = new Map();
    data.imports.forEach((item) => {
      const code = item.code?.trim().toUpperCase();
      balances.set(
        code,
        (balances.get(code) || 0) + Number(item.quantity || 0),
      );
    });
    data.exports.forEach((item) => {
      const code = item.code?.trim().toUpperCase();
      balances.set(
        code,
        (balances.get(code) || 0) - Number(item.quantity || 0),
      );
    });
    const invalidBalance = [...balances.entries()].find(
      ([, balance]) => balance < 0,
    );
    if (invalidBalance)
      return NextResponse.json(
        {
          error: `Không thể cập nhật vì tồn kho ${invalidBalance[0]} sẽ âm ${Math.abs(invalidBalance[1])}`,
        },
        { status: 400 },
      );

    await saveAssets(data);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || "Người dùng",
      adminEmail: token.email || "",
      action: "UPDATE_ASSET_TRANSACTION",
      targetType: "ASSET",
      targetId: updated.id,
      details: `Cập nhật phiếu ${type === "export" ? "xuất" : "nhập"} ${quantity} ${updated.name} (${updated.code})`,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API Assets] PATCH:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật giao dịch tài sản" },
      { status: 500 },
    );
  }
}

export async function DELETE(req) {
  try {
    const token = await getToken({ req, secret });
    if (!canManageAssets(token))
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );

    const body = await req.json();
    const data = normalizeData(await getAssets());
    const type = body.type === "export" ? "export" : "import";
    const collection = type === "export" ? data.exports : data.imports;
    const index = collection.findIndex((item) => item.id === body.id);

    if (index < 0)
      return NextResponse.json(
        { error: "Không tìm thấy phiếu tài sản" },
        { status: 404 },
      );

    const record = collection[index];
    const normalizedCode = record.code?.trim().toUpperCase();
    if (
      type === "import" &&
      data.exports.some(
        (item) => item.code?.trim().toUpperCase() === normalizedCode,
      )
    )
      return NextResponse.json(
        {
          error:
            "Không thể xóa phiếu nhập vì tài sản này đã có giao dịch xuất kho",
        },
        { status: 400 },
      );

    collection.splice(index, 1);
    await saveAssets(data);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || "Người dùng",
      adminEmail: token.email || "",
      action: "DELETE_ASSET_TRANSACTION",
      targetType: "ASSET",
      targetId: record.id,
      details: `Xóa phiếu ${type === "export" ? "xuất" : "nhập"} ${record.quantity} ${record.name} (${record.code})`,
    });
    return NextResponse.json({ message: "Đã xóa phiếu tài sản" });
  } catch (error) {
    console.error("[API Assets] DELETE:", error);
    return NextResponse.json(
      { error: "Không thể xóa phiếu tài sản" },
      { status: 500 },
    );
  }
}
