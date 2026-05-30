import { ClipboardCheck } from 'lucide-react';
import { ModuleCard, Row } from '../module-card';
import { Avatar } from '../avatar';
import { StatusPill } from '../status-pill';
import { EmptyState } from '../empty-state';
import { fullName, relTime, titleize } from '../../_lib/format';
import { T } from '../../_lib/tokens';
import type { CompletedEvalRow } from '../../_lib/queries';

export function CompletedEvalsModule({ rows }: { rows: CompletedEvalRow[] }) {
  const top = rows.slice(0, 5);
  return (
    <ModuleCard
      title="Evaluations completed"
      subtitle="Last 30 days"
      count={rows.length}
      tone="green"
      icon={ClipboardCheck}
      viewAllHref="/compliance"
    >
      {rows.length === 0 ? (
        <EmptyState label="No completions yet" hint="Once Casesync evaluations sync in, they appear here" />
      ) : (
        <>
          {top.map(r => (
            <Row key={r.eval_id}
              left={
                <>
                  <Avatar first={r.first_name} last={r.last_name} url={r.avatar_url} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fullName(r.first_name, r.last_name)}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textFaint }}>
                      {titleize(r.evaluation_type)} · {relTime(r.completed_at)}
                    </div>
                  </div>
                </>
              }
              right={r.score != null
                ? <StatusPill tone={r.score >= 80 ? 'green' : r.score >= 60 ? 'amber' : 'red'}>{r.score}%</StatusPill>
                : <StatusPill tone="green">Done</StatusPill>}
            />
          ))}
          {rows.length > 5 && (
            <div style={{ fontSize: 11, color: T.textMuted, paddingTop: 4 }}>+{rows.length - 5} more this month</div>
          )}
        </>
      )}
    </ModuleCard>
  );
}
