/**
 * app/compare/page.jsx
 * ─────────────────────────────────────────────────────────────
 * Head-to-head team comparison tool.
 *
 * URL:  /compare?teams=40,42       → Liverpool vs Arsenal
 *       /compare?teams=40,42,50    → Three-way (max 3)
 *       /compare                   → Team picker UI
 *
 * Sections:
 *   1. Team selector (server-renders available teams, client picks)
 *   2. Hero matchup bar — crests, names, record this season
 *   3. Head-to-head history — all-time and last 5 meetings
 *   4. This season — side-by-side stat cards
 *   5. Stat comparison bars — visual % diff on key metrics
 *   6. Last 5 meetings results table
 *   7. Top performers from each side
 * ─────────────────────────────────────────────────────────────
 */

import { redirect }   from 'next/navigation'
import Image          from 'next/image'
import Link           from 'next/link'
import { format }     from 'date-fns'
import { db }         from '@/lib/db'
import H2HChart       from '@/components/H2HChart'
import StatBars       from '@/components/StatBars'

export const revalidate = 3600   // 1 hour — H2H data rarely changes

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ searchParams }) {
  const ids = parseTeamIds(searchParams.teams)
  if (ids.length < 2) return { title: 'Compare teams' }
  const teams = await getTeams(ids)
  const names = teams.map(t => t.name).join(' vs ')
  return {
    title:       `${names} — Head to Head`,
    description: `Head-to-head stats, history, and season comparison for ${names}.`,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTeamIds(raw) {
  if (!raw) return []
  return raw.split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n))
    .slice(0, 3)   // max 3 teams
}

async function getTeams(ids) {
  return db.teams.findMany({
    where:   { id: { in: ids } },
    include: { country: true },
  })
}

async function getH2HMatches(teamId1, teamId2, limit = 10) {
  return db.matches.findMany({
    where: {
      status: 'finished',
      OR: [
        { homeTeamId: teamId1, awayTeamId: teamId2 },
        { homeTeamId: teamId2, awayTeamId: teamId1 },
      ],
    },
    include: { homeTeam: true, awayTeam: true, season: { include: { competition: true } } },
    orderBy: { kickoffAt: 'desc' },
    take:    limit,
  })
}

async function getCurrentSeasonStats(teamId) {
  // Get the most recent season this team played in
  const seasonTeam = await db.seasonTeams.findFirst({
    where:   { teamId, season: { isCurrent: true } },
    include: { season: true },
    orderBy: { season: { yearStart: 'desc' } },
  })
  if (!seasonTeam) return null

  const [standing, teamStats] = await Promise.all([
    db.standings.findFirst({
      where: { teamId, seasonId: seasonTeam.seasonId, groupType: 'overall' },
    }),
    db.matchTeamStats.aggregate({
      where:  { teamId, match: { seasonId: seasonTeam.seasonId } },
      _avg:   { possessionPct: true, xg: true, passAccuracyPct: true, shotsOnTarget: true },
      _sum:   { shots: true, shotsOnTarget: true, yellowCards: true, redCards: true, corners: true },
      _count: { id: true },
    }),
  ])

  return { standing, teamStats, season: seasonTeam.season }
}

async function getTopScorers(teamId, seasonId, limit = 5) {
  return db.playerSeasonStats.findMany({
    where:   { teamId, seasonId },
    include: { player: true },
    orderBy: [{ goals: 'desc' }, { assists: 'desc' }],
    take:    limit,
  })
}

async function getAllTeamsForPicker() {
  return db.teams.findMany({
    where:   { seasonTeams: { some: { season: { isCurrent: true } } } },
    include: { seasonTeams: { where: { season: { isCurrent: true } }, include: { season: { include: { competition: true } } } } },
    orderBy: { name: 'asc' },
    take:    200,
  })
}

// ── H2H record calculator ─────────────────────────────────────────────────────

