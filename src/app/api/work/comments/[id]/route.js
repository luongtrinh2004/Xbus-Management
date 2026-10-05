import { NextResponse } from 'next/server'
import { auditFor, loadWorkContext, nowIso, persistWork } from '@/libs/workApi'

export async function PATCH(req, context) {
  const { id } = await context.params
  const { actor, state } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const comment = state.comments.find(item => item.id === id)
  if (!comment) return NextResponse.json({ error: 'Không tìm thấy bình luận' }, { status: 404 })
  if (comment.authorId !== actor.id && actor.role !== 'admin') return NextResponse.json({ error: 'Chỉ tác giả được sửa bình luận' }, { status: 403 })
  const { content } = await req.json()
  const text = String(content || '').trim()
  if (!text || text.length > 3000) return NextResponse.json({ error: 'Bình luận không hợp lệ' }, { status: 400 })
  comment.content = text; comment.updatedAt = nowIso()
  await persistWork(state, auditFor(actor, 'UPDATE_WORK_COMMENT', 'WORK_COMMENT', id, 'Cập nhật bình luận công việc'))
  return NextResponse.json(comment)
}

export async function DELETE(req, context) {
  const { id } = await context.params
  const { actor, state } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const comment = state.comments.find(item => item.id === id)
  if (!comment) return NextResponse.json({ error: 'Không tìm thấy bình luận' }, { status: 404 })
  if (comment.authorId !== actor.id && actor.role !== 'admin') return NextResponse.json({ error: 'Chỉ tác giả được xóa bình luận' }, { status: 403 })
  state.comments = state.comments.filter(item => item.id !== id)
  await persistWork(state, auditFor(actor, 'DELETE_WORK_COMMENT', 'WORK_COMMENT', id, 'Xóa bình luận công việc'))
  return NextResponse.json({ success: true })
}
