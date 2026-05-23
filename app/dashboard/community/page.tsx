'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, X } from 'lucide-react'

type Post = {
  id: string
  title: string
  content: string | null
  created_at: string
  user_id: string
  profiles?: { full_name: string | null } | null
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })

  const supabase = useMemo(() => createClient(), [])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setPosts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('posts').insert({
      user_id: user.id,
      title: form.title,
      content: form.content || null,
    })
    setForm({ title: '', content: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  const inputClass = 'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50'
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Community</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Connect with other students</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">New Post</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  required
                  placeholder="What's on your mind?"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Content (optional)</label>
                <textarea
                  rows={4}
                  placeholder="Share more details..."
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
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
                  {saving ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No posts yet — be the first!</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-zinc-900 dark:text-zinc-50 font-medium mt-1 hover:underline"
          >
            Create a post →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{post.title}</h3>
                  {post.content && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">{post.content}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(post as { profiles?: { full_name: string | null } | null }).profiles?.full_name ?? 'Student'}
                  {' · '}
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
