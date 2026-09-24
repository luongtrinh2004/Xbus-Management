import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { assetDocumentCodeFromName } from "@/libs/assetIds";
import {
  appendAuditLog,
  createAssetTransaction,
  deleteAssetTransaction,
  getAssets,
  getUsers,
  saveAssets,
  updateAssetTransaction,
} from "@/libs/dataRepository";
import { createNotification } from "@/libs/notificationStorage";

const secret = process.env.NEXTAUTH_SECRET;
const canManageAssets = (token) =>
  token?.role === "admin" || token?.role === "assistant";
const canViewAssets = (token) => Boolean(token);
const isApproved = (item) => !item.status || item.status === "approved";
const normalizeData = (data) => ({
  imports: Array.isArray(data.imports) ? data.imports : [],
  exports: Array.isArray(data.exports) ? data.exports : [],
  products: Array.isArray(data.products) ? data.products : [],
  categories: Array.isArray(data.categories) ? data.categories : [],
  units: Array.isArray(data.units) ? data.units : [],
});

const normalizeText = (value) => String(value || "").trim();
const stockKey = (item) =>
  assetDocumentCodeFromName(item.name || item.productName);
const findProduct = (products, input) => {
  const productId = normalizeText(input.productId);
  const code = normalizeText(input.code).toUpperCase();
  const documentCode =
    normalizeText(input.documentCode) || assetDocumentCodeFromName(input.name);
  return products.find(
    (item) =>
      (productId && item.id === productId) ||
      (code && normalizeText(item.code).toUpperCase() === code) ||
      (documentCode && assetDocumentCodeFromName(item.name) === documentCode),
  );
};
const transactionBaseKey = (item) =>
  [
    stockKey(item),
    normalizeText(item.date),
    normalizeText(item.person).toLocaleLowerCase("vi"),
  ].join("|");

const indexToTicketCode = (n) => {
  const num = Math.max(0, n) % 1000;
  let charIndex = Math.floor(Math.max(0, n) / 1000);
  const c3 = String.fromCharCode(65 + (charIndex % 26));
  charIndex = Math.floor(charIndex / 26);
  const c2 = String.fromCharCode(65 + (charIndex % 26));
  charIndex = Math.floor(charIndex / 26);
  const c1 = String.fromCharCode(65 + (charIndex % 26));
  return `${c1}${c2}${c3}${String(num).padStart(3, "0")}`;
};

const ticketCodeToIndex = (code) => {
  if (!code || typeof code !== "string" || !/^[A-Z]{3}[0-9]{3}$/.test(code)) {
    return -1;
  }
  const c1 = code.charCodeAt(0) - 65;
  const c2 = code.charCodeAt(1) - 65;
  const c3 = code.charCodeAt(2) - 65;
  const num = parseInt(code.slice(3), 10);
  return (c1 * 26 * 26 + c2 * 26 + c3) * 1000 + num;
};

