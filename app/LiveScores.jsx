import { useState, useEffect, useCallback, useRef } from 'react'
import { formatDistanceToNow, format, isToday, isTomorrow, isYesterday } from 'date-fns'

// ─── Types (JSDoc for plain JS, use TypeScript interfaces if on TS) ──────────
/**
 * @typedef {Object} Team
 * @property {number}  id
 * @property {string}  name
 * @property {string}  shortName
 * @property {string}  logoUrl
 */

/**
 * @typedef {Object} MatchEvent
 * @property {number}  id
 * @property {'goal'|'own_goal'|'penalty_scored'|'penalty_missed'|'yellow_card'|'red_card'|'substitution_in'} type
 * @property {number}  minute
 * @property {number|null} extraMinute
 * @property {string}  playerName
 * @property {string|null} relatedPlayerName  // assist or player coming on
 * @property {number}  teamId
 */

/**
 * @typedef {Object} Match
 * @property {number}  id
 * @property {'scheduled'|'live'|'half_time'|'finished'|'postponed'|'cancelled'} status
 * @property {string}  kickoffAt           // ISO timestamp
 * @property {number|null} minute          // current match minute, null if not live
 * @property {Team}    homeTeam
 * @property {Team}    awayTeam
 * @property {number|null} homeScore
 * @property {number|null} awayScore
 * @property {number|null} homeScoreHt     // half-time score
 * @property {number|null} awayScoreHt
 * @property {number}  matchweek
 * @property {MatchEvent[]} events
 * @property {string}  competitionName
 * @property {string}  competitionLogo
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_LIVE    = 30_000   // 30s when matches are live
const POLL_INTERVAL_IDLE    = 300_000  // 5min when no live matches
const POLL_INTERVAL_PREMATCH = 60_000  // 1min in the hour before kickoff

const STATUS_CONFIG = {
  scheduled:  { label: 'Upcoming',  color: 'text-muted',  bg: 'bg-muted'     },
  live:       { label: 'Live',      color: 'text-live',   bg: 'bg-live'      },
  half_time:  { label: 'HT',        color: 'text-ht',     bg: 'bg-ht'        },
  finished:   { label: 'FT',        color: 'text-muted',  bg: 'bg-finished'  },
  postponed:  { label: 'PPD',       color: 'text-warn',   bg: 'bg-warn'      },
  cancelled:  { label: 'CANC',      color: 'text-danger', bg: 'bg-danger'    },
}

const EVENT_ICONS = {
  goal:             '⚽',
  own_goal:         '⚽',   // render differently in UI
  penalty_scored:   '⚽',
  penalty_missed:   '✗',
  yellow_card:      '🟨',
  red_card:         '🟥',
  yellow_red_card:  '🟨🟥',
  substitution_in:  '↕',
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function formatKickoff(isoString) {
  const date = new Date(isoString)
  if (isToday(date))     return `Today ${format(date, 'HH:mm')}`
  if (isTomorrow(date))  return `Tomorrow ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`
  return format(date, 'EEE d MMM, HH:mm')
}

function formatMinute(minute, extraMinute) {
  if (!minute) return ''
  return extraMinute ? `${minute}+${extraMinute}'` : `${minute}'`
}

function isMatchSoon(isoString) {
  const diff = new Date(isoString) - Date.now()
  return diff > 0 && diff < 60 * 60 * 1000  // within 1 hour
}

function hasLiveMatches(matches) {
  return matches.some(m => m.status === 'live' || m.status === 'half_time')
}

function getPollInterval(matches) {
  if (hasLiveMatches(matches))                           return POLL_INTERVAL_LIVE
  if (matches.some(m => isMatchSoon(m.kickoffAt)))      return POLL_INTERVAL_PREMATCH
  return POLL_INTERVAL_IDLE
}

// Group matches by competition name
function groupByCompetition(matches) {
  return matches.reduce((acc, match) => {
    const key = match.competitionName
    if (!acc[key]) acc[key] = { logo: match.competitionLogo, matches: [] }
    acc[key].matches.push(match)
    return acc
  }, {})
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status, minute, extraMinute }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled
  const isLive = status === 'live'
  const isHT   = status === 'half_time'

  return (
    <span className={`status-badge status-badge--${status}`}>
      {isLive && <span className="live-dot" aria-hidden="true" />}
      {isLive
        ? formatMinute(minute, extraMinute) || 'Live'
        : isHT
        ? 'HT'
        : cfg.label}
    </span>
  )
}

function TeamRow({ team, score, isWinner, isHome }) {
  return (
    <div className={`team-row ${isWinner ? 'team-row--winner' : ''}`}>
      <div className="team-identity">
        {team.logoUrl
          ? <img src={team.logoUrl} alt="" className="team-logo" width={20} height={20} />
          : <div className="team-logo team-logo--placeholder">{team.shortName?.[0] ?? '?'}</div>
        }
        <span className="team-name">{team.shortName ?? team.name}</span>
      </div>
      <span className={`team-score ${score !== null ? 'team-score--known' : 'team-score--unknown'}`}>
        {score ?? '–'}
      </span>
    </div>
  )
}

function EventTimeline({ events, homeTeamId }) {
  if (!events?.length) return null

  // Separate home and away events
  const home = events.filter(e => e.teamId === homeTeamId)
  const away = events.filter(e => e.teamId !== homeTeamId)

  // Build unified sorted list with side info
  const sorted = [...events]
    .sort((a, b) => a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0))

  return (
    <div className="event-timeline" role="list" aria-label="Match events">
      {sorted.map(event => {
        const isHome  = event.teamId === homeTeamId
        const icon    = EVENT_ICONS[event.type] ?? '•'
        const isOG    = event.type === 'own_goal'
        const isMiss  = event.type === 'penalty_missed'

        return (
          <div
            key={event.id}
            className={`event event--${isHome ? 'home' : 'away'} ${isMiss ? 'event--miss' : ''}`}
            role="listitem"
          >
            {isHome && (
              <span className="event-player event-player--home">
                {event.playerName}
                {isOG && <span className="event-tag">OG</span>}
                {event.relatedPlayerName && event.type !== 'substitution_in' && (
                  <span className="event-assist">({event.relatedPlayerName})</span>
                )}
                {event.type === 'substitution_in' && event.relatedPlayerName && (
                  <span className="event-sub">↓ {event.relatedPlayerName}</span>
                )}
              </span>
            )}
            <span className="event-icon-block">
              <span className="event-icon" aria-label={event.type.replace(/_/g, ' ')}>{icon}</span>
              <span className="event-minute">{formatMinute(event.minute, event.extraMinute)}</span>
            </span>
            {!isHome && (
              <span className="event-player event-player--away">
                {event.playerName}
                {isOG && <span className="event-tag">OG</span>}
                {event.relatedPlayerName && event.type !== 'substitution_in' && (
                  <span className="event-assist">({event.relatedPlayerName})</span>
                )}
                {event.type === 'substitution_in' && event.relatedPlayerName && (
                  <span className="event-sub">↓ {event.relatedPlayerName}</span>
                )}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MatchCard({ match, expanded, onToggle }) {
  const { homeTeam, awayTeam, homeScore, awayScore, status, minute, extraMinute, events } = match
  const isLive     = status === 'live' || status === 'half_time'
  const isFinished = status === 'finished'
  const hasScore   = homeScore !== null && awayScore !== null

  const homeWins = hasScore && homeScore > awayScore
  const awayWins = hasScore && awayScore > homeScore

  return (
    <article
      className={`match-card ${isLive ? 'match-card--live' : ''}`}
      aria-label={`${homeTeam.name} vs ${awayTeam.name}`}
    >
      <button
        className="match-card__main"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`events-${match.id}`}
      >
        <div className="match-teams">
          <TeamRow team={homeTeam} score={homeScore} isWinner={homeWins} isHome />
          <TeamRow team={awayTeam} score={awayScore} isWinner={awayWins} isHome={false} />
        </div>

        <div className="match-meta">
          <StatusBadge status={status} minute={minute} extraMinute={extraMinute} />
          {status === 'scheduled' && (
            <span className="match-kickoff">{formatKickoff(match.kickoffAt)}</span>
          )}
          {hasScore && match.homeScoreHt !== null && (
            <span className="match-ht-score">
              HT {match.homeScoreHt}–{match.awayScoreHt}
            </span>
          )}
          {(events?.length > 0) && (
            <span className="match-expand-hint" aria-hidden="true">
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>
      </button>

      {expanded && events?.length > 0 && (
        <div id={`events-${match.id}`} className="match-card__events">
          <EventTimeline events={events} homeTeamId={homeTeam.id} />
        </div>
      )}
    </article>
  )
}

function CompetitionGroup({ name, logo, matches, expandedIds, onToggle }) {
  return (
    <section className="competition-group">
      <header className="competition-header">
        {logo && <img src={logo} alt="" className="competition-logo" width={16} height={16} />}
        <h2 className="competition-name">{name}</h2>
      </header>
      <div className="match-list">
        {matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            expanded={expandedIds.has(match.id)}
            onToggle={() => onToggle(match.id)}
          />
        ))}
      </div>
    </section>
  )
}

function SkeletonCard() {
  return (
    <div className="match-card match-card--skeleton" aria-hidden="true">
      <div className="skeleton-row" />
      <div className="skeleton-row skeleton-row--short" />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

/**
 * LiveScores
 *
 * @param {Object}  props
 * @param {number}  [props.competitionId]  - Filter by a specific competition
 * @param {boolean} [props.liveOnly=false] - Show only live matches
 * @param {string}  [props.date]           - ISO date string to show matches for (default: today)
 */
