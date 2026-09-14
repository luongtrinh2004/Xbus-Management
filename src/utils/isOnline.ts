const STALE = Number(process.env.NEXT_PUBLIC_PRESENCE_STALE_MS || 5000)

/**
 * Ưu tiên boolean v.online (Presence),
 * nếu không có thì dùng lastSeen/presenceLastSeen để tính.
 */
export default function isOnline(v?: {
  online?: boolean
  lastSeen?: number | string
  presenceLastSeen?: number | string
}) {
  if (typeof v?.online === 'boolean') return v.online
  const ls = Number(v?.lastSeen ?? v?.presenceLastSeen)

  if (!ls) return false

  return Date.now() - ls <= STALE
}
