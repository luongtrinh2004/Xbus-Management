const formatTimeHour = date => {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export { formatTimeHour }
