export const COLUMN_GROUPS = {
  summary: {
    label: 'Summary',
    columns: [
      { key: 'rank',          label: '#',       width: 36,  align: 'center', sortable: false },
      { key: 'player',        label: 'Player',  width: 160, align: 'left',  sticky: true, sortable: true },
      { key: 'team',          label: 'Club',    width: 110, align: 'left',  sortable: true },
      { key: 'position',      label: 'Pos',     width: 44,  align: 'center', sortable: true },
      { key: 'appearances',   label: 'MP',      width: 44,  align: 'center', sortable: true, tooltip: 'Matches played' },
      { key: 'minutesPlayed', label: 'Mins',    width: 56,  align: 'center', sortable: true },
      { key: 'goals',         label: 'Gls',     width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'goalsPer90' },
      { key: 'assists',       label: 'Ast',     width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'assistsPer90' },
      { key: 'xg',            label: 'xG',      width: 52,  align: 'center', sortable: true, heatmap: true, per90Key: 'xgPer90', decimals: 2 },
      { key: 'xa',            label: 'xA',      width: 52,  align: 'center', sortable: true, heatmap: true, per90Key: 'xaPer90', decimals: 2 },
      { key: 'yellowCards',   label: 'YC',      width: 40,  align: 'center', sortable: true },
      { key: 'redCards',      label: 'RC',      width: 40,  align: 'center', sortable: true },
      { key: 'avgRating',     label: 'Rtg',     width: 52,  align: 'center', sortable: true, heatmap: true, decimals: 1 },
    ],
  },
  attacking: {
    label: 'Attacking',
    columns: [
      { key: 'rank',              label: '#',       width: 36,  align: 'center', sortable: false },
      { key: 'player',            label: 'Player',  width: 160, align: 'left',  sticky: true, sortable: true },
      { key: 'team',              label: 'Club',    width: 100, align: 'left',  sortable: true },
      { key: 'minutesPlayed',     label: 'Mins',    width: 56,  align: 'center', sortable: true },
      { key: 'goals',             label: 'Gls',     width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'goalsPer90' },
      { key: 'assists',           label: 'Ast',     width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'assistsPer90' },
      { key: 'shots',             label: 'Sh',      width: 44,  align: 'center', sortable: true, per90Key: 'shotsPer90' },
      { key: 'shotsOnTarget',     label: 'SoT',     width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'sotPer90', tooltip: 'Shots on target' },
      { key: 'xg',                label: 'xG',      width: 52,  align: 'center', sortable: true, heatmap: true, per90Key: 'xgPer90', decimals: 2 },
      { key: 'xa',                label: 'xA',      width: 52,  align: 'center', sortable: true, heatmap: true, per90Key: 'xaPer90', decimals: 2 },
      { key: 'keyPasses',         label: 'KP',      width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'keyPassesPer90', tooltip: 'Key passes' },
      { key: 'bigChancesCreated', label: 'BCC',     width: 44,  align: 'center', sortable: true, tooltip: 'Big chances created' },
      { key: 'bigChancesMissed',  label: 'BCM',     width: 44,  align: 'center', sortable: true, tooltip: 'Big chances missed' },
      { key: 'dribblesPct',       label: 'Dr%',     width: 52,  align: 'center', sortable: true, decimals: 0, suffix: '%', tooltip: 'Dribble success %' },
    ],
  },
  passing: {
    label: 'Passing',
    columns: [
      { key: 'rank',              label: '#',       width: 36,  align: 'center', sortable: false },
      { key: 'player',            label: 'Player',  width: 160, align: 'left',  sticky: true, sortable: true },
      { key: 'team',              label: 'Club',    width: 100, align: 'left',  sortable: true },
      { key: 'minutesPlayed',     label: 'Mins',    width: 56,  align: 'center', sortable: true },
      { key: 'passes',            label: 'Pas',     width: 50,  align: 'center', sortable: true, per90Key: 'passesPer90', tooltip: 'Total passes' },
      { key: 'passAccuracyPct',   label: 'PA%',     width: 52,  align: 'center', sortable: true, heatmap: true, decimals: 0, suffix: '%', tooltip: 'Pass accuracy %' },
      { key: 'passesProgressive', label: 'PrgP',    width: 52,  align: 'center', sortable: true, heatmap: true, per90Key: 'progPassesPer90', tooltip: 'Progressive passes' },
      { key: 'xa',                label: 'xA',      width: 52,  align: 'center', sortable: true, heatmap: true, per90Key: 'xaPer90', decimals: 2 },
      { key: 'keyPasses',         label: 'KP',      width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'keyPassesPer90' },
      { key: 'crosses',           label: 'Crs',     width: 44,  align: 'center', sortable: true, per90Key: 'crossesPer90' },
      { key: 'longBallsAccurate', label: 'LB',      width: 44,  align: 'center', sortable: true, tooltip: 'Accurate long balls' },
    ],
  },
  defending: {
    label: 'Defending',
    columns: [
      { key: 'rank',              label: '#',       width: 36,  align: 'center', sortable: false },
      { key: 'player',            label: 'Player',  width: 160, align: 'left',  sticky: true, sortable: true },
      { key: 'team',              label: 'Club',    width: 100, align: 'left',  sortable: true },
      { key: 'minutesPlayed',     label: 'Mins',    width: 56,  align: 'center', sortable: true },
      { key: 'tackles',           label: 'Tkl',     width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'tacklesPer90' },
      { key: 'tacklesWon',        label: 'TklW',    width: 50,  align: 'center', sortable: true, heatmap: true, per90Key: 'tacklesWonPer90' },
      { key: 'interceptions',     label: 'Int',     width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'intPer90' },
      { key: 'blocks',            label: 'Blk',     width: 44,  align: 'center', sortable: true, per90Key: 'blocksPer90' },
      { key: 'clearances',        label: 'Clr',     width: 44,  align: 'center', sortable: true, per90Key: 'clearancesPer90' },
      { key: 'aerialDuelsWon',    label: 'Aer',     width: 44,  align: 'center', sortable: true, heatmap: true, per90Key: 'aerialPer90', tooltip: 'Aerial duels won' },
      { key: 'foulsCommitted',    label: 'Fls',     width: 44,  align: 'center', sortable: true },
      { key: 'yellowCards',       label: 'YC',      width: 40,  align: 'center', sortable: true },
    ],
  },
  goalkeeping: {
    label: 'Goalkeeping',
    columns: [
      { key: 'rank',          label: '#',       width: 36,  align: 'center', sortable: false },
      { key: 'player',        label: 'Player',  width: 160, align: 'left',  sticky: true, sortable: true },
      { key: 'team',          label: 'Club',    width: 100, align: 'left',  sortable: true },
      { key: 'appearances',   label: 'MP',      width: 44,  align: 'center', sortable: true },
      { key: 'minutesPlayed', label: 'Mins',    width: 56,  align: 'center', sortable: true },
      { key: 'saves',         label: 'Sv',      width: 44,  align: 'center', sortable: true, heatmap: true },
      { key: 'savePct',       label: 'Sv%',     width: 52,  align: 'center', sortable: true, heatmap: true, decimals: 0, suffix: '%' },
      { key: 'cleanSheets',   label: 'CS',      width: 44,  align: 'center', sortable: true, heatmap: true },
      { key: 'goalsConceded', label: 'GA',      width: 44,  align: 'center', sortable: true },
      { key: 'xgFaced',       label: 'xGF',     width: 52,  align: 'center', sortable: true, decimals: 2, tooltip: 'xG faced' },
      { key: 'gkDiff',        label: 'PSxG',    width: 52,  align: 'center', sortable: true, decimals: 2,
        tooltip: 'Goals conceded minus xG faced (lower = better)',
        compute: p => p.goalsConceded != null && p.xgFaced != null
          ? parseFloat((p.goalsConceded - p.xgFaced).toFixed(2))
          : null,
        heatmap: true, invertHeatmap: true,   // lower is better for this metric
      },
    ],
  },
}

