'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

export type CalEvent = { date: string; type: 'interview' | 'start' | 'deadline'; label: string }
interface Props { events: CalEvent[] }

const TYPE_COLOR: Record<CalEvent['type'], string> = { interview: '#fff', start: '#fff', deadline: '#fff' }
const TYPE_BG: Record<CalEvent['type'], string> = { interview: '#1d9e75', start: '#1c2b2a', deadline: '#d85a30' }
const TYPE_NAME: Record<CalEvent['type'], string> = { interview: 'Interviews', start: 'Start dates', deadline: 'Deadlines' }
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function DashboardCalendar({ events }: Props) {
  const today = new Date()
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })

  const byDate = new Map<string, CalEvent[]>()
  for (const e of events) {
    if (!byDate.has(e.date)) byDate.set(e.date, [])
    byDate.get(e.date)!.push(e)
  }

  const firstWeekday = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate())
  const step = (dir: number) => {
    let m = view.m + dir, y = view.y
    if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
    setView({ y, m })
  }

  const monthEventCount = events.filter((e) => e.date.startsWith(`${view.y}-${String(view.m + 1).padStart(2, '0')}`)).length

  return (
    <div style={{ background: '#fbf9f4', borderRadius: 12, border: '1px solid #e4ddcd', padding: 24, animation: 'fadeUp 0.4s ease-out 0.2s both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: '#fdeed9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays style={{ width: 15, height: 15, color: '#e08a3c' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#2c2c2a' }}>{MONTHS[view.m]} {view.y}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => step(-1)} aria-label="Previous month" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e4ddcd', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8475' }}>
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          <button onClick={() => step(1)} aria-label="Next month" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e4ddcd', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8475' }}>
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#a39d8e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const key = ymd(view.y, view.m, d)
          const evs = byDate.get(key) || []
          const isToday = key === todayKey
          return (
            <div key={i} style={{ minHeight: 52, borderRadius: 9, padding: '5px 6px', background: isToday ? '#fdeed9' : '#fff', border: isToday ? '1px solid #e08a3c' : '1px solid #efe9db' }}>
              <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? '#a86a28' : '#8a8475', textAlign: 'right' }}>{d}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                {evs.slice(0, 2).map((e, j) => (
                  <div key={j} title={e.label} style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.2, padding: '1px 4px', borderRadius: 4, background: TYPE_BG[e.type], color: TYPE_COLOR[e.type], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</div>
                ))}
                {evs.length > 2 && <div style={{ fontSize: 9, fontWeight: 700, color: '#a39d8e', paddingLeft: 2 }}>+{evs.length - 2} more</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        {(['interview', 'start', 'deadline'] as CalEvent['type'][]).map((t) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: TYPE_BG[t], display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8a8475' }}>{TYPE_NAME[t]}</span>
          </div>
        ))}
      </div>
      {monthEventCount === 0 && (
        <p style={{ fontSize: 11, color: '#bcb5a4', marginTop: 10, textAlign: 'center' }}>No scheduled events this month</p>
      )}
    </div>
  )
}