export default function LiveScores({ competitionId, liveOnly = false, date }) {
  const [matches,      setMatches]     = useState([])
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState(null)
  const [lastUpdated,  setLastUpdated] = useState(null)
  const [expandedIds,  setExpandedIds] = useState(new Set())

  const timerRef     = useRef(null)
  const abortRef     = useRef(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchScores = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const params = new URLSearchParams()
      if (competitionId) params.set('competitionId', competitionId)
      if (liveOnly)      params.set('liveOnly', 'true')
      if (date)          params.set('date', date)

      const res = await fetch(`/api/live-scores?${params}`, {
        signal: abortRef.current.signal,
        headers: { 'Accept': 'application/json' },
      })

      if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)

      const data = await res.json()
      setMatches(data.matches ?? [])
      setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : new Date())
      setError(null)

    } catch (err) {
      if (err.name === 'AbortError') return  // Intentional cancellation — ignore
      console.error('[LiveScores] Fetch failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [competitionId, liveOnly, date])

  // ── Polling loop ─────────────────────────────────────────────────────────
  const scheduleNextPoll = useCallback((currentMatches) => {
    clearTimeout(timerRef.current)
    const interval = getPollInterval(currentMatches)
    timerRef.current = setTimeout(async () => {
      await fetchScores()
    }, interval)
  }, [fetchScores])

  useEffect(() => {
    fetchScores()
    return () => {
      clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [fetchScores])

  // Re-schedule polling whenever matches update
  useEffect(() => {
    if (!loading) scheduleNextPoll(matches)
  }, [matches, loading, scheduleNextPoll])

  // ── Expand/collapse match events ─────────────────────────────────────────
  const toggleExpand = useCallback((matchId) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(matchId) ? next.delete(matchId) : next.add(matchId)
      return next
    })
  }, [])

  // ── Derived state ────────────────────────────────────────────────────────
  const grouped    = groupByCompetition(matches)
  const liveCount  = matches.filter(m => m.status === 'live' || m.status === 'half_time').length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="live-scores">
      {/* Header */}
      <div className="live-scores__header">
        <div className="live-scores__title-row">
          <h1 className="live-scores__title">
            {liveOnly ? 'Live now' : 'Scores'}
          </h1>
          {liveCount > 0 && (
            <span className="live-count-badge">
              <span className="live-dot live-dot--sm" aria-hidden="true" />
              {liveCount} live
            </span>
          )}
        </div>

        <div className="live-scores__controls">
          <button
            className="refresh-btn"
            onClick={fetchScores}
            disabled={loading}
            aria-label="Refresh scores"
          >
            {loading ? 'Updating…' : 'Refresh'}
          </button>
          {lastUpdated && (
            <span className="last-updated" aria-live="polite">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="error-banner" role="alert">
          <p>Could not load scores: {error}</p>
          <button onClick={fetchScores}>Try again</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && matches.length === 0 && (
        <div aria-busy="true" aria-label="Loading matches">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && matches.length === 0 && (
        <div className="empty-state">
          <p>No matches found{date ? ` for ${format(new Date(date), 'EEEE d MMMM')}` : ' today'}.</p>
        </div>
      )}

      {/* Match groups */}
      {Object.entries(grouped).map(([name, { logo, matches: groupMatches }]) => (
        <CompetitionGroup
          key={name}
          name={name}
          logo={logo}
          matches={groupMatches}
          expandedIds={expandedIds}
          onToggle={toggleExpand}
        />
      ))}
    </div>
  )
}