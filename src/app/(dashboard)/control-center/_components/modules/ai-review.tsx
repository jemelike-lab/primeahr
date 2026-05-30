import { Sparkles } from 'lucide-react';
import { ModuleCard, Row } from '../module-card';
import { StatusPill } from '../status-pill';
import { EmptyState } from '../empty-state';
import { relTime, titleize } from '../../_lib/format';
import { T } from '../../_lib/tokens';
import type { AiReviewRow } from '../../_lib/queries';

export function AiReviewModule({ rows }: { rows: AiReviewRow[] }) {
  const top = rows.slice(0, 5);
  return (
    <ModuleCard
      title="AI actions for review"
      subtitle="Agentic decisions flagged below confidence"
      count={rows.length}
      tone={rows.length > 0 ? 'violet' : 'green'}
      icon={Sparkles}
      viewAllHref="/compliance"
      accent={rows.length > 0}
    >
      {rows.length === 0 ? (
        <EmptyState label="Nothing flagged" hint="The AI layer is operating within confidence" />
      ) : (
        <>
          {top.map(r => (
            <Row key={r.action_id}
              left={
                <>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: T.violetSoft, color: T.violet,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Sparkles size={14} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {titleize(r.kind)}
                      {r.target_table && <span style={{ color: T.textFaint, fontWeight: 500 }}> · {r.target_table}</span>}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textFaint,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.result_summary ?? '—'} · {relTime(r.created_at)}
                    </div>
                  </div>
                </>
              }
              right={<StatusPill tone="violet">Review</StatusPill>}
            />
          ))}
          {rows.length > 5 && (
            <div style={{ fontSize: 11, color: T.textMuted, paddingTop: 4 }}>+{rows.length - 5} more awaiting</div>
          )}
        </>
      )}
    </ModuleCard>
  );
}
