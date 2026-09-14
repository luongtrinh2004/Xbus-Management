const accountAvatarMap = {
  admin: '/images/avatars/admin.png',
  user: '/images/avatars/user.png',
  customer: '/images/avatars/customer.png'
}

export const getAccountAvatar = type => accountAvatarMap[type] || null

export const getOperationAvatarByRole = role => getAccountAvatar(role) || getAccountAvatar('user')
