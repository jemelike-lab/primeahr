import type { EventHandler, EventHandlerResult } from '../types';

/**
 * Handlers for events arriving from blhinterviews.com.
 * Stub implementations — fill out as the real event schema is finalized.
 */

const handlerMap: Record<string, EventHandler> = {
  'candidate.advanced': handleCandidateAdvanced,
  'candidate.rejected': handleCandidateRejected,
  'candidate.hired': handleCandidateHired,
  'candidate.note_added': handleCandidateNoteAdded,
  'interview.scheduled': handleInterviewScheduled,
  'interview.completed': handleInterviewCompleted,
};

export const blhinterviewsHandlers = {
  resolve(eventType: string): EventHandler | null {
    return handlerMap[eventType] ?? null;
  },
  knownEventTypes: () => Object.keys(handlerMap),
};

async function handleCandidateAdvanced(event, ctx): Promise<EventHandlerResult> {
  const { adminSupabase } = ctx;
  const payload = event.payload as { blhinterviews_candidate_id?: string; new_stage?: string };
  if (!payload.blhinterviews_candidate_id) {
    return { target_table: null, target_id: null, outcome: 'failure',
      result_summary: 'missing blhinterviews_candidate_id' };
  }
  const { data, error } = await adminSupabase
    .from('candidates')
    .select('id')
    .eq('blhinterviews_candidate_id', payload.blhinterviews_candidate_id)
    .maybeSingle();
  if (error || !data) {
    return { target_table: 'candidates', target_id: null, outcome: 'requires_review',
      result_summary: `no candidate match for blhinterviews id ${payload.blhinterviews_candidate_id}` };
  }
  return { target_table: 'candidates', target_id: data.id as string, outcome: 'success',
    result_summary: `stage advanced to ${payload.new_stage ?? 'unknown'}` };
}

async function handleCandidateRejected(event, ctx): Promise<EventHandlerResult> {
  return handleCandidateAdvanced(event, ctx);
}

async function handleCandidateHired(event, ctx): Promise<EventHandlerResult> {
  // Hire is a high-stakes event — flag for human review until the employee-creation
  // flow has been signed off.
  return { target_table: 'candidates', target_id: null, outcome: 'requires_review',
    result_summary: 'candidate.hired received — awaiting employee creation workflow' };
}

async function handleCandidateNoteAdded(event, ctx): Promise<EventHandlerResult> {
  return { target_table: 'candidates', target_id: null, outcome: 'success',
    result_summary: 'note recorded (no PrimeaHR mutation)' };
}

async function handleInterviewScheduled(event, ctx): Promise<EventHandlerResult> {
  return { target_table: null, target_id: null, outcome: 'success',
    result_summary: 'interview event logged' };
}

async function handleInterviewCompleted(event, ctx): Promise<EventHandlerResult> {
  return handleInterviewScheduled(event, ctx);
}
