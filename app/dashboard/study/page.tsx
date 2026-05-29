'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, BookOpen, Clock, CalendarDays, AlertCircle } from 'lucide-react'

type Assignment = {
  id: string
  title: string
  due_date: string
  priority: string | null
  status: string
  course_id: string | null
  courses?: { name: string } | null
}

type StudySession = {
  date: string
  duration_hours: number
  focus: string
}

type PlanItem = {
  assignment: string
  course: string | null
  due_date: string
  priority: string
  days_remaining: number
  strategy: string
  sessions: StudySession[]
  total_hours: number
}

type Plan = {
  plan: PlanItem[]
  general_advice: string
}

function priorityColor(p: string) {
  if (p === 'high') return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950'
  if (p === 'medium') return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950'
  return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800'
}

function priorityDot(p: string) {
  if (p === 'high') return 'bg-red-500'
  if (p === 'medium') return 'bg-amber-500'
  return 'bg-zinc-400'
}

function daysLabel(n: number) {
  if (n === 0) return 'due today'
  if (n === 1) return '1 day left'
  return `${n} days left`
}

const PRIORITIES = ['low', 'medium', 'high'] as const

export default function StudyPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openPriority, setOpenPriority] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('assignments')
      .select('id, title, due_date, priority, status, course_id, courses(name)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .not('due_date', 'is', null)
      .gte('due_date', todayStr)
      .order('due_date', { ascending: true })
    setAssignments((data ?? []) as unknown as Assignment[])
    setLoading(false)
  }, [supabase, todayStr])

  useEffect(() => { load() }, [load])

  async function handlePriorityChange(id: string, priority: string) {
    setOpenPriority(null)
    await supabase.from('assignments').update({ priority }).eq('id', id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, priority } : a))
    setPlan(null) // clear stale plan when priority changes
  }

  async function generatePlan() {
    setGenerating(true)
    setError(null)
    setPlan(null)

    const payload = assignments.map(a => ({
      title: a.title,
      due_date: a.due_date,
      priority: a.priority ?? 'low',
      course: a.courses?.name ?? null,
      days_until_due: Math.ceil(
        (new Date(a.due_date + 'T00:00:00').getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

    try {
      const res = await fetch('/api/study-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: payload, today: todayStr }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPlan(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Study Planner</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            AI generates a study schedule based on your upcoming tests and due dates.
          </p>
        </div>
        <button
          onClick={generatePlan}
          disabled={generating || assignments.length === 0}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          {generating ? 'Generating...' : 'Generate Plan'}
        </button>
      </div>

      {/* Upcoming assignments preview */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Upcoming Assignments ({assignments.length})
        </h2>
        {assignments.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No pending assignments with due dates.</p>
            <a href="/dashboard/assignments" className="text-xs text-zinc-900 dark:text-zinc-50 font-medium mt-1 inline-block hover:underline">
              Add assignments →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map(a => {
              const daysLeft = Math.ceil(
                (new Date(a.due_date + 'T00:00:00').getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              )
              return (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot(a.priority ?? 'low')}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{a.title}</p>
                    {a.courses?.name && <p className="text-xs text-zinc-500 dark:text-zinc-400">{a.courses.name}</p>}
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setOpenPriority(openPriority === a.id ? null : a.id)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full transition-opacity hover:opacity-70 ${priorityColor(a.priority ?? 'low')}`}
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
                              onClick={() => handlePriorityChange(a.id, p)}
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
                  <span className={`text-xs font-medium flex-shrink-0 ${daysLeft <= 2 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {daysLabel(daysLeft)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {generating && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <Sparkles className="w-6 h-6 text-zinc-400 mx-auto mb-3 animate-pulse" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Building your study plan...</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">This may take a few seconds</p>
        </div>
      )}

      {plan && (
        <div className="space-y-5">
          {/* General advice */}
          <div className="flex items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <Sparkles className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{plan.general_advice}</p>
          </div>

          {/* Per-assignment plans */}
          {plan.plan.map((item, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {daysLabel(item.days_remaining)} · Due {new Date(item.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{item.assignment}</h3>
                  {item.course && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{item.course}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{item.total_hours}h</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">total study</p>
                </div>
              </div>

              <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">{item.strategy}</p>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {item.sessions.map((session, j) => (
                  <div key={j} className="flex items-start gap-4 px-6 py-3.5">
                    <div className="flex-shrink-0 text-center w-14">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                        {new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex-shrink-0">{session.duration_hours}h</span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 pt-0.5 leading-snug">{session.focus}</p>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.sessions.length} sessions planned</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
