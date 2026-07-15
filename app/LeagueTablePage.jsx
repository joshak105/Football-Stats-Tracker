import { notFound }            from 'next/navigation'
import Link                    from 'next/link'
import { format }              from 'date-fns'
import { db }                  from '@/lib/db'
import StandingsTable          from '@/components/StandingsTable'
import TopScorers              from '@/components/TopScorers'
import UpcomingFixtures        from '@/components/UpcomingFixtures'
import CompetitionHeader       from '@/components/CompetitionHeader'

// ── Revalidate every 5 minutes (ISR) ──────────────────────────────────────────
// Standings change at most once per matchday, so 5min is plenty.
// For live match windows you'd drop this to 60.
export const revalidate = 300

// ── Dynamic metadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params, searchParams }) {
  const competition = await getCompetition(Number(params.competitionId))
  if (!competition) return { title: 'League not found' }

  const season = await getCurrentSeason(competition.id, searchParams.season)

  return {
    title: `${competition.name} Table ${season?.label ?? ''}`,
    description: `Full ${competition.name} standings, form guide, top scorers and fixtures for the ${season?.label ?? 'current'} season.`,
    openGraph: {
      title:       `${competition.name} Table`,
      description: `Live standings for ${competition.name} ${season?.label ?? ''}`,
      images:      competition.logoUrl ? [competition.logoUrl] : [],
    },
  }
}

// ── Static params (pre-render the top competitions at build time) ──────────────

export async function generateStaticParams() {
  // Pre-render the most popular leagues so they're ready immediately
  const topCompetitions = [39, 140, 78, 135, 61, 2, 3]  // PL, La Liga, Bundesliga, Serie A, Ligue 1, UCL, Europa
  return topCompetitions.map(id => ({ competitionId: String(id) }))
}

// ── Data fetching helpers ──────────────────────────────────────────────────────

async function getCompetition(id) {
  return db.competitions.findUnique({
    where:   { externalId: id },
    include: { country: true },
  })
}

async function getCurrentSeason(competitionId, seasonParam) {
  if (seasonParam) {
    return db.seasons.findUnique({ where: { id: Number(seasonParam) } })
  }
  return db.seasons.findFirst({
    where:   { competitionId, isCurrent: true },
  })
}

async function getStandings(seasonId, groupType = 'overall') {
  return db.standings.findMany({
    where:   { seasonId, groupType },
    include: { team: true },
    orderBy: { position: 'asc' },
  })
}

async function getTopScorers(seasonId, limit = 10) {
  return db.playerSeasonStats.findMany({
    where:   { seasonId, goals: { gt: 0 } },
    include: { player: true, team: true },
    orderBy: [{ goals: 'desc' }, { xg: 'desc' }],
    take:    limit,
  })
}

async function getUpcomingFixtures(competitionId, seasonId, limit = 6) {
  return db.matches.findMany({
    where: {
      seasonId,
      status:    'scheduled',
      kickoffAt: { gte: new Date() },
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: { kickoffAt: 'asc' },
    take:    limit,
  })
}

async function getSeasons(competitionId) {
  return db.seasons.findMany({
    where:   { competitionId },
    orderBy: { yearStart: 'desc' },
    take:    5,
  })
}

// ── Page component ────────────────────────────────────────────────────────────

export default async function LeagueTablePage({ params, searchParams }) {
  const competitionId = Number(params.competitionId)

  // Fetch competition and guard against invalid IDs
  const competition = await getCompetition(competitionId)
  if (!competition) notFound()

  // Fetch all data in parallel — never waterfall database calls
  const [season, seasons] = await Promise.all([
    getCurrentSeason(competition.id, searchParams.season),
    getSeasons(competition.id),
  ])

  if (!season) notFound()

  const [standings, awayStandings, homeStandings, topScorers, fixtures] = await Promise.all([
    getStandings(season.id, 'overall'),
    getStandings(season.id, 'away'),
    getStandings(season.id, 'home'),
    getTopScorers(season.id),
    getUpcomingFixtures(competition.id, season.id),
  ])

  return (
    <div className="league-page">

      {/* ── Competition header ─────────────────────────────────────────── */}
      <CompetitionHeader
        competition={competition}
        season={season}
        seasons={seasons}
        currentSeasonId={season.id}
      />

      {/* ── Main layout: table + sidebar ──────────────────────────────── */}
      <div className="league-layout">

        {/* Left: standings table */}
        <main className="league-main">
          <StandingsTable
            overall={standings}
            home={homeStandings}
            away={awayStandings}
            competitionId={competitionId}
          />
        </main>

        {/* Right: sidebar */}
        <aside className="league-sidebar">
          <TopScorers players={topScorers} competitionId={competitionId} />
          <UpcomingFixtures fixtures={fixtures} />
        </aside>
      </div>

    </div>
  )
}
