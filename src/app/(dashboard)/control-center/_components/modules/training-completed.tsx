import { GraduationCap } from 'lucide-react';
import { ModuleCard, Row } from '../module-card';
import { Avatar } from '../avatar';
import { StatusPill } from '../status-pill';
import { EmptyState } from '../empty-state';
import { fullName, relTime } from '../../_lib/format';
import { T } from '../../_lib/tokens';
import type { TrainingCompletedRow } from '../../_lib/queries';

export function TrainingCompletedModule({ rows }: { rows: TrainingCompletedRow[] }) {
  const top = rows.slice(0, 5);
  return (
    <ModuleCard
      title="Training completions"
      subtitle="Last 30 days"
      count={rows.length}
      tone="green"
      icon={GraduationCap}
      viewAllHref="/onboarding"
    >
      {rows.length === 0 ? (
        <EmptyState label="No completions yet" hint="Once Casesync training records sync, they appear here" />
      ) : (
        <>
          {top.map(r => (
            <Row key={r.training_id}
              left={
                <>
                  <Avatar first={r.first_name} last={r.last_name} url={r.avatar_url} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fullName(r.first_name, r.last_name)}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textFaint,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title} · {relTime(r.completed_at)}
                    </div>
                  </div>
                </>
              }
              right={
                r.passed === false
                  ? <StatusPill tone="red">Failed</StatusPill>
                  : r.score != null
                    ? <StatusPill tone={r.score >= 80 ? 'green' : 'amber'}>{r.score}%</StatusPill>
                    : <StatusPill tone="green">Pass</StatusPill>
              }
            />
          ))}
          {rows.length > 5 && (
            <div style={{ fontSize: 11, color: T.textMuted, paddingTop: 4 }}>+{rows.length - 5} more completed</div>
          )}
        </>
      )}
    </ModuleCard>
  );
}
