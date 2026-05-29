import Link from 'next/link'
import { GraduationCap, TrendingUp, ClipboardList, BookOpen, Sparkles, CalendarDays } from 'lucide-react'

const features = [
  {
    icon: TrendingUp,
    title: 'GPA Tracking',
    description: 'Log your courses and grades. Your GPA is calculated automatically as you go.',
  },
  {
    icon: ClipboardList,
    title: 'Assignment Management',
    description: 'Keep track of every assignment with due dates, priorities, and completion status.',
  },
  {
    icon: CalendarDays,
    title: 'Due Date Calendar',
    description: 'See all your deadlines in one place. Click any date to view and edit assignments.',
  },
  {
    icon: Sparkles,
    title: 'AI Syllabus Import',
    description: 'Upload a syllabus PDF and AI extracts grade weights, exam dates, and assignments instantly.',
  },
  {
    icon: BookOpen,
    title: 'Course Organizer',
    description: 'Organize all your courses by semester, credits, and grade in one clean view.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-zinc-900 dark:text-zinc-50" />
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">Point Up</span>
          </div>
          <Link
            href="/auth?mode=signin"
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI-powered academic assistant
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight tracking-tight max-w-2xl">
          Take control of your GPA
        </h1>
        <p className="mt-5 text-lg text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
          Point Up helps students track courses, manage assignments, and import syllabuses with AI — all in one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/auth?mode=signup"
            className="rounded-xl bg-zinc-900 dark:bg-zinc-50 px-6 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            Get started free
          </Link>
          <Link
            href="/auth?mode=signin"
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 text-center mb-12">
            Everything you need to succeed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-6"
              >
                <div className="w-9 h-9 rounded-lg bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-white dark:text-zinc-900" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1.5">{title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">Ready to point up?</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Create a free account and start tracking your academic progress today.</p>
        <Link
          href="/auth?mode=signup"
          className="inline-block rounded-xl bg-zinc-900 dark:bg-zinc-50 px-6 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm"
        >
          Create your account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 px-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
          <GraduationCap className="w-4 h-4" />
          <span>Point Up — built for students</span>
        </div>
      </footer>
    </div>
  )
}