const POSITIONS = ['All', 'GK', 'DEF', 'MID', 'FWD']
const MIN_MINUTES_OPTIONS = [0, 90, 450, 900, 1350]

// ─── Heatmap colour interpolation ────────────────────────────────────────────
// Returns a CSS rgba colour ranging from neutral → green for high values.
// invertHeatmap: high value = red (for metrics where lower is better).

function heatmapColor(value, min, max, invert = false) {
  if (max === min) return 'transparent'
  const ratio = (value - min) / (max - min)
  const t = invert ? 1 - ratio : ratio
  // 0 = #f3f4f6 (cool grey), 1 = #bbf7d0 (mint green) / #fecaca (soft red)
  if (!invert) {
    const r = Math.round(243 - t * (243 - 187))
    const g = Math.round(244 - t * (244 - 247))
    const b = Math.round(246 - t * (246 - 208))
    return `rgba(${r},${g},${b},${0.3 + t * 0.6})`
  } else {
    const r = Math.round(243 - t * (243 - 254))
    const g = Math.round(244 - t * (244 - 202))
    const b = Math.round(246 - t * (246 - 202))
    return `rgba(${r},${g},${b},${0.3 + t * 0.6})`
  }
}

// ─── Per-90 computation ───────────────────────────────────────────────────────

