import { Repeat } from 'lucide-react';
import { ModuleCard, Row } from '../module-card';
import { StatusPill, syncTone } from '../status-pill';
import { EmptyState } from '../empty-state';
import { relTime, titleize } from '../../_lib/format';
import { T } from '../../_lib/tokens';
import type { SyncQueueRow } from '../../_lib/queries';

export function SyncQueueModule({ rows }: { rows: SyncQueueRow[] }) {
  const totalRows = rows.reduce((s, r) => s + Number(r.rows || 0), 0);
  const failing = rows.filter(r => ['failed', 'dead_letter', 'retrying'].includes(r.status))
    .reduce((s, r) => s + Number(r.rows || 0), 0);
  const tone = failing > 0 ? 'red' : totalRows > 0 ? 'blue' : 'green';
  const top = rows.slice(0, 5);
  return (
    <ModuleCard
      title="Sync queue health"
      subtitle="Outbound to external systems"
      count={totalRows}
      tone={tone}
      icon={Repeat}
      viewAllHref="/settings"
      accent={failing > 0}
    >
      {rows.length === 0 ? (
        <EmptyState label="Queue empty" hint="No outbound sync events queued" />
      ) : (
        <>
          {top.map((r, i) => (
            <Row key={`${r.target_system}-${r.status}-${i}`}
              left={
                <>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: T.accentSoft, color: T.accentDeep,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, letterSpacing: '-0.01em',
                  }}>
                    {r.target_system.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {titleize(r.target_system)}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textFaint }}>
                      {r.rows} {r.rows === 1 ? 'event' : 'events'}
                      {r.last_seen && ` · ${relTime(r.last_seen)}`}
                    </div>
                  </div>
                </>
              }
              right={<StatusPill tone={syncTone(r.status)}>{titleize(r.status)}</StatusPill>}
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
