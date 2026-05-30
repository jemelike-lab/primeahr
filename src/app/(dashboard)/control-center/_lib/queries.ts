import { createClient } from '@/lib/supabase/server';

/**
 * Phase C Control Center — server-side query layer.
 * Calls 10 Postgres functions (cc_*) defined in migration `cc_phase_c_dashboard_functions`.
 * All run in parallel via Promise.all from the page.
 */

export type BgCheckRow = {
  employee_id: string; first_name: string; last_name: string; avatar_url: string | null;
  bg_check_id: string | null; status: string | null; package_type: string | null;
  expires_at: string | null; category: 'missing' | 'failing' | 'expiring' | 'unknown';
};
export type UpcomingEvalRow = {
  eval_id: string; employee_id: string; first_name: string; last_name: string;
  avatar_url: string | null; evaluation_type: string; scheduled_for: string; status: string;
};
export type CompletedEvalRow = {
  eval_id: string; employee_id: string; first_name: string; last_name: string;
  avatar_url: string | null; evaluation_type: string; completed_at: string; score: number | null;
};
export type RateChangeRow = {
  employee_id: string; first_name: string; last_name: string; avatar_url: string | null;
  eval_id: string; completed_at: string; score: number | null;
};
export type PendingCompRow = {
  comp_id: string; employee_id: string; first_name: string; last_name: string;
  avatar_url: string | null; compensation_type: string; amount: number; pay_frequency: string;
  effective_date: string; status: string; created_at: string;
};
export type TrainingCohortRow = {
  employee_id: string; first_name: string; last_name: string; avatar_url: string | null;
  hire_date: string | null; open_modules: number; completed_modules: number;
};
export type TrainingCompletedRow = {
  training_id: string; employee_id: string; first_name: string; last_name: string;
  avatar_url: string | null; title: string; completed_at: string; score: number | null;
  passed: boolean | null;
};
export type SyncQueueRow = {
  target_system: string; status: string; rows: number; last_seen: string | null;
};
export type WebhookLagRow = {
  source_system: string; event_type: string; rows: number; oldest_pending: string | null;
};
export type AiReviewRow = {
  action_id: string; kind: string; target_table: string | null;
  target_id: string | null; result_summary: string | null; created_at: string;
};

async function rpc<T>(name: string): Promise<T[]> {
  const s = await createClient();
  const { data, error } = await s.rpc(name);
  if (error) {
    console.error(`[control-center] rpc ${name} failed:`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export const getMissingBgChecks = () => rpc<BgCheckRow>('cc_missing_bg_checks');
export const getUpcomingEvals = () => rpc<UpcomingEvalRow>('cc_upcoming_evals');
export const getCompletedEvals = () => rpc<CompletedEvalRow>('cc_completed_evals');
export const getRateChangeDue = () => rpc<RateChangeRow>('cc_rate_change_due');
export const getPendingComp = () => rpc<PendingCompRow>('cc_pending_comp');
export const getTrainingCohort = () => rpc<TrainingCohortRow>('cc_training_cohort');
export const getTrainingCompleted = () => rpc<TrainingCompletedRow>('cc_training_completed');
export const getSyncQueueHealth = () => rpc<SyncQueueRow>('cc_sync_queue_health');
export const getWebhookLag = () => rpc<WebhookLagRow>('cc_webhook_lag');
export const getAiReview = () => rpc<AiReviewRow>('cc_ai_review');

export async function getAllControlCenterData() {
  const [bgChecks, upcomingEvals, completedEvals, rateChange, pendingComp,
    trainingCohort, trainingCompleted, syncQueue, webhookLag, aiReview] = await Promise.all([
    getMissingBgChecks(), getUpcomingEvals(), getCompletedEvals(), getRateChangeDue(),
    getPendingComp(), getTrainingCohort(), getTrainingCompleted(), getSyncQueueHealth(),
    getWebhookLag(), getAiReview(),
  ]);
  return { bgChecks, upcomingEvals, completedEvals, rateChange, pendingComp,
    trainingCohort, trainingCompleted, syncQueue, webhookLag, aiReview };
}
