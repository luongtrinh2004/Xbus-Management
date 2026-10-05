import { NextResponse } from 'next/server'
import { addActivity, auditFor, findProject, loadWorkContext, makeId, mayManageProject, mayReadProject, nowIso, persistWork, publicUser } from '@/libs/workApi'
import { calculateProjectProgress, isValidId, validateProjectKey } from '@/libs/workManagement'

export async function GET(req, context) {
  const { id } = await context.params
  const { actor, state, users } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  if (!isValidId(id)) return NextResponse.json({ error: 'Mã dự án không hợp lệ' }, { status: 400 })
  const project = findProject(state, id)
  if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 })
  if (!mayReadProject(state, project, actor)) return NextResponse.json({ error: 'Không có quyền truy cập dự án' }, { status: 403 })
  const userMap = new Map(users.map(user => [user.id, publicUser(user)]))
  return NextResponse.json({
    project: { ...project, progress: calculateProjectProgress(state.tasks, id) },
    members: state.projectMembers.filter(item => item.projectId === id).map(item => ({ ...item, user: userMap.get(item.userId) || null })),
    sections: state.sections.filter(item => item.projectId === id).sort((a, b) => a.order - b.order),
    tasks: state.tasks.filter(item => item.projectId === id && !item.archivedAt).map(task => ({ ...task, assignee: userMap.get(task.assigneeId) || null, labels: state.taskLabels.filter(link => link.taskId === task.id).map(link => state.labels.find(label => label.id === link.labelId)).filter(Boolean) })),
    comments: state.comments.filter(item => state.tasks.some(task => task.id === item.taskId && task.projectId === id)),
    activities: state.activities.filter(item => item.projectId === id).slice(0, 100),
    labels: state.labels.filter(item => item.projectId === id),
    users: [...userMap.values()]
  })
}

export async function PATCH(req, context) {
  const { id } = await context.params
  const { actor, state, users } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const project = findProject(state, id)
  if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 })
  if (!mayManageProject(state, project, actor)) return NextResponse.json({ error: 'Chỉ chủ dự án hoặc quản trị viên được cập nhật dự án' }, { status: 403 })
  const body = await req.json()
  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title || title.length > 120) return NextResponse.json({ error: 'Tên dự án không hợp lệ' }, { status: 400 })
    project.title = title
  }
  if (body.key !== undefined && body.key !== project.key) {
    const validation = validateProjectKey(body.key, state.projects.filter(item => item.id !== id).map(item => item.key))
    if (!validation.valid) return NextResponse.json({ error: 'Mã dự án không hợp lệ hoặc đã tồn tại' }, { status: 400 })
    project.key = validation.key
  }
  if (body.description !== undefined) project.description = String(body.description || '').trim().slice(0, 1000)
  if (body.visibility !== undefined) {
    if (!['public', 'private'].includes(body.visibility)) return NextResponse.json({ error: 'Phạm vi không hợp lệ' }, { status: 400 })
    project.visibility = body.visibility
  }
  if (body.color !== undefined && /^#[0-9a-f]{6}$/i.test(body.color)) project.color = body.color
  if (Array.isArray(body.members)) {
    const validUsers = new Set(users.map(user => user.id))
    const next = body.members.filter(item => validUsers.has(item.userId) && item.userId !== project.ownerId && ['editor', 'member'].includes(item.role))
    state.projectMembers = state.projectMembers.filter(item => item.projectId !== id || item.userId === project.ownerId)
    for (const item of next) state.projectMembers.push({ id: makeId('pm'), projectId: id, userId: item.userId, role: item.role, createdAt: nowIso() })
  }
  project.updatedAt = nowIso()
  addActivity(state, { actor, projectId: id, action: 'update_project', details: project.title })
  await persistWork(state, auditFor(actor, 'UPDATE_WORK_PROJECT', 'WORK_PROJECT', id, `Cập nhật dự án ${project.key}`))
  return NextResponse.json(project)
}

export async function DELETE(req, context) {
  const { id } = await context.params
  const { actor, state } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const project = findProject(state, id)
  if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 })
  if (!mayManageProject(state, project, actor)) return NextResponse.json({ error: 'Không có quyền lưu trữ dự án' }, { status: 403 })
  project.archivedAt = nowIso(); project.updatedAt = project.archivedAt
  addActivity(state, { actor, projectId: id, action: 'archive_project', details: project.title })
  await persistWork(state, auditFor(actor, 'ARCHIVE_WORK_PROJECT', 'WORK_PROJECT', id, `Lưu trữ dự án ${project.key}`))
  return NextResponse.json({ success: true })
}
