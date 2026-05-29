'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, X, Pencil, Plus, BookOpen, CalendarDays, ArrowLeft, Trash2 } from 'lucide-react'
import { EditableDate } from '@/components/EditableDate'

type Assignment = {
  id: string
  title: string
  due_date: string
  priority: string | null
  status: string
  course_id: string | null
  courses?: { name: string } | null
}

type Course = { id: string; name: string }
type CalendarView = 'month' | 'week' | 'day'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const PRIORITIES = ['low', 'medium', 'high']
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_H = 60 // px per hour, 1 px per minute

function priorityColor(p: string | null, status?: string) {
  if (status === 'event') return 'bg-purple-500'
  if (p === 'high') return 'bg-red-500'
  if (p === 'medium') return 'bg-amber-500'
  return 'bg-zinc-400'
}

function priorityBadge(p: string | null, status?: string) {
  if (status === 'event') return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400'
  if (p === 'high') return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
  if (p === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
}

function itemChipClass(a: Assignment) {
  if (a.status === 'event') return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400'
  if (a.priority === 'high') return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
  if (a.priority === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekStart(d: Date): Date {
  const s = new Date(d)
  s.setDate(s.getDate() - s.getDay())
  return s
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return 'Noon'
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}

// Parses "· 2:30 PM" appended to event titles — returns minutes from midnight or null
function parseTimeFromTitle(title: string): number | null {
  const match = title.match(/·\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/)
  if (!match) return null
  let h = parseInt(match[1])
  const m = parseInt(match[2])
  if (match[3] === 'PM' && h !== 12) h += 12
  if (match[3] === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function stripTime(title: string): string {
  return title.replace(/\s*·\s+\d{1,2}:\d{2}\s+(?:AM|PM)$/, '')
}

const inputClass = 'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50'
const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'

export default function CalendarPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [editForm, setEditForm] = useState({ title: '', due_date: '', priority: 'medium', course_id: '' })
  const [addingDate, setAddingDate] = useState<string | null>(null)
  const [addType, setAddType] = useState<'assignment' | 'event' | null>(null)
  const [addForm, setAddForm] = useState({ title: '', priority: 'medium', course_id: '', due_date: '', time: '' })
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<CalendarView>('month')
  const [viewDate, setViewDate] = useState(() => new Date())

  const gridRef = useRef<HTMLDivElement>(null)
  const today = new Date()
  const todayStr = fmtDate(today)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Minutes from midnight for current time line
  const nowTop = today.getHours() * 60 + today.getMinutes() // 1px per minute

  const supabase = useMemo(() => createClient(), [])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: asgn }, { data: crss }] = await Promise.all([
      supabase
        .from('assignments')
        .select('id, title, due_date, priority, status, course_id, courses(name)')
        .eq('user_id', user.id)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true }),
      supabase
        .from('courses')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name'),
    ])
    setAssignments((asgn ?? []) as unknown as Assignment[])
    setCourses(crss ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Auto-scroll to current time when entering week/day view
  useEffect(() => {
    if ((view === 'week' || view === 'day') && gridRef.current) {
      gridRef.current.scrollTop = Math.max(0, nowTop - 120)
    }
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDateChange(id: string, due_date: string) {
    await supabase.from('assignments').update({ due_date }).eq('id', id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, due_date } : a))
    setSelectedDate(due_date)
  }

  function openEdit(a: Assignment) {
    setEditingAssignment(a)
    setEditForm({ title: a.title, due_date: a.due_date, priority: a.priority ?? 'medium', course_id: a.course_id ?? '' })
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAssignment) return
    setSaving(true)
    await supabase.from('assignments').update({
      title: editForm.title,
      due_date: editForm.due_date,
      priority: editForm.priority,
      course_id: editForm.course_id || null,
    }).eq('id', editingAssignment.id)
    setAssignments(prev => prev.map(a =>
      a.id === editingAssignment.id
        ? { ...a, title: editForm.title, due_date: editForm.due_date, priority: editForm.priority, course_id: editForm.course_id || null }
        : a
    ))
    if (selectedDate && editForm.due_date !== selectedDate) setSelectedDate(editForm.due_date)
    setSaving(false)
    setEditingAssignment(null)
  }

  async function handleDelete() {
    if (!editingAssignment) return
    setSaving(true)
    await supabase.from('assignments').delete().eq('id', editingAssignment.id)
    setAssignments(prev => prev.filter(a => a.id !== editingAssignment.id))
    setSaving(false)
    setEditingAssignment(null)
  }

  function openAdd(dateStr: string) {
    setAddingDate(dateStr)
    setSelectedDate(dateStr)
    setAddType(null)
    setAddForm({ title: '', priority: 'medium', course_id: '', due_date: dateStr, time: '' })
  }

  async function handleAddSave(e: React.FormEvent) {
    e.preventDefault()
    if (!addingDate || !addForm.title.trim() || !addType) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const saveDate = addForm.due_date || addingDate
    let title = addForm.title.trim()
    if (addType === 'event' && addForm.time) {
      const [h, m] = addForm.time.split(':').map(Number)
      const suffix = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      title = `${title} · ${h12}:${String(m).padStart(2, '0')} ${suffix}`
    }

    const { data: newA } = await supabase
      .from('assignments')
      .insert({
        user_id: user.id, title, due_date: saveDate,
        priority: addType === 'event' ? null : addForm.priority,
        course_id: addType === 'event' ? null : (addForm.course_id || null),
        status: addType === 'event' ? 'event' : 'pending',
      })
      .select('id, title, due_date, priority, status, course_id, courses(name)')
      .single()
    if (newA) { setAssignments(prev => [...prev, newA as unknown as Assignment]); setSelectedDate(saveDate) }
    setSaving(false)
    setAddingDate(null)
    setAddType(null)
  }

  function navigate(dir: 1 | -1) {
    setViewDate(d => {
      const next = new Date(d)
      if (view === 'month') next.setMonth(next.getMonth() + dir)
      else if (view === 'week') next.setDate(next.getDate() + dir * 7)
      else next.setDate(next.getDate() + dir)
      return next
    })
  }

  function goToToday() { setViewDate(new Date()); setSelectedDate(todayStr) }

  function switchView(v: CalendarView) {
    if (selectedDate) {
      const [yr, mo, dy] = selectedDate.split('-').map(Number)
      setViewDate(new Date(yr, mo - 1, dy))
    } else { setViewDate(new Date()) }
    setView(v)
  }

  function headerLabel(): string {
    if (view === 'month') return `${MONTHS[month]} ${year}`
    if (view === 'week') {
      const ws = getWeekStart(viewDate)
      const we = new Date(ws); we.setDate(we.getDate() + 6)
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return ws.getFullYear() === we.getFullYear()
        ? `${fmt(ws)} – ${fmt(we)}, ${we.getFullYear()}`
        : `${fmt(ws)}, ${ws.getFullYear()} – ${fmt(we)}, ${we.getFullYear()}`
    }
    return viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const dueByDate = useMemo(() => {
    const map: Record<string, Assignment[]> = {}
    for (const a of assignments) {
      if (!map[a.due_date]) map[a.due_date] = []
      map[a.due_date].push(a)
    }
    return map
  }, [assignments])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const weekStart = getWeekStart(viewDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d
  })

  const dayViewStr = fmtDate(viewDate)
  const dayItems = dueByDate[dayViewStr] ?? []
  const dayAllDay = dayItems.filter(a => parseTimeFromTitle(a.title) === null)
  const dayTimed = dayItems.filter(a => parseTimeFromTitle(a.title) !== null)
  const selectedAssignments = selectedDate ? (dueByDate[selectedDate] ?? []) : []

  if (loading) return <div className="text-center py-12 text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Calendar</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Your assignment due dates at a glance.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 flex-shrink-0">
          {(['month', 'week', 'day'] as CalendarView[]).map(v => (
            <button key={v} onClick={() => switchView(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === v ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {addingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {addType !== null && (
                  <button onClick={() => setAddType(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mr-1">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {addType === null ? 'Add to Calendar' : addType === 'assignment' ? 'New Assignment' : 'New Event'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {new Date(addingDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <button onClick={() => setAddingDate(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {addType === null ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setAddType('assignment')}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 p-5 hover:border-zinc-900 dark:hover:border-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                    <BookOpen className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Assignment</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Homework, tests, projects</p>
                  </div>
                </button>
                <button onClick={() => setAddType('event')}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 p-5 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 group-hover:bg-purple-200 dark:group-hover:bg-purple-900 flex items-center justify-center transition-colors">
                    <CalendarDays className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Event</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Reminders, appointments</p>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddSave} className="space-y-4">
                <div>
                  <label className={labelClass}>Title</label>
                  <input required autoFocus
                    placeholder={addType === 'assignment' ? 'e.g. Chapter 5 Problem Set' : 'e.g. Office Hours'}
                    value={addForm.title}
                    onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                    className={inputClass} />
                </div>
                <div className={addType === 'event' ? 'grid grid-cols-2 gap-3' : ''}>
                  <div>
                    <label className={labelClass}>Date</label>
                    <input type="date" required value={addForm.due_date}
                      onChange={e => setAddForm(f => ({ ...f, due_date: e.target.value }))}
                      className={inputClass} />
                  </div>
                  {addType === 'event' && (
                    <div>
                      <label className={labelClass}>Time <span className="font-normal text-zinc-400">(optional)</span></label>
                      <input type="time" value={addForm.time}
                        onChange={e => setAddForm(f => ({ ...f, time: e.target.value }))}
                        className={inputClass} />
                    </div>
                  )}
                </div>
                {addType === 'assignment' && (
                  <>
                    <div>
                      <label className={labelClass}>Course</label>
                      <select value={addForm.course_id} onChange={e => setAddForm(f => ({ ...f, course_id: e.target.value }))} className={inputClass}>
                        <option value="">No course</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Priority</label>
                      <select value={addForm.priority} onChange={e => setAddForm(f => ({ ...f, priority: e.target.value }))} className={inputClass}>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setAddingDate(null)}
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors ${
                      addType === 'event' ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200'
                    }`}>
                    <Plus className="w-4 h-4" />
                    {saving ? 'Adding...' : addType === 'event' ? 'Add Event' : 'Add Assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Edit</h2>
              <button onClick={() => setEditingAssignment(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input required value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Course</label>
                <select value={editForm.course_id} onChange={e => setEditForm(f => ({ ...f, course_id: e.target.value }))} className={inputClass}>
                  <option value="">No course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" required value={editForm.due_date}
                    onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className={inputClass}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingAssignment(null)}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navigation bar */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex-1">{headerLabel()}</h2>
        <button onClick={goToToday}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          Today
        </button>
      </div>

      {/* ── Month view ── */}
      {view === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-zinc-400 dark:text-zinc-500 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayAssignments = dueByDate[dateStr] ?? []
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                return (
                  <button key={i}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    onDoubleClick={e => { e.preventDefault(); openAdd(dateStr) }}
                    className={`relative flex flex-col items-center rounded-lg py-2 px-1 transition-colors min-h-[52px] ${
                      isSelected ? 'bg-zinc-900 dark:bg-zinc-50'
                      : isToday ? 'bg-zinc-100 dark:bg-zinc-800'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}>
                    <span className={`text-xs font-medium ${
                      isSelected ? 'text-white dark:text-zinc-900'
                      : isToday ? 'text-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-700 dark:text-zinc-300'
                    }`}>{day}</span>
                    {dayAssignments.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full">
                        {dayAssignments.slice(0, 3).map((a, idx) => (
                          <span key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70 dark:bg-zinc-900/70' : priorityColor(a.priority, a.status)}`} />
                        ))}
                        {dayAssignments.length > 3 && (
                          <span className={`text-[9px] font-medium ${isSelected ? 'text-white/70 dark:bg-zinc-900/70' : 'text-zinc-400'}`}>
                            +{dayAssignments.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-3">Double-click a day to add</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            {selectedDate ? (
              <>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                {selectedAssignments.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing due this day.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedAssignments.map(a => (
                      <div key={a.id} className={`rounded-lg border p-3 ${a.status === 'completed' ? 'border-zinc-100 dark:border-zinc-800 opacity-50' : 'border-zinc-200 dark:border-zinc-700'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-snug ${a.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
                            {a.title}
                          </p>
                          <button onClick={() => openEdit(a)}
                            className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors mt-0.5">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {a.courses?.name && <span className="text-xs text-zinc-500 dark:text-zinc-400">{a.courses.name}</span>}
                          {a.priority && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${priorityBadge(a.priority, a.status)}`}>
                              {a.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col justify-center text-center py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Click a day to see assignments due.</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Colored dots mark due dates.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Week view ── */}
      {view === 'week' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Day headers */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
            <div className="w-16 flex-shrink-0 border-r border-zinc-100 dark:border-zinc-800" />
            {weekDays.map((d, i) => {
              const dateStr = fmtDate(d)
              const isToday = dateStr === todayStr
              return (
                <div key={i} className="flex-1 text-center py-3 border-l border-zinc-100 dark:border-zinc-800">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {DAYS[d.getDay()]}
                  </p>
                  <div className={`text-sm font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5 ${
                    isToday ? 'bg-blue-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* All-day row */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800 min-h-[32px]">
            <div className="w-16 flex-shrink-0 flex items-start justify-end pr-3 pt-1.5 border-r border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">all-day</span>
            </div>
            {weekDays.map((d, i) => {
              const allDayItems = (dueByDate[fmtDate(d)] ?? []).filter(a => parseTimeFromTitle(a.title) === null)
              return (
                <div key={i} className="flex-1 border-l border-zinc-100 dark:border-zinc-800 px-1 py-1 space-y-0.5">
                  {allDayItems.map((a, j) => (
                    <button key={j} onClick={() => openEdit(a)}
                      className={`w-full text-left text-[11px] font-medium px-1.5 py-0.5 rounded truncate hover:opacity-70 transition-opacity ${itemChipClass(a)}`}>
                      {a.title}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Scrollable time grid */}
          <div className="overflow-y-auto" style={{ maxHeight: 580 }} ref={gridRef}>
            <div className="flex" style={{ height: 24 * HOUR_H }}>
              {/* Time gutter */}
              <div className="w-16 flex-shrink-0 relative border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                {HOURS.map(h => h > 0 && (
                  <div key={h} className="absolute right-3 text-[10px] text-zinc-400 dark:text-zinc-500 select-none"
                    style={{ top: h * HOUR_H - 8 }}>
                    {formatHour(h)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((d, i) => {
                const dateStr = fmtDate(d)
                const isToday = dateStr === todayStr
                const timedItems = (dueByDate[dateStr] ?? []).filter(a => parseTimeFromTitle(a.title) !== null)

                return (
                  <div key={i}
                    className={`flex-1 relative border-l border-zinc-100 dark:border-zinc-800 cursor-pointer ${
                      isToday ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''
                    }`}
                    onDoubleClick={e => { e.preventDefault(); openAdd(dateStr) }}
                  >
                    {/* Hour lines */}
                    {HOURS.map(h => (
                      <div key={h} className="absolute inset-x-0 border-t border-zinc-100 dark:border-zinc-800"
                        style={{ top: h * HOUR_H }} />
                    ))}
                    {/* Half-hour lines */}
                    {HOURS.map(h => (
                      <div key={`hh-${h}`} className="absolute inset-x-0 border-t border-zinc-100/60 dark:border-zinc-800/60 border-dashed"
                        style={{ top: h * HOUR_H + HOUR_H / 2 }} />
                    ))}
                    {/* Current time indicator */}
                    {isToday && (
                      <div className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                        style={{ top: nowTop }}>
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    )}
                    {/* Timed items */}
                    {timedItems.map((a, j) => {
                      const mins = parseTimeFromTitle(a.title)!
                      return (
                        <button key={j}
                          onClick={e => { e.stopPropagation(); openEdit(a) }}
                          className={`absolute left-1 right-1 text-left text-[11px] font-medium px-1.5 py-0.5 rounded truncate z-10 hover:opacity-80 transition-opacity ${itemChipClass(a)}`}
                          style={{ top: (mins / 60) * HOUR_H }}>
                          {stripTime(a.title)}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2 border-t border-zinc-100 dark:border-zinc-800">
            Double-click to add · click an item to edit
          </p>
        </div>
      )}

      {/* ── Day view ── */}
      {view === 'day' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* All-day row */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800 min-h-[36px]">
            <div className="w-16 flex-shrink-0 flex items-start justify-end pr-3 pt-1.5 border-r border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">all-day</span>
            </div>
            <div className="flex-1 px-2 py-1 space-y-0.5">
              {dayAllDay.length === 0 ? (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">No all-day items</span>
              ) : dayAllDay.map((a, j) => (
                <button key={j} onClick={() => openEdit(a)}
                  className={`w-full text-left text-xs font-medium px-2 py-0.5 rounded truncate hover:opacity-70 transition-opacity ${itemChipClass(a)}`}>
                  {a.title}
                </button>
              ))}
            </div>
            <button onClick={() => openAdd(dayViewStr)}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-3 m-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {/* Scrollable time grid */}
          <div className="overflow-y-auto" style={{ maxHeight: 600 }} ref={gridRef}>
            <div className="flex" style={{ height: 24 * HOUR_H }}>
              {/* Time gutter */}
              <div className="w-16 flex-shrink-0 relative border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                {HOURS.map(h => h > 0 && (
                  <div key={h} className="absolute right-3 text-[10px] text-zinc-400 dark:text-zinc-500 select-none"
                    style={{ top: h * HOUR_H - 8 }}>
                    {formatHour(h)}
                  </div>
                ))}
              </div>

              {/* Single day column */}
              <div className="flex-1 relative cursor-pointer" onDoubleClick={() => openAdd(dayViewStr)}>
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} className="absolute inset-x-0 border-t border-zinc-100 dark:border-zinc-800"
                    style={{ top: h * HOUR_H }} />
                ))}
                {/* Half-hour lines */}
                {HOURS.map(h => (
                  <div key={`hh-${h}`} className="absolute inset-x-0 border-t border-zinc-100/60 dark:border-zinc-800/60 border-dashed"
                    style={{ top: h * HOUR_H + HOUR_H / 2 }} />
                ))}
                {/* Current time indicator */}
                {dayViewStr === todayStr && (
                  <div className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                    style={{ top: nowTop }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                )}
                {/* Timed items */}
                {dayTimed.map((a, j) => {
                  const mins = parseTimeFromTitle(a.title)!
                  return (
                    <button key={j}
                      onClick={e => { e.stopPropagation(); openEdit(a) }}
                      className={`absolute left-2 right-2 text-left text-xs font-medium px-2 py-1 rounded z-10 hover:opacity-80 transition-opacity ${itemChipClass(a)}`}
                      style={{ top: (mins / 60) * HOUR_H }}>
                      <p className="font-semibold truncate">{stripTime(a.title)}</p>
                      {a.courses?.name && <p className="text-[10px] truncate opacity-80">{a.courses.name}</p>}
                    </button>
                  )
                })}
                {dayTimed.length === 0 && dayAllDay.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-sm text-zinc-400 dark:text-zinc-500">Nothing scheduled</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Double-click to add</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming due dates — month and week only */}
      {view !== 'day' && Object.keys(dueByDate).length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Upcoming Due Dates</h3>
          <div className="space-y-2">
            {assignments
              .filter(a => a.due_date >= todayStr && a.status !== 'completed')
              .slice(0, 8)
              .map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColor(a.priority, a.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{a.title}</p>
                    {a.courses?.name && <p className="text-xs text-zinc-500 dark:text-zinc-400">{a.courses.name}</p>}
                  </div>
                  <button onClick={() => openEdit(a)}
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <EditableDate date={a.due_date} onSave={(d) => handleDateChange(a.id, d)}
                    className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
