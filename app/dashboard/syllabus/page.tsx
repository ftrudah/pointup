'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ChevronRight, Trash2, Check, Upload, FileText, X } from 'lucide-react'

type Course = { id: string; name: string }
type GradeWeight = { category: string; weight: number }
type GradingScale = { grade: string; min_percent: number }
type RubricItem = { category: string; points: number }
type Exam = { title: string; date: string | null; date_range: string | null }
type ParsedAssignment = {
  title: string
  available_date: string | null
  due_date: string | null
  date_range: string | null
  type: string
}
type ClassPeriod = {
  start_date: string | null
  end_date: string | null
  meeting_times: string | null
}

type ParsedSyllabus = {
  course_name: string | null
  total_points: number | null
  class_period: ClassPeriod | null
  grade_weights: GradeWeight[]
  grading_scale: GradingScale[]
  rubric: { total_points: number | null; items: RubricItem[] } | null
  exams: Exam[]
  assignments: ParsedAssignment[]
}

export default function SyllabusPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [courseInput, setCourseInput] = useState('')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)
  const courseBoxRef = useRef<HTMLDivElement>(null)
  const [inputMode, setInputMode] = useState<'pdf' | 'text'>('pdf')
  const [syllabusText, setSyllabusText] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedSyllabus | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('courses').select('id, name').eq('user_id', user.id).order('name')
      setCourses(data ?? [])
    }
    load()
  }, [])

  // Close course dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (courseBoxRef.current && !courseBoxRef.current.contains(e.target as Node)) {
        setShowCourseDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(courseInput.toLowerCase())
  )

  function handleCourseInputChange(value: string) {
    setCourseInput(value)
    setCourseId(null)
    setShowCourseDropdown(true)
  }

  function selectExistingCourse(c: Course) {
    setCourseInput(c.name)
    setCourseId(c.id)
    setShowCourseDropdown(false)
  }

  function handleFileSelect(file: File) {
    if (file.type !== 'application/pdf') { setError('Please upload a PDF file'); return }
    if (file.size > 10 * 1024 * 1024) { setError('PDF must be under 10 MB'); return }
    setError(null)
    setPdfFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  async function handleParse(e: React.FormEvent) {
    e.preventDefault()
    if (!courseInput.trim()) { setError('Please enter or select a course'); return }
    setParsing(true)
    setError(null)
    setParsed(null)

    try {
      let body: Record<string, string>
      if (inputMode === 'pdf' && pdfFile) {
        const arrayBuffer = await pdfFile.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
        }
        body = { pdf: btoa(binary) }
      } else {
        if (!syllabusText.trim()) throw new Error('Please enter syllabus text')
        body = { syllabus: syllabusText }
      }

      const res = await fetch('/api/parse-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setParsed(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setParsing(false)
    }
  }

  function removeWeight(i: number) {
    if (!parsed) return
    setParsed({ ...parsed, grade_weights: parsed.grade_weights.filter((_, idx) => idx !== i) })
  }

  function removeAssignment(i: number) {
    if (!parsed) return
    setParsed({ ...parsed, assignments: parsed.assignments.filter((_, idx) => idx !== i) })
  }

  async function handleSave() {
    if (!parsed || !courseInput.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Create course if the user typed a new name
    let resolvedCourseId = courseId
    if (!resolvedCourseId) {
      const { data: newCourse } = await supabase
        .from('courses')
        .insert({ user_id: user.id, name: courseInput.trim(), semester: 'Fall', year: new Date().getFullYear() })
        .select('id')
        .single()
      resolvedCourseId = newCourse?.id ?? null
      if (resolvedCourseId) {
        setCourseId(resolvedCourseId)
        setCourses(prev => [...prev, { id: resolvedCourseId!, name: courseInput.trim() }])
      }
    }

    if (!resolvedCourseId) { setSaving(false); return }

    const ops: PromiseLike<unknown>[] = []

    if (parsed.grade_weights.length > 0) {
      await supabase.from('grade_weights').delete().eq('course_id', resolvedCourseId).eq('user_id', user.id)
      ops.push(
        supabase.from('grade_weights').insert(
          parsed.grade_weights.map(w => ({
            user_id: user.id,
            course_id: resolvedCourseId,
            category: w.category,
            weight: w.weight,
          }))
        )
      )
    }

    if (parsed.assignments.length > 0) {
      ops.push(
        supabase.from('assignments').insert(
          parsed.assignments.map(a => ({
            user_id: user.id,
            course_id: resolvedCourseId,
            title: a.title,
            due_date: a.due_date,
            status: 'pending',
            priority: a.type === 'exam' ? 'high' : a.type === 'quiz' ? 'medium' : 'low',
          }))
        )
      )
    }

    await Promise.all(ops)
    setSaving(false)
    setSaved(true)
  }

  const totalWeight = parsed?.grade_weights.reduce((s, w) => s + w.weight, 0) ?? 0
  const inputClass = 'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50'

  if (saved) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
          <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Syllabus Imported</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Grade weights and assignments have been saved to your course.
        </p>
        <div className="flex gap-3">
          <a href="/dashboard/assignments" className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            View Assignments
          </a>
          <button
            onClick={() => { setSaved(false); setParsed(null); setSyllabusText(''); setPdfFile(null) }}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Parse Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Syllabus Import</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Upload your syllabus and AI will extract grade weights, exam dates, and assignments automatically.
        </p>
      </div>

      {!parsed ? (
        <form onSubmit={handleParse} className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">

            {/* Course combobox */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Course</label>
              <div ref={courseBoxRef} className="relative">
                <input
                  type="text"
                  placeholder="Type to search or create a course..."
                  value={courseInput}
                  onChange={e => handleCourseInputChange(e.target.value)}
                  onFocus={() => setShowCourseDropdown(true)}
                  className={inputClass}
                  autoComplete="off"
                />
                {showCourseDropdown && courseInput.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden">
                    {filteredCourses.length > 0 && (
                      <>
                        {filteredCourses.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectExistingCourse(c)}
                            className="w-full text-left px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                          >
                            {c.name}
                          </button>
                        ))}
                      </>
                    )}
                    {!courses.some(c => c.name.toLowerCase() === courseInput.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => { setCourseId(null); setShowCourseDropdown(false) }}
                        className="w-full text-left px-3.5 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border-t border-zinc-100 dark:border-zinc-700"
                      >
                        Create <span className="font-medium text-zinc-900 dark:text-zinc-50">&ldquo;{courseInput}&rdquo;</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {courseId && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">Existing course selected</p>
              )}
              {courseInput.trim() && !courseId && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">A new course will be created with this name</p>
              )}
            </div>

            <div>
              <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 mb-4 w-fit">
                {(['pdf', 'text'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setInputMode(mode); setError(null) }}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                      inputMode === mode
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {mode === 'pdf' ? 'Upload PDF' : 'Paste Text'}
                  </button>
                ))}
              </div>

              {inputMode === 'pdf' ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                  />
                  {pdfFile ? (
                    <div className="flex items-center gap-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3">
                      <FileText className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                      <p className="text-sm text-zinc-900 dark:text-zinc-50 flex-1 truncate">{pdfFile.name}</p>
                      <button type="button" onClick={() => setPdfFile(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
                        dragging
                          ? 'border-zinc-900 dark:border-zinc-50 bg-zinc-50 dark:bg-zinc-800'
                          : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
                      }`}
                    >
                      <Upload className="w-6 h-6 text-zinc-400" />
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Drop your syllabus PDF here</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">or click to browse · max 10 MB</p>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  required={inputMode === 'text'}
                  rows={12}
                  placeholder="Paste your full syllabus here — include the grading breakdown, exam schedule, and assignment list..."
                  value={syllabusText}
                  onChange={e => setSyllabusText(e.target.value)}
                  className={inputClass + ' resize-y'}
                />
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={parsing || (inputMode === 'pdf' ? !pdfFile : !syllabusText.trim())}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {parsing ? 'Analyzing...' : 'Parse with AI'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              {parsed.course_name ?? courseInput ?? 'Course'}
            </h2>
            {(parsed.total_points != null || (parsed.class_period && (parsed.class_period.start_date || parsed.class_period.meeting_times))) ? (
              <div className="mt-3 flex flex-wrap gap-3">
                {parsed.total_points != null && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    <span className="text-blue-400 dark:text-blue-500">Total pts</span>
                    {parsed.total_points}
                  </span>
                )}
                {parsed.class_period?.start_date && parsed.class_period?.end_date && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <span className="text-zinc-400">Class runs</span>
                    {new Date(parsed.class_period.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' – '}
                    {new Date(parsed.class_period.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {parsed.class_period?.meeting_times && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <span className="text-zinc-400">Meets</span>
                    {parsed.class_period.meeting_times}
                  </span>
                )}
              </div>
            ) : null}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">Review the extracted information below, then save to your course.</p>
          </div>

          {parsed.grade_weights.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Grade Weights</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${Math.abs(totalWeight - 100) < 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
                  Total: {totalWeight}%
                </span>
              </div>
              <div className="space-y-2">
                {parsed.grade_weights.map((w, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{w.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-12 text-right">{w.weight}%</span>
                    <button onClick={() => removeWeight(i)} className="text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsed.grading_scale.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Grading Scale</h3>
              <div className="flex flex-wrap gap-2">
                {parsed.grading_scale.map((s, i) => (
                  <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {s.grade} ≥ {s.min_percent}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {parsed.rubric && parsed.rubric.items.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Grading Rubric</h3>
                {parsed.rubric.total_points != null && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                    {parsed.rubric.total_points} pts total
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {parsed.rubric.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <p className="text-sm text-zinc-900 dark:text-zinc-50">{item.category}</p>
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{item.points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsed.exams.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Exams ({parsed.exams.length})</h3>
              <div className="space-y-2">
                {parsed.exams.map((exam, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{exam.title}</p>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                      {exam.date_range ?? (exam.date ? new Date(exam.date + 'T00:00:00').toLocaleDateString() : 'Date TBD')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsed.assignments.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Assignments & Exams ({parsed.assignments.length})
              </h3>
              <div className="space-y-2">
                {parsed.assignments.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{a.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {a.available_date && a.due_date
                          ? `Available ${new Date(a.available_date + 'T00:00:00').toLocaleDateString()} – Due ${new Date(a.due_date + 'T00:00:00').toLocaleDateString()}`
                          : a.due_date
                          ? `Due ${new Date(a.due_date + 'T00:00:00').toLocaleDateString()}`
                          : a.available_date
                          ? `Available ${new Date(a.available_date + 'T00:00:00').toLocaleDateString()}`
                          : a.date_range ?? 'No date'}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      a.type === 'exam' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                      a.type === 'quiz' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                      a.type === 'project' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>{a.type}</span>
                    <button onClick={() => removeAssignment(i)} className="text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setParsed(null)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              ← Re-parse
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !courseInput.trim()}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save to Course'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
