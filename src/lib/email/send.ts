import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null

const DEFAULT_FROM = 'Beatrice Loving Heart Careers <onboarding@resend.dev>'
const DEFAULT_REPLY_TO = 'hr@beatricelovingheart.com'

const FROM = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM
const REPLY_TO = process.env.RESEND_REPLY_TO || DEFAULT_REPLY_TO

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
  skipped?: boolean
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing — skipping send to', params.to)
    return { ok: false, skipped: true }
  }
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      replyTo: REPLY_TO,
      subject: params.subject,
      html: params.html,
      text: params.text ?? '',
    })
    if (result.error) {
      console.error('[email] send error:', result.error)
      return { ok: false, error: result.error.message }
    }
    return { ok: true, id: result.data?.id }
  } catch (err) {
    console.error('[email] send threw:', err)
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
