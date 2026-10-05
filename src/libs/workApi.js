import { getToken } from 'next-auth/jwt'
import { appendAuditLog, getUsers, getWorkManagement, saveWorkManagement } from '@/libs/dataRepository'
import { canAccessProject, canManageProject, canManageTasks, getProjectRole, normalizeWorkState } from '@/libs/workManagement'

export const WORK_SECRET = process.env.NEXTAUTH_SECRET
export const nowIso = () => new Date().toISOString()
export const makeId = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export async function getWorkActor(req) {
  const token = await getToken({ req, secret: WORK_SECRET })
  if (!token?.id || token.status === 'disabled') return null
  return { id: token.id, name: token.name || 'Người dùng', email: token.email || '', role: token.role || 'user' }
}

export async function loadWork() {
  return normalizeWorkState(await getWorkManagement())
}

export async function loadWorkContext(req) {
  const actor = await getWorkActor(req)
  if (!actor) return { actor: null, state: null, users: [] }
  const [state, users] = await Promise.all([loadWork(), getUsers()])
  return { actor, state, users: users.filter(user => user.status !== 'disabled') }
}

export const findProject = (state, id) => state.projects.find(item => item.id === id && !item.archivedAt)
export const projectRole = (state, project, actor) => getProjectRole(project, state.projectMembers, actor)
export const mayReadProject = (state, project, actor) => canAccessProject(project, state.projectMembers, actor)
export const mayManageProject = (state, project, actor) => canManageProject(project, state.projectMembers, actor)
export const mayManageTasks = (state, project, actor) => canManageTasks(project, state.projectMembers, actor)

export function addActivity(state, { actor, projectId, taskId = null, action, details = '' }) {
  state.activities.unshift({ id: makeId('act'), projectId, taskId, actorId: actor.id, action, details, createdAt: nowIso() })
  state.activities = state.activities.slice(0, 3000)
}

export async function persistWork(state, audit) {
  await saveWorkManagement(normalizeWorkState(state))
  if (audit) await appendAuditLog(audit)
}

export const auditFor = (actor, action, targetType, targetId, details) => ({
  adminId: actor.id,
  adminName: actor.name,
  adminEmail: actor.email,
  action,
  targetType,
  targetId,
  details
})

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, code: user.code || '', avatarUrl: user.avatarUrl || '', role: user.role }
}