function per90(value, minutes) {
  if (!value || !minutes || minutes < 1) return 0
  return (value / minutes) * 90
}

function enrichWithPer90(player) {
  const m = player.minutesPlayed || 0
  return {
    ...player,
    goalsPer90:       per90(player.goals,             m),
    assistsPer90:     per90(player.assists,           m),
    xgPer90:          per90(player.xg,               m),
    xaPer90:          per90(player.xa,               m),
    shotsPer90:       per90(player.shots,             m),
    sotPer90:         per90(player.shotsOnTarget,     m),
    keyPassesPer90:   per90(player.keyPasses,         m),
    passesPer90:      per90(player.passes,            m),
    progPassesPer90:  per90(player.passesProgressive, m),
    crossesPer90:     per90(player.crosses,           m),
    tacklesPer90:     per90(player.tackles,           m),
    tacklesWonPer90:  per90(player.tacklesWon,        m),
    intPer90:         per90(player.interceptions,     m),
    blocksPer90:      per90(player.blocks,            m),
    clearancesPer90:  per90(player.clearances,        m),
    aerialPer90:      per90(player.aerialDuelsWon,   m),
    dribblesPct: player.dribblesAttempted
      ? Math.round((player.dribblesSucceeded / player.dribblesAttempted) * 100)
      : null,
    savePct: player.saves != null && player.goalsConceded != null && (player.saves + player.goalsConceded) > 0
      ? Math.round((player.saves / (player.saves + player.goalsConceded)) * 100)
      : null,
  }
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportToCSV(players, columns) {
  const headers = columns.map(c => c.label).join(',')
  const rows = players.map(p =>
    columns.map(c => {
      const v = c.compute ? c.compute(p) : p[c.key]
      return v ?? ''
    }).join(',')
  )
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'player-stats.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ direction }) {
  if (!direction) return <span style={{ opacity: 0.2, fontSize: '0.6rem' }}>⇅</span>
  return <span style={{ fontSize: '0.6rem', color: 'var(--color-text-info)' }}>{direction === 'desc' ? '↓' : '↑'}</span>
}

// ─── Position badge ───────────────────────────────────────────────────────────

const POS_COLORS = {
  GK:  { bg: '#fef9c3', color: '#854d0e' },
  DEF: { bg: '#dbeafe', color: '#1e40af' },
  MID: { bg: '#dcfce7', color: '#166534' },
  FWD: { bg: '#fee2e2', color: '#991b1b' },
}

function PosBadge({ position }) {
  const style = POS_COLORS[position] ?? { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '0.65rem',
      fontWeight: 600,
      padding: '1px 5px',
      borderRadius: '4px',
      background: style.bg,
      color: style.color,
    }}>
      {position}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StatsTable({
  seasonId,
  competitionId,
  defaultView = 'summary',
  playersData = null,
}) {
  const [players,      setPlayers]    = useState(playersData ?? [])
  const [loading,      setLoading]    = useState(!playersData)
  const [error,        setError]      = useState(null)
  const [view,         setView]       = useState(defaultView)
  const [search,       setSearch]     = useState('')
  const [position,     setPosition]   = useState('All')
  const [per90Mode,    setPer90Mode]  = useState(false)
  const [minMinutes,   setMinMinutes] = useState(0)
  const [sortKey,      setSortKey]    = useState(null)
  const [sortDir,      setSortDir]    = useState('desc')

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (playersData) return
    setLoading(true)

    const params = new URLSearchParams()
    if (seasonId)      params.set('seasonId', seasonId)
    if (competitionId) params.set('competitionId', competitionId)

    fetch(`/api/player-stats?${params}`)
      .then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json() })
      .then(data => { setPlayers(data.players ?? []); setError(null) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [seasonId, competitionId, playersData])

  // ── Column config for current view ────────────────────────────────────────
  const columns = useMemo(() => {
    const group = COLUMN_GROUPS[view] ?? COLUMN_GROUPS.summary
    return group.columns.map(col => ({
      ...col,
      // When per90 mode is on, swap to the per-90 key if available
      activeKey: per90Mode && col.per90Key ? col.per90Key : col.key,
    }))
  }, [view, per90Mode])

  // ── Enrich players with per-90 and computed fields ─────────────────────────
  const enriched = useMemo(() => players.map(enrichWithPer90), [players])

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return enriched.filter(p => {
      if (search    && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (position !== 'All' && p.position !== position) return false
      if (minMinutes > 0 && (p.minutesPlayed ?? 0) < minMinutes) return false
      if (view === 'goalkeeping' && p.position !== 'GK') return false
      return true
    })
  }, [enriched, search, position, minMinutes, view])

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortKey) {
      // Default: sort by the first heatmap column descending
      const firstHeat = columns.find(c => c.heatmap && c.key !== 'rank')
      if (!firstHeat) return filtered
      return [...filtered].sort((a, b) => {
        const va = firstHeat.compute ? firstHeat.compute(a) : a[firstHeat.activeKey]
        const vb = firstHeat.compute ? firstHeat.compute(b) : b[firstHeat.activeKey]
        return (vb ?? -Infinity) - (va ?? -Infinity)
      })
    }
    const col = columns.find(c => c.activeKey === sortKey || c.key === sortKey)
    return [...filtered].sort((a, b) => {
      const va = col?.compute ? col.compute(a) : a[sortKey]
      const vb = col?.compute ? col.compute(b) : b[sortKey]
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb?.localeCompare(va)
      return sortDir === 'asc' ? (va ?? -Infinity) - (vb ?? -Infinity) : (vb ?? -Infinity) - (va ?? -Infinity)
    })
  }, [filtered, sortKey, sortDir, columns])

  // ── Heatmap ranges ────────────────────────────────────────────────────────
  const heatmapRanges = useMemo(() => {
    const ranges = {}
    columns.forEach(col => {
      if (!col.heatmap) return
      const key = col.activeKey
      const vals = sorted
        .map(p => col.compute ? col.compute(p) : p[key])
        .filter(v => v != null && !isNaN(v))
      if (!vals.length) return
      ranges[key] = { min: Math.min(...vals), max: Math.max(...vals) }
    })
    return ranges
  }, [sorted, columns])

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = useCallback((col) => {
    if (!col.sortable) return
    const key = col.activeKey
    setSortDir(prev => (sortKey === key && prev === 'desc') ? 'asc' : 'desc')
    setSortKey(key)
  }, [sortKey])

  // ── Format cell value ─────────────────────────────────────────────────────
  const formatValue = (value, col) => {
    if (value == null) return <span style={{ color: 'var(--color-text-tertiary)' }}>–</span>
    let v = typeof value === 'number'
      ? value.toFixed(col.decimals ?? 0)
      : value
    if (col.suffix) v = `${v}${col.suffix}`
    return v
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="stats-table-wrapper">
      {/* Toolbar */}
      <div className="st-toolbar">
        {/* View switcher */}
        <div className="st-view-tabs" role="tablist" aria-label="Stat category">
          {Object.entries(COLUMN_GROUPS).map(([key, { label }]) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              className={`st-tab ${view === key ? 'st-tab--active' : ''}`}
              onClick={() => { setView(key); setSortKey(null) }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="st-filters">
          <input
            type="search"
            placeholder="Search player…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="st-search"
            aria-label="Search players"
          />

          <select
            value={position}
            onChange={e => setPosition(e.target.value)}
            aria-label="Filter by position"
            className="st-select"
          >
            {POSITIONS.map(p => <option key={p}>{p}</option>)}
          </select>

          <select
            value={minMinutes}
            onChange={e => setMinMinutes(Number(e.target.value))}
            aria-label="Minimum minutes played"
            className="st-select"
          >
            <option value={0}>All mins</option>
            <option value={90}>90+ mins</option>
            <option value={450}>450+ mins</option>
            <option value={900}>900+ mins</option>
            <option value={1350}>1350+ mins</option>
          </select>

          <label className="st-toggle" title="Show stats per 90 minutes">
            <input
              type="checkbox"
              checked={per90Mode}
              onChange={e => setPer90Mode(e.target.checked)}
            />
            <span className="st-toggle-track">
              <span className="st-toggle-thumb" />
            </span>
            <span className="st-toggle-label">Per 90</span>
          </label>

          <button
            className="st-export-btn"
            onClick={() => exportToCSV(sorted, columns)}
            aria-label="Export to CSV"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Status */}
      {error && (
        <div role="alert" className="st-error">
          Failed to load stats: {error}
        </div>
      )}

      {/* Table */}
      <div className="st-scroll-wrapper" role="region" aria-label="Player statistics table">
        <table
          className="st-table"
          aria-busy={loading}
          aria-rowcount={sorted.length + 1}
        >
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    textAlign: col.align,
                    position: col.sticky ? 'sticky' : undefined,
                    left: col.sticky ? 0 : undefined,
                  }}
                  className={`st-th ${col.sticky ? 'st-th--sticky' : ''} ${col.sortable ? 'st-th--sortable' : ''}`}
                  onClick={() => handleSort(col)}
                  title={col.tooltip}
                  scope="col"
                  aria-sort={
                    sortKey === col.activeKey
                      ? (sortDir === 'asc' ? 'ascending' : 'descending')
                      : 'none'
                  }
                >
                  <span className="st-th-inner">
                    {col.label}
                    {col.sortable && <SortIcon direction={sortKey === col.activeKey ? sortDir : null} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="st-skeleton-row" aria-hidden="true">
                {columns.map(col => (
                  <td key={col.key} style={{ textAlign: col.align }}>
                    <span className="st-skeleton" style={{ width: col.key === 'player' ? 120 : 28 }} />
                  </td>
                ))}
              </tr>
            ))}

            {!loading && sorted.map((player, idx) => (
              <tr
                key={player.id}
                className="st-row"
                aria-rowindex={idx + 2}
              >
                {columns.map(col => {
                  if (col.key === 'rank') {
                    return (
                      <td key="rank" className="st-td st-td--rank">
                        {idx + 1}
                      </td>
                    )
                  }

                  if (col.key === 'player') {
                    return (
                      <td key="player" className="st-td st-td--player st-td--sticky">
                        <div className="st-player-cell">
                          {player.photoUrl
                            ? <img src={player.photoUrl} alt="" className="st-player-photo" />
                            : <div className="st-player-initials">{player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                          }
                          <div>
                            <div className="st-player-name">{player.name}</div>
                            {player.nationality && (
                              <div className="st-player-nat">{player.nationality}</div>
                            )}
                          </div>
                        </div>
                      </td>
                    )
                  }

                  if (col.key === 'team') {
                    return (
                      <td key="team" className="st-td" style={{ textAlign: col.align }}>
                        <div className="st-team-cell">
                          {player.teamLogo && <img src={player.teamLogo} alt="" className="st-team-logo" />}
                          <span className="st-team-name">{player.teamShort ?? player.team}</span>
                        </div>
                      </td>
                    )
                  }

                  if (col.key === 'position') {
                    return (
                      <td key="position" className="st-td" style={{ textAlign: col.align }}>
                        <PosBadge position={player.position} />
                      </td>
                    )
                  }

                  const rawVal = col.compute ? col.compute(player) : player[col.activeKey]
                  const range  = heatmapRanges[col.activeKey]
                  const bgColor = col.heatmap && rawVal != null && range
                    ? heatmapColor(rawVal, range.min, range.max, col.invertHeatmap)
                    : 'transparent'

                  return (
                    <td
                      key={col.key}
                      className="st-td st-td--num"
                      style={{
                        textAlign: col.align,
                        background: bgColor,
                      }}
                      title={col.tooltip}
                    >
                      {formatValue(rawVal, col)}
                    </td>
                  )
                })}
              </tr>
            ))}

            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="st-empty">
                  No players match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="st-footer">
        <span>{sorted.length} players</span>
        {per90Mode && <span className="st-per90-note">Stats shown per 90 minutes played</span>}
        {minMinutes > 0 && <span>Min. {minMinutes} mins played</span>}
      </div>
    </div>
  )
}