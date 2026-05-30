import { CalendarClock } from 'lucide-react';
import { ModuleCard, Row } from '../module-card';
import { Avatar } from '../avatar';
import { StatusPill, evalTone } from '../status-pill';
import { EmptyState } from '../empty-state';
import { fullName, shortDate, titleize, daysUntil } from '../../_lib/format';
import { T } from '../../_lib/tokens';
import type { UpcomingEvalRow } from '../../_lib/queries';

export function UpcomingEvalsModule({ rows }: { rows: UpcomingEvalRow[] }) {
  const top = rows.slice(0, 5);
  return (
    <ModuleCard
      title="Upcoming evaluations"
      subtitle="Scheduled · next 30 days"
      count={rows.length}
      tone="blue"
      icon={CalendarClock}
      viewAllHref="/compliance"
    >
      {rows.length === 0 ? (
        <EmptyState label="Nothing scheduled" hint="No evaluations due in the next 30 days" />
      ) : (
        <>
          {top.map(r => {
            const d = daysUntil(r.scheduled_for);
            return (
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
                        {titleize(r.evaluation_type)} · {shortDate(r.scheduled_for)}
                      </div>
                    </div>
                  </>
                }
                right={
                  <StatusPill tone={evalTone(r.status)}>
                    {d != null && d <= 7 ? `${d}d` : titleize(r.status)}
                  </StatusPill>
                }
              />
            );
          })}
          {rows.length > 5 && (
            <div style={{ fontSize: 11, color: T.textMuted, paddingTop: 4 }}>+{rows.length - 5} more scheduled</div>
          )}
        </>
      )}
    </ModuleCard>
  );
}
