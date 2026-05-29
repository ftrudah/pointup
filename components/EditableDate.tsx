'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

type Props = {
  date: string | null
  onSave: (newDate: string) => Promise<void>
  className?: string
}

export function EditableDate({ date, onSave, className = '' }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(date ?? '')
  const [saving, setSaving] = useState(false)

  function handleDoubleClick() {
    setValue(date ?? '')
    setEditing(true)
  }

  async function handleConfirm() {
    if (!value) return
    setSaving(true)
    setEditing(false)
    await onSave(value)
    setSaving(false)
  }

  function handleCancel() {
    setValue(date ?? '')
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') handleCancel()
  }

  const label = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Set date'

  if (editing) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <input
          type="date"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-50"
        />
        <button
          onClick={handleConfirm}
          className="rounded bg-zinc-900 dark:bg-zinc-50 p-0.5 text-white dark:text-zinc-900 hover:opacity-80 transition-opacity"
          title="Confirm"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={handleCancel}
          className="rounded border border-zinc-300 dark:border-zinc-600 p-0.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          title="Cancel"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    )
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className={`cursor-pointer underline decoration-dashed underline-offset-2 select-none ${saving ? 'opacity-40' : ''} ${className}`}
      title="Double-click to edit date"
    >
      {label}
    </span>
  )
}
