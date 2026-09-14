import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getTypes, saveTypes, getUsers, saveUsers } from '@/libs/jsonRepository'

const secret = process.env.NEXTAUTH_SECRET

export async function DELETE(req, { params }) {
  try {
    const token = await getToken({ req, secret })
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const { id } = params
    const types = getTypes()
    const target = types.find(t => t.id === id)

    if (!target) {
      return NextResponse.json({ error: 'Bộ phận không tồn tại' }, { status: 404 })
    }

    // Cascade: các nhân sự đang gắn bộ phận này → typeId = null
    const users = getUsers()
    let affectedCount = 0
    const updatedUsers = users.map(u => {
      if (u.typeId === id) {
        affectedCount++
        return { ...u, typeId: null, updatedAt: new Date().toISOString() }
      }
      return u
    })

    if (affectedCount > 0) {
      saveUsers(updatedUsers)
    }

    // Xóa bộ phận
    const newTypes = types.filter(t => t.id !== id)
    saveTypes(newTypes)

    return NextResponse.json({
      message: `Đã xóa bộ phận "${target.name}"`,
      affectedUsers: affectedCount
    })
  } catch (error) {
    console.error('[API Departments] DELETE error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
