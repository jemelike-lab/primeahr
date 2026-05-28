import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateToken } from '@/lib/tokens'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ExtractionPlan {
  label: string
  fields: string[]
  guidance?: string
}

function planFor(docName: string): ExtractionPlan {
  const n = docName.toLowerCase()
  if (n.includes('w-4') || n.includes('w4')) {
    return {
      label: 'W-4 Federal Tax Form',
      fields: ['name', 'address', 'filing_status', 'ssn_last_4', 'dependents_amount', 'extra_withholding', 'signed', 'signature_date'],
      guidance: 'IRS Form W-4. Extract only last 4 digits of SSN, never the full number.',
    }
  }
  if (n.includes('mw-507') || n.includes('mw507')) {
    return {
      label: 'Maryland MW-507',
      fields: ['name', 'address', 'county_of_residence', 'total_exemptions', 'signed', 'signature_date'],
      guidance: 'Maryland Form MW-507 Employee Withholding Exemption.',
    }
  }
  if (n.includes('social security') || n.includes('ssn')) {
    return {
      label: 'Social Security Card',
      fields: ['name', 'ssn_last_4', 'appears_authentic'],
      guidance: 'Extract only the last 4 digits of the SSN. Set appears_authentic=true only if the card has SSA seal, signature line, and standard layout.',
    }
  }
  if (n.includes('driver') || n.includes('license')) {
    return {
      label: "Driver's License",
      fields: ['name', 'date_of_birth', 'license_number_last_4', 'state', 'expiration_date', 'is_expired'],
      guidance: 'US state-issued driver license. Extract only last 4 digits of the license number. Determine is_expired by comparing expiration_date to today.',
    }
  }
  if (n.includes('diploma')) {
    return {
      label: 'Diploma',
      fields: ['recipient_name', 'institution', 'degree', 'field_of_study', 'graduation_date'],
    }
  }
  if (n.includes('transcript')) {
    return {
      label: 'College Transcript',
      fields: ['recipient_name', 'institution', 'degree', 'field_of_study', 'graduation_date', 'gpa', 'is_official'],
      guidance: 'is_official=true if it shows registrar seal/signature.',
    }
  }
  if (n.includes('insurance')) {
    return {
      label: 'Auto Insurance Card / Declaration',
      fields: ['insured_name', 'policy_number_last_4', 'carrier', 'effective_date', 'expiration_date', 'is_expired'],
    }
  }
  if (n.includes('direct deposit')) {
    return {
      label: 'Direct Deposit Authorization',
      fields: ['name', 'bank_name', 'account_type', 'account_number_last_4', 'routing_number', 'signed'],
    }
  }
  if (n.includes('emergency')) {
    return {
      label: 'Emergency Contact Form',
      fields: ['employee_name', 'contact_name', 'contact_relationship', 'contact_phone', 'signed'],
    }
  }
  if (n.includes('hipaa')) {
    return {
      label: 'HIPAA Acknowledgment',
      fields: ['employee_name', 'signed', 'signature_date'],
    }
  }
  return { label: docName, fields: ['name', 'document_type', 'date', 'summary'] }
}

function buildPrompt(plan: ExtractionPlan, employeeName: string): string {
  return `You are reviewing an onboarding document submitted by an applicant named "${employeeName}" for a Maryland case management agency.

Document expected: ${plan.label}.

Extract the following fields if visible: ${plan.fields.join(', ')}.
${plan.guidance ? plan.guidance + '\n' : ''}
Then verify:
1. document_match: "match" | "mismatch" | "unclear" — does this image/PDF actually show a ${plan.label}? "mismatch" if it's clearly a different kind of document.
2. name_match: "match" | "mismatch" | "unclear" — does the name on the document match "${employeeName}"? "match" if reasonably close (initials, nicknames, name order ok). "mismatch" only if clearly a different person. "unclear" if no name visible.
3. legible: true | false — is the document readable enough to extract data?
4. confidence: 0.0 to 1.0 — how confident are you in the extraction overall?
5. notes: short string — anything HR should know (e.g. "signature missing", "expired", "blurry corner").

Respond with ONLY a single valid JSON object, no prose, no markdown fences. Privacy rules: never include full SSNs, full account numbers, or full driver's license numbers — only the last 4 digits where requested.`
}

const PDF_MIME = 'application/pdf'
const IMG_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'])

