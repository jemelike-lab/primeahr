'use client'
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowUpRight, FileText } from 'lucide-react'

type Point = { label: string; count: number }
type Range = '7d' | '30d' | '6mo'
interface Props {
  series: { '7d': Point[]; '30d': Point[]; '6mo': Point[] }
  applications: { '7d': number; '30d': number; '6mo': number }
  movedToOffer: { '7d': number; '30d': number; '6mo': number }
}

const RANGE_LABEL: Record<Range, string> = { '7d': 'last 7 days', '30d': 'last 30 days', '6mo': 'last 6 months' }

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const v = payload[0].value
  return (
    <div style={{ background: '#fbf9f4', border: '1px solid #e4ddcd', borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 16px rgba(44,44,42,0.10)' }}>
      <div style={{ fontSize: 11, color: '#8a8475', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 15, color: '#2c2c2a', fontWeight: 800, marginTop: 2 }}>{v} application{v === 1 ? '' : 's'}</div>
    </div>
  )
}

export function ApplicationsChart({ series, applications, movedToOffer }: Props) {
  const [range, setRange] = useState<Range>('7d')
  const data = series[range]
  const total = applications[range]
  const offers = movedToOffer[range]
  const hasData = data.some((d) => d.count > 0)

  return (
    <div style={{ background: '#fbf9f4', borderRadius: 12, border: '1px solid #e4ddcd', padding: 24, animation: 'fadeUp 0.4s ease-out both' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2c2c2a', margin: 0, letterSpacing: '-0.01em' }}>Incoming applications</h2>
          <p style={{ fontSize: 12, color: '#8a8475', marginTop: 2 }}>Applications received, {RANGE_LABEL[range]}</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#f4f1ea', borderRadius: 10, padding: 4 }}>
          {(['7d', '30d', '6mo'] as Range[]).map((r) => {
            const on = r === range
            return (
              <button key={r} onClick={() => setRange(r)}
                style={{ border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 7, transition: 'all 0.15s',
                  background: on ? '#e08a3c' : 'transparent', color: on ? '#fff' : '#8a8475', boxShadow: on ? '0 1px 3px rgba(224,138,60,0.35)' : 'none' }}>
                {r === '6mo' ? '6mo' : r}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chart + stat callouts */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap', marginTop: 12 }}>
        <div style={{ flex: '1 1 360px', minWidth: 280, position: 'relative' }}>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e08a3c" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="#e08a3c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="#ece3d2" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a39d8e' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a39d8e' }} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e08a3c', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="count" stroke="#d4762a" strokeWidth={3} fill="url(#amberFill)" dot={false} activeDot={{ r: 4, fill: '#d4762a', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
          {!hasData && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a39d8e' }}>No applications in this window yet</div>
              <div style={{ fontSize: 11, color: '#bcb5a4', marginTop: 2 }}>Share your apply links to start the funnel</div>
            </div>
          )}
        </div>

        {/* Stat callouts */}
        <div style={{ flex: '0 1 200px', minWidth: 180, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,#fff7ee 0%,#fdeed9 100%)', border: '1px solid #f3dcbf', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#e08a3c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a86a28' }}>Applications</span>
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#2c2c2a', letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 10 }}>{total}</div>
            <div style={{ fontSize: 11, color: '#8a8475', marginTop: 2 }}>{RANGE_LABEL[range]}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e4ddcd', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#e6f4ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight style={{ width: 16, height: 16, color: '#1d9e75' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d9e75' }}>Moved to offer</span>
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#2c2c2a', letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 10 }}>{offers}</div>
            <div style={{ fontSize: 11, color: '#8a8475', marginTop: 2 }}>{RANGE_LABEL[range]}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
