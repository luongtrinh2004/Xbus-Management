import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUsers, saveUsers, appendAuditLog } from "@/libs/dataRepository";
import { generateExcelBuffer } from "@/libs/excelHelper";
import { formatVietnamDate } from "@/libs/dateTime";

const secret = process.env.NEXTAUTH_SECRET;
const normalizeStaffCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");
const validPhone = (value) => !value || /^(\+84|0)\d{9,10}$/.test(value);
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );

export async function GET(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id)
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    const searchParams = req.nextUrl.searchParams;
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const category = searchParams.get("category") || "";
    const search = (searchParams.get("search") || "").toLowerCase().trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const isExport = searchParams.get("export") === "excel";
    const sortBy = searchParams.get("sortBy") || "";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;

    let users = await getUsers();

    // Lọc theo role
    if (role) {
      users = users.filter((u) => u.role === role);
    }

    // Lọc theo status
    if (status) {
      users = users.filter((u) => u.status === status);
    }

    // Lọc theo type (bộ phận)
    if (type) {
      users = users.filter((u) => u.typeId === type);
    }

    // Lọc theo category (hình thức)
    if (category) {
      users = users.filter((u) => u.categoryId === category);
    }

    // Lọc toàn bộ danh sách trước khi phân trang để kết quả không bị giới hạn
    // trong trang hiện tại.
    if (search) {
      users = users.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(search)) ||
          (u.email && u.email.toLowerCase().includes(search)) ||
          (u.code && u.code.toLowerCase().includes(search)) ||
          (u.phone && u.phone.toLowerCase().includes(search)),
      );
    }

    const sortableFields = new Set([
      "name",
      "code",
      "gender",
      "phone",
      "typeId",
      "categoryId",
      "role",
      "schedulingPoints",
    ]);
    if (sortableFields.has(sortBy)) {
      const ranks = {
        gender: { female: 0, male: 1, other: 2, unspecified: 3 },
        categoryId: {
          category_official: 0,
          category_probation: 1,
          category_intern: 2,
          category_collaborator: 3,
        },
        role: { admin: 0, assistant: 1, user: 2 },
      };
      users.sort((a, b) => {
        if (ranks[sortBy])
          return (
            ((ranks[sortBy][a[sortBy]] ?? 99) -
              (ranks[sortBy][b[sortBy]] ?? 99)) *
            sortOrder
          );
        if (sortBy === "schedulingPoints")
          return (
            (Number(a.schedulingPoints || 0) -
              Number(b.schedulingPoints || 0)) *
            sortOrder
          );
        if (!a[sortBy] && b[sortBy]) return 1;
        if (a[sortBy] && !b[sortBy]) return -1;
        return (
          String(a[sortBy] || "").localeCompare(String(b[sortBy] || ""), "vi", {
            numeric: true,
            sensitivity: "base",
          }) * sortOrder
        );
      });
    }

    // Xuất Excel nếu có param export=excel
    if (isExport) {
      const exportData = users.map((u) => ({
        "Mã nhân sự": u.code || "",
        "Họ và tên": u.name || "",
        Email: u.email || "",
        "Giới tính":
          u.gender === "male" ? "Nam" : u.gender === "female" ? "Nữ" : "Khác",
        "Số điện thoại": u.phone || "",
        "Vai trò":
          u.role === "admin"
            ? "Quản trị viên"
            : u.role === "assistant"
              ? "Trợ lý"
              : "Nhân viên",
        "Bộ phận": u.typeId || "",
        "Hình thức": u.categoryId || "",
        "Trạng thái":
          u.status === "able"
            ? "Đang hoạt động"
            : "Chờ kích hoạt / Vô hiệu hóa",
        "Điểm bê nước": u.schedulingPoints || 0,
        "Số lượt bê nước": u.waterTripCount || 0,
        "Ngày tạo": formatVietnamDate(u.createdAt),
      }));

      const buffer = generateExcelBuffer(exportData, "Danh sách nhân sự");
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="danh_sach_nhan_su_${Date.now()}.xlsx"`,
        },
      });
    }

    // Phân trang
    const totalUsers = users.length;
    const skip = (page - 1) * limit;
    const paginatedUsers = users.slice(skip, skip + limit);

    return NextResponse.json({
      data: paginatedUsers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit,
      },
    });
  } catch (error) {
    console.error("[API Users] Lỗi GET:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (token?.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên có quyền thêm nhân sự" },
        { status: 403 },
      );
    }
    const body = await req.json();

    if (!body.email || !body.name || !normalizeStaffCode(body.code)) {
      return NextResponse.json(
        { error: "Tên, email và mã nhân sự là bắt buộc" },
        { status: 400 },
      );
    }
    if (!validEmail(body.email))
      return NextResponse.json(
        { error: "Email không hợp lệ" },
        { status: 400 },
      );
    if (!validPhone(body.phone))
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
      [body.birthday, body.citizenIssuedDate, body.joinedDate].some(
        (date) => date && date > today(),
      )
    )
      return NextResponse.json(
        { error: "Ngày hồ sơ không được lớn hơn ngày hiện tại" },
        { status: 400 },
      );

    const users = await getUsers();
    const code = normalizeStaffCode(body.code);
    if (!/^[\p{L}\p{N}_-]+$/u.test(code)) {
      return NextResponse.json(
        {
          error:
            "Mã nhân sự chỉ gồm chữ cái, số, dấu gạch ngang hoặc gạch dưới",
        },
        { status: 400 },
      );
    }

    // Kiểm tra trùng email
    if (users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      return NextResponse.json(
        { error: "Email đã tồn tại trong hệ thống" },
        { status: 409 },
      );
    }
    if (users.some((u) => normalizeStaffCode(u.code) === code)) {
      return NextResponse.json(
        { error: "Mã nhân sự đã được sử dụng" },
        { status: 409 },
      );
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      googleId: body.googleId || "",
      name: body.name,
      email: body.email.toLowerCase(),
      code,
      avatarUrl: body.avatarUrl || "",
      gender: body.gender || "unspecified",
      birthday: body.birthday || "",
      phone: body.phone || "",
      citizenId: body.citizenId || "",
      citizenIssuedDate: body.citizenIssuedDate || "",
      address: body.address || "",
      position: body.position || "",
      jiraAccount: body.jiraAccount || "",
      joinedDate: body.joinedDate || "",
      role: body.role || "user",
      typeId: body.typeId || "web_app",
      categoryId: body.categoryId || "category_official",
      status: body.status || "able",
      schedulingPoints: 0,
      waterTripCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activatedAt: body.status === "able" ? new Date().toISOString() : null,
      activatedBy: token?.id || "system",
    };

    users.unshift(newUser);
    await saveUsers(users);

    // Ghi audit log
    await appendAuditLog({
      adminId: token?.id || "admin",
      adminName: token?.name || "Admin",
      adminEmail: token?.email || "admin@phenikaa-x.com",
      action: "CREATE_USER",
      targetType: "USER",
      targetId: newUser.id,
      details: `Tạo mới nhân sự ${newUser.name} (${newUser.code} - ${newUser.email})`,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("[API Users] Lỗi POST:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
