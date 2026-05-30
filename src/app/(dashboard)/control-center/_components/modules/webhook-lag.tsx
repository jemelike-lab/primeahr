import { Inbox } from 'lucide-react';
import { ModuleCard, Row } from '../module-card';
import { StatusPill } from '../status-pill';
import { EmptyState } from '../empty-state';
import { relTime, titleize } from '../../_lib/format';
import { T } from '../../_lib/tokens';
import type { WebhookLagRow } from '../../_lib/queries';

function ageTone(oldestIso: string | null): 'green' | 'amber' | 'red' {
  if (!oldestIso) return 'green';
  const ageMin = (Date.now() - new Date(oldestIso).getTime()) / 60000;
  if (ageMin > 60) return 'red';
  if (ageMin > 10) return 'amber';
  return 'green';
}

export function WebhookLagModule({ rows }: { rows: WebhookLagRow[] }) {
  const totalPending = rows.reduce((s, r) => s + Number(r.rows || 0), 0);
  const top = rows.slice(0, 5);
  return (
    <ModuleCard
      title="Webhook inbox"
      subtitle="Inbound events · received + processing"
      count={totalPending}
      tone={totalPending > 0 ? 'amber' : 'green'}
      icon={Inbox}
      viewAllHref="/settings"
    >
      {rows.length === 0 ? (
        <EmptyState label="Inbox clear" hint="All inbound webhooks processed" />
      ) : (
        <>
          {top.map((r, i) => (
            <Row key={`${r.source_system}-${r.event_type}-${i}`}
              left={
                <>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: T.violetSoft, color: T.violet,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, letterSpacing: '-0.01em',
                  }}>
                    {r.source_system.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {titleize(r.source_system)} · {r.event_type}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textFaint }}>
                      {r.rows} pending
                      {r.oldest_pending && ` · oldest ${relTime(r.oldest_pending)}`}
                    </div>
                  </div>
                </>
              }
              right={<StatusPill tone={ageTone(r.oldest_pending)}>
                {ageTone(r.oldest_pending) === 'green' ? 'Fresh' : ageTone(r.oldest_pending) === 'amber' ? 'Aging' : 'Lagging'}
              </StatusPill>}
            />
          ))}
          {rows.length > 5 && (
            <div style={{ fontSize: 11, color: T.textMuted, paddingTop: 4 }}>+{rows.length - 5} more buckets</div>
          )}
        </>
      )}
    </ModuleCard>
  );
}
