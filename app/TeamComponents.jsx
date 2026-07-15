'use client'

import { useEffect, useRef } from 'react'

/**
 * @param {{ data: Array<{x: number, y: number}> }} props
 *   x = matchweek number, y = cumulative goals at that point
 */
export default function GoalsChart({ data }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !data.length) return

    import('chart.js/auto').then(({ Chart }) => {
      // Destroy existing chart on re-render
      if (chartRef.current) chartRef.current.destroy()

      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const textMuted  = isDark ? '#9ca3af' : '#9ca3af'
      const gridColor  = isDark ? '#2c2c2a' : '#e1e0d9'
      const lineColor  = '#16a34a'
      const areaColor  = 'rgba(22,163,74,0.08)'

      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels:   data.map(d => `MW ${d.x}`),
          datasets: [{
            label:           'Cumulative goals',
            data:            data.map(d => d.y),
            borderColor:     lineColor,
            backgroundColor: areaColor,
            borderWidth:     2,
            pointRadius:     3,
            pointHoverRadius: 5,
            pointBackgroundColor: lineColor,
            pointBorderColor:    isDark ? '#1f2937' : '#fff',
            pointBorderWidth:    2,
            fill:            true,
            tension:         0.3,
          }],
        },
        options: {
          responsive:          true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.parsed.y} goals`,
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color:      textMuted,
                font:       { size: 11 },
                autoSkip:   true,
                maxTicksLimit: 10,
              },
              grid: { display: false },
              border: { color: gridColor },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color:     textMuted,
                font:      { size: 11 },
                stepSize:  5,
                precision: 0,
              },
              grid:   { color: gridColor, lineWidth: 1 },
              border: { display: false },
            },
          },
        },
      })
    })

    return () => { chartRef.current?.destroy() }
  }, [data])

  return (
    <div style={{ position: 'relative', width: '100%', height: 200 }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Cumulative goals by matchweek. Total: ${data.at(-1)?.y ?? 0} goals over ${data.length} matchweeks.`}
      >
        {data.at(-1)?.y ?? 0} goals over {data.length} matchweeks.
      </canvas>
    </div>
  )
}


/**
 * components/SquadTable.jsx
 * ─────────────────────────────────────────────────────────────
 * Squad list with position grouping, current season stats,
 * and sortable columns.
 * ─────────────────────────────────────────────────────────────
 */

'use client'

import { useState, useMemo } from 'react'
import Link                  from 'next/link'
import Image                 from 'next/image'

const POS_ORDER   = { goalkeeper: 0, defender: 1, midfielder: 2, forward: 3 }
const POS_LABELS  = { goalkeeper: 'Goalkeepers', defender: 'Defenders', midfielder: 'Midfielders', forward: 'Forwards' }
const POS_BADGES  = { goalkeeper: { bg: '#fef9c3', color: '#854d0e', label: 'GK'  },
                      defender:   { bg: '#dbeafe', color: '#1e40af', label: 'DEF' },
                      midfielder: { bg: '#dcfce7', color: '#166534', label: 'MID' },
                      forward:    { bg: '#fee2e2', color: '#991b1b', label: 'FWD' } }

/**
 * @param {{ squad: PlayerTeam[], seasonId: number }} props
 */
