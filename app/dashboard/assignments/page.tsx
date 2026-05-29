'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClipboardList, Plus, X, CheckCircle2, Circle, MoreVertical, Trash2, Pencil } from 'lucide-react'
import { EditableDate } from '@/components/EditableDate'

type Assignment = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  status: string
  priority: string | null
  course_id: string | null
  courses?: { name: string } | null
}

type Course = { id: string; name: string }

const PRIORITIES = ['low', 'medium', 'high']

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [openPriority, setOpenPriority] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', course_id: '', due_date: '', priority: 'medium' })
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    course_id: '',
    due_date: '',
    priority: 'medium',
  })

  const supabase = useMemo(() => createClient(), [])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: asgn }, { data: crss }] = await Promise.all([
      supabase
        .from('assignments')
        .select('*, courses(name)')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
      supabase
        .from('courses')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name'),
    ])
    setAssignments(asgn ?? [])
    setCourses(crss ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('assignments').insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      course_id: form.course_id || null,
      due_date: form.due_date || null,
      priority: form.priority,
      status: 'pending',
    })
    setForm({ title: '', description: '', course_id: '', due_date: '', priority: 'medium' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function toggleStatus(a: Assignment) {
    const next = a.status === 'pending' ? 'completed' : 'pending'
    await supabase.from('assignments').update({ status: next }).eq('id', a.id)
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x))
  }

  async function setPriority(a: Assignment, priority: string) {
    setOpenPriority(null)
    await supabase.from('assignments').update({ priority }).eq('id', a.id)
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, priority } : x))
  }

  async function handleDateChange(id: string, due_date: string) {
    await supabase.from('assignments').update({ due_date }).eq('id', id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, due_date } : a))
  }

  async function handleDelete(id: string) {
    setOpenMenu(null)
    await supabase.from('assignments').delete().eq('id', id)
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  function openEdit(a: Assignment) {
    setOpenMenu(null)
    setEditingAssignment(a)
    setEditForm({
      title: a.title,
      description: a.description ?? '',
      course_id: a.course_id ?? '',
      due_date: a.due_date ?? '',
      priority: a.priority ?? 'medium',
    })
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAssignment) return
    setSaving(true)
    await supabase.from('assignments').update({
      title: editForm.title,
      description: editForm.description || null,
      course_id: editForm.course_id || null,
      due_date: editForm.due_date || null,
      priority: editForm.priority,
    }).eq('id', editingAssignment.id)
    setAssignments(prev => prev.map(a =>
      a.id === editingAssignment.id
        ? { ...a, title: editForm.title, description: editForm.description || null, course_id: editForm.course_id || null, due_date: editForm.due_date || null, priority: editForm.priority }
        : a
    ))
    setSaving(false)
    setEditingAssignment(null)
  }

  const filtered = assignments.filter(a => filter === 'all' ? true : a.status === filter)

  const priorityStyle = (p: string | null) => {
    if (p === 'high') return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
    if (p === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
    return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
  }

  const inputClass = 'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Assignments</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {assignments.filter(a => a.status === 'pending').length} pending · {assignments.filter(a => a.status === 'completed').length} completed
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Assignment
        </button>
      </div>

      <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 w-fit">
        {(['pending', 'all', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize ${
              filter === f
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Add Assignment</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  required
                  placeholder="e.g. Chapter 5 Problem Set"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Course</label>
                <select
                  value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">No course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Due Date</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className={inputClass}
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any notes..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={inputClass + ' resize-none'}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Add Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Edit Assignment</h2>
              <button onClick={() => setEditingAssignment(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  required
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Course</label>
                <select
                  value={editForm.course_id}
                  onChange={e => setEditForm(f => ({ ...f, course_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">No course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Due Date</label>
                  <input
                    type="date"
                    value={editForm.due_date}
                    onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                    className={inputClass}
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Description (optional)</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className={inputClass + ' resize-none'}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {filter === 'completed' ? 'No completed assignments' : 'No pending assignments'}
            </p>
            {filter !== 'completed' && (
              <button
                onClick={() => setShowForm(true)}
                className="text-xs text-zinc-900 dark:text-zinc-50 font-medium mt-1 hover:underline"
              >
                Add an assignment →
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map(a => (
              <li key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <button onClick={() => toggleStatus(a)} className="flex-shrink-0 text-zinc-400 hover:text-emerald-500 transition-colors">
                  {a.status === 'completed'
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <Circle className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${a.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
                    {a.title}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {(a as { courses?: { name: string } | null }).courses?.name ?? 'No course'}
                    {' · Due '}
                    <EditableDate date={a.due_date} onSave={(d) => handleDateChange(a.id, d)} />
                  </p>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenPriority(openPriority === a.id ? null : a.id)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full transition-opacity hover:opacity-70 ${priorityStyle(a.priority)}`}
                  >
                    {a.priority ?? 'low'} ▾
                  </button>
                  {openPriority === a.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenPriority(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-28 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden">
                        {PRIORITIES.map(p => (
                          <button
                            key={p}
                            onClick={() => setPriority(a, p)}
                            className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700 ${a.priority === p ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'}`}
                          >
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenu === a.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden">
                        <button
                          onClick={() => openEdit(a)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