function calcH2HRecord(matches, teamId) {
  return matches.reduce(
    (acc, m) => {
      const isHome = m.homeTeamId === teamId
      const scored   = isHome ? m.homeScore : m.awayScore
      const conceded = isHome ? m.awayScore : m.homeScore
      if (scored > conceded) acc.w++
      else if (scored === conceded) acc.d++
      else acc.l++
      acc.gf += scored ?? 0
      acc.ga += conceded ?? 0
      return acc
    },
    { w: 0, d: 0, l: 0, gf: 0, ga: 0 }
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MatchRow({ match, teamId }) {
  const isHome   = match.homeTeamId === teamId
  const opponent = isHome ? match.awayTeam : match.homeTeam
  const scored   = isHome ? match.homeScore : match.awayScore
  const conceded = isHome ? match.awayScore : match.homeScore
  const result   = scored > conceded ? 'W' : scored === conceded ? 'D' : 'L'
  const COLORS = { W: { bg: '#dcfce7', c: '#15803d' }, D: { bg: '#f3f4f6', c: '#6b7280' }, L: { bg: '#fee2e2', c: '#dc2626' } }
  const s = COLORS[result]

  return (
    <tr className="h2h-match-row">
      <td className="h2h-td h2h-td--date">{format(new Date(match.kickoffAt), 'dd MMM yyyy')}</td>
      <td className="h2h-td h2h-td--comp">{match.season.competition.shortName ?? match.season.competition.name}</td>
      <td className="h2h-td h2h-td--teams">
        <span className={isHome ? 'h2h-team--self' : ''}>{match.homeTeam.tla}</span>
        <span className="h2h-score">{match.homeScore}–{match.awayScore}</span>
        <span className={!isHome ? 'h2h-team--self' : ''}>{match.awayTeam.tla}</span>
      </td>
      <td className="h2h-td h2h-td--result">
        <span className="h2h-result-pill" style={{ background: s.bg, color: s.c }}>{result}</span>
      </td>
    </tr>
  )
}

function RecordBadge({ w, d, l }) {
  return (
    <div className="h2h-record">
      <span className="h2h-record-w">{w}W</span>
      <span className="h2h-record-d">{d}D</span>
      <span className="h2h-record-l">{l}L</span>
    </div>
  )
}

function StatCompRow({ label, val1, val2, higherIsBetter = true, format: fmt = (v) => v ?? '–' }) {
  const n1 = parseFloat(val1) || 0
  const n2 = parseFloat(val2) || 0
  const total = n1 + n2 || 1
  const pct1 = Math.round((n1 / total) * 100)
  const pct2 = 100 - pct1
  const t1Better = higherIsBetter ? n1 > n2 : n1 < n2
  const t2Better = higherIsBetter ? n2 > n1 : n2 < n1

  return (
    <div className="stat-comp-row">
      <span className={`stat-comp-val stat-comp-val--left ${t1Better ? 'stat-comp-val--winner' : ''}`}>{fmt(val1)}</span>
      <div className="stat-comp-bar-wrap">
        <div className="stat-comp-bar stat-comp-bar--left"  style={{ width: `${pct1}%` }} />
        <span className="stat-comp-label">{label}</span>
        <div className="stat-comp-bar stat-comp-bar--right" style={{ width: `${pct2}%` }} />
      </div>
      <span className={`stat-comp-val stat-comp-val--right ${t2Better ? 'stat-comp-val--winner' : ''}`}>{fmt(val2)}</span>
    </div>
  )
}

// ── Team picker (shown when no teams selected) ────────────────────────────────

function TeamPicker({ teams }) {
  return (
    <div className="team-picker">
      <h1 className="team-picker__title">Compare teams</h1>
      <p className="team-picker__sub">Select two teams to see their head-to-head stats and history</p>
      <div className="team-picker__grid">
        {teams.map(t => (
          <Link key={t.id} href={`/compare?teams=${t.id}`} className="team-picker__card">
            {t.logoUrl && <Image src={t.logoUrl} alt="" width={32} height={32} />}
            <span>{t.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ComparePage({ searchParams }) {
  const teamIds = parseTeamIds(searchParams.teams)

  // No teams selected → show picker
  if (teamIds.length === 0) {
    const allTeams = await getAllTeamsForPicker()
    return <TeamPicker teams={allTeams} />
  }

  // One team → redirect back (needs at least 2)
  if (teamIds.length === 1) {
    const allTeams = await getAllTeamsForPicker()
    return (
      <div className="compare-page">
        <p className="compare-hint">Select a second team to compare with.</p>
        <TeamPicker teams={allTeams} />
      </div>
    )
  }

  // Fetch both teams + all comparison data in parallel
  const [teams, h2hMatches] = await Promise.all([
    getTeams(teamIds),
    getH2HMatches(teamIds[0], teamIds[1]),
  ])

  if (teams.length < 2) redirect('/compare')

  const [team1, team2] = teams
  const [stats1, stats2] = await Promise.all([
    getCurrentSeasonStats(team1.id),
    getCurrentSeasonStats(team2.id),
  ])

  // Top scorers for each team
  const [scorers1, scorers2] = await Promise.all([
    stats1 ? getTopScorers(team1.id, stats1.season.id) : [],
    stats2 ? getTopScorers(team2.id, stats2.season.id) : [],
  ])

  const record1 = calcH2HRecord(h2hMatches, team1.id)
  const record2 = calcH2HRecord(h2hMatches, team2.id)
  const draws   = h2hMatches.filter(m => m.homeScore === m.awayScore).length

  const s1 = stats1?.standing
  const s2 = stats2?.standing
  const t1 = stats1?.teamStats
  const t2 = stats2?.teamStats

  // Build chart data for wins distribution
  const chartData = {
    team1: { name: team1.name, wins: record1.w, draws, losses: record1.l },
    team2: { name: team2.name, wins: record2.w, draws, losses: record2.l },
  }

  return (
    <div className="compare-page">

      {/* Team switcher row */}
      <div className="compare-teams-nav">
        <Link href="/compare" className="compare-back">← Change teams</Link>
        <span className="compare-teams-label">{team1.name} vs {team2.name}</span>
      </div>

      {/* Hero matchup */}
      <section className="compare-hero">
        <div className="compare-hero__team">
          {team1.logoUrl && <Image src={team1.logoUrl} alt={team1.name} width={72} height={72} className="compare-hero__crest" />}
          <h1 className="compare-hero__name">{team1.name}</h1>
          {s1 && <p className="compare-hero__standing">{ordinal(s1.position)} · {s1.points} pts</p>}
          <RecordBadge w={record1.w} d={record1.d} l={record1.l} />
        </div>

        <div className="compare-hero__vs">
          <span className="compare-hero__vs-text">vs</span>
          <span className="compare-hero__meetings">{h2hMatches.length} meetings</span>
        </div>

        <div className="compare-hero__team compare-hero__team--right">
          {team2.logoUrl && <Image src={team2.logoUrl} alt={team2.name} width={72} height={72} className="compare-hero__crest" />}
          <h1 className="compare-hero__name">{team2.name}</h1>
          {s2 && <p className="compare-hero__standing">{ordinal(s2.position)} · {s2.points} pts</p>}
          <RecordBadge w={record2.w} d={record2.d} l={record2.l} />
        </div>
      </section>

      {/* H2H history chart */}
      <section className="compare-section">
        <h2 className="compare-section__title">All-time record</h2>
        <H2HChart data={chartData} />
      </section>

      {/* Season stat comparison bars */}
      {s1 && s2 && (
        <section className="compare-section">
          <h2 className="compare-section__title">This season</h2>
          <div className="stat-comp-header">
            <div className="stat-comp-header__team">
              {team1.logoUrl && <Image src={team1.logoUrl} alt="" width={18} height={18} />}
              {team1.shortName ?? team1.name}
            </div>
            <div />
            <div className="stat-comp-header__team stat-comp-header__team--right">
              {team2.shortName ?? team2.name}
              {team2.logoUrl && <Image src={team2.logoUrl} alt="" width={18} height={18} />}
            </div>
          </div>

          <StatCompRow label="Points"         val1={s1.points}       val2={s2.points} />
          <StatCompRow label="Goals scored"   val1={s1.goalsFor}     val2={s2.goalsFor} />
          <StatCompRow label="Goals conceded" val1={s1.goalsAgainst} val2={s2.goalsAgainst} higherIsBetter={false} />
          <StatCompRow label="Goal diff"      val1={s1.goalDifference} val2={s2.goalDifference} />
          <StatCompRow label="Wins"           val1={s1.won}          val2={s2.won} />
          {t1?._avg && t2?._avg && <>
            <StatCompRow label="Avg possession" val1={t1._avg.possessionPct} val2={t2._avg.possessionPct} format={(v) => v ? `${Number(v).toFixed(0)}%` : '–'} />
            <StatCompRow label="Avg xG"         val1={t1._avg.xg}            val2={t2._avg.xg}            format={(v) => v ? Number(v).toFixed(2) : '–'} />
            <StatCompRow label="Pass accuracy"  val1={t1._avg.passAccuracyPct} val2={t2._avg.passAccuracyPct} format={(v) => v ? `${Number(v).toFixed(0)}%` : '–'} />
          </>}
        </section>
      )}

      {/* Last 5 meetings */}
      {h2hMatches.length > 0 && (
        <section className="compare-section">
          <h2 className="compare-section__title">Recent meetings</h2>
          <div className="h2h-matches-scroll">
            <table className="h2h-matches-table">
              <thead>
                <tr>
                  <th className="h2h-th">Date</th>
                  <th className="h2h-th">Competition</th>
                  <th className="h2h-th h2h-th--center">Result</th>
                  <th className="h2h-th h2h-th--center">{team1.tla}</th>
                </tr>
              </thead>
              <tbody>
                {h2hMatches.slice(0, 8).map(m => (
                  <MatchRow key={m.id} match={m} teamId={team1.id} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Top performers */}
      {(scorers1.length > 0 || scorers2.length > 0) && (
        <section className="compare-section">
          <h2 className="compare-section__title">Top performers this season</h2>
          <div className="top-performers-grid">
            {[{ team: team1, scorers: scorers1 }, { team: team2, scorers: scorers2 }].map(({ team, scorers }) => (
              <div key={team.id} className="top-performers-col">
                <div className="top-performers-col__header">
                  {team.logoUrl && <Image src={team.logoUrl} alt="" width={16} height={16} />}
                  {team.shortName ?? team.name}
                </div>
                {scorers.map((s, i) => (
                  <Link key={s.playerId} href={`/players/${s.playerId}`} className="performer-row">
                    <span className="performer-rank">{i + 1}</span>
                    <span className="performer-name">{s.player.name}</span>
                    <span className="performer-stat">{s.goals}G {s.assists}A</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}

function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100
  return `${n}${s[(v-20)%10]||s[v]||s[0]}`
}
