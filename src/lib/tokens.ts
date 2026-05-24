import { randomBytes } from 'crypto'
import { createAdminClient } from './supabase/admin'

export type TokenKind = 'apply_resume' | 'onboarding'
export type TokenStatus = 'active' | 'used' | 'revoked' | 'expired'

export interface TokenRow {
  id: string
  token: string
  kind: TokenKind
  status: TokenStatus
  application_id: string | null
  candidate_id: string | null
  employee_id: string | null
  offer_letter_id: string | null
  expires_at: string
  metadata: Record<string, unknown>
  usage_count: number
  last_used_at: string | null
}

// Cryptographically strong, URL-safe token (32 bytes -> 43 char base64url).
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

// Server-side token validation. Calls the validate_token() SQL function
// which atomically checks freshness and increments usage counter.
// Returns null when token is invalid, expired, used, or revoked.
export async function validateToken(
  token: string,
  kind: TokenKind,
  ip?: string,
  userAgent?: string
): Promise<TokenRow | null> {
  if (!token || token.length < 16) return null
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('validate_token', {
    p_token: token,
    p_kind: kind,
    p_ip: ip ?? null,
    p_user_agent: userAgent ?? null,
  })
  if (error || !data) return null
  // Postgres composite return type comes back as the row object directly.
  // When no match exists, all fields are null; check id presence.
  const row = data as TokenRow
  return row && row.id ? row : null
}

export interface CreateTokenInput {
  kind: TokenKind
  expiresInDays: number
  applicationId?: string
  candidateId?: string
  employeeId?: string
  offerLetterId?: string
  createdBy?: string
  metadata?: Record<string, unknown>
}

export async function createToken(input: CreateTokenInput): Promise<TokenRow> {
  const supabase = createAdminClient()
  const token = generateToken()
  const expiresAt = new Date(
    Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000
  )
  const { data, error } = await supabase
    .from('tokens')
    .insert({
      token,
      kind: input.kind,
      application_id: input.applicationId ?? null,
      candidate_id: input.candidateId ?? null,
      employee_id: input.employeeId ?? null,
      offer_letter_id: input.offerLetterId ?? null,
      created_by: input.createdBy ?? null,
      metadata: input.metadata ?? {},
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data as TokenRow
}

