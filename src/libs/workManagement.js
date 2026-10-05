const collections = [
  'projects',
  'projectMembers',
  'sections',
  'tasks',
  'comments',
  'activities',
  'labels',
  'taskLabels'
]

export const WORK_TEMPLATES = {
  basic: ['Việc cần làm', 'Đang thực hiện', 'Hoàn thành'],
  campaign: ['Ý tưởng', 'Chuẩn bị', 'Đang chạy', 'Đã hoàn tất'],
  sprint: ['Backlog', 'Sẵn sàng', 'Đang thực hiện', 'Kiểm thử', 'Hoàn thành']
}

export function normalizeProjectKey(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, match => (match === 'Đ' ? 'D' : 'd'))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12)
}

export function validateProjectKey(value, existingKeys = []) {
  const raw = String(value || '').trim().toUpperCase()
  const key = normalizeProjectKey(value)
  if (raw !== key || !/^[A-Z][A-Z0-9-]{1,11}$/.test(key)) return { valid: false, key, reason: 'invalid' }
  if (existingKeys.some(item => normalizeProjectKey(item) === key)) return { valid: false, key, reason: 'duplicate' }
  return { valid: true, key }
}

export function nextTaskNumber(tasks = [], projectId, counter = 0) {
  return Math.max(Number(counter) || 0, ...tasks.filter(item => item.projectId === projectId).map(item => Number(item.number) || 0)) + 1
}

export function taskCode(project, number) {
  return `${normalizeProjectKey(project?.key)}-${Number(number)}`
}

export function getTemplateSections(template = 'basic') {
  const names = WORK_TEMPLATES[template] || WORK_TEMPLATES.basic
  return names.map((name, index) => ({ name, order: index, status: index === names.length - 1 ? 'done' : index === 0 ? 'todo' : 'in_progress' }))
}

export function getProjectRole(project, members = [], actor) {
  if (!actor?.id) return null
  if (actor.role === 'admin') return 'admin'
  if (project?.ownerId === actor.id) return 'owner'
  return members.find(item => item.projectId === project?.id && item.userId === actor.id)?.role || null
}

export function canAccessProject(project, members, actor) {
  return Boolean(actor?.id && (project?.visibility === 'public' || getProjectRole(project, members, actor)))
}

export function canManageProject(project, members, actor) {
  return ['admin', 'owner'].includes(getProjectRole(project, members, actor))
}

export function canManageTasks(project, members, actor) {
  return ['admin', 'owner', 'editor'].includes(getProjectRole(project, members, actor))
}

export function canUpdateTask(task, project, members, actor, patch = {}) {
  if (canManageTasks(project, members, actor)) return true
  const onlyStatus = Object.keys(patch).every(key => ['status', 'completed', 'sectionId'].includes(key))
  return onlyStatus && task?.assigneeId === actor?.id && Boolean(getProjectRole(project, members, actor))
}

export function calculateProjectProgress(tasks = [], projectId) {
  const active = tasks.filter(item => item.projectId === projectId && !item.archivedAt)
  if (!active.length) return 0
  const completed = active.filter(item => item.completed || item.status === 'done').length
  return Math.round((completed / active.length) * 100)
}

export function normalizeWorkState(input = {}) {
  const state = { ...input }
  for (const name of collections) state[name] = Array.isArray(input[name]) ? input[name] : []
  const counters = { ...(input.counters || {}) }
  for (const task of state.tasks) counters[task.projectId] = Math.max(Number(counters[task.projectId]) || 0, Number(task.number) || 0)
  state.counters = counters
  state.version = 1
  return state
}

export function isValidId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{2,100}$/.test(value)
}

export function isValidDate(value) {
  if (value === null || value === undefined || value === '') return true
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
}

export function normalizeTaskStatus(value) {
  return ['todo', 'in_progress', 'blocked', 'done'].includes(value) ? value : 'todo'
}