export default function SquadTable({ squad, seasonId }) {
  const [sortKey,  setSortKey]  = useState('name')
  const [sortDir,  setSortDir]  = useState('asc')
  const [viewMode, setViewMode] = useState('grouped') // 'grouped' | 'flat'

  function handleSort(key) {
    setSortDir(prev => sortKey === key && prev === 'desc' ? 'asc' : 'desc')
    setSortKey(key)
    setViewMode('flat')
  }

  // Flatten squad entries with their current season stats
  const rows = useMemo(() => squad.map(pt => {
    const stats = pt.player.seasonStats?.[0]
    return {
      id:            pt.player.id,
      name:          pt.player.name,
      position:      pt.player.position,
      nationality:   pt.player.nationality?.name,
      flagUrl:       pt.player.nationality?.flagUrl,
      photoUrl:      pt.player.photoUrl,
      shirtNumber:   pt.shirtNumber,
      age:           pt.player.dateOfBirth
                       ? new Date().getFullYear() - new Date(pt.player.dateOfBirth).getFullYear()
                       : null,
      appearances:   stats?.appearances   ?? null,
      goals:         stats?.goals         ?? null,
      assists:       stats?.assists       ?? null,
      minutesPlayed: stats?.minutesPlayed ?? null,
      avgRating:     stats?.avgRating     ? Number(stats.avgRating).toFixed(1) : null,
    }
  }), [squad])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = a[sortKey] ?? (typeof b[sortKey] === 'number' ? -Infinity : '')
      const vb = b[sortKey] ?? (typeof a[sortKey] === 'number' ? -Infinity : '')
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [rows, sortKey, sortDir])

  // Group by position for grouped view
  const grouped = useMemo(() => {
    const byPos = {}
    const posOrder = [...rows].sort((a, b) => (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9))
    posOrder.forEach(r => {
      const p = r.position ?? 'unknown'
      if (!byPos[p]) byPos[p] = []
      byPos[p].push(r)
    })
    return byPos
  }, [rows])

  function SortIcon({ col }) {
    if (sortKey !== col) return <span style={{ opacity: 0.2, fontSize: 10 }}>⇅</span>
    return <span style={{ fontSize: 10, color: '#2563eb' }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  function PlayerRow({ row }) {
    const badge = POS_BADGES[row.position] ?? { bg: '#f3f4f6', color: '#6b7280', label: '–' }
    return (
      <tr className="squad-row">
        <td className="squad-td squad-td--num" style={{ color: 'var(--squad-muted)', width: 28 }}>
          {row.shirtNumber ?? '–'}
        </td>
        <td className="squad-td squad-td--player">
          <Link href={`/players/${row.id}`} className="squad-player-link">
            {row.photoUrl
              ? <img src={row.photoUrl} alt="" className="squad-photo" />
              : <div className="squad-initials">{row.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
            }
            <span className="squad-name">{row.name}</span>
          </Link>
        </td>
        <td className="squad-td">
          <span className="squad-pos-badge" style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        </td>
        <td className="squad-td squad-td--num">{row.age ?? '–'}</td>
        <td className="squad-td squad-td--flag">
          {row.flagUrl && <img src={row.flagUrl} alt={row.nationality ?? ''} width={16} height={11} />}
        </td>
        <td className="squad-td squad-td--num">{row.appearances ?? '–'}</td>
        <td className="squad-td squad-td--num squad-td--hl">{row.goals ?? '–'}</td>
        <td className="squad-td squad-td--num squad-td--hl">{row.assists ?? '–'}</td>
        <td className="squad-td squad-td--num">{row.minutesPlayed?.toLocaleString() ?? '–'}</td>
        <td className="squad-td squad-td--num">
          {row.avgRating
            ? <span style={{ color: Number(row.avgRating) >= 7.5 ? '#15803d' : 'inherit', fontWeight: Number(row.avgRating) >= 7.5 ? 600 : 400 }}>
                {row.avgRating}
              </span>
            : '–'}
        </td>
      </tr>
    )
  }

  const thProps = (key) => ({
    className: `squad-th squad-th--num ${sortKey === key ? 'squad-th--active' : ''}`,
    onClick:   () => handleSort(key),
    style:     { cursor: 'pointer' },
  })

  const thead = (
    <thead>
      <tr>
        <th className="squad-th" style={{ width: 28 }}>#</th>
        <th className="squad-th squad-th--player" onClick={() => handleSort('name')} style={{ cursor:'pointer' }}>
          Player <SortIcon col="name" />
        </th>
        <th className="squad-th">Pos</th>
        <th {...thProps('age')}>Age <SortIcon col="age" /></th>
        <th className="squad-th">Nat</th>
        <th {...thProps('appearances')}>MP <SortIcon col="appearances" /></th>
        <th {...thProps('goals')}>Gls <SortIcon col="goals" /></th>
        <th {...thProps('assists')}>Ast <SortIcon col="assists" /></th>
        <th {...thProps('minutesPlayed')}>Mins <SortIcon col="minutesPlayed" /></th>
        <th {...thProps('avgRating')}>Rtg <SortIcon col="avgRating" /></th>
      </tr>
    </thead>
  )

  return (
    <div className="squad-wrapper">
      <div className="squad-controls">
        <button
          className={`squad-view-btn ${viewMode === 'grouped' ? 'squad-view-btn--active' : ''}`}
          onClick={() => setViewMode('grouped')}
        >
          By position
        </button>
        <button
          className={`squad-view-btn ${viewMode === 'flat' ? 'squad-view-btn--active' : ''}`}
          onClick={() => setViewMode('flat')}
        >
          All players
        </button>
        <span className="squad-count">{rows.length} players</span>
      </div>

      <div className="squad-scroll">
        {viewMode === 'flat' ? (
          <table className="squad-table">
            {thead}
            <tbody>{sorted.map(r => <PlayerRow key={r.id} row={r} />)}</tbody>
          </table>
        ) : (
          Object.entries(grouped).map(([pos, players]) => (
            <div key={pos} className="squad-group">
              <div className="squad-group__label">{POS_LABELS[pos] ?? pos}</div>
              <table className="squad-table">
                {thead}
                <tbody>{players.map(r => <PlayerRow key={r.id} row={r} />)}</tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


/**
 * components/FormGuide.jsx
 * Reusable form pill row — used on both team page and standings.
 */

export function FormGuide({ form, large = false }) {
  const COLORS = {
    W: { bg: '#dcfce7', color: '#15803d' },
    D: { bg: '#f3f4f6', color: '#6b7280' },
    L: { bg: '#fee2e2', color: '#dc2626' },
  }
  const size = large ? 28 : 20
  const fontSize = large ? '0.75rem' : '0.6rem'

  return (
    <div style={{ display: 'flex', gap: large ? 5 : 3, marginBottom: large ? '1rem' : 0 }}>
      {form.split('').map((r, i) => {
        const s = COLORS[r] ?? COLORS.D
        return (
          <span
            key={i}
            title={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
            aria-label={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: size, height: size, borderRadius: '50%',
              fontSize, fontWeight: 700,
              background: s.bg, color: s.color,
            }}
          >
            {r}
          </span>
        )
      })}
    </div>
  )
}
