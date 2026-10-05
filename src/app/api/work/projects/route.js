import { NextResponse } from 'next/server'
import { addActivity, auditFor, loadWorkContext, makeId, nowIso, persistWork, publicUser } from '@/libs/workApi'
import { calculateProjectProgress, getProjectRole, getTemplateSections, normalizeProjectKey, validateProjectKey } from '@/libs/workManagement'

export async function GET(req) {
  const { actor, state, users } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Vui lòng đăng nhập bằng tài khoản đang hoạt động' }, { status: 401 })
  const userMap = new Map(users.map(user => [user.id, publicUser(user)]))
  const projects = state.projects
    .filter(project => !project.archivedAt && (project.visibility === 'public' || getProjectRole(project, state.projectMembers, actor)))
    .map(project => ({
      ...project,
      role: getProjectRole(project, state.projectMembers, actor) || 'viewer',
      owner: userMap.get(project.ownerId) || null,
      members: state.projectMembers.filter(item => item.projectId === project.id).map(item => ({ ...item, user: userMap.get(item.userId) || null })),
      taskCount: state.tasks.filter(item => item.projectId === project.id && !item.archivedAt).length,
      progress: calculateProjectProgress(state.tasks, project.id)
    }))
  return NextResponse.json({ projects, users: [...userMap.values()] })
}

export async function POST(req) {
  const { actor, state, users } = await loadWorkContext(req)
  if (!actor) return NextResponse.json({ error: 'Vui lòng đăng nhập bằng tài khoản đang hoạt động' }, { status: 401 })
  const body = await req.json()
  const title = String(body.title || '').trim()
  const validation = validateProjectKey(body.key, state.projects.map(item => item.key))
  if (!title || title.length > 120) return NextResponse.json({ error: 'Tên dự án phải có từ 1 đến 120 ký tự' }, { status: 400 })
  if (!validation.valid) return NextResponse.json({ error: validation.reason === 'duplicate' ? 'Mã dự án đã tồn tại' : 'Mã dự án gồm 2-12 ký tự in hoa, số hoặc dấu gạch ngang' }, { status: 400 })
  if (!['public', 'private'].includes(body.visibility || 'private')) return NextResponse.json({ error: 'Phạm vi dự án không hợp lệ' }, { status: 400 })
  const now = nowIso()
  const project = {
    id: makeId('prj'), title, key: normalizeProjectKey(body.key), description: String(body.description || '').trim().slice(0, 1000),
    color: /^#[0-9a-f]{6}$/i.test(body.color || '') ? body.color : '#7367F0', visibility: body.visibility || 'private',
    ownerId: actor.id, template: body.template || 'basic', createdAt: now, updatedAt: now, archivedAt: null
  }
  state.projects.unshift(project)
  state.projectMembers.push({ id: makeId('pm'), projectId: project.id, userId: actor.id, role: 'owner', createdAt: now })
  for (const section of getTemplateSections(project.template)) state.sections.push({ id: makeId('sec'), projectId: project.id, ...section, createdAt: now })
  for (const userId of [...new Set(Array.isArray(body.memberIds) ? body.memberIds : [])]) {
    if (userId !== actor.id && users.some(user => user.id === userId)) state.projectMembers.push({ id: makeId('pm'), projectId: project.id, userId, role: 'member', createdAt: now })
  }
  addActivity(state, { actor, projectId: project.id, action: 'create_project', details: title })
  await persistWork(state, auditFor(actor, 'CREATE_WORK_PROJECT', 'WORK_PROJECT', project.id, `Tạo dự án ${project.key} - ${title}`))
  return NextResponse.json(project, { status: 201 })
}
