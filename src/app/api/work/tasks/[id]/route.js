import { NextResponse } from 'next/server'
import { addActivity, auditFor, findProject, loadWorkContext, mayReadProject, nowIso, persistWork } from '@/libs/workApi'
import { canUpdateTask, isValidDate, normalizeTaskStatus } from '@/libs/workManagement'

export async function GET(req, context) {
  const { id } = await context.params
  const { actor, state, users } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const task = state.tasks.find(item => item.id === id && !item.archivedAt)
  const project = task && findProject(state, task.projectId)
  if (!task || !project) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })
  if (!mayReadProject(state, project, actor)) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
  const names = new Map(users.map(user => [user.id, user]))
  return NextResponse.json({ task, project, assignee: names.get(task.assigneeId) || null, comments: state.comments.filter(item => item.taskId === id).map(item => ({ ...item, author: names.get(item.authorId) || null })), activities: state.activities.filter(item => item.taskId === id).slice(0, 100) })
}

export async function PATCH(req, context) {
  const { id } = await context.params
  const { actor, state } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const task = state.tasks.find(item => item.id === id && !item.archivedAt)
  const project = task && findProject(state, task.projectId)
  if (!task || !project) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })
  const body = await req.json()
  if (!canUpdateTask(task, project, state.projectMembers, actor, body)) return NextResponse.json({ error: 'Không có quyền cập nhật công việc' }, { status: 403 })
  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title || title.length > 200) return NextResponse.json({ error: 'Tiêu đề không hợp lệ' }, { status: 400 })
    task.title = title
  }
  if (body.description !== undefined) task.description = String(body.description || '').trim().slice(0, 5000)
  if (body.priority !== undefined) {
    if (!['low', 'medium', 'high', 'urgent'].includes(body.priority)) return NextResponse.json({ error: 'Độ ưu tiên không hợp lệ' }, { status: 400 })
    task.priority = body.priority
  }
  if (body.dueDate !== undefined) {
    if (!isValidDate(body.dueDate)) return NextResponse.json({ error: 'Ngày không hợp lệ' }, { status: 400 })
    task.dueDate = body.dueDate || null
  }
  if (body.assigneeId !== undefined) {
    if (body.assigneeId && !state.projectMembers.some(item => item.projectId === project.id && item.userId === body.assigneeId)) return NextResponse.json({ error: 'Người phụ trách phải là thành viên dự án' }, { status: 400 })
    task.assigneeId = body.assigneeId || null
  }
  if (body.sectionId !== undefined) {
    const section = state.sections.find(item => item.id === body.sectionId && item.projectId === project.id)
    if (!section) return NextResponse.json({ error: 'Nhóm công việc không hợp lệ' }, { status: 400 })
    task.sectionId = section.id
    if (!body.status) task.status = section.status
  }
  if (body.status !== undefined) task.status = normalizeTaskStatus(body.status)
  if (body.completed !== undefined) task.completed = Boolean(body.completed)
  if (task.status === 'done') task.completed = true
  if (body.subtasks !== undefined && Array.isArray(body.subtasks)) task.subtasks = body.subtasks.slice(0, 50).map(item => ({ id: item.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, title: String(item.title || '').trim(), completed: Boolean(item.completed) })).filter(item => item.title)
  task.updatedAt = nowIso()
  addActivity(state, { actor, projectId: project.id, taskId: id, action: 'update_task', details: `${task.code} - ${task.title}` })
  await persistWork(state, auditFor(actor, 'UPDATE_WORK_TASK', 'WORK_TASK', id, `Cập nhật công việc ${task.code}`))
  return NextResponse.json(task)
}

export async function DELETE(req, context) {
  const { id } = await context.params
  const { actor, state } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const task = state.tasks.find(item => item.id === id && !item.archivedAt)
  const project = task && findProject(state, task.projectId)
  if (!task || !project) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })
  if (!canUpdateTask(task, project, state.projectMembers, actor, { title: task.title })) return NextResponse.json({ error: 'Không có quyền xóa công việc' }, { status: 403 })
  task.archivedAt = nowIso(); task.updatedAt = task.archivedAt
  addActivity(state, { actor, projectId: project.id, taskId: id, action: 'archive_task', details: task.code })
  await persistWork(state, auditFor(actor, 'ARCHIVE_WORK_TASK', 'WORK_TASK', id, `Lưu trữ công việc ${task.code}`))
  return NextResponse.json({ success: true })
}
