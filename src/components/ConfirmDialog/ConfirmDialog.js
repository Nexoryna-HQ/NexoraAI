import React, { useEffect } from "react"
import "./ConfirmDialog.css"

export function ConfirmDialog({ open, title, onConfirm, onCancel, confirmLabel = "Yes", cancelLabel = "No" }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="confirmDialogBackdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirmDialogPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <div className="confirmDialogActions">
          <button type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PanelDialog({ open, onClose, children, label = "Dialog" }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="confirmDialogBackdrop" role="presentation" onClick={onClose}>
      <div
        className="confirmDialogPanel confirmDialogPanelWide"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="confirmDialogClose" onClick={onClose} aria-label="Close">
          Close
        </button>
        {children}
      </div>
    </div>
  )
}
