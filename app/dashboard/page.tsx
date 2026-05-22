import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, ClipboardList, TrendingUp, Award } from 'lucide-react'

function gradeToPoints(grade: string): number | null {
  const map: Record<string, number> = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0,
  }
  return map[grade.toUpperCase()] ?? null
}

function calcGPA(courses: { grade: string | null; credits: number | null }[]) {
  let totalPoints = 0
  let totalCredits = 0
  for (const c of courses) {
    if (!c.grade || !c.credits) continue
    const pts = gradeToPoints(c.grade)
    if (pts === null) continue
    totalPoints += pts * c.credits
    totalCredits += c.credits
  }
  return totalCredits === 0 ? null : (totalPoints / totalCredits).toFixed(2)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: courses }, { data: assignments }] = await Promise.all([
    supabase.from('courses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('assignments').select('*, courses(name)').eq('user_id', user.id).eq('status', 'pending').order('due_date', { ascending: true }).limit(5),
  ])

  const gpa = calcGPA(courses ?? [])
  const totalCredits = (courses ?? []).reduce((sum, c) => sum + (c.credits ?? 0), 0)
  const pendingCount = assignments?.length ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Welcome back — here's your academic overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Current GPA', value: gpa ?? '—', icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Courses', value: courses?.length ?? 0, icon: BookOpen, color: 'text-blue-600' },
          { label: 'Credits', value: totalCredits, icon: Award, color: 'text-purple-600' },
          { label: 'Pending Tasks', value: pendingCount, icon: ClipboardList, color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">My Courses</h2>
            <a href="/dashboard/courses" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">View all →</a>
          </div>
          {!courses?.length ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No courses yet</p>
              <a href="/dashboard/courses" className="text-xs text-zinc-900 dark:text-zinc-50 font-medium mt-1 inline-block hover:underline">Add your first course →</a>
            </div>
          ) : (
            <div className="space-y-2">
              {courses.slice(0, 5).map((course) => (
                <div key={course.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{course.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{course.credits} credits · {course.semester} {course.year}</p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{course.grade ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Upcoming Assignments</h2>
            <a href="/dashboard/assignments" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">View all →</a>
          </div>
          {!assignments?.length ? (
            <div className="text-center py-8">
              <ClipboardList className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No pending assignments</p>
              <a href="/dashboard/assignments" className="text-xs text-zinc-900 dark:text-zinc-50 font-medium mt-1 inline-block hover:underline">Add an assignment →</a>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{a.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {(a as { courses?: { name: string } }).courses?.name} · {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    a.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                    a.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>{a.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
