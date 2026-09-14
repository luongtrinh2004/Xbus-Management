import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getTypes, saveTypes } from '@/libs/jsonRepository'

const secret = process.env.NEXTAUTH_SECRET

export async function GET() {
  try {
    const types = getTypes()
    return NextResponse.json(types)
  } catch (error) {
    console.error('[API Departments] GET error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret })
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const body = await req.json()
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Tên bộ phận không được để trống' }, { status: 400 })
    }

    const types = getTypes()

    // Kiểm tra trùng tên
    if (types.some(t => t.name.toLowerCase() === body.name.trim().toLowerCase())) {
      return NextResponse.json({ error: 'Tên bộ phận đã tồn tại' }, { status: 409 })
    }

    const slug = body.name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const newType = {
      id: `type_${slug}_${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() || '',
      active: true,
      createdAt: new Date().toISOString()
    }

    types.push(newType)
    saveTypes(types)

    return NextResponse.json(newType, { status: 201 })
  } catch (error) {
    console.error('[API Departments] POST error:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
