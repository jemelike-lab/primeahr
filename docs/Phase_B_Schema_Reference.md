# PrimeaHR — Phase B Schema Reference

**Status:** Live in Supabase project `cnzsloaydotapqrdauch` as of 2026-05-30
**Migrations covered:** `add_consent_opt_out_fields` through `add_external_ref_columns` (8 total)
**Scope:** Control-center domain tables, AI audit, cross-site bridge layer

---

## 1. Overview

Phase B established two layers of infrastructure that everything in Phase C (dashboard control-center modules) and beyond will sit on:

- **Control-center layer (5 tables):** `ai_actions`, `background_checks`, `compensation_history`, `evaluations`, `training`. These power the operational widgets — overdue checks, pending approvals, completion tracking, audit trail.
- **Bridge layer (3 tables + inline external IDs):** `external_systems`, `external_events`, `sync_outbox`. These define how PrimeaHR communicates with `blhinterviews.com`, `blhcasesync.com`, and (future) Checkr.

Plus consent/opt-out fields added to `candidates` and `employees` for TCPA compliance.

**Design philosophy:**
1. **Append-only history.** Rate changes, background checks, and evaluations are never destructively updated. Each change is a new row linked to the prior one via `superseded_by`. The "current" row is the latest one with `superseded_by IS NULL`.
2. **Decoupled sync.** Outbound writes to external systems go through `sync_outbox` (queue) instead of inline HTTP. Inbound webhooks land in `external_events` (inbox) before any business logic runs. Database guarantees idempotency.
3. **Locked shared infrastructure.** Every control-center table carries the same four columns for the reminder system: `due_date`, `reminder_state`, `last_reminder_at`, `notification_channel`. Drives a single, generic reminder cron.
4. **AI is auditable.** Every AI-driven action writes a row to `ai_actions`. When the AI acts on an external system, that's 3 rows total (domain table + `sync_outbox` + `ai_actions`).

---

## 2. Glossary of conventions

| Convention | Rule |
|---|---|
| IDs | All primary keys are `uuid` with `gen_random_uuid()` default |
| Timestamps | All `timestamptz`, all defaulting to `now()` when applicable |
| `updated_at` | Maintained by a per-table `BEFORE UPDATE` trigger |
| RLS | Enabled on every table. Service-role full access; authenticated users SELECT-only |
| Enums | Domain-specific enums per table; two shared infra enums (`reminder_state`, `notification_channel`) |
| Soft deletes | Not used. Append a new row and link via `superseded_by` instead |
| External IDs | Inline columns (`casesync_employee_id`, `blhinterviews_candidate_id`, etc.) rather than a join table |
| Metadata | Every table has a `metadata jsonb NOT NULL DEFAULT '{}'::jsonb` escape hatch |

### Shared infrastructure enums

```sql
reminder_state       :: 'none' | 'scheduled' | 'sent'
notification_channel :: 'email' | 'sms' | 'whatsapp'
```

Every control-center row has both. The reminder cron pattern is:

```sql
SELECT * FROM {table}
WHERE reminder_state IN ('none','scheduled')
  AND due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY due_date;
```

---

## 3. Control-center tables

### 3.1 `ai_actions` — universal AI audit

**Purpose:** Every AI-driven action (reminder sent, OCR run, form prefilled, status transition, etc.) writes one row here. Required for debugging, oversight, and trust in the agentic layer.

**Key columns:**

| Column | Type | Notes |
|---|---|---|
| `kind` | `ai_action_kind` | What the AI did |
| `outcome` | `ai_action_outcome` | `success` / `failure` / `partial` / `requires_review` |
| `target_table` | text | Which table the AI touched |
| `target_id` | uuid | Which specific record |
| `subject_employee_id` / `subject_candidate_id` | uuid | Who it was about |
| `model` | text | e.g., `claude-sonnet-4-20250514` |
| `prompt_summary` | text | Short human-readable summary |
| `input_tokens`, `output_tokens`, `duration_ms` | int | Cost/perf tracking |
| `result_summary` | text | One-sentence description of what happened |
| `result_data` | jsonb | Structured result for replay/debugging |
| `triggered_by` | text | `system` / `cron` / `user` / `webhook` |
| `request_id` | text | Correlation id across the stack |

**Enums:**

```sql
ai_action_kind :: 'reminder_sent' | 'document_ocr' | 'document_auto_approved'
              | 'form_prefilled' | 'status_transition' | 'background_check_initiated'
              | 'evaluation_assigned' | 'training_assigned'
              | 'compensation_change_proposed' | 'communication_drafted' | 'other'

ai_action_outcome :: 'success' | 'failure' | 'partial' | 'requires_review'
```

**Insertion pattern (server action):**

```ts
await supabase.from('ai_actions').insert({
  kind: 'document_auto_approved',
  outcome: 'success',
  target_table: 'employee_documents',
  target_id: docId,
  subject_employee_id: employeeId,
  model: 'claude-sonnet-4-20250514',
  prompt_summary: 'OCR identity doc + confidence check',
  result_summary: `Auto-approved at confidence ${confidence}`,
  result_data: { confidence, extracted_fields },
  triggered_by: 'system',
})
```

**Indexes:** target lookup, employee/candidate filter, kind+created_at history, `requires_review` partial index for the human review queue.

---

### 3.2 `background_checks` — pattern-setter

**Purpose:** One row per package per subject. Re-runs create new rows; old row's `superseded_by` points to the new one. Full history preserved.

**Subject XOR:** exactly one of `subject_employee_id` or `subject_candidate_id` must be set. Enforced by check constraint `bg_subject_xor`. Background checks happen pre-hire (against `candidates`) and on a recurring cadence post-hire (against `employees`).

**Enums:**

```sql
bg_check_package :: 'oig_exclusion' | 'sam_exclusion' | 'mdh_exclusion'
                 | 'criminal_background' | 'mva_check'
                 | 'professional_reference' | 'education_verification'
                 | 'employment_verification' | 'custom'

bg_check_status :: 'pending' | 'requested' | 'in_progress' | 'pending_review'
                | 'clear' | 'consider' | 'suspended' | 'disputed'
                | 'expired' | 'canceled' | 'error'

bg_check_decision :: 'not_decided' | 'passed' | 'failed'
                  | 'passed_with_conditions' | 'waived'
```

`status` covers process state (manual and webhook-driven). `decision` covers outcome. The two are independent.

**Checkr columns (nullable, populated only when `vendor='checkr'`):**
`checkr_report_id`, `checkr_candidate_id`, `checkr_invitation_id`, `checkr_package`, `checkr_webhook_data`.

**Vendor:** `text`, not enum. `'manual'` is the default. Common values: `'manual'`, `'checkr'`, `'sam_gov_direct'`, `'oig_leie_direct'`.

**Supersession pattern (re-running a check):**

```sql
-- Insert the new run
WITH new_run AS (
  INSERT INTO background_checks (subject_employee_id, package_type, vendor, status, ...)
  VALUES (...)
  RETURNING id
)
-- Link old row to new
UPDATE background_checks SET superseded_by = (SELECT id FROM new_run)
WHERE id = $old_id;
```

**"Current" check for a (subject, package) pair:**

```sql
SELECT * FROM background_checks
WHERE subject_employee_id = $employee_id
  AND package_type = 'oig_exclusion'
  AND superseded_by IS NULL
ORDER BY created_at DESC LIMIT 1;
```

**Indexes:** subject+package+date for history, partial index `idx_bg_current` for "current row" queries, `idx_bg_expires_clear` for expiring-cert reminders.

---

### 3.3 `compensation_history` — approval workflow + supersession

**Purpose:** Every pay-rate change is a row. The current rate is the latest row where `status='effective' AND superseded_by IS NULL`.

**Subject:** employee only (candidates have no comp history). `employee_id NOT NULL`.

**Enums:**

```sql
compensation_type :: 'salary_annual' | 'hourly_rate' | 'stipend' | 'bonus' | 'other'
pay_frequency :: 'annual' | 'monthly' | 'biweekly' | 'weekly' | 'hourly' | 'one_time'

comp_trigger_source :: 'scheduled_review' | 'evaluation_completed' | 'promotion'
                    | 'cost_of_living' | 'ad_hoc' | 'correction'

comp_approval_status :: 'proposed' | 'pending_approval' | 'approved' | 'rejected'
                     | 'effective' | 'superseded' | 'canceled'
```

**Approval workflow:**

```
proposed → pending_approval → approved → effective
                            → rejected (terminal)
                            → canceled (terminal)
                              effective → superseded (when next change goes effective)
```

**Eval-triggered comp change:** `trigger_evaluation_id` FK to `evaluations(id) ON DELETE SET NULL`. When an evaluation completes, business logic can propose a comp change with `trigger_source='evaluation_completed'` and link it.

**Amount:** `numeric(12,2)` with `CHECK (amount >= 0)`. Up to $9,999,999,999.99 — deliberate over-provisioning for org-wide planning use cases.

**Date validity:** `CHECK (end_date IS NULL OR end_date >= effective_date)`.

**"Current pay rate" query:**

```sql
SELECT amount, pay_frequency, effective_date
FROM compensation_history
WHERE employee_id = $employee_id
  AND status = 'effective'
  AND superseded_by IS NULL
ORDER BY effective_date DESC LIMIT 1;
```

**"Pending approval" dashboard query:**

```sql
SELECT ch.*, e.first_name, e.last_name
FROM compensation_history ch
JOIN employees e ON e.id = ch.employee_id
WHERE ch.status IN ('proposed','pending_approval')
ORDER BY ch.created_at DESC;
```

---

### 3.4 `evaluations` — thin tracker

**Purpose:** PrimeaHR tracks who is due, who is overdue, when an eval completes. The actual evaluation content lives in `blhcasesync.com`.

**Subject:** employee only. `employee_id NOT NULL`, `evaluator_id` optional.

**Enums:**

```sql
evaluation_type :: '90_day_review' | 'annual_review' | 'mid_year'
                | 'probationary' | 'performance_improvement_plan' | 'ad_hoc'

evaluation_status :: 'scheduled' | 'due' | 'overdue' | 'in_progress'
                  | 'completed' | 'waived' | 'canceled'
```

**Casesync link:** `casesync_record_id` (the eval's id in Casesync), `casesync_url` (deep link), `synced_at` (last successful sync).

**Score:** `numeric(5,2)` — optional summary number; Casesync has the full rubric.

**"Overdue evaluations" dashboard query:**

```sql
SELECT e.id, emp.first_name, emp.last_name, e.evaluation_type, e.scheduled_for,
       (CURRENT_DATE - e.scheduled_for) AS days_overdue
FROM evaluations e
JOIN employees emp ON emp.id = e.employee_id
WHERE e.status IN ('scheduled','due','overdue')
  AND e.scheduled_for < CURRENT_DATE
ORDER BY e.scheduled_for;
```

---

### 3.5 `training` — thin tracker, mirrors evaluations

**Purpose:** Track training assignments, completion, and certificate links. Casesync is the LMS; PrimeaHR is the dashboard tracker.

**Subject:** employee only.

**Enums:**

```sql
training_type :: 'compliance_required' | 'role_specific' | 'continuing_education'
              | 'onboarding' | 'corrective' | 'optional'

training_status :: 'assigned' | 'not_started' | 'in_progress'
                | 'completed' | 'overdue' | 'waived' | 'canceled'
```

**Differences from `evaluations`:**

- `title text NOT NULL` — name of the course/module
- `pass_threshold numeric(5,2)` — for graded modules
- `passed boolean` — quick pass/fail flag
- `certificate_document_id` FK to `employee_documents(id)` — link to the issued certificate file
- `expires_at timestamptz` — for CEUs and other renewable certs
- `idx_training_expires_completed` index for "expiring certificate" reminders

**"Compliance training overdue" dashboard query:**

```sql
SELECT t.id, e.first_name, e.last_name, t.title, t.due_date
FROM training t
JOIN employees e ON e.id = t.employee_id
WHERE t.training_type = 'compliance_required'
  AND t.status IN ('assigned','not_started','in_progress','overdue')
  AND t.due_date < CURRENT_DATE
ORDER BY t.due_date;
```

---

## 4. Bridge layer

The bridge handles all communication with external systems. **No business logic ever talks directly to an external HTTP API.** Outbound goes through `sync_outbox`, inbound comes through `external_events`.

### 4.1 `external_systems` — registry

Small lookup table. One row per external system. Holds base URLs and the **env var NAMES** that contain the secrets (not the secrets themselves).

| code | name | active |
|---|---|---|
| `blhinterviews` | BLH Interviews | true |
| `blhcasesync` | BLH Casesync | true |
| `checkr` | Checkr | false (staged) |

**Activation:** flipping `is_active` to true makes the system live to the dispatcher. Use this to stage integrations before turning them on.

### 4.2 `external_events` — inbound webhook inbox

Every webhook from every external system lands here first via `POST /api/webhooks/[system]`.

**Endpoint flow:**

```
1. Receive POST /api/webhooks/blhcasesync
2. Verify HMAC signature using env var named in external_systems.webhook_secret_env
3. Insert row into external_events with signature_valid + payload + headers
4. Return 200 OK
5. (Async) Background dispatcher picks up rows with processing_status='received'
   and routes them to the right handler
```

**Idempotency:** `UNIQUE (source_system, external_event_id)` constraint. Duplicate webhook deliveries (and Casesync **will** send dupes) are rejected at the DB level. The endpoint catches the unique-violation error and returns 200.

**Processing states:**

```sql
event_processing_status :: 'received' | 'processing' | 'processed' | 'failed' | 'ignored'
```

When the dispatcher handles an event, it sets `processed_at`, updates `processing_status`, and fills `target_table` + `target_id` to record what was updated.

**Reading recent inbound events for a record:**

```sql
SELECT event_type, payload, received_at, processing_status
FROM external_events
WHERE target_table = 'evaluations' AND target_id = $eval_id
ORDER BY received_at DESC;
```

### 4.3 `sync_outbox` — outbound sync queue

When business logic needs to write to an external system, it writes to **two rows in one transaction**: the domain table + a `sync_outbox` row.

**Status flow:**

```
pending → in_flight → sent → confirmed   (happy path)
                  → failed (retry until max_attempts) → abandoned (terminal)
```

**Retry/backoff:** drainer reads rows where `status IN ('pending','failed') AND next_attempt_at <= now()`. On failure, it sets `next_attempt_at = now() + (attempts * 2 minutes)` (suggested; tune in dispatcher code).

**Linking back to AI audit:** `ai_action_id` FK to `ai_actions(id)`. When an AI-driven action causes an outbox row, the audit chain is queryable.

**Confirmation:** when the external system later sends back a confirmation webhook (e.g., "training completed"), the dispatcher updates `sync_outbox.external_event_id` to point to the inbound event and sets `confirmed_at`.

**Server-action insertion pattern:**

```ts
// All in one transaction (use Supabase RPC or pg transaction)
const { data: training } = await supabase
  .from('training')
  .insert({ employee_id, title, training_type, ... })
  .select().single()

await supabase.from('sync_outbox').insert({
  target_system: 'blhcasesync',
  operation: 'assign_training',
  target_table: 'training',
  target_id: training.id,
  payload: { casesync_employee_id, course_code, due_date },
  triggered_by: 'user',
  triggered_by_user_id: currentUser.id,
})
```

**Drainer health query:**

```sql
SELECT target_system, status, count(*)
FROM sync_outbox
GROUP BY target_system, status
ORDER BY target_system, status;
```

---

## 5. External ref columns

Inline external-system identifiers on the entities that cross boundaries.

| Table | Columns |
|---|---|
| `employees` | `casesync_employee_id`, `casesync_url`, `casesync_synced_at`, `blhinterviews_employee_id`, `blhinterviews_url` |
| `candidates` | `blhinterviews_candidate_id`, `blhinterviews_url`, `blhinterviews_synced_at` |
| `applications` | `blhinterviews_application_id`, `blhinterviews_synced_at` |
| `requisitions` | `blhinterviews_requisition_id`, `blhinterviews_synced_at` |
| `evaluations` | `casesync_record_id`, `casesync_url`, `synced_at` |
| `training` | `casesync_record_id`, `casesync_url`, `synced_at` |

Each external ID column has a partial index `WHERE col IS NOT NULL` for fast lookup by external system.

**Lookup pattern (webhook handler resolves an inbound event to a local record):**

```sql
SELECT id FROM employees WHERE casesync_employee_id = $casesync_id;
```

---

## 6. Consent and opt-out (TCPA)

Added to both `candidates` and `employees`:

| Column | Default | Notes |
|---|---|---|
| `consent_email` | `true` | Default opt-in |
| `consent_sms` | `false` | **Default opt-out — TCPA-compliant** |
| `consent_whatsapp` | `false` | Default opt-out |
| `tcpa_consent_at` | null | Set when explicit opt-in captured |
| `tcpa_consent_ip` | null | `inet` — IP at time of consent for audit |
| `opted_out_at` | null | Set when subject withdraws consent |
| `opt_out_reason` | null | text |

**Rule:** The reminder system must check the relevant `consent_*` column for the row's `notification_channel` before sending. SMS reminders to anyone with `consent_sms = false` are TCPA violations.

```sql
-- Safe SMS reminder query
SELECT t.id, e.phone
FROM training t
JOIN employees e ON e.id = t.employee_id
WHERE t.notification_channel = 'sms'
  AND t.reminder_state = 'none'
  AND t.due_date <= CURRENT_DATE + INTERVAL '7 days'
  AND e.consent_sms = true
  AND e.opted_out_at IS NULL;
```

---

## 7. Query cookbook — dashboard control-center modules

The ~10 dashboard sections Phase C will build, with their canonical queries.

### 7.1 "Missing background checks"

Employees who don't have a current (non-superseded) `clear` OIG check, or whose check is expiring within 30 days.

```sql
SELECT e.id, e.first_name, e.last_name,
       bc.status, bc.expires_at, bc.package_type
FROM employees e
LEFT JOIN background_checks bc
  ON bc.subject_employee_id = e.id
  AND bc.package_type = 'oig_exclusion'
  AND bc.superseded_by IS NULL
WHERE bc.id IS NULL                                  -- no check at all
   OR bc.status NOT IN ('clear','pending_review')   -- not passing
   OR bc.expires_at <= now() + INTERVAL '30 days'   -- expiring soon
ORDER BY bc.expires_at NULLS FIRST;
```

### 7.2 "Upcoming evaluations" (next 30 days)

```sql
SELECT e.id, emp.first_name, emp.last_name, e.evaluation_type, e.scheduled_for
FROM evaluations e
JOIN employees emp ON emp.id = e.employee_id
WHERE e.status IN ('scheduled','due')
  AND e.scheduled_for BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY e.scheduled_for;
```

### 7.3 "Evaluations completed" (last 30 days)

```sql
SELECT e.id, emp.first_name, emp.last_name, e.evaluation_type, e.completed_at, e.score
FROM evaluations e
JOIN employees emp ON emp.id = e.employee_id
WHERE e.status = 'completed'
  AND e.completed_at >= now() - INTERVAL '30 days'
ORDER BY e.completed_at DESC;
```

### 7.4 "Due for rate change" (post-eval triggered)

Employees with a completed evaluation in the last 30 days but no comp change yet linked to that eval.

```sql
SELECT emp.id, emp.first_name, emp.last_name,
       ev.id AS eval_id, ev.completed_at, ev.score
FROM evaluations ev
JOIN employees emp ON emp.id = ev.employee_id
WHERE ev.status = 'completed'
  AND ev.completed_at >= now() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM compensation_history ch
    WHERE ch.trigger_evaluation_id = ev.id
  )
ORDER BY ev.completed_at;
```

### 7.5 "Pending comp approvals"

```sql
SELECT ch.id, emp.first_name, emp.last_name,
       ch.compensation_type, ch.amount, ch.pay_frequency,
       ch.effective_date, ch.status, ch.created_at
FROM compensation_history ch
JOIN employees emp ON emp.id = ch.employee_id
WHERE ch.status IN ('proposed','pending_approval')
ORDER BY ch.created_at;
```

### 7.6 "Training sent / not sent" — onboarding cohort

```sql
SELECT emp.id, emp.first_name, emp.last_name,
       count(t.id) FILTER (WHERE t.status IN ('assigned','not_started','in_progress')) AS open_modules,
       count(t.id) FILTER (WHERE t.status = 'completed') AS completed_modules
FROM employees emp
LEFT JOIN training t ON t.employee_id = emp.id AND t.training_type = 'onboarding'
WHERE emp.created_at >= now() - INTERVAL '90 days'
GROUP BY emp.id, emp.first_name, emp.last_name
ORDER BY open_modules DESC;
```

### 7.7 "Training completed" feed

```sql
SELECT t.id, emp.first_name, emp.last_name, t.title, t.completed_at, t.score, t.passed
FROM training t
JOIN employees emp ON emp.id = t.employee_id
WHERE t.status = 'completed'
  AND t.completed_at >= now() - INTERVAL '30 days'
ORDER BY t.completed_at DESC;
```

### 7.8 "Sync queue health"

```sql
SELECT target_system, status, count(*) AS rows,
       max(last_attempt_at) AS last_seen
FROM sync_outbox
GROUP BY target_system, status
ORDER BY target_system, status;
```

### 7.9 "Webhook inbox lag"

```sql
SELECT source_system, event_type, count(*) AS rows,
       min(received_at) AS oldest_pending
FROM external_events
WHERE processing_status IN ('received','processing')
GROUP BY source_system, event_type;
```

### 7.10 "AI actions requiring review"

```sql
SELECT id, kind, target_table, target_id, result_summary, created_at
FROM ai_actions
WHERE outcome = 'requires_review'
ORDER BY created_at DESC;
```

---

## 8. AI action pattern (full example)

Walk-through: AI detects an employee's OIG check expires next week and auto-runs a re-check via Checkr.

```ts
// 1. Insert the new background_checks row (the re-run)
const { data: bgRow } = await supabase.from('background_checks').insert({
  subject_employee_id: employeeId,
  package_type: 'oig_exclusion',
  vendor: 'checkr',
  status: 'requested',
  requested_at: new Date().toISOString(),
  due_date: futureDate,
  notification_channel: 'email',
  metadata: { initiated_by: 'ai_annual_recheck_policy' },
}).select().single()

// 2. Mark the previous check as superseded
await supabase.from('background_checks')
  .update({ superseded_by: bgRow.id })
  .eq('id', previousCheckId)

// 3. Log the AI decision
const { data: aiAction } = await supabase.from('ai_actions').insert({
  kind: 'background_check_initiated',
  outcome: 'success',
  target_table: 'background_checks',
  target_id: bgRow.id,
  subject_employee_id: employeeId,
  model: 'claude-sonnet-4-20250514',
  prompt_summary: 'Annual OIG re-check 30 days before expiry',
  result_summary: 'Auto-initiated Checkr OIG re-check',
  triggered_by: 'cron',
}).select().single()

// 4. Queue the actual HTTP call to Checkr
await supabase.from('sync_outbox').insert({
  target_system: 'checkr',
  operation: 'create_invitation',
  target_table: 'background_checks',
  target_id: bgRow.id,
  payload: { candidate_email, package: 'oig_sam_combo' },
  triggered_by: 'ai',
  ai_action_id: aiAction.id,
})

// Done. 4 writes, 1 transaction, full audit chain. The drainer
// process picks up the sync_outbox row and makes the actual HTTP
// call to Checkr. When Checkr's webhook returns with the report,
// it lands in external_events, the dispatcher resolves it to the
// background_checks row by checkr_report_id, and updates status.
```

---

## 9. Migration history

| # | Migration | Date |
|---|---|---|
| 1 | `add_consent_opt_out_fields` | 2026-05-30 |
| 2 | `create_ai_actions_audit` | 2026-05-30 |
| 3 | `create_background_checks` | 2026-05-30 |
| 4 | `create_compensation_history` | 2026-05-30 |
| 5 | `create_evaluations` | 2026-05-30 |
| 6 | `create_training` | 2026-05-30 |
| 7 | `create_bridge_layer` | 2026-05-30 |
| 8 | `add_external_ref_columns` | 2026-05-30 |

Pull migration SQL from Supabase at any time:

```bash
supabase db pull --project-ref cnzsloaydotapqrdauch
```

---

## 10. What's next (Phase C and beyond)

**Phase C — Dashboard control-center modules** (the 10 widgets in §7).
**Phase D — Webhook endpoints + dispatcher.** `/api/webhooks/[system]` Next.js routes + a Vercel cron that drains `sync_outbox` and processes `external_events`.
**Phase E — blhinterviews bridge.** First real outbound integration (candidate hand-off).
**Phase F — blhcasesync bridge.** Eval/training assignment + completion sync.
**Phase G — Checkr.** Flip `external_systems.checkr.is_active=true` and wire the report-creation flow.

---

*Protected by PrimeaHR encryption*
*Built and powered by VELOX "Automated Operations" LLC*
