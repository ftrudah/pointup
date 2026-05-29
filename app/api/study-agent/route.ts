import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

type AssignmentInput = {
  title: string
  due_date: string
  priority: string
  course: string | null
  days_until_due: number
}

export async function POST(request: Request) {
  try {
    const { assignments, today } = await request.json() as {
      assignments: AssignmentInput[]
      today: string
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: 'No assignments provided' }, { status: 400 })
    }

    const assignmentList = assignments
      .map(a =>
        `- "${a.title}" | Course: ${a.course ?? 'None'} | Due: ${a.due_date} (${a.days_until_due} days away) | Priority: ${a.priority}`
      )
      .join('\n')

    const prompt = `You are a smart academic study planner. Today is ${today}.

The student has the following upcoming tests, exams, and assignments:
${assignmentList}

Generate a personalized study plan. For each assignment, provide:
1. Specific study sessions with dates leading up to the due date
2. How long each session should be (in hours)
3. What to focus on in each session
4. An overall strategy

Rules:
- High priority items need more sessions spread further in advance (start 7+ days early if possible)
- Medium priority items should start 3-5 days early
- Low priority items should start 1-2 days early
- Never schedule a study session on or after the due date
- If an item is due in fewer days than ideal, compress the plan accordingly
- Sessions should be 1-3 hours max each to avoid burnout
- Space sessions at least 1 day apart when possible
- Return ONLY valid JSON with no extra text in this exact format:

{
  "plan": [
    {
      "assignment": "string",
      "course": "string or null",
      "due_date": "YYYY-MM-DD",
      "priority": "string",
      "days_remaining": number,
      "strategy": "1-2 sentence overall approach",
      "sessions": [
        {
          "date": "YYYY-MM-DD",
          "duration_hours": number,
          "focus": "string describing what to study"
        }
      ],
      "total_hours": number
    }
  ],
  "general_advice": "2-3 sentences of overall advice for the student given their workload"
}`

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const result = JSON.parse(json)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Study agent error:', err)
    return NextResponse.json({ error: 'Failed to generate study plan' }, { status: 500 })
  }
}
