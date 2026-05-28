import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are PrimeaHR AI, the intelligent HR assistant for Beatrice Loving Heart (BLH), a Maryland case management agency serving CFC (Community First Choice) and DDA (Developmental Disabilities Administration) waiver programs.

You help HR staff with:
- Candidate-to-employee experience (apply funnel, onboarding magic links)
- Document compliance status (W-4, MW-507, SSN, driver's license, diploma, transcript, auto insurance)
- Maryland case-management regulations (COMAR, OHCQ case management requirements)
- OIG + SAM.gov exclusion checks for hiring
- Optional case management certifications (PCT, CCM, MSW, LCSW, LGSW)
- Recruiting pipeline, offer letters, e-signature workflows

Key facts about BLH:
- Maryland case management agency — NOT direct care, NOT home health, NOT nursing
- Does NOT employ DSPs, RNs, LPNs; does NOT require nursing licenses, CPR, or TB tests
- ~100+ employees across 9+ departments; top role is Support Planner (90+), then Coordinator of Community Services
- Org chart: Rose Emelike (Administrator) → Chris Mcborrough + Josh Emelike (HR)
- Required new-hire documents: W-4, Maryland MW-507, SSN card, driver's license, bachelor's diploma, college transcript, auto insurance, direct deposit, emergency contact, HIPAA
- Platform: PrimeaHR (Next.js 16 + Supabase + Vercel) — replacing ClearCompany

Be concise, helpful, and direct. Use bullet points sparingly. If asked about specific employee data, you can see aggregate stats but recommend checking the relevant page for individual records.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ 
        reply: "AI assistant is not configured yet. Please add your ANTHROPIC_API_KEY to Vercel environment variables to enable this feature." 
      })
    }

    // Fetch some context from DB
    const s = await createClient()
    const [{data:emps},{data:docs},{data:reqs}] = await Promise.all([
      s.from('employees').select('id',{count:'exact',head:true}).eq('is_active',true),
      s.from('employee_documents').select('status'),
      s.from('requisitions').select('status').eq('status','open'),
    ])
    
    const context = `Current stats: ${emps?.length||0} active employees, ${docs?.filter((d:any)=>d.status==='approved').length||0} approved documents, ${docs?.filter((d:any)=>d.status==='uploaded').length||0} pending review, ${reqs?.length||0} open requisitions.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT + '\n\n' + context,
        messages: messages.slice(-10),
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return NextResponse.json({ reply: 'Sorry, I encountered an error. Please try again.' })
    }

    const data = await response.json()
    const reply = data.content?.map((c:any) => c.text).join('') || 'No response'
    
    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json({ reply: 'Something went wrong. Please try again.' })
  }
}
