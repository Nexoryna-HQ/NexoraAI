import React, { useEffect, useState } from "react"
import { subscribeNotifications } from "../../helpers/notify"
import "./NotifyToast.css"

export function NotificationContainer() {
  const [items, setItems] = useState([])

  useEffect(() => {
    return subscribeNotifications((entry) => {
      setItems((current) => [...current.slice(-4), entry])
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== entry.id))
      }, 3500)
    })
  }, [])

  if (!items.length) return null

  return (
    <div className="notifyToastStack" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`notifyToast notifyToast-${item.type}`}>
          {item.message}
        </div>
      ))}
    </div>
  )
}
