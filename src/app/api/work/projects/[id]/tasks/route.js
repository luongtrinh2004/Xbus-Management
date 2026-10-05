import { NextResponse } from 'next/server'
import { addActivity, auditFor, findProject, loadWorkContext, makeId, mayManageTasks, nowIso, persistWork } from '@/libs/workApi'
import { isValidDate, nextTaskNumber, normalizeTaskStatus, taskCode } from '@/libs/workManagement'

export async function POST(req, context) {
  const { id } = await context.params
  const { actor, state } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const project = findProject(state, id)
  if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 })
  if (!mayManageTasks(state, project, actor)) return NextResponse.json({ error: 'Không có quyền tạo công việc' }, { status: 403 })
  const body = await req.json()
  const title = String(body.title || '').trim()
  if (!title || title.length > 200) return NextResponse.json({ error: 'Tiêu đề công việc phải có từ 1 đến 200 ký tự' }, { status: 400 })
  const section = state.sections.find(item => item.id === body.sectionId && item.projectId === id) || state.sections.filter(item => item.projectId === id).sort((a, b) => a.order - b.order)[0]
  if (!section) return NextResponse.json({ error: 'Dự án chưa có nhóm công việc' }, { status: 400 })
  if (!isValidDate(body.dueDate)) return NextResponse.json({ error: 'Hạn hoàn thành không hợp lệ' }, { status: 400 })
  if (body.assigneeId && !state.projectMembers.some(item => item.projectId === id && item.userId === body.assigneeId)) return NextResponse.json({ error: 'Người phụ trách phải là thành viên dự án' }, { status: 400 })
  const number = nextTaskNumber(state.tasks, id, state.counters[id])
  state.counters[id] = number
  const now = nowIso()
  const task = {
    id: makeId('tsk'), projectId: id, sectionId: section.id, number, code: taskCode(project, number), title,
    description: String(body.description || '').trim().slice(0, 5000), status: normalizeTaskStatus(body.status || section.status),
    priority: ['low', 'medium', 'high', 'urgent'].includes(body.priority) ? body.priority : 'medium', assigneeId: body.assigneeId || null,
    dueDate: body.dueDate || null, completed: body.status === 'done' || section.status === 'done', subtasks: Array.isArray(body.subtasks) ? body.subtasks.slice(0, 50).map(item => ({ id: makeId('sub'), title: String(item.title || item).trim(), completed: Boolean(item.completed) })).filter(item => item.title) : [],
    createdBy: actor.id, createdAt: now, updatedAt: now, archivedAt: null
  }
  state.tasks.push(task)
  addActivity(state, { actor, projectId: id, taskId: task.id, action: 'create_task', details: `${task.code} - ${task.title}` })
  await persistWork(state, auditFor(actor, 'CREATE_WORK_TASK', 'WORK_TASK', task.id, `Tạo công việc ${task.code}: ${task.title}`))
  return NextResponse.json(task, { status: 201 })
}
