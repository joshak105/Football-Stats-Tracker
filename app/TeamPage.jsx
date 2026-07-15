/**
 * app/teams/[teamId]/page.jsx
 * ─────────────────────────────────────────────────────────────
 * Team profile page.
 *
 * URL:  /teams/40          → Liverpool FC
 *       /teams/40?season=2 → Specific season
 *
 * Sections:
 *   1. Hero — crest, name, stadium, country, season selector
 *   2. Season stat cards — position, points, W/D/L, xG, clean sheets
 *   3. Two-column layout:
 *        Left  → Form guide + mini fixtures/results
 *        Right → Season goals chart (line, matchweek-by-matchweek)
 *   4. Squad table — all players, sortable by position
 *   5. Head-to-head record sidebar card
 *   6. Season results table
 * ─────────────────────────────────────────────────────────────
 */

import { notFound }         from 'next/navigation'
import Image                from 'next/image'
import Link                 from 'next/link'
import { format }           from 'date-fns'
import { db }               from '@/lib/db'
import FormGuide            from '@/components/FormGuide'
import GoalsChart           from '@/components/GoalsChart'
import SquadTable           from '@/components/SquadTable'
import ResultsList          from '@/components/ResultsList'

export const revalidate = 300

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const team = await getTeam(Number(params.teamId))
  if (!team) return { title: 'Team not found' }
  return {
    title:       `${team.name} — Stats, Squad & Results`,
    description: `${team.name} season stats, squad list, recent results, and fixtures.`,
    openGraph:   { title: team.name, images: team.logoUrl ? [team.logoUrl] : [] },
  }
}

// ── Static params — pre-render the biggest clubs ──────────────────────────────

export async function generateStaticParams() {
  const topTeamIds = [40, 42, 50, 49, 33, 47, 34, 541, 85, 157, 505]
  return topTeamIds.map(id => ({ teamId: String(id) }))
}

// ── Data helpers ──────────────────────────────────────────────────────────────

async function getTeam(id) {
  return db.teams.findUnique({
    where:   { id },
    include: { country: true, venue: true },
  })
}

async function getCurrentSeason(competitionId, seasonParam) {
  if (seasonParam) return db.seasons.findUnique({ where: { id: Number(seasonParam) } })
  return db.seasons.findFirst({
    where:   { competitionId, isCurrent: true },
  })
}

async function getTeamSeasons(teamId) {
  return db.seasonTeams.findMany({
    where:   { teamId },
    include: { season: { include: { competition: true } } },
    orderBy: { season: { yearStart: 'desc' } },
    take:    5,
  })
}

async function getStandingRow(teamId, seasonId) {
  return db.standings.findFirst({
    where:     { teamId, seasonId, groupType: 'overall' },
    include:   { season: { include: { competition: true } } },
  })
}

async function getTeamStats(teamId, seasonId) {
  return db.matchTeamStats.aggregate({
    where:  { teamId, match: { seasonId } },
    _sum:   { shots: true, shotsOnTarget: true, possession: true, foulsCommitted: true, yellowCards: true, redCards: true },
    _avg:   { xg: true, possession: true },
    _count: { id: true },
  })
}

async function getRecentMatches(teamId, seasonId, limit = 10) {
  return db.matches.findMany({
    where: {
      seasonId,
      status: 'finished',
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: 'desc' },
    take:    limit,
  })
}

async function getUpcomingMatches(teamId, seasonId, limit = 5) {
  return db.matches.findMany({
    where: {
      seasonId,
      status:    'scheduled',
      kickoffAt: { gte: new Date() },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: 'asc' },
    take:    limit,
  })
}

async function getSquad(teamId) {
  return db.playerTeams.findMany({
    where:   { teamId, isCurrent: true },
    include: {
      player: {
        include: {
          nationality: true,
          seasonStats: {
            where:   { teamId },
            orderBy: { season: { yearStart: 'desc' } },
            take:    1,
          },
        },
      },
    },
    orderBy: [
      { player: { position: 'asc' } },
      { player: { name: 'asc' } },
    ],
  })
}

async function getGoalsByMatchweek(teamId, seasonId) {
  const matches = await db.matches.findMany({
    where: {
      seasonId,
      status:    'finished',
      matchweek: { not: null },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: { matchweek: true, homeTeamId: true, homeScore: true, awayScore: true },
    orderBy: { matchweek: 'asc' },
  })

  let running = 0
  return matches.map(m => {
    const scored = m.homeTeamId === teamId ? m.homeScore : m.awayScore
    running += scored ?? 0
    return { week: m.matchweek, goals: scored ?? 0, cumulative: running }
  })
}

// ── Stat card component ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={`team-stat-card ${highlight ? 'team-stat-card--hl' : ''}`}>
      <span className="tsc-label">{label}</span>
      <span className="tsc-value">{value ?? '–'}</span>
      {sub && <span className="tsc-sub">{sub}</span>}
    </div>
  )
}

