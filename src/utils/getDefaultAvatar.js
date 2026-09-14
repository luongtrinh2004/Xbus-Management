/**
 * Trả về đường dẫn avatar mặc định dựa trên role và gender.
 * Nếu user đã có avatarUrl riêng, dùng trực tiếp avatarUrl đó.
 */
export function getDefaultAvatar(role, gender) {
  const isAdmin = role === 'admin'
  const isFemale = gender === 'female'

  if (role === 'assistant') return '/images/avatars/assistant.png'
  if (isAdmin && isFemale) return '/images/avatars/female-admin.png'
  if (isAdmin) return '/images/avatars/male-admin.png'
  if (isFemale) return '/images/avatars/female-user.png'
  return '/images/avatars/male-user.png'
}

/**
 * Trả về src avatar cuối cùng: custom nếu có, ngược lại dùng default.
 */
export function resolveAvatar(user) {
  if (user?.avatarUrl) return user.avatarUrl
  return getDefaultAvatar(user?.role, user?.gender)
}
