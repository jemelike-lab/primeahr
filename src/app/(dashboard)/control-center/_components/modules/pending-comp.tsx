import { BadgeDollarSign } from 'lucide-react';
import { ModuleCard, Row } from '../module-card';
import { Avatar } from '../avatar';
import { StatusPill, compTone } from '../status-pill';
import { EmptyState } from '../empty-state';
import { fullName, money, titleize } from '../../_lib/format';
import { T } from '../../_lib/tokens';
import type { PendingCompRow } from '../../_lib/queries';

export function PendingCompModule({ rows }: { rows: PendingCompRow[] }) {
  const top = rows.slice(0, 5);
  return (
    <ModuleCard
      title="Pending comp approvals"
      subtitle="Proposed · awaiting approval"
      count={rows.length}
      tone={rows.length > 0 ? 'amber' : 'green'}
      icon={BadgeDollarSign}
      viewAllHref="/employees"
      accent={rows.length > 0}
    >
      {rows.length === 0 ? (
        <EmptyState label="No comp pending" hint="All compensation changes are approved" />
      ) : (
        <>
          {top.map(r => (
            <Row key={r.comp_id}
              left={
                <>
                  <Avatar first={r.first_name} last={r.last_name} url={r.avatar_url} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fullName(r.first_name, r.last_name)}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textFaint }}>
                      {money(r.amount)} {titleize(r.pay_frequency)} · {titleize(r.compensation_type)}
                    </div>
                  </div>
                </>
              }
              right={<StatusPill tone={compTone(r.status)}>{titleize(r.status)}</StatusPill>}
            />
          ))}
          {rows.length > 5 && (
            <div style={{ fontSize: 11, color: T.textMuted, paddingTop: 4 }}>+{rows.length - 5} more pending</div>
          )}
        </>
      )}
    </ModuleCard>
  );
}
