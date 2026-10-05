import { NextResponse } from 'next/server'
import { addActivity, auditFor, findProject, loadWorkContext, makeId, mayReadProject, nowIso, persistWork } from '@/libs/workApi'

export async function POST(req, context) {
  const { id } = await context.params
  const { actor, state } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const task = state.tasks.find(item => item.id === id && !item.archivedAt)
  const project = task && findProject(state, task.projectId)
  if (!task || !project) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })
  if (!mayReadProject(state, project, actor)) return NextResponse.json({ error: 'Không có quyền bình luận' }, { status: 403 })
  const body = await req.json()
  const content = String(body.content || '').trim()
  if (!content || content.length > 3000) return NextResponse.json({ error: 'Bình luận phải có từ 1 đến 3000 ký tự' }, { status: 400 })
  const now = nowIso()
  const comment = { id: makeId('cmt'), taskId: id, authorId: actor.id, content, createdAt: now, updatedAt: now }
  state.comments.push(comment)
  addActivity(state, { actor, projectId: project.id, taskId: id, action: 'comment_task', details: content.slice(0, 100) })
  await persistWork(state, auditFor(actor, 'COMMENT_WORK_TASK', 'WORK_TASK', id, `Bình luận công việc ${task.code}`))
  return NextResponse.json(comment, { status: 201 })
}
