import { ShieldAlert } from 'lucide-react';
import { ModuleCard, Row } from '../module-card';
import { Avatar } from '../avatar';
import { StatusPill, bgCheckTone } from '../status-pill';
import { EmptyState } from '../empty-state';
import { fullName, shortDate, titleize } from '../../_lib/format';
import { T } from '../../_lib/tokens';
import type { BgCheckRow } from '../../_lib/queries';

export function BgChecksModule({ rows }: { rows: BgCheckRow[] }) {
  const top = rows.slice(0, 5);
  const tone = rows.length === 0 ? 'green' : rows.length >= 5 ? 'red' : 'orange';
  return (
    <ModuleCard
      title="Background checks"
      subtitle="OIG · SAM.gov · expiring within 30d"
      count={rows.length}
      tone={tone}
      icon={ShieldAlert}
      viewAllHref="/compliance"
      accent
    >
      {rows.length === 0 ? (
        <EmptyState label="No employees flagged" hint="OIG checks current for all active staff" />
      ) : (
        <>
          {top.map(r => (
            <Row key={r.employee_id}
              left={
                <>
                  <Avatar first={r.first_name} last={r.last_name} url={r.avatar_url} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fullName(r.first_name, r.last_name)}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textFaint }}>
                      {titleize(r.package_type || 'OIG exclusion')}
                      {r.expires_at && ` · expires ${shortDate(r.expires_at)}`}
                    </div>
                  </div>
                </>
              }
              right={<StatusPill tone={bgCheckTone(r.category)}>{titleize(r.category)}</StatusPill>}
            />
          ))}
          {rows.length > 5 && (
            <div style={{ fontSize: 11, color: T.textMuted, paddingTop: 4 }}>
              +{rows.length - 5} more flagged
            </div>
          )}
        </>
      )}
    </ModuleCard>
  );
}
