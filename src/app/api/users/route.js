import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getUsers, saveUsers, appendAuditLog } from '@/libs/jsonRepository'
import { generateExcelBuffer } from '@/libs/excelHelper'

const secret = process.env.NEXTAUTH_SECRET

export async function GET(req) {
  try {
    const token = await getToken({ req, secret })
    const searchParams = req.nextUrl.searchParams
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const category = searchParams.get('category') || ''
    const search = (searchParams.get('search') || '').toLowerCase().trim()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const isExport = searchParams.get('export') === 'excel'
    const sortBy = searchParams.get('sortBy') || ''
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1

    let users = getUsers()

    // Lọc theo role
    if (role) {
      users = users.filter(u => u.role === role)
    }

    // Lọc theo status
    if (status) {
      users = users.filter(u => u.status === status)
    }

    // Lọc theo type (bộ phận)
    if (type) {
      users = users.filter(u => u.typeId === type)
    }

    // Lọc theo category (hình thức)
    if (category) {
      users = users.filter(u => u.categoryId === category)
    }

    // Lọc tìm kiếm theo tên, email, hoặc code
    if (search) {
      users = users.filter(u =>
        (u.name && u.name.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.code && u.code.toLowerCase().includes(search))
      )
    }

    const sortableFields = new Set(['name', 'code', 'gender', 'phone', 'typeId', 'categoryId', 'role'])
    if (sortableFields.has(sortBy)) {
      const ranks = {
        gender: { female: 0, male: 1, other: 2, unspecified: 3 },
        categoryId: { category_official: 0, category_probation: 1, category_intern: 2, category_collaborator: 3 },
        role: { admin: 0, assistant: 1, user: 2 }
      }
      users.sort((a, b) => {
        if (ranks[sortBy]) return ((ranks[sortBy][a[sortBy]] ?? 99) - (ranks[sortBy][b[sortBy]] ?? 99)) * sortOrder
        if (!a[sortBy] && b[sortBy]) return 1
        if (a[sortBy] && !b[sortBy]) return -1
        return String(a[sortBy] || '').localeCompare(String(b[sortBy] || ''), 'vi', { numeric: true, sensitivity: 'base' }) * sortOrder
      })
    }

    // Xuất Excel nếu có param export=excel
    if (isExport) {
      const exportData = users.map(u => ({
        'Mã nhân sự': u.code || '',
        'Họ và tên': u.name || '',
        'Email': u.email || '',
        'Giới tính': u.gender === 'male' ? 'Nam' : u.gender === 'female' ? 'Nữ' : 'Khác',
        'Số điện thoại': u.phone || '',
        'Vai trò': u.role === 'admin' ? 'Quản trị viên' : u.role === 'assistant' ? 'Trợ lý' : 'Nhân viên',
        'Bộ phận': u.typeId || '',
        'Hình thức': u.categoryId || '',
        'Trạng thái': u.status === 'able' ? 'Đang hoạt động' : 'Chờ kích hoạt / Vô hiệu hóa',
        'Điểm bê nước': u.schedulingPoints || 0,
        'Số lượt bê nước': u.waterTripCount || 0,
        'Ngày tạo': u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : ''
      }))

      const buffer = generateExcelBuffer(exportData, 'Danh sách nhân sự')
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="danh_sach_nhan_su_${Date.now()}.xlsx"`
        }
      })
    }

    // Phân trang
    const totalUsers = users.length
    const skip = (page - 1) * limit
    const paginatedUsers = users.slice(skip, skip + limit)

    return NextResponse.json({
      data: paginatedUsers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit
      }
    })
  } catch (error) {
    console.error('[API Users] Lỗi GET:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret })
    if (token?.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ quản trị viên có quyền thêm nhân sự' }, { status: 403 })
    }
    const body = await req.json()

    if (!body.email || !body.name) {
      return NextResponse.json({ error: 'Tên và Email là bắt buộc' }, { status: 400 })
    }

    const users = getUsers()

    // Kiểm tra trùng email
    if (users.some(u => u.email.toLowerCase() === body.email.toLowerCase())) {
      return NextResponse.json({ error: 'Email đã tồn tại trong hệ thống' }, { status: 409 })
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      googleId: body.googleId || '',
      name: body.name,
      email: body.email.toLowerCase(),
      code: body.code || `XBS${Math.floor(100 + Math.random() * 900)}`,
      avatarUrl: body.avatarUrl || '',
      gender: body.gender || 'unspecified',
      birthday: body.birthday || '',
      phone: body.phone || '',
      role: body.role || 'user',
      typeId: body.typeId || 'type_web_app',
      categoryId: body.categoryId || 'category_official',
      status: body.status || 'able',
      schedulingPoints: 0,
      waterTripCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activatedAt: body.status === 'able' ? new Date().toISOString() : null,
      activatedBy: token?.id || 'system'
    }

    users.unshift(newUser)
    saveUsers(users)

    // Ghi audit log
    appendAuditLog({
      adminId: token?.id || 'admin',
      adminName: token?.name || 'Admin',
      adminEmail: token?.email || 'admin@phenikaa-x.com',
      action: 'CREATE_USER',
      targetType: 'USER',
      targetId: newUser.id,
      details: `Tạo mới nhân sự ${newUser.name} (${newUser.code} - ${newUser.email})`
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('[API Users] Lỗi POST:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
