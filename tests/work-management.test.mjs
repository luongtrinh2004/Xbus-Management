import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateProjectProgress,
  canAccessProject,
  getProjectRole,
  getTemplateSections,
  nextTaskNumber,
  normalizeProjectKey,
  normalizeWorkState,
  taskCode,
  validateProjectKey
} from '../src/libs/workManagement.js'

test('project keys are normalized to uppercase ASCII tokens', () => {
  assert.equal(normalizeProjectKey('  web app  '), 'WEB-APP')
  assert.equal(normalizeProjectKey('Dự án số 1'), 'DU-AN-SO-1')
})

test('project key validation rejects invalid or duplicate keys', () => {
  assert.deepEqual(validateProjectKey('WEB-1', ['OPS']), { valid: true, key: 'WEB-1' })
  assert.equal(validateProjectKey('A', []).valid, false)
  assert.equal(validateProjectKey('WEB_1', []).valid, false)
  assert.equal(validateProjectKey('WEB', ['web']).reason, 'duplicate')
})

test('task numbering and code use the next project sequence', () => {
  const tasks = [{ projectId: 'p1', number: 1 }, { projectId: 'p1', number: 7 }, { projectId: 'p2', number: 20 }]
  assert.equal(nextTaskNumber(tasks, 'p1'), 8)
  assert.equal(taskCode({ key: 'WEB' }, 8), 'WEB-8')
})

test('templates provide practical default sections', () => {
  assert.deepEqual(getTemplateSections('basic').map(item => item.name), ['Việc cần làm', 'Đang thực hiện', 'Hoàn thành'])
  assert.deepEqual(getTemplateSections('campaign').map(item => item.name), ['Ý tưởng', 'Chuẩn bị', 'Đang chạy', 'Đã hoàn tất'])
})

test('project visibility and member roles enforce private access', () => {
  const project = { id: 'p1', visibility: 'private', ownerId: 'u1' }
  const members = [{ projectId: 'p1', userId: 'u2', role: 'editor' }]
  assert.equal(getProjectRole(project, members, { id: 'u1', role: 'user' }), 'owner')
  assert.equal(getProjectRole(project, members, { id: 'u2', role: 'user' }), 'editor')
  assert.equal(getProjectRole(project, members, { id: 'admin', role: 'admin' }), 'admin')
  assert.equal(canAccessProject(project, members, { id: 'u3', role: 'user' }), false)
  assert.equal(canAccessProject({ ...project, visibility: 'public' }, members, { id: 'u3', role: 'user' }), true)
})

test('project progress ignores archived tasks and rounds completion percentage', () => {
  const tasks = [
    { projectId: 'p1', completed: true },
    { projectId: 'p1', status: 'done' },
    { projectId: 'p1', completed: false },
    { projectId: 'p1', archivedAt: '2026-01-01' },
    { projectId: 'p2', completed: true }
  ]
  assert.equal(calculateProjectProgress(tasks, 'p1'), 67)
  assert.equal(calculateProjectProgress([], 'p1'), 0)
})

test('state normalization creates all collections and repairs counters', () => {
  const state = normalizeWorkState({ projects: [{ id: 'p1', key: 'WEB' }], tasks: [{ id: 't1', projectId: 'p1', number: 4 }] })
  assert.deepEqual(state.projectMembers, [])
  assert.deepEqual(state.sections, [])
  assert.deepEqual(state.comments, [])
  assert.deepEqual(state.activities, [])
  assert.deepEqual(state.labels, [])
  assert.deepEqual(state.taskLabels, [])
  assert.equal(state.counters.p1, 4)
})