const getNextTicketCode = (items = []) => {
  let maxIndex = -1;
  for (const item of items) {
    const idx = ticketCodeToIndex(item.ticketId);
    if (idx > maxIndex) maxIndex = idx;
  }
  return indexToTicketCode(maxIndex + 1);
};

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
    const parsedQuantity = Number(item.quantity);
    const quantity =
      Number.isInteger(parsedQuantity) && parsedQuantity > 0
        ? parsedQuantity
        : null;

    const normalized = {
      documentCode: assetDocumentCodeFromName(name),
      code,
      name,
      category: normalizeText(item.category),
      unit: normalizeText(item.unit),
      description: normalizeText(item.description),
      date: /^\d{4}-\d{2}-\d{2}$/.test(item.date || "") ? item.date : null,
      quantity,
      location: normalizeText(item.location),
      person: normalizeText(item.person),
      issuedTo: normalizeText(item.issuedTo),
      note: normalizeText(item.note),
    };
    const baseKey = transactionBaseKey(normalized);
    const occurrence = occurrences.get(baseKey) || 0;
    occurrences.set(baseKey, occurrence + 1);
    const existing = currentGroups.get(baseKey)?.[occurrence];
    const ticketId =
      item.ticketId && /^[A-Z]{3}[0-9]{3}$/.test(item.ticketId)
        ? item.ticketId
        : getNextTicketCode([...current, ...Array.from(replacements.values())]);
    if (existing) {
      replacements.set(existing.id, {
        ...normalized,
        ticketId: existing.ticketId || ticketId,
        status: existing.status || "approved",
        id: existing.id,
        createdAt: existing.createdAt || now,
        updatedAt: now,
      });
      updated += 1;
    } else {
      const id = `${type}_excel_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
      replacements.set(id, {
        ...normalized,
        id,
        ticketId,
        status: "approved",
        createdAt: now,
      });
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
  if (!canViewAssets(token))
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 },
    );
  return NextResponse.json(normalizeData(await getAssets()));
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id)
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thực hiện" },
        { status: 401 },
      );
    const body = await req.json();
    const data = normalizeData(await getAssets());
    const type = body.type === "export" ? "export" : "import";
    const quantity = Number(body.quantity);
    const product = findProduct(data.products || [], body);
    if (
      !product ||
      !body.date ||
      !body.person?.trim() ||
      (type === "export" && !body.issuedTo?.trim())
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
    if (!product.active)
      return NextResponse.json(
        { error: "Sản phẩm đã ngừng sử dụng" },
        { status: 400 },
      );

    const users = await getUsers();
    const personName = body.person.trim();
    const matchedPerson = users.find(
      (u) =>
        u.name?.trim().toLowerCase() === personName.toLowerCase() ||
        (body.personId && u.id === body.personId),
    );
    if (!matchedPerson) {
      return NextResponse.json(
        {
          error: `Người ${type === "import" ? "nhập kho" : "mượn tài sản"} "${personName}" không hợp lệ. Vui lòng chọn nhân sự trong danh sách nhân viên công ty.`,
        },
        { status: 400 },
      );
    }

    let matchedRecipient = null;
    if (type === "export") {
      const issuedToName = body.issuedTo.trim();
      matchedRecipient = users.find(
        (u) =>
          u.name?.trim().toLowerCase() === issuedToName.toLowerCase() ||
          (body.issuedToId && u.id === body.issuedToId),
      );
      if (!matchedRecipient) {
        return NextResponse.json(
          {
            error: `Người nhận tài sản "${issuedToName}" không hợp lệ. Vui lòng chọn nhân sự trong danh sách nhân viên công ty.`,
          },
          { status: 400 },
        );
      }
    }

    const categoryName =
      data.categories.find((item) => item.id === product.categoryId)?.name ||
      "";
    const normalizedCode = normalizeText(product.code).toUpperCase();
    const docCode = assetDocumentCodeFromName(product.name);

    if (type === "export") {
      const imported = data.imports
        .filter((item) => isApproved(item) && stockKey(item) === docCode)
        .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      const exported = data.exports
        .filter((item) => isApproved(item) && stockKey(item) === docCode)
        .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      const available = imported - exported;
      if (quantity > available)
        return NextResponse.json(
          { error: `Số lượng tồn kho khả dụng chỉ còn ${available}` },
          { status: 400 },
        );
    }

    const isAdminOrAssistant = canManageAssets(token);
    const status = isAdminOrAssistant ? "approved" : "pending";
    const now = new Date().toISOString();
    let ticketId = (body.ticketId || "").trim().toUpperCase();
    if (!/^[A-Z]{3}[0-9]{3}$/.test(ticketId)) {
      ticketId = getNextTicketCode([
        ...(data.imports || []),
        ...(data.exports || []),
      ]);
    }

    const record = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ticketId,
      status,
      approvedBy: status === "approved" ? token.id : null,
      approvedAt: status === "approved" ? now : null,
      rejectedBy: null,
      rejectedAt: null,
      rejectReason: "",
      documentCode: docCode,
      code: normalizedCode,
      name: product.name,
      category: categoryName,
      unit: product.unit,
      description: product.description || "",
      date: body.date,
      quantity,
      location: product.location || "",
      person: matchedPerson.name,
      issuedTo: type === "export" ? matchedRecipient.name : "",
      performedBy: token.id || "",
      note: body.note?.trim() || "",
      createdAt: now,
      updatedAt: now,
    };
    await createAssetTransaction(type, record);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || "Người dùng",
      adminEmail: token.email || "",
      action:
        status === "pending"
          ? type === "export"
            ? "REQUEST_EXPORT_ASSET"
            : "REQUEST_IMPORT_ASSET"
          : type === "export"
            ? "EXPORT_ASSET"
            : "IMPORT_ASSET",
      targetType: "ASSET",
      targetId: record.id,
      details: `${status === "pending" ? "Tạo phiếu chờ duyệt" : "Thực hiện"}: ${type === "export" ? "Xuất" : "Nhập"} ${quantity} ${record.name} (${record.code}) - Mã phiếu: ${ticketId}`,
    });

    if (status === "pending") {
      try {
        createNotification({
          targetRole: "admin",
          type: "system",
          title: `Phiếu ${type === "export" ? "xuất" : "nhập"} kho cần duyệt`,
          message: `${token.name || "Một nhân sự"} đã tạo phiếu ${type === "export" ? "xuất" : "nhập"} kho (${ticketId}) đang chờ quản trị viên duyệt.`,
          link: "/assets",
          metadata: { ticketId, type, id: record.id },
        });
      } catch (err) {
        console.error("[Notification Error]", err);
      }
    }

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
      (!Array.isArray(body.exports) || !body.exports.length) &&
      (!Array.isArray(body.stock) || !body.stock.length)
    )
      return NextResponse.json(
        { error: "File Excel không có dữ liệu nhập kho" },
        { status: 400 },
      );
    const current = normalizeData(await getAssets());
    if (Array.isArray(body.stock) && body.stock.length) {
      const balances = new Map();
      current.imports.filter(isApproved).forEach((item) =>
        balances.set(
          stockKey(item),
          (balances.get(stockKey(item)) || 0) + Number(item.quantity || 0),
        ),
      );
      current.exports.filter(isApproved).forEach((item) =>
        balances.set(
          stockKey(item),
          (balances.get(stockKey(item)) || 0) - Number(item.quantity || 0),
        ),
      );
      const productByCode = new Map(
        current.products
          .filter((item) => item.code)
          .map((item) => [item.code.toUpperCase(), item]),
      );
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      let updated = 0;
      const baseIdx =
        Math.max(
          -1,
          ...[...current.imports, ...current.exports].map((it) =>
            ticketCodeToIndex(it.ticketId),
          ),
        ) + 1;
      for (const [index, item] of body.stock.entries()) {
        const code = normalizeText(item.code).toUpperCase();
        const desired = Number(item.quantity);
        const product = productByCode.get(code);
        if (!product || !Number.isInteger(desired) || desired < 0) continue;
        const documentCode = assetDocumentCodeFromName(product.name);
        const difference = desired - (balances.get(documentCode) || 0);
        if (!difference) continue;
        const type = difference > 0 ? "import" : "export";
        const record = {
          id: `${type}_stock_${Date.now()}_${index}`,
          ticketId: indexToTicketCode(baseIdx + index),
          status: "approved",
          approvedBy: token.id || null,
          approvedAt: now.toISOString(),
          rejectedBy: null,
          rejectedAt: null,
          rejectReason: "",
          documentCode,
          code,
          name: product.name,
          category:
            current.categories.find((item) => item.id === product.categoryId)
              ?.name || "",
          unit: product.unit || "",
          description: product.description || "",
          date,
          quantity: Math.abs(difference),
          location: product.location || "",
          person: token.name || "Import danh sách mới",
          issuedTo: "",
          performedBy: token.id || "",
          note: "Điều chỉnh tồn kho từ Excel",
          createdAt: now.toISOString(),
        };
        current[type === "import" ? "imports" : "exports"].push(record);
        balances.set(documentCode, desired);
        updated += 1;
      }
      if (!updated)
        return NextResponse.json(
          { error: "Không có dòng tồn kho hợp lệ cần điều chỉnh" },
          { status: 400 },
        );
      await saveAssets(current);
      await appendAuditLog({
        adminId: token.id,
        adminName: token.name || "Người dùng",
        adminEmail: token.email || "",
        action: "ADJUST_ASSET_STOCK_FROM_EXCEL",
        targetType: "ASSET",
        details: `Import danh sách mới: điều chỉnh tồn kho ${updated} sản phẩm`,
      });
      return NextResponse.json({
        ...current,
        summary: { added: updated, updated },
      });
    }
    const productByCode = new Map(
      current.products
        .filter((item) => normalizeText(item.code))
        .map((item) => [normalizeText(item.code).toUpperCase(), item]),
    );
    const productByName = new Map(
      current.products
        .filter((item) => assetDocumentCodeFromName(item.name))
        .map((item) => [assetDocumentCodeFromName(item.name), item]),
    );
    const categoryById = new Map(
      current.categories.map((item) => [item.id, item.name]),
    );
    const categoryNames = new Set(
      current.categories.map((item) =>
        normalizeText(item.name).toLocaleLowerCase("vi"),
      ),
    );
    const unitNames = new Map(
      current.units.map((item) => [
        normalizeText(item.name).toLocaleLowerCase("vi"),
        item.name,
      ]),
    );
    const normalizeImportedRows = (rows, type) =>
      rows.map((item) => {
        const requestedCode = normalizeText(item.code).toUpperCase();
        const requestedName = normalizeText(item.name);
        const product = requestedCode
          ? productByCode.get(requestedCode)
          : productByName.get(assetDocumentCodeFromName(requestedName));
        const requestedCategory = normalizeText(item.category);
        const requestedUnit = normalizeText(item.unit);
        return {
          ...item,
          code: product?.code || "",
          name: product?.name || requestedName,
          category: product
            ? categoryById.get(product.categoryId) || ""
            : categoryNames.has(requestedCategory.toLocaleLowerCase("vi"))
              ? requestedCategory
              : "",
          unit:
            product?.unit ||
            unitNames.get(requestedUnit.toLocaleLowerCase("vi")) ||
            "",
          description: product?.description || normalizeText(item.description),
          // Vị trí trên dòng giao dịch trong Excel được ưu tiên. Chỉ dùng vị
          // trí danh mục khi file không cung cấp giá trị.
          location: normalizeText(item.location) || product?.location || "",
          issuedTo: type === "export" ? item.issuedTo : "",
        };
      });
    const importedRows = normalizeImportedRows(body.imports || [], "import");
    const exportedRows = normalizeImportedRows(body.exports || [], "export");
    // File được coi là danh sách Excel hiện hành: thay các dòng được tạo từ
    // lần import Excel trước, nhưng giữ nguyên giao dịch nhập tay.
    const currentImports =
      body.replaceExcelRows && Array.isArray(body.imports)
        ? current.imports.filter(
            (item) => !String(item.id || "").startsWith("import_excel_"),
          )
        : current.imports;
    const currentExports =
      body.replaceExcelRows && Array.isArray(body.exports)
        ? current.exports.filter(
            (item) => !String(item.id || "").startsWith("export_excel_"),
          )
        : current.exports;
    const importResult = mergeTransactions(
      currentImports,
      importedRows,
      "import",
      token,
    );
    const exportResult = mergeTransactions(
      currentExports,
      exportedRows,
      "export",
      token,
    );
    const merged = {
      ...current,
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
      details: `Import danh sách mới: thêm ${importResult.added + exportResult.added}, cập nhật ${importResult.updated + exportResult.updated} giao dịch`,
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
      { error: error.message || "Không thể Import danh sách mới" },
      { status: 400 },
    );
  }
}

export async function PATCH(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id)
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thực hiện" },
        { status: 401 },
      );

    const body = await req.json();
    const data = normalizeData(await getAssets());
    const type = body.type === "export" ? "export" : "import";
    const collection = type === "export" ? data.exports : data.imports;

    // Xử lý Duyệt phiếu
    if (body.action === "approve") {
      if (!canManageAssets(token))
        return NextResponse.json(
          { error: "Không có quyền duyệt phiếu" },
          { status: 403 },
        );
      const targets = collection.filter(
        (item) =>
          (body.id
            ? item.id === body.id
            : (item.ticketId || item.id) === body.ticketId) &&
          item.status === "pending",
      );
      if (!targets.length)
        return NextResponse.json(
          { error: "Không tìm thấy phiếu đang chờ duyệt" },
          { status: 404 },
        );

      // Nếu duyệt phiếu xuất, kiểm tra lại tồn kho hiện tại
      if (type === "export") {
        const neededByProduct = new Map();
        for (const item of targets) {
          const key = stockKey(item);
          neededByProduct.set(
            key,
            (neededByProduct.get(key) || 0) + Number(item.quantity || 0),
          );
        }
        for (const [key, needed] of neededByProduct.entries()) {
          const imported = data.imports
            .filter((item) => isApproved(item) && stockKey(item) === key)
            .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          const exported = data.exports
            .filter((item) => isApproved(item) && stockKey(item) === key)
            .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          const available = imported - exported;
          if (needed > available) {
            return NextResponse.json(
              {
                error: `Không thể duyệt phiếu xuất vì tồn kho không đủ (còn ${available}, yêu cầu ${needed})`,
              },
              { status: 400 },
            );
          }
        }
      }

      const now = new Date().toISOString();
      for (const target of targets) {
        const updated = {
          ...target,
          status: "approved",
          approvedBy: token.id,
          approvedAt: now,
          updatedAt: now,
        };
        await updateAssetTransaction(type, updated);
        if (target.performedBy) {
          try {
            createNotification({
              userId: target.performedBy,
              type: "system",
              title: `Phiếu ${type === "export" ? "xuất" : "nhập"} kho đã được duyệt`,
              message: `Phiếu ${type === "export" ? "xuất" : "nhập"} (${target.ticketId || target.id} - ${target.name}) của bạn đã được quản trị viên duyệt thành công.`,
              link: "/assets",
              metadata: { ticketId: target.ticketId, id: target.id },
            });
          } catch {}
        }
      }

      await appendAuditLog({
        adminId: token.id,
        adminName: token.name || "Người dùng",
        adminEmail: token.email || "",
        action: "APPROVE_ASSET_TRANSACTION",
        targetType: "ASSET",
        targetId: body.ticketId || body.id,
        details: `Duyệt ${targets.length} sản phẩm trong phiếu ${type === "export" ? "xuất" : "nhập"} kho (${body.ticketId || targets[0]?.ticketId || body.id})`,
      });

      return NextResponse.json({ success: true, count: targets.length });
    }

    // Xử lý Từ chối phiếu
    if (body.action === "reject") {
      if (!canManageAssets(token))
        return NextResponse.json(
          { error: "Không có quyền từ chối phiếu" },
          { status: 403 },
        );
      const targets = collection.filter(
        (item) =>
          (body.id
            ? item.id === body.id
            : (item.ticketId || item.id) === body.ticketId) &&
          item.status === "pending",
      );
      if (!targets.length)
        return NextResponse.json(
          { error: "Không tìm thấy phiếu đang chờ duyệt" },
          { status: 404 },
        );

      const now = new Date().toISOString();
      const reason = String(body.rejectReason || "").trim();
      for (const target of targets) {
        const updated = {
          ...target,
          status: "rejected",
          rejectedBy: token.id,
          rejectedAt: now,
          rejectReason: reason,
          updatedAt: now,
        };
        await updateAssetTransaction(type, updated);
        if (target.performedBy) {
          try {
            createNotification({
              userId: target.performedBy,
              type: "system",
              title: `Phiếu ${type === "export" ? "xuất" : "nhập"} kho bị từ chối`,
              message: `Phiếu ${type === "export" ? "xuất" : "nhập"} (${target.ticketId || target.id} - ${target.name}) của bạn đã bị từ chối${reason ? `: ${reason}` : "."}`,
              link: "/assets",
              metadata: { ticketId: target.ticketId, id: target.id, reason },
            });
          } catch {}
        }
      }

      await appendAuditLog({
        adminId: token.id,
        adminName: token.name || "Người dùng",
        adminEmail: token.email || "",
        action: "REJECT_ASSET_TRANSACTION",
        targetType: "ASSET",
        targetId: body.ticketId || body.id,
        details: `Từ chối ${targets.length} sản phẩm trong phiếu ${type === "export" ? "xuất" : "nhập"} kho (${body.ticketId || targets[0]?.ticketId || body.id}). Lý do: ${reason || "Không nêu lý do"}`,
      });

      return NextResponse.json({ success: true, count: targets.length });
    }

    // Chỉnh sửa giao dịch thông thường
    if (!canManageAssets(token))
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );

    const index = collection.findIndex((item) => item.id === body.id);
    const quantity = Number(body.quantity);
    const product = findProduct(data.products || [], body);

    if (index < 0)
      return NextResponse.json(
        { error: "Không tìm thấy phiếu tài sản" },
        { status: 404 },
      );
    if (
      !product ||
      !body.date ||
      !body.person?.trim() ||
      (type === "export" && !body.issuedTo?.trim())
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

    if (!product.active)
      return NextResponse.json(
        { error: "Sản phẩm đã ngừng sử dụng" },
        { status: 400 },
      );

    const users = await getUsers();
    const personName = body.person.trim();
    const matchedPerson = users.find(
      (u) =>
        u.name?.trim().toLowerCase() === personName.toLowerCase() ||
        (body.personId && u.id === body.personId),
    );
    if (!matchedPerson) {
      return NextResponse.json(
        {
          error: `Người ${type === "import" ? "nhập kho" : "mượn tài sản"} "${personName}" không hợp lệ. Vui lòng chọn nhân sự trong danh sách nhân viên công ty.`,
        },
        { status: 400 },
      );
    }

    let matchedRecipient = null;
    if (type === "export") {
      const issuedToName = body.issuedTo.trim();
      matchedRecipient = users.find(
        (u) =>
          u.name?.trim().toLowerCase() === issuedToName.toLowerCase() ||
          (body.issuedToId && u.id === body.issuedToId),
      );
      if (!matchedRecipient) {
        return NextResponse.json(
          {
            error: `Người nhận tài sản "${issuedToName}" không hợp lệ. Vui lòng chọn nhân sự trong danh sách nhân viên công ty.`,
          },
          { status: 400 },
        );
      }
    }

    const categoryName =
      data.categories.find((item) => item.id === product.categoryId)?.name ||
      "";
    const normalizedCode = normalizeText(product.code).toUpperCase();

    const previous = collection[index];
    const updated = {
      ...previous,
      ticketId: previous.ticketId || previous.id,
      status: previous.status || "approved",
      documentCode: assetDocumentCodeFromName(product.name),
      code: normalizedCode,
      name: product.name,
      category: categoryName,
      unit: product.unit,
      description: product.description || "",
      date: body.date,
      quantity,
      location: product.location || "",
      performedBy: previous.performedBy || token.id || "",
      person: matchedPerson.name,
      issuedTo: type === "export" ? matchedRecipient.name : "",
      note: body.note?.trim() || "",
      updatedAt: new Date().toISOString(),
    };
    collection[index] = updated;

    if (isApproved(updated)) {
      const balances = new Map();
      data.imports.filter(isApproved).forEach((item) => {
        const code = stockKey(item);
        balances.set(
          code,
          (balances.get(code) || 0) + Number(item.quantity || 0),
        );
      });
      data.exports.filter(isApproved).forEach((item) => {
        const code = stockKey(item);
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
    }

    await updateAssetTransaction(type, updated);
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
    if (!token?.id)
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thực hiện" },
        { status: 401 },
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
    const canManage = canManageAssets(token);
    const isOwnerPending =
      record.performedBy === token.id && record.status === "pending";

    if (!canManage && !isOwnerPending) {
      return NextResponse.json(
        { error: "Không có quyền xóa phiếu này" },
        { status: 403 },
      );
    }

    const normalizedCode = stockKey(record);
    if (
      type === "import" &&
      isApproved(record) &&
      data.exports.some(
        (item) => isApproved(item) && stockKey(item) === normalizedCode,
      )
    )
      return NextResponse.json(
        {
          error:
            "Không thể xóa phiếu nhập vì tài sản này đã có giao dịch xuất kho",
        },
        { status: 400 },
      );

    await deleteAssetTransaction(type, record.id);
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
