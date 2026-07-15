/**
 * components/H2HChart.jsx
 * ─────────────────────────────────────────────────────────────
 * Horizontal stacked bar showing wins/draws/losses split
 * between two teams. Pure SVG — no chart library needed.
 * ─────────────────────────────────────────────────────────────
 */

'use client'

/**
 * @param {{ data: { team1: { name, wins, draws, losses }, team2: { name, wins, draws, losses } } }} props
 */
export default function H2HChart({ data }) {
  const { team1, team2 } = data
  const total = team1.wins + team2.wins + (team1.draws || 0)
  if (!total) return <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No matches played</p>

  const pct = (n) => Math.round((n / total) * 100)
  const p1   = pct(team1.wins)
  const pd   = pct(team1.draws)
  const p2   = 100 - p1 - pd

  // Bar segment widths as percentages
  const segments = [
    { pct: p1,  color: '#2a78d6', label: `${team1.name} wins`, value: team1.wins },
    { pct: pd,  color: '#888780', label: 'Draws',              value: team1.draws },
    { pct: p2,  color: '#d85a30', label: `${team2.name} wins`, value: team2.wins  },
  ].filter(s => s.pct > 0)

  return (
    <div className="h2h-chart" role="img" aria-label={`Head to head: ${team1.name} ${team1.wins} wins, ${team1.draws} draws, ${team2.name} ${team2.wins} wins`}>
      {/* Stacked bar */}
      <div className="h2h-bar">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="h2h-bar__seg"
            style={{ width: `${seg.pct}%`, background: seg.color }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="h2h-bar-labels">
        <div className="h2h-bar-label h2h-bar-label--left">
          <span className="h2h-bar-label__count" style={{ color: '#2a78d6' }}>{team1.wins}</span>
          <span className="h2h-bar-label__text">{team1.name} wins</span>
        </div>
        <div className="h2h-bar-label h2h-bar-label--center">
          <span className="h2h-bar-label__count" style={{ color: '#888780' }}>{team1.draws}</span>
          <span className="h2h-bar-label__text">Draws</span>
        </div>
        <div className="h2h-bar-label h2h-bar-label--right">
          <span className="h2h-bar-label__count" style={{ color: '#d85a30' }}>{team2.wins}</span>
          <span className="h2h-bar-label__text">{team2.name} wins</span>
        </div>
      </div>

      {/* Summary line */}
      <p className="h2h-chart__summary">
        {total} meetings total · {team1.wins + team2.wins + team1.draws} decisive
      </p>
    </div>
  )
}


/* ─────────────────────────────────────────────────────────────
   COMPARE PAGE CSS
   Add to app/globals.css
   ───────────────────────────────────────────────────────────── */

/*

.compare-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  color: #111827;
}

── Nav ──────────────────────────────────────────────────────────

.compare-teams-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.25rem;
}

.compare-back {
  font-size: 0.78rem;
  color: #2563eb;
  text-decoration: none;
}

.compare-back:hover { text-decoration: underline; }

.compare-teams-label {
  font-size: 0.78rem;
  color: #6b7280;
  margin-left: auto;
}

── Hero matchup ──────────────────────────────────────────────────

.compare-hero {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.25rem;
}

.compare-hero__team {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.compare-hero__team--right {
  align-items: flex-end;
  text-align: right;
}

.compare-hero__crest { object-fit: contain; }

.compare-hero__name {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #111827;
  margin: 0;
  line-height: 1.2;
}

.compare-hero__standing {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.compare-hero__vs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.compare-hero__vs-text {
  font-size: 1rem;
  font-weight: 700;
  color: #9ca3af;
}

.compare-hero__meetings {
  font-size: 0.68rem;
  color: #9ca3af;
  white-space: nowrap;
}

.h2h-record {
  display: flex;
  gap: 4px;
}

.h2h-record-w { font-size: 0.72rem; font-weight: 700; color: #15803d; }
.h2h-record-d { font-size: 0.72rem; font-weight: 700; color: #6b7280; }
.h2h-record-l { font-size: 0.72rem; font-weight: 700; color: #dc2626; }

── Section ───────────────────────────────────────────────────────

.compare-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

.compare-section__title {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #6b7280;
  margin: 0 0 1rem;
}

── H2H chart ─────────────────────────────────────────────────────

.h2h-chart { padding: 0.25rem 0; }

.h2h-bar {
  display: flex;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  gap: 2px;
  margin-bottom: 10px;
}

.h2h-bar__seg {
  transition: width 0.5s ease;
  flex-shrink: 0;
}

.h2h-bar__seg:first-child { border-radius: 6px 0 0 6px; }
.h2h-bar__seg:last-child  { border-radius: 0 6px 6px 0; }
.h2h-bar__seg:only-child  { border-radius: 6px; }

.h2h-bar-labels {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  margin-bottom: 8px;
}

.h2h-bar-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.h2h-bar-label--center { align-items: center; }
.h2h-bar-label--right  { align-items: flex-end; }

.h2h-bar-label__count {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.h2h-bar-label__text {
  font-size: 0.7rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.h2h-chart__summary {
  font-size: 0.72rem;
  color: #9ca3af;
  margin: 0;
}

── Stat comparison bars ──────────────────────────────────────────

.stat-comp-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.stat-comp-header__team {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.stat-comp-header__team--right {
  justify-content: flex-end;
}

.stat-comp-row {
  display: grid;
  grid-template-columns: 60px 1fr 60px;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid #f9fafb;
}

.stat-comp-row:last-child { border-bottom: none; }

.stat-comp-val {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  font-variant-numeric: tabular-nums;
}

.stat-comp-val--left  { text-align: right; }
.stat-comp-val--right { text-align: left;  }

.stat-comp-val--winner {
  font-weight: 700;
  color: #111827;
}

.stat-comp-bar-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 20px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  gap: 0;
}

.stat-comp-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.62rem;
  color: #6b7280;
  white-space: nowrap;
  z-index: 1;
  background: rgba(255,255,255,0.85);
  padding: 0 4px;
  border-radius: 2px;
}

.stat-comp-bar--left {
  height: 100%;
  background: #2a78d6;
  flex-shrink: 0;
  transition: width 0.4s ease;
}

.stat-comp-bar--right {
  height: 100%;
  background: #d85a30;
  flex-shrink: 0;
  margin-left: auto;
  transition: width 0.4s ease;
}

── H2H match table ───────────────────────────────────────────────

.h2h-matches-scroll { overflow-x: auto; }

.h2h-matches-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.h2h-th {
  padding: 6px 8px;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
  white-space: nowrap;
}

.h2h-th--center { text-align: center; }

.h2h-match-row {
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.1s;
}

.h2h-match-row:hover { background: #f9fafb; }
.h2h-match-row:last-child { border-bottom: none; }

.h2h-td { padding: 7px 8px; color: #374151; white-space: nowrap; }
.h2h-td--date { color: #9ca3af; font-size: 0.72rem; }
.h2h-td--comp { font-size: 0.72rem; color: #6b7280; }

.h2h-td--teams {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 500;
}

.h2h-score {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #111827;
  min-width: 32px;
  text-align: center;
}

.h2h-team--self { color: #2563eb; }

.h2h-td--result { text-align: center; }

.h2h-result-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.62rem;
  font-weight: 700;
}

── Top performers ────────────────────────────────────────────────

.top-performers-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.top-performers-col__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #374151;
  padding-bottom: 6px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2px;
}

.performer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid #f9fafb;
}

.performer-row:hover .performer-name { color: #2563eb; }
.performer-row:last-child { border-bottom: none; }

.performer-rank { font-size: 0.68rem; color: #9ca3af; width: 14px; flex-shrink: 0; }

.performer-name {
  flex: 1;
  font-size: 0.78rem;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.performer-stat {
  font-size: 0.72rem;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

── Team picker ───────────────────────────────────────────────────

.team-picker { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
.team-picker__title { font-size: 1.25rem; font-weight: 700; margin: 0 0 6px; color: #111827; }
.team-picker__sub   { font-size: 0.85rem; color: #6b7280; margin: 0 0 1.5rem; }

.team-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.team-picker__card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-decoration: none;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 500;
  transition: border-color 0.12s, background 0.12s;
}

.team-picker__card:hover { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; }

── Dark mode ─────────────────────────────────────────────────────

@media (prefers-color-scheme: dark) {
  .compare-page { color: #f9fafb; }
  .compare-hero { border-bottom-color: #374151; }
  .compare-hero__name { color: #f9fafb; }
  .compare-section { background: #1f2937; border-color: #374151; }
  .stat-comp-row { border-bottom-color: #1f2937; }
  .stat-comp-label { background: rgba(31,41,55,0.85); color: #9ca3af; }
  .stat-comp-bar-wrap { background: #374151; }
  .stat-comp-val { color: #d1d5db; }
  .stat-comp-val--winner { color: #f9fafb; }
  .stat-comp-header__team { color: #d1d5db; }
  .h2h-th { background: #111827; border-bottom-color: #374151; }
  .h2h-match-row { border-bottom-color: #1f2937; }
  .h2h-match-row:hover { background: #111827; }
  .h2h-score { color: #f9fafb; }
  .performer-name { color: #f9fafb; }
  .performer-row { border-bottom-color: #1f2937; }
  .top-performers-col__header { border-bottom-color: #374151; color: #d1d5db; }
  .team-picker__title { color: #f9fafb; }
  .team-picker__card { background: #1f2937; border-color: #374151; color: #d1d5db; }
  .team-picker__card:hover { border-color: #3b82f6; background: #1e3a5f; color: #93c5fd; }
  .h2h-bar-label__text { color: #9ca3af; }
  .h2h-chart__summary { color: #6b7280; }
  .compare-teams-nav { border-bottom-color: #374151; }
  .compare-section__title { color: #9ca3af; }
}

*/