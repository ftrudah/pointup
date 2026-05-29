import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

const PROMPT = `Extract structured information from this course syllabus. Return ONLY valid JSON with no extra text, in this exact format:

{
  "course_name": "string or null",
  "total_points": number or null,
  "class_period": {
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null",
    "meeting_times": "string or null"
  },
  "grade_weights": [
    { "category": "string", "weight": number }
  ],
  "grading_scale": [
    { "grade": "string", "min_percent": number }
  ],
  "rubric": {
    "total_points": number or null,
    "items": [
      { "category": "string", "points": number }
    ]
  },
  "exams": [
    { "title": "string", "date": "YYYY-MM-DD or null", "date_range": "string or null" }
  ],
  "assignments": [
    {
      "title": "string",
      "available_date": "YYYY-MM-DD or null",
      "due_date": "YYYY-MM-DD or null",
      "date_range": "string or null",
      "type": "assignment|exam|quiz|project|other"
    }
  ]
}

Rules:
- total_points: search the entire document for any mention of a total point value for the course. Look for phrases like "total points", "points possible", "worth X points", "out of X points", "X points total", "course total", or any summary line listing a grand total. If found, set this to that number. If the rubric items sum to a clear total, use that. If nothing is found, set to null. This is a top-level course total — separate from individual rubric item breakdowns.
- grade_weights: percentage-based weights (e.g. 30 for 30%); should add up to 100
- grading_scale: each letter grade with its minimum percentage threshold
- rubric: search specifically for the word "rubric" or any point-based grading table. Extract every category and its point value. Sum all item points to get total_points (or read it directly if stated). If the syllabus uses percentages only and no rubric, set rubric to { "total_points": null, "items": [] }
- exams: search specifically for the word "exam" anywhere in the document. For every exam found, record its title and date. If the exam spans multiple days (e.g. "Exam Week: Dec 10-14"), put the formatted range in date_range and set date to null. If it is a single day, put it in date as YYYY-MM-DD and set date_range to null
- assignments: all other graded items; do not duplicate exams here. Apply these rules carefully:
  1. DEDUPLICATION: Scan the entire document for every mention of each assignment title (case-insensitive, ignoring minor wording differences like "HW 1" vs "Homework 1"). If the same assignment appears more than once, merge it into a single entry — never list the same assignment twice.
  2. AVAILABLE vs DUE: Look for keywords "available", "opens", "open", "released", "posted" near a date to identify available_date. Look for keywords "due", "deadline", "submit", "closes", "turn in" near a date to identify due_date.
  3. DATE RANGE: If an assignment has both an available_date and a due_date, set date_range to a human-readable string like "Jan 10 – Jan 17". If only one date exists, set date_range to null.
  4. All dates must be in YYYY-MM-DD format or null if not found.
- class_period: extract how long the class runs using this priority order:
  1. Look for the keywords "meeting times", "meeting dates", "class meets", "class schedule", "course dates", "semester dates" — extract the days/times and date range stated there
  2. If those keywords are not found, scan ALL dates in the document (assignment dates, exam dates, schedule dates, etc.), take the earliest as start_date and the latest as end_date
  3. meeting_times should capture the recurring schedule as a string if stated (e.g. "MWF 10:00–10:50 AM" or "TR 2:00–3:15 PM"), otherwise null
  4. start_date and end_date must be in YYYY-MM-DD format or null
- If a field cannot be determined, use null or an empty array`

export async function POST(request: Request) {
  try {
    const { syllabus, pdf } = await request.json()

    if (!syllabus && !pdf) {
      return NextResponse.json({ error: 'Syllabus text or PDF is required' }, { status: 400 })
    }

    const userContent: Anthropic.MessageParam['content'] = pdf
      ? [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdf,
            },
          } as Anthropic.DocumentBlockParam,
          { type: 'text', text: PROMPT },
        ]
      : `${PROMPT}\n\nSyllabus:\n${syllabus}`

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: userContent }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(jsonText)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Parse syllabus error:', err)
    return NextResponse.json({ error: 'Failed to parse syllabus' }, { status: 500 })
  }
}