export async function POST(req: NextRequest) {
  try {
    const { token, documentId } = (await req.json()) as { token?: string; documentId?: string }
    if (!token || !documentId) return NextResponse.json({ error: 'Missing token or documentId.' }, { status: 400 })

    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ua = h.get('user-agent') ?? undefined
    const tokenRow = await validateToken(token, 'onboarding', ip, ua)
    if (!tokenRow || !tokenRow.employee_id) {
      return NextResponse.json({ error: 'Your magic link has expired.' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: doc, error: docErr } = await supabase
      .from('employee_documents')
      .select('id, name, status, storage_path, file_mime_type, employee_id')
      .eq('id', documentId)
      .eq('employee_id', tokenRow.employee_id)
      .single()
    if (docErr || !doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    if (!doc.storage_path) return NextResponse.json({ error: 'No file attached.' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // Without an API key we can't OCR — leave status as 'uploaded' for HR review.
      return NextResponse.json({
        status: 'uploaded',
        notes: 'AI verification is offline. HR will review manually.',
        confidence: 0,
      })
    }

    const { data: emp } = await supabase
      .from('employees')
      .select('first_name, last_name')
      .eq('id', doc.employee_id)
      .single()
    const employeeName = `${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim() || 'Unknown'

    // Download the file from private storage
    const { data: blob, error: dlErr } = await supabase.storage.from('employee-documents').download(doc.storage_path)
    if (dlErr || !blob) return NextResponse.json({ error: 'Could not read uploaded file.' }, { status: 500 })
    const ab = await blob.arrayBuffer()
    const b64 = Buffer.from(ab).toString('base64')
    const mime = doc.file_mime_type || 'application/octet-stream'
    const isPDF = mime === PDF_MIME
    const isImg = IMG_MIMES.has(mime)
    if (!isPDF && !isImg) {
      return NextResponse.json({ error: 'Unsupported file type for AI verification.' }, { status: 400 })
    }

    const plan = planFor(doc.name)
    const prompt = buildPrompt(plan, employeeName)
    const mediaBlock = isPDF
      ? { type: 'document', source: { type: 'base64', media_type: PDF_MIME, data: b64 } }
      : { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } }

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: [mediaBlock, { type: 'text', text: prompt }] }],
      }),
    })

    if (!aiResp.ok) {
      const errBody = await aiResp.text()
      console.error('verify-document AI error:', errBody)
      return NextResponse.json({ error: 'AI verification failed. HR will review manually.', status: 'uploaded' }, { status: 200 })
    }

    const aiData = await aiResp.json()
    const reply = (aiData.content ?? []).map((c: any) => c.text ?? '').join('').trim()
    let parsed: Record<string, any> = {}
    const m = reply.match(/\{[\s\S]*\}/)
    if (m) {
      try { parsed = JSON.parse(m[0]) } catch { /* ignore */ }
    }

    // Decide status
    const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5
    const docMatch = String(parsed.document_match ?? 'unclear').toLowerCase()
    const nameMatch = String(parsed.name_match ?? 'unclear').toLowerCase()
    const legible = parsed.legible !== false

    let newStatus: 'approved' | 'rejected' | 'uploaded' = 'uploaded'
    let rejectionReason: string | null = null

    if (docMatch === 'mismatch') {
      newStatus = 'rejected'
      rejectionReason = `This appears to be a different document type. Expected ${plan.label}. ${parsed.notes ? '— ' + parsed.notes : ''}`
    } else if (nameMatch === 'mismatch') {
      newStatus = 'rejected'
      rejectionReason = `Name on document does not match ${employeeName}. ${parsed.notes ? '— ' + parsed.notes : ''}`
    } else if (!legible) {
      newStatus = 'rejected'
      rejectionReason = `Document is not legible. Please re-upload a clearer copy. ${parsed.notes ? '— ' + parsed.notes : ''}`
    } else if (parsed.is_expired === true) {
      newStatus = 'rejected'
      rejectionReason = `Document is expired. Please upload a current version.`
    } else if (confidence >= 0.8 && docMatch === 'match' && (nameMatch === 'match' || nameMatch === 'unclear')) {
      newStatus = 'approved'
    } else {
      newStatus = 'uploaded' // HR review queue
    }

    await supabase
      .from('employee_documents')
      .update({
        ocr_extracted_data: parsed,
        ocr_confidence: confidence,
        status: newStatus,
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id)

    return NextResponse.json({
      status: newStatus,
      confidence,
      extracted: parsed,
      rejectionReason,
      docLabel: plan.label,
    })
  } catch (err: any) {
    console.error('verify-document error:', err)
    return NextResponse.json({ error: 'Verification failed unexpectedly.' }, { status: 500 })
  }
}