// ── Results row ───────────────────────────────────────────────────────────────

function MatchRow({ match, teamId }) {
  const isHome   = match.homeTeamId === teamId
  const opponent = isHome ? match.awayTeam : match.homeTeam
  const scored   = isHome ? match.homeScore : match.awayScore
  const conceded = isHome ? match.awayScore : match.homeScore
  const result   = scored > conceded ? 'W' : scored === conceded ? 'D' : 'L'
  const RES_STYLE = {
    W: { bg: '#dcfce7', color: '#15803d' },
    D: { bg: '#f3f4f6', color: '#6b7280' },
    L: { bg: '#fee2e2', color: '#dc2626' },
  }
  const s = RES_STYLE[result]

  return (
    <tr className="match-row">
      <td className="match-td match-td--date">
        {format(new Date(match.kickoffAt), 'd MMM')}
      </td>
      <td className="match-td match-td--venue">
        <span className="venue-tag">{isHome ? 'H' : 'A'}</span>
      </td>
      <td className="match-td match-td--opp">
        <Link href={`/teams/${opponent.id}`} className="opp-link">
          {opponent.logoUrl && <Image src={opponent.logoUrl} alt="" width={14} height={14} />}
          {opponent.shortName ?? opponent.name}
        </Link>
      </td>
      <td className="match-td match-td--score">
        <span className="score-pill">{scored}–{conceded}</span>
      </td>
      <td className="match-td match-td--result">
        <span className="result-pill" style={{ background: s.bg, color: s.color }}>{result}</span>
      </td>
    </tr>
  )
}

// ── Clean sheet helper ────────────────────────────────────────────────────────

function countCleanSheets(matches, teamId) {
  return matches.filter(m => {
    const conceded = m.homeTeamId === teamId ? m.awayScore : m.homeScore
    return conceded === 0
  }).length
}

