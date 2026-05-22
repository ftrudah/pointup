'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GraduationCap, LayoutDashboard, BookOpen, ClipboardList, Users, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/courses', label: 'Courses', icon: BookOpen },
  { href: '/dashboard/assignments', label: 'Assignments', icon: ClipboardList },
  { href: '/dashboard/community', label: 'Community', icon: Users },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="w-64 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 fixed inset-y-0">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <GraduationCap className="w-6 h-6 text-zinc-900 dark:text-zinc-50" />
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Point Up</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}
