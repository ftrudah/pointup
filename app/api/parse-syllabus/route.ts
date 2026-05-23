import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

const PROMPT = `Extract structured information from this course syllabus. Return ONLY valid JSON with no extra text, in this exact format:

{
  "course_name": "string or null",
  "grade_weights": [
    { "category": "string", "weight": number }
  ],
  "grading_scale": [
    { "grade": "string", "min_percent": number }
  ],
  "assignments": [
    { "title": "string", "due_date": "YYYY-MM-DD or null", "type": "assignment|exam|quiz|project|other" }
  ]
}

Rules:
- grade_weights weights should be numbers (e.g. 30 for 30%), they must add up to 100
- grading_scale should list each letter grade with its minimum percentage
- assignments should only include items with specific due dates or exam dates
- due_date must be in YYYY-MM-DD format or null if not specified
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
      max_tokens: 1024,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Parse syllabus error:', err)
    return NextResponse.json({ error: 'Failed to parse syllabus' }, { status: 500 })
  }
}