function countRecord(matches, teamId) {
  return matches.reduce(
    (acc, m) => {
      const scored   = m.homeTeamId === teamId ? m.homeScore : m.awayScore
      const conceded = m.homeTeamId === teamId ? m.awayScore : m.homeScore
      if (scored > conceded) acc.w++
      else if (scored === conceded) acc.d++
      else acc.l++
      return acc
    },
    { w: 0, d: 0, l: 0 }
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeamPage({ params, searchParams }) {
  const teamId = Number(params.teamId)

  const [team, teamSeasons] = await Promise.all([
    getTeam(teamId),
    getTeamSeasons(teamId),
  ])

  if (!team) notFound()

  const focusSeasonRow = searchParams.season
    ? teamSeasons.find(ts => ts.seasonId === Number(searchParams.season))
    : teamSeasons[0]

  const seasonId = focusSeasonRow?.seasonId

  const [standing, recentMatches, upcomingMatches, squad, goalsData, teamAggStats] =
    await Promise.all([
      seasonId ? getStandingRow(teamId, seasonId)          : null,
      seasonId ? getRecentMatches(teamId, seasonId)        : [],
      seasonId ? getUpcomingMatches(teamId, seasonId)      : [],
      getSquad(teamId),
      seasonId ? getGoalsByMatchweek(teamId, seasonId)     : [],
      seasonId ? getTeamStats(teamId, seasonId)            : null,
    ])

  const cleanSheets = countCleanSheets(recentMatches, teamId)
  const record      = countRecord(recentMatches, teamId)
  const formString  = standing?.form ?? ''

  // Build goals-by-matchweek for chart
  const chartData = goalsData.map(d => ({ x: d.week, y: d.cumulative }))

  return (
    <div className="team-page">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header className="team-hero">
        <div className="team-hero__crest-wrap">
          {team.logoUrl
            ? <Image src={team.logoUrl} alt={team.name} width={80} height={80} className="team-hero__crest" />
            : <div className="team-hero__initials">{team.tla ?? team.name.slice(0, 3)}</div>
          }
        </div>

        <div className="team-hero__info">
          <div className="team-hero__eyebrow">
            {team.country && (
              <span className="team-hero__country">
                {team.country.flagUrl && <Image src={team.country.flagUrl} alt="" width={16} height={11} />}
                {team.country.name}
              </span>
            )}
            {focusSeasonRow && (
              <Link
                href={`/leagues/${focusSeasonRow.season.competition.externalId}`}
                className="team-hero__league"
              >
                {focusSeasonRow.season.competition.name}
              </Link>
            )}
          </div>

          <h1 className="team-hero__name">{team.name}</h1>

          <div className="team-hero__meta">
            {team.venue && (
              <span className="team-hero__meta-item">
                <i className="ti ti-building-stadium" aria-hidden="true" />
                {team.venue.name}
                {team.venue.capacity && ` · ${team.venue.capacity.toLocaleString()} cap.`}
              </span>
            )}
            {team.foundedYear && (
              <span className="team-hero__meta-item">
                <i className="ti ti-calendar" aria-hidden="true" />
                Est. {team.foundedYear}
              </span>
            )}
          </div>
        </div>

        {/* Season selector */}
        {teamSeasons.length > 1 && (
          <nav className="team-season-nav" aria-label="Season">
            {teamSeasons.map(ts => (
              <Link
                key={ts.id}
                href={`?season=${ts.seasonId}`}
                className={`team-season-tab ${ts.seasonId === seasonId ? 'team-season-tab--active' : ''}`}
              >
                {ts.season.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* ── Season stat cards ────────────────────────────────────── */}
      {standing && (
        <section className="team-stats-row" aria-label="Season summary">
          <StatCard label="Position"    value={`${standing.position}${ordinal(standing.position)}`} highlight />
          <StatCard label="Points"      value={standing.points}    sub={`${standing.ppg} per game`} highlight />
          <StatCard label="Record"      value={`${standing.won}W ${standing.drawn}D ${standing.lost}L`} />
          <StatCard label="Goals for"   value={standing.goalsFor}  sub={`${(standing.goalsFor / Math.max(standing.played, 1)).toFixed(1)} per game`} />
          <StatCard label="Goals against" value={standing.goalsAgainst} sub={`${(standing.goalsAgainst / Math.max(standing.played, 1)).toFixed(1)} per game`} />
          <StatCard label="Clean sheets" value={cleanSheets} />
          {teamAggStats?._avg?.xg != null && (
            <StatCard label="xG per game" value={Number(teamAggStats._avg.xg).toFixed(2)} />
          )}
          {teamAggStats?._avg?.possession != null && (
            <StatCard label="Avg possession" value={`${Math.round(teamAggStats._avg.possession)}%`} />
          )}
        </section>
      )}

      {/* ── Form + goals chart ──────────────────────────────────── */}
      <div className="team-mid-grid">

        {/* Form guide + recent results */}
        <section className="team-section">
          <h2 className="team-section__title">Form</h2>
          {formString && <FormGuide form={formString} large />}

          {recentMatches.length > 0 && (
            <table className="match-table" aria-label="Recent results">
              <tbody>
                {recentMatches.slice(0, 8).map(m => (
                  <MatchRow key={m.id} match={m} teamId={teamId} />
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Goals-by-matchweek chart (client component) */}
        {chartData.length > 0 && (
          <section className="team-section">
            <h2 className="team-section__title">Cumulative goals</h2>
            <p className="team-section__sub">{focusSeasonRow?.season.label} · goals scored by matchweek</p>
            <GoalsChart data={chartData} />
          </section>
        )}

      </div>

      {/* ── Upcoming fixtures ───────────────────────────────────── */}
      {upcomingMatches.length > 0 && (
        <section className="team-section" style={{ marginBottom: '1rem' }}>
          <h2 className="team-section__title">Upcoming fixtures</h2>
          <table className="match-table" aria-label="Upcoming fixtures">
            <tbody>
              {upcomingMatches.map(m => {
                const isHome   = m.homeTeamId === teamId
                const opponent = isHome ? m.awayTeam : m.homeTeam
                return (
                  <tr key={m.id} className="match-row">
                    <td className="match-td match-td--date">{format(new Date(m.kickoffAt), 'EEE d MMM')}</td>
                    <td className="match-td match-td--venue">
                      <span className="venue-tag">{isHome ? 'H' : 'A'}</span>
                    </td>
                    <td className="match-td match-td--opp">
                      <Link href={`/teams/${opponent.id}`} className="opp-link">
                        {opponent.logoUrl && <Image src={opponent.logoUrl} alt="" width={14} height={14} />}
                        {opponent.shortName ?? opponent.name}
                      </Link>
                    </td>
                    <td className="match-td match-td--score" style={{ color: 'var(--ls-text-muted)' }}>
                      {format(new Date(m.kickoffAt), 'HH:mm')}
                    </td>
                    <td className="match-td" />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Squad ──────────────────────────────────────────────── */}
      <section className="team-section">
        <h2 className="team-section__title">Squad</h2>
        <SquadTable squad={squad} seasonId={seasonId} />
      </section>

    </div>
  )
}
