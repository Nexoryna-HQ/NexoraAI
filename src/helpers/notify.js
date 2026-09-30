const listeners = new Set()

function emit(type, message) {
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, message: String(message || "") }
  listeners.forEach((listener) => listener(entry))
}

export const NotificationManager = {
  success(message) {
    emit("success", message)
  },
  error(message) {
    emit("error", message)
  },
  warning(message) {
    emit("warning", message)
  },
  info(message) {
    emit("info", message)
  },
}

export function subscribeNotifications(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
