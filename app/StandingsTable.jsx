'use client'

import { useState } from 'react'
import Link    from 'next/Link'
import image   from 'next/image'



const ZONE_CONFIG = {
 39: [   // Premier League
    { positions: [1, 2, 3, 4],        type: 'cl',   label: 'Champions League' },
    { positions: [5],                  type: 'el',   label: 'Europa League'    },
    { positions: [6],                  type: 'ecl',  label: 'Conference League'},
    { positions: [18, 19, 20],         type: 'rl',   label: 'Relegation'       },
  ],
  140: [  // La Liga
    { positions: [1, 2, 3, 4],        type: 'cl',   label: 'Champions League' },
    { positions: [5, 6],               type: 'el',   label: 'Europa League'    },
    { positions: [7],                  type: 'ecl',  label: 'Conference League'},
    { positions: [18, 19, 20],         type: 'rl',   label: 'Relegation'       },
  ],
  78: [   // Bundesliga (18 teams)
    { positions: [1, 2, 3, 4],        type: 'cl',   label: 'Champions League' },
    { positions: [5, 6],               type: 'el',   label: 'Europa League'    },
    { positions: [7],                  type: 'ecl',  label: 'Conference League'},
    { positions: [16],                 type: 'rlpo', label: 'Relegation playoff'},
    { positions: [17, 18],             type: 'rl',   label: 'Relegation'       },
  ],
  61: [   // Ligue 1
    { positions: [1, 2, 3 ],        type: 'cl',   label: 'Champions League' },
    { positions: [4],              type: 'clq', label: 'Champions league Qualifiers '},
    { positions: [5],                  type: 'el',   label: 'Europa League'    },
    { positions: [6],                  type: 'ecl',  label: 'Conference League'},
    { positions: [16],                 type: 'rlpo', label: 'Relegation Playoff'},
    { positions: [17, 18],         type: 'rl',   label: 'Relegation'       },
  ],
  2: [   // Champions League
    { positions: [1, 2, 3, 4, 5, 6, 7, 8],      type: 'Ro16',   label: 'Round of 16'      },
    { positions: [9, 10, 11, 12, 13, 14, 15, 16,
                 17, 18, 19, 20, 21, 22, 23, 24], type: 'Pl',  label: 'Playoff'          },
    { positions: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], type: 'el',   label: 'Eliminated'       },
  ],


135: 
 [  //  Serie A
    { positions: [1, 2, 3, 4],        type: 'cl',   label: 'Champions League' },
    { positions: [5, 6],               type: 'el',   label: 'Europa League'    },
    { positions: [7],                  type: 'ecl',  label: 'Conference League'},
    { positions: [18, 19, 20],         type: 'rl',   label: 'Relegation'       },
  ],
    3: [   // Europa League
    { positions: [1, 2, 3, 4, 5, 6, 7, 8],      type: 'Ro16',   label: 'Round of 16'      },
    { positions: [9, 10, 11, 12, 13, 14, 15, 16,
                 17, 18, 19, 20, 21, 22, 23, 24], type: 'Pl',  label: 'Playoff'          },
    { positions: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], type: 'el',   label: 'Eliminated'       },
  ],
 
}
const ZONE_STYLES = {
  cl:   { border: '#16a34a', bg: '#f0fdf4', dot: '#16a34a' },
  el:   { border: '#65a30d', bg: '#f7fee7', dot: '#65a30d' },
  ecl:  { border: '#a3e635', bg: '#fefce8', dot: '#a3e635' },
  rlpo: { border: '#d97706', bg: '#fffbeb', dot: '#d97706' },
  rl:   { border: '#dc2626', bg: '#fef2f2', dot: '#dc2626' },
  Ro16: { border: '#16a34a', bg: '#f0fdf4', dot: '#16a34a' },
  Pl: { border: '#65a30d', bg: '#f7fee7', dot: '#65a30d' },
  el:   { border: '#dc2626', bg: '#fef2f2', dot: '#dc2626' },  
}

// ─── Form pill ────────────────────────────────────────────────────────────────

const FORM_STYLES = {
  W: { bg: '#dcfce7', color: '#15803d', label: 'Win'  },
  D: { bg: '#f3f4f6', color: '#6b7280', label: 'Draw' },
  L: { bg: '#fee2e2', color: '#dc2626', label: 'Loss' },
}

function FormPill({ result }) {
  const s = FORM_STYLES[result] ?? FORM_STYLES.D
  return (
    <span
      title={s.label}
      aria-label={s.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        borderRadius: '50%',
        fontSize: '0.6rem',
        fontWeight: 700,
        background: s.bg,
        color: s.color,
      }}
    >
      {result}
    </span>
  )
}

function FormGuide({ form }) {
  if (!form) return <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>–</span>
  return (
    <div style={{ display: 'flex', gap: 3 }} aria-label={`Form: ${form}`}>
      {form.split('').map((r, i) => <FormPill key={i} result={r} />)}
    </div>
  )
}

// ─── Zone legend ──────────────────────────────────────────────────────────────

