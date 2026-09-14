import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getUsers, saveUsers, appendAuditLog } from '@/libs/jsonRepository'
import bcrypt from 'bcryptjs'

const secret = process.env.NEXTAUTH_SECRET

export async function GET(req) {
  try {
    const token = await getToken({ req, secret })
    if (!token) return NextResponse.json({ error: 'Chua xac thuc' }, { status: 401 })
    const users = getUsers()
    const user = users.find(u => u.id === token.id)
    if (!user) return NextResponse.json({ error: 'Khong tim thay tai khoan' }, { status: 404 })
    const { password, ...safeUser } = user
    return NextResponse.json(safeUser)
  } catch (error) {
    console.error('[API Profile] GET:', error)
    return NextResponse.json({ error: 'Loi he thong' }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const token = await getToken({ req, secret })
    if (!token) return NextResponse.json({ error: 'Chua xac thuc' }, { status: 401 })
    const body = await req.json()
    const users = getUsers()
    const index = users.findIndex(u => u.id === token.id)
    if (index === -1) return NextResponse.json({ error: 'Khong tim thay tai khoan' }, { status: 404 })
    const oldUser = users[index]
    const allowedFields = ['name', 'phone', 'gender']
    const updates = {}
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field]
    }
    if (body.newPassword) {
      if (!body.currentPassword) return NextResponse.json({ error: 'Vui long nhap mat khau hien tai' }, { status: 400 })
      if (body.newPassword.length < 6) return NextResponse.json({ error: 'Mat khau moi can it nhat 6 ky tu' }, { status: 400 })
      const isMatch = await bcrypt.compare(body.currentPassword, oldUser.password || '')
      if (!isMatch) return NextResponse.json({ error: 'Mat khau hien tai khong dung' }, { status: 400 })
      updates.password = await bcrypt.hash(body.newPassword, 10)
    }
    const updatedUser = { ...oldUser, ...updates, updatedAt: new Date().toISOString() }
    users[index] = updatedUser
    saveUsers(users)
    appendAuditLog({
      adminId: token.id, adminName: token.name || oldUser.name, adminEmail: token.email || oldUser.email,
      action: 'UPDATE_PROFILE', targetType: 'USER', targetId: token.id,
      details: `${updatedUser.name} cap nhat thong tin ca nhan: ${Object.keys(updates).filter(k => k !== 'password').join(', ')}`
    })
    const { password, ...safeUser } = updatedUser
    return NextResponse.json(safeUser)
  } catch (error) {
    console.error('[API Profile] PATCH:', error)
    return NextResponse.json({ error: 'Loi he thong' }, { status: 500 })
  }
}
