import { getAllControlCenterData } from './_lib/queries';
import { T, FONT } from './_lib/tokens';
import { PageHeader, MetricTile } from './_components/page-header';
import { BrandingFooter } from './_components/branding-footer';
import { BgChecksModule } from './_components/modules/bg-checks';
import { UpcomingEvalsModule } from './_components/modules/upcoming-evals';
import { CompletedEvalsModule } from './_components/modules/completed-evals';
import { RateChangeModule } from './_components/modules/rate-change';
import { PendingCompModule } from './_components/modules/pending-comp';
import { TrainingCohortModule } from './_components/modules/training-cohort';
import { TrainingCompletedModule } from './_components/modules/training-completed';
import { SyncQueueModule } from './_components/modules/sync-queue';
import { WebhookLagModule } from './_components/modules/webhook-lag';
import { AiReviewModule } from './_components/modules/ai-review';
import { ShieldAlert, Sparkles, Repeat, AlertTriangle } from 'lucide-react';

// Always render fresh — this is the operational console
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = { title: 'Control Center · PrimeaHR' };

export default async function ControlCenterPage() {
  const data = await getAllControlCenterData();

  // Hero KPIs — synthesized from underlying module data
  const totalAttention =
    data.bgChecks.length + data.upcomingEvals.length + data.rateChange.length +
    data.pendingComp.length + data.webhookLag.length + data.aiReview.length;
  const syncFailing = data.syncQueue.filter(r => ['failed','dead_letter','retrying'].includes(r.status))
    .reduce((s, r) => s + Number(r.rows || 0), 0);
  const aiAwaiting = data.aiReview.length;
  const complianceGaps = data.bgChecks.length;

  return (
    <div style={{
      background: T.bg,
      minHeight: '100vh',
      padding: '28px 32px 40px',
      fontFamily: FONT,
      color: T.text,
    }}>
      <div style={{ maxWidth: 1480, margin: '0 auto' }}>
        <PageHeader generatedAt={new Date()} />

        {/* Hero KPI strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14, marginBottom: 22,
        }}>
          <MetricTile
            label="Items needing attention"
            value={totalAttention}
            hint="Across compliance, comp, sync, and AI"
            icon={AlertTriangle}
            tone={totalAttention > 10 ? 'red' : totalAttention > 0 ? 'amber' : 'green'}
          />
          <MetricTile
            label="Compliance gaps"
            value={complianceGaps}
            hint="Missing or expiring OIG checks"
            icon={ShieldAlert}
            tone={complianceGaps > 0 ? 'red' : 'green'}
          />
          <MetricTile
            label="Sync failures"
            value={syncFailing}
            hint="Outbound events stuck or retrying"
            icon={Repeat}
            tone={syncFailing > 0 ? 'red' : 'green'}
          />
          <MetricTile
            label="AI awaiting review"
            value={aiAwaiting}
            hint="Agentic decisions below confidence"
            icon={Sparkles}
            tone={aiAwaiting > 0 ? 'violet' : 'green'}
          />
        </div>

        {/* Section heading */}
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <h2 style={{
            fontSize: 16, fontWeight: 800, letterSpacing: '-0.015em',
            color: T.text, margin: 0,
          }}>Operational modules</h2>
          <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>
            10 live modules · auto-refreshed on view
          </span>
        </div>

        {/* The 10-module grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 14,
        }}>
          <BgChecksModule rows={data.bgChecks} />
          <UpcomingEvalsModule rows={data.upcomingEvals} />
          <CompletedEvalsModule rows={data.completedEvals} />
          <RateChangeModule rows={data.rateChange} />
          <PendingCompModule rows={data.pendingComp} />
          <TrainingCohortModule rows={data.trainingCohort} />
          <TrainingCompletedModule rows={data.trainingCompleted} />
          <SyncQueueModule rows={data.syncQueue} />
          <WebhookLagModule rows={data.webhookLag} />
          <AiReviewModule rows={data.aiReview} />
        </div>

        <BrandingFooter />
      </div>
    </div>
  );
}