function ZoneLegend({ competitionId }) {
  const zones = ZONE_CONFIG[competitionId]
  if (!zones) return null

  // De-duplicate by type
  const seen = new Set()
  const unique = zones.filter(z => { if (seen.has(z.type)) return false; seen.add(z.type); return true })

  return (
    <div className="zone-legend">
      {unique.map(z => {
        const s = ZONE_STYLES[z.type]
        return (
          <div key={z.type} className="zone-legend-item">
            <span className="zone-dot" style={{ background: s.dot }} />
            <span className="zone-legend-label">{z.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Zone lookup helper ───────────────────────────────────────────────────────

function getZone(position, competitionId) {
  const zones = ZONE_CONFIG[competitionId]
  if (!zones) return null
  for (const z of zones) {
    if (z.positions.includes(position)) return z.type
  }
  return null
}

// ─── Standings row ────────────────────────────────────────────────────────────

function StandingRow({ row, position, competitionId, isHighlighted }) {
  const zone      = getZone(position, competitionId)
  const zoneStyle = zone ? ZONE_STYLES[zone] : null

  return (
    <tr
      className={`standings-row ${isHighlighted ? 'standings-row--highlighted' : ''}`}
      style={zoneStyle ? { borderLeft: `3px solid ${zoneStyle.border}` } : { borderLeft: '3px solid transparent' }}
    >
      {/* Position */}
      <td className="std-td std-td--pos">
        <span className="std-position">{position}</span>
      </td>

      {/* Team */}
      <td className="std-td std-td--team">
        <Link href={`/teams/${row.team.id}`} className="std-team-link">
          {row.team.logoUrl && (
            <Image
              src={row.team.logoUrl}
              alt=""
              width={18}
              height={18}
              className="std-team-logo"
            />
          )}
          <span className="std-team-name">{row.team.name}</span>
          <span className="std-team-short">{row.team.tla}</span>
        </Link>
      </td>

      {/* Core stats */}
      <td className="std-td std-td--num">{row.played}</td>
      <td className="std-td std-td--num">{row.won}</td>
      <td className="std-td std-td--num">{row.drawn}</td>
      <td className="std-td std-td--num">{row.lost}</td>
      <td className="std-td std-td--num">{row.goalsFor}</td>
      <td className="std-td std-td--num">{row.goalsAgainst}</td>
      <td className="std-td std-td--num std-td--gd">
        <span className={row.goalDifference > 0 ? 'gd--pos' : row.goalDifference < 0 ? 'gd--neg' : ''}>
          {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
        </span>
      </td>

      {/* Points */}
      <td className="std-td std-td--num std-td--pts">
        <strong>{row.points}</strong>
      </td>

      {/* PPG */}
      <td className="std-td std-td--num std-td--ppg">
        {row.ppg ? Number(row.ppg).toFixed(2) : '–'}
      </td>

      {/* Form */}
      <td className="std-td std-td--form">
        <FormGuide form={row.form} />
      </td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {Array}  props.overall         - Overall standings rows
 * @param {Array}  props.home            - Home standings rows
 * @param {Array}  props.away            - Away standings rows
 * @param {number} props.competitionId   - Used for zone colouring
 * @param {number} [props.highlightTeamId] - Optionally highlight a team row
 */
export default function StandingsTable({ overall, home, away, competitionId, highlightTeamId }) {
  const [activeTab, setActiveTab] = useState('overall')

  const tabs = [
    { key: 'overall', label: 'Overall', data: overall },
    { key: 'home',    label: 'Home',    data: home    },
    { key: 'away',    label: 'Away',    data: away    },
  ]

  const activeData = tabs.find(t => t.key === activeTab)?.data ?? overall

  return (
    <div className="standings-wrapper">
      {/* Tabs */}
      <div className="standings-tabs" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`standings-tab ${activeTab === tab.key ? 'standings-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="standings-scroll" role="region" aria-label="League standings">
        <table className="standings-table">
          <thead>
            <tr className="standings-header">
              <th className="std-th std-th--pos" scope="col" title="Position">#</th>
              <th className="std-th std-th--team" scope="col">Club</th>
              <th className="std-th std-th--num" scope="col" title="Matches played">MP</th>
              <th className="std-th std-th--num" scope="col" title="Won">W</th>
              <th className="std-th std-th--num" scope="col" title="Drawn">D</th>
              <th className="std-th std-th--num" scope="col" title="Lost">L</th>
              <th className="std-th std-th--num" scope="col" title="Goals for">GF</th>
              <th className="std-th std-th--num" scope="col" title="Goals against">GA</th>
              <th className="std-th std-th--num" scope="col" title="Goal difference">GD</th>
              <th className="std-th std-th--num std-th--pts" scope="col" title="Points">Pts</th>
              <th className="std-th std-th--num std-th--ppg" scope="col" title="Points per game">PPG</th>
              <th className="std-th std-th--form" scope="col" title="Last 5 matches">Form</th>
            </tr>
          </thead>
          <tbody>
            {activeData.map((row, idx) => (
              <StandingRow
                key={row.teamId}
                row={row}
                position={idx + 1}
                competitionId={competitionId}
                isHighlighted={row.teamId === highlightTeamId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Zone legend */}
      <ZoneLegend competitionId={competitionId} />
    </div>
  )
}


