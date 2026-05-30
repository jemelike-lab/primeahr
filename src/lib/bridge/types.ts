// Shared types for the PrimeaHR bridge layer (Phase D).
// Inbound: external_events; Outbound: sync_outbox.

export type ExternalEventRow = {
  id: string;
  source_system: string;
  external_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  headers: Record<string, unknown> | null;
  signature_valid: boolean | null;
  processing_status: 'received' | 'processing' | 'processed' | 'failed' | 'ignored';
  received_at: string;
  processed_at: string | null;
  attempts: number;
  target_table: string | null;
  target_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
};

export type SyncOutboxRow = {
  id: string;
  target_system: string;
  operation: string;
  target_table: string;
  target_id: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'in_flight' | 'sent' | 'confirmed' | 'failed' | 'abandoned';
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  next_attempt_at: string;
  sent_at: string | null;
  confirmed_at: string | null;
  response_data: Record<string, unknown> | null;
  external_event_id: string | null;
  error_message: string | null;
};

export type ExternalSystemRow = {
  id: string;
  code: string;
  name: string;
  base_url: string;
  webhook_secret_env: string | null;
  api_token_env: string | null;
  is_active: boolean;
};

/** A handler resolves an inbound event into a domain mutation. */
export type EventHandlerResult = {
  target_table: string | null;
  target_id: string | null;
  result_summary: string;
  outcome: 'success' | 'failure' | 'partial' | 'requires_review' | 'ignored';
  notes?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventHandler = (
  event: ExternalEventRow,
  ctx: { adminSupabase: any }
) => Promise<EventHandlerResult>;

/** A dispatcher serializes an outbound row into an HTTP call. */
export type DispatchResult = {
  status: number;
  ok: boolean;
  response_data: Record<string, unknown> | null;
  error_message: string | null;
};
