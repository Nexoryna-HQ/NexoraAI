const databaseURL = (process.env.REACT_APP_FIREBASE_DATABASE_URL || "").replace(/\/$/, "")

function ensureConfigured() {
  if (!databaseURL) {
    console.warn(
      "Firebase not configured. Add REACT_APP_FIREBASE_DATABASE_URL to your .env file. " +
        "Using an empty database URL will fail network requests."
    )
  }
}

ensureConfigured()

function toSnapshot(data) {
  return {
    exists() {
      return data !== null && data !== undefined
    },
    val() {
      return data
    },
  }
}

function buildUrl(path, query) {
  const clean = String(path || "").replace(/^\/+|\/+$/g, "")
  const params = new URLSearchParams()
  if (query.orderBy != null) params.set("orderBy", query.orderBy)
  if (query.startAt != null) params.set("startAt", String(query.startAt))
  if (query.endAt != null) params.set("endAt", String(query.endAt))
  if (query.equalTo != null) params.set("equalTo", String(query.equalTo))
  if (query.limitToFirst != null) params.set("limitToFirst", String(query.limitToFirst))
  if (query.limitToLast != null) params.set("limitToLast", String(query.limitToLast))
  const qs = params.toString()
  return `${databaseURL}/${clean}.json${qs ? `?${qs}` : ""}`
}

class DbRef {
  constructor(path, query = {}) {
    this.path = path
    this.query = query
    this._timers = new Map()
  }

  orderByChild(key) {
    return new DbRef(this.path, { ...this.query, orderBy: JSON.stringify(String(key)) })
  }

  startAt(value) {
    return new DbRef(this.path, { ...this.query, startAt: value })
  }

  endAt(value) {
    return new DbRef(this.path, { ...this.query, endAt: value })
  }

  equalTo(value) {
    return new DbRef(this.path, { ...this.query, equalTo: value })
  }

  async get() {
    if (!databaseURL) return toSnapshot(null)
    const response = await fetch(buildUrl(this.path, this.query))
    if (!response.ok) throw new Error(`database get failed: ${response.status}`)
    return toSnapshot(await response.json())
  }

  on(event, callback, onError) {
    if (event !== "value" || typeof callback !== "function") return callback
    const poll = async () => {
      try {
        const snap = await this.get()
        callback(snap)
      } catch (error) {
        console.warn("database listen error:", error)
        if (typeof onError === "function") onError(error)
        else callback(toSnapshot(null))
      }
    }
    poll()
    const timer = window.setInterval(poll, 4000)
    this._timers.set(callback, timer)
    return callback
  }

  off(event, callback) {
    const timer = this._timers.get(callback)
    if (timer) {
      window.clearInterval(timer)
      this._timers.delete(callback)
    }
  }

  update(values) {
    if (!databaseURL) return Promise.reject(new Error("database URL missing"))
    return fetch(buildUrl(this.path, {}), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values || {}),
    }).then((response) => {
      if (!response.ok) throw new Error(`database update failed: ${response.status}`)
      return response.json()
    })
  }

  set(values) {
    if (!databaseURL) return Promise.reject(new Error("database URL missing"))
    return fetch(buildUrl(this.path, {}), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).then((response) => {
      if (!response.ok) throw new Error(`database set failed: ${response.status}`)
      return response.json()
    })
  }
}

export const database = {
  ref(path) {
    return new DbRef(path)
  },
}

export default { database }
