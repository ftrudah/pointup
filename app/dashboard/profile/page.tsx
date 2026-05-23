'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserCircle } from 'lucide-react'

type Profile = {
  full_name: string | null
  college: string | null
  gender: string | null
}

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({ full_name: '', college: '', gender: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? null)
      const { data } = await supabase
        .from('profiles')
        .select('full_name, college, gender')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase
      .from('profiles')
      .upsert({ id: user.id, ...profile })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputClass = 'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Profile</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage your personal information</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {profile.full_name || 'No name set'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{email}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={profile.full_name ?? ''}
                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>College / University</label>
              <input
                type="text"
                placeholder="e.g. University of Michigan"
                value={profile.college ?? ''}
                onChange={e => setProfile(p => ({ ...p, college: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Gender</label>
              <select
                value={profile.gender ?? ''}
                onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
                className={inputClass}
              >
                <option value="">Prefer not to say</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saved && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved!</p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
