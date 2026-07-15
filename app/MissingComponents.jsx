/**
 * components/PositionBadge.jsx
 * Coloured pill showing a player's position (GK / DEF / MID / FWD).
 * Used on the player profile hero and squad table.
 */
export default function PositionBadge({ position }) {
  const MAP = {
    goalkeeper: { label: 'GK',  bg: '#fef9c3', color: '#854d0e' },
    defender:   { label: 'DEF', bg: '#dbeafe', color: '#1e40af' },
    midfielder: { label: 'MID', bg: '#dcfce7', color: '#166534' },
    forward:    { label: 'FWD', bg: '#fee2e2', color: '#991b1b' },
  }
  const style = MAP[position] ?? { label: position?.toUpperCase().slice(0, 3) ?? '–', bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span
      className="pos-badge"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  )
}


/**
 * components/ResultsList.jsx
 * Simple list of recent match results for a team.
 * Used on the team page when a dedicated results section is needed.
 * (The team page MatchRow renders inline; this is a standalone wrapper.)
 */
'use client'

import Link   from 'next/link'
import Image  from 'next/image'
import { format } from 'date-fns'

export default function ResultsList({ matches = [], teamId }) {
  if (!matches.length) {
    return <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>No results yet.</p>
  }

  const COLORS = {
    W: { bg: '#dcfce7', color: '#15803d' },
    D: { bg: '#f3f4f6', color: '#6b7280' },
    L: { bg: '#fee2e2', color: '#dc2626' },
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {matches.map(m => {
        const isHome   = m.homeTeamId === teamId
        const opponent = isHome ? m.awayTeam : m.homeTeam
        const scored   = isHome ? m.homeScore : m.awayScore
        const conceded = isHome ? m.awayScore : m.homeScore
        const result   = scored > conceded ? 'W' : scored === conceded ? 'D' : 'L'
        const s        = COLORS[result]

        return (
          <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: '0.7rem', color: '#9ca3af', width: 48, flexShrink: 0 }}>
              {format(new Date(m.kickoffAt), 'd MMM')}
            </span>
            <span style={{ fontSize: '0.68rem', background: '#f3f4f6', color: '#6b7280', padding: '1px 5px', borderRadius: 3 }}>
              {isHome ? 'H' : 'A'}
            </span>
            <Link href={`/teams/${opponent.id}`} style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, textDecoration: 'none', fontSize: '0.78rem', fontWeight: 500, color: '#111827' }}>
              {opponent.logoUrl && <Image src={opponent.logoUrl} alt="" width={14} height={14} />}
              {opponent.shortName ?? opponent.name}
            </Link>
            <span style={{ fontWeight: 600, fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums', color: '#111827' }}>
              {scored}–{conceded}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', fontSize: '0.6rem', fontWeight: 700, background: s.bg, color: s.color }}>
              {result}
            </span>
          </li>
        )
      })}
    </ul>
  )
}


/**
 * components/StatBars.jsx
 * Side-by-side stat comparison bars used on the compare page.
 * (Defined inline in ComparePage.jsx as StatCompRow —
 *  this standalone file re-exports it for use elsewhere.)
 */
export default function StatBars({ stats = [], team1Name, team2Name }) {
  return (
    <div className="stat-bars">
      {stats.map(({ label, val1, val2, higherIsBetter = true, format: fmt = v => v ?? '–' }) => {
        const n1    = parseFloat(val1) || 0
        const n2    = parseFloat(val2) || 0
        const total = n1 + n2 || 1
        const pct1  = Math.round((n1 / total) * 100)
        const pct2  = 100 - pct1
        const t1Win = higherIsBetter ? n1 > n2 : n1 < n2
        const t2Win = higherIsBetter ? n2 > n1 : n2 < n1

        return (
          <div key={label} className="stat-comp-row">
            <span className={`stat-comp-val stat-comp-val--left  ${t1Win ? 'stat-comp-val--winner' : ''}`}>{fmt(val1)}</span>
            <div className="stat-comp-bar-wrap">
              <div className="stat-comp-bar--left"  style={{ height: '100%', width: `${pct1}%`, background: '#2a78d6', flexShrink: 0 }} />
              <span className="stat-comp-label">{label}</span>
              <div className="stat-comp-bar--right" style={{ height: '100%', width: `${pct2}%`, background: '#d85a30', flexShrink: 0, marginLeft: 'auto' }} />
            </div>
            <span className={`stat-comp-val stat-comp-val--right ${t2Win ? 'stat-comp-val--winner' : ''}`}>{fmt(val2)}</span>
          </div>
        )
      })}
    </div>
  )
}