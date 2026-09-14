import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getUsers, saveUsers } from '@/libs/jsonRepository'
import path from 'path'
import fs from 'fs'

const secret = process.env.NEXTAUTH_SECRET
const AVATARS_DIR = path.join(process.cwd(), 'public', 'images', 'avatars')
const MAX_SIZE_MB = 5

export async function POST(req, { params }) {
  try {
    const token = await getToken({ req, secret })
    if (!token) {
      return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 })
    }

    const { id } = params
    const users = getUsers()
    const user = users.find(u => u.id === id)

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy nhân sự' }, { status: 404 })
    }

    // Chỉ admin hoặc chính user đó mới được upload
    if (token.role !== 'admin' && token.id !== id) {
      return NextResponse.json({ error: 'Không có quyền thực hiện' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('avatar')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Không tìm thấy file ảnh' }, { status: 400 })
    }

    // Kiểm tra loại file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP' }, { status: 400 })
    }

    // Kiểm tra kích thước (max 5MB)
    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Ảnh không được vượt quá ${MAX_SIZE_MB}MB` }, { status: 400 })
    }

    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(AVATARS_DIR)) {
      fs.mkdirSync(AVATARS_DIR, { recursive: true })
    }

    // Xóa avatar cũ nếu là file custom (không phải default)
    if (user.avatarUrl && user.avatarUrl.startsWith('/images/avatars/') && user.code) {
      const oldFileName = path.basename(user.avatarUrl)
      // Chỉ xóa nếu là file tên theo mã NV (không xóa file default)
      const defaultFiles = ['male-admin.png', 'female-admin.png', 'male-user.png', 'female-user.png', 'assistant.png']
      if (!defaultFiles.includes(oldFileName)) {
        const oldPath = path.join(AVATARS_DIR, oldFileName)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
    }

    // Lưu file mới với tên = mã nhân viên
    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
    const code = user.code || user.id
    const fileName = `${code}-${Date.now()}.${ext}`
    const filePath = path.join(AVATARS_DIR, fileName)

    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filePath, buffer)

    // Cập nhật avatarUrl trong user record
    const avatarUrl = `/images/avatars/${fileName}`
    const updatedUsers = users.map(u =>
      u.id === id ? { ...u, avatarUrl, updatedAt: new Date().toISOString() } : u
    )
    saveUsers(updatedUsers)

    return NextResponse.json({ avatarUrl })
  } catch (error) {
    console.error('[API Avatar] POST error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
