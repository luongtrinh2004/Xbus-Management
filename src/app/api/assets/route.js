import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { assetDocumentCodeFromName } from "@/libs/assetIds";
import {
  appendAuditLog,
  createAssetTransaction,
  deleteAssetTransaction,
  getAssets,
  saveAssets,
  updateAssetTransaction,
} from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const canManageAssets = (token) =>
  token?.role === "admin" || token?.role === "assistant";
const canViewAssets = (token) => Boolean(token);
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
    if (!canManageAssets(token))
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
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
    const categoryName =
      data.categories.find((item) => item.id === product.categoryId)?.name ||
      "";
    const normalizedCode = normalizeText(product.code).toUpperCase();
    if (type === "export") {
      const imported = data.imports
        .filter(
          (item) => stockKey(item) === assetDocumentCodeFromName(product.name),
        )
        .reduce((sum, item) => sum + item.quantity, 0);
      const exported = data.exports
        .filter(
          (item) => stockKey(item) === assetDocumentCodeFromName(product.name),
        )
        .reduce((sum, item) => sum + item.quantity, 0);
      if (quantity > imported - exported)
        return NextResponse.json(
          { error: `Số lượng tồn kho chỉ còn ${imported - exported}` },
          { status: 400 },
        );
    }
    const record = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      documentCode: assetDocumentCodeFromName(product.name),
      code: normalizedCode,
      name: product.name,
      category: categoryName,
      unit: product.unit,
      description: product.description || "",
      date: body.date,
      quantity,
      location: product.location || "",
      person: body.person.trim(),
      issuedTo: type === "export" ? normalizeText(body.issuedTo) : "",
      performedBy: token.id || "",
      note: body.note?.trim() || "",
      createdAt: new Date().toISOString(),
    };
    await createAssetTransaction(type, record);
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
      current.imports.forEach((item) =>
        balances.set(
          stockKey(item),
          (balances.get(stockKey(item)) || 0) + Number(item.quantity || 0),
        ),
      );
      current.exports.forEach((item) =>
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
    const categoryName =
      data.categories.find((item) => item.id === product.categoryId)?.name ||
      "";
    const normalizedCode = normalizeText(product.code).toUpperCase();

    const previous = collection[index];
    const updated = {
      ...previous,
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
      person: body.person.trim(),
      issuedTo: type === "export" ? normalizeText(body.issuedTo) : "",
      note: body.note?.trim() || "",
      updatedAt: new Date().toISOString(),
    };
    collection[index] = updated;

    const balances = new Map();
    data.imports.forEach((item) => {
      const code = stockKey(item);
      balances.set(
        code,
        (balances.get(code) || 0) + Number(item.quantity || 0),
      );
    });
    data.exports.forEach((item) => {
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
    const normalizedCode = stockKey(record);
    if (
      type === "import" &&
      data.exports.some((item) => stockKey(item) === normalizedCode)
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
