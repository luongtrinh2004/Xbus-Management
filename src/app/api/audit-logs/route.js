import { NextResponse } from 'next/server'
import { getAuditLogs } from '@/libs/jsonRepository'

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)

    const allLogs = getAuditLogs()
    const skip = (page - 1) * limit
    const logs = allLogs.slice(skip, skip + limit)

    // Thêm alias createdAt từ timestamp
    const mapped = logs.map(l => ({ ...l, createdAt: l.timestamp || l.createdAt }))

    return NextResponse.json({
      logs: mapped,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(allLogs.length / limit),
        total: allLogs.length,
        limit
      }
    })
  } catch (error) {
    console.error('[API AuditLogs] GET:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
