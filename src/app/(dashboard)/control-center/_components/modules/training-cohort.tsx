import { Users } from 'lucide-react';
import { ModuleCard, Row } from '../module-card';
import { Avatar } from '../avatar';
import { EmptyState } from '../empty-state';
import { fullName, shortDate } from '../../_lib/format';
import { T } from '../../_lib/tokens';
import type { TrainingCohortRow } from '../../_lib/queries';

export function TrainingCohortModule({ rows }: { rows: TrainingCohortRow[] }) {
  const top = rows.slice(0, 5);
  const openCount = rows.reduce((s, r) => s + Number(r.open_modules || 0), 0);
  return (
    <ModuleCard
      title="Onboarding training"
      subtitle="Cohort · hired last 90 days"
      count={openCount}
      tone={openCount > 0 ? 'orange' : 'green'}
      icon={Users}
      viewAllHref="/onboarding"
    >
      {rows.length === 0 ? (
        <EmptyState label="No recent hires" hint="No employees onboarded in the last 90 days" />
      ) : (
        <>
          {top.map(r => {
            const open = Number(r.open_modules || 0);
            const done = Number(r.completed_modules || 0);
            const total = open + done;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const tone = pct >= 80 ? T.green : pct >= 40 ? T.accent : T.red;
            return (
              <Row key={r.employee_id}
                left={
                  <>
                    <Avatar first={r.first_name} last={r.last_name} url={r.avatar_url} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {fullName(r.first_name, r.last_name)}
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: tone, flexShrink: 0 }}>{pct}%</div>
                      </div>
                      <div style={{
                        marginTop: 4, height: 4, borderRadius: 999,
                        background: T.slateSoft, overflow: 'hidden', width: '100%',
                      }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: tone, borderRadius: 999 }} />
                      </div>
                      <div style={{ fontSize: 10, color: T.textFaint, marginTop: 3 }}>
                        {done}/{total} modules · hired {shortDate(r.hire_date)}
                      </div>
                    </div>
                  </>
                }
              />
            );
          })}
          {rows.length > 5 && (
            <div style={{ fontSize: 11, color: T.textMuted, paddingTop: 4 }}>+{rows.length - 5} more in cohort</div>
          )}
        </>
      )}
    </ModuleCard>
  );
}
