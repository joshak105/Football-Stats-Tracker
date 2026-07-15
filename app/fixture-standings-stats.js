/**
 * scripts/ingest/fixtures.js
 * ─────────────────────────────────────────────────────────────
 * Ingests all fixtures (past and upcoming) for tracked competitions,
 * including match events (goals, cards, subs), lineups, and
 * team-level match statistics.
 *
 * For finished matches we also ingest full match stats.
 * For upcoming matches we just store the fixture shell.
 * ─────────────────────────────────────────────────────────────
 */

import { apiFetch, apiFetchAll }                              from './apiClient.js'
import { log, upsertMatch, requireTeamId, requireSeasonId,
         mapMatchStatus, mapEventType, safeFloat, safeInt,
         processInBatches }                                   from './utils.js'
import { db }                                                 from '../../lib/db.js'

export async function ingestFixtures(tracked) {
  log.info('Ingesting fixtures')

  for (const { externalId: leagueId, season } of tracked) {
    const rows     = await apiFetchAll('/fixtures', { league: leagueId, season })
    const seasonId = await requireSeasonId(leagueId, season)

    log.info(`  League ${leagueId}: ${rows.length} fixtures`)

    await processInBatches(rows, 50, async (batch) => {
      for (const row of batch) {
        await ingestOneFixture(row, seasonId)
      }
    })
  }

  log.info('Fixtures ingestion complete')
}

async function ingestOneFixture(row, seasonId) {
  const fix    = row.fixture
  const teams  = row.teams
  const goals  = row.goals
  const score  = row.score
  const status = mapMatchStatus(fix.status.short)

  // Look up our internal team IDs
  const homeTeamId = await requireTeamId(teams.home.id)
  const awayTeamId = await requireTeamId(teams.away.id)

  // Look up venue if present
  let venueId = null
  if (fix.venue?.id) {
    const venue = await db.venues.findUnique({ where: { externalId: fix.venue.id }, select: { id: true } })
    venueId = venue?.id ?? null
  }

  // Upsert the match
  const matchId = await upsertMatch({
    externalId:    fix.id,
    seasonId,
    homeTeamId,
    awayTeamId,
    venueId,
    kickoffAt:     new Date(fix.date),
    status,
    matchweek:     safeInt(row.league?.round?.match(/\d+/)?.[0]),
    homeScore:     goals.home,
    awayScore:     goals.away,
    homeScoreHt:   score.halftime.home,
    awayScoreHt:   score.halftime.away,
    homeScoreEt:   score.extratime.home,
    awayScoreEt:   score.extratime.away,
    homeScorePen:  score.penalty.home,
    awayScorePen:  score.penalty.away,
    referee:       fix.referee,
    minute:        fix.status.elapsed,
    rawApiPayload: row,
  })

  // Only ingest detailed data for finished matches
  if (status !== 'finished') return

  // Fetch full fixture details (events, lineups, stats) in one call
  const details = await apiFetch('/fixtures', { id: fix.id })
  const detail  = details[0]
  if (!detail) return

  await Promise.all([
    ingestMatchEvents(matchId, detail.events ?? [], homeTeamId, awayTeamId),
    ingestMatchStats(matchId, detail.statistics ?? [], homeTeamId, awayTeamId),
    ingestLineups(matchId, detail.lineups ?? [], homeTeamId, awayTeamId),
  ])
}

// ── Match events (goals, cards, subs) ────────────────────────────────────────

async function ingestMatchEvents(matchId, events, homeTeamId, awayTeamId) {
  // Delete and re-insert — events can be corrected by the API
  await db.matchEvents.deleteMany({ where: { matchId } })

  for (const e of events) {
    const apiTeamId = e.team.id
    const teamId    = apiTeamId === homeTeamId ? homeTeamId : awayTeamId

    // Resolve player IDs from our DB
    const player = e.player?.id
      ? await db.players.findUnique({ where: { externalId: e.player.id }, select: { id: true } })
      : null
    const related = e.assist?.id
      ? await db.players.findUnique({ where: { externalId: e.assist.id }, select: { id: true } })
      : null

    await db.matchEvents.create({
      data: {
        matchId,
        teamId,
        playerId:        player?.id ?? null,
        relatedPlayerId: related?.id ?? null,
        eventType:       mapEventType(e.type, e.detail),
        minute:          e.time.elapsed,
        extraMinute:     e.time.extra,
        detail:          e.detail,
        comment:         e.comments,
      },
    })
  }
}

// ── Team match stats ──────────────────────────────────────────────────────────

async function ingestMatchStats(matchId, statistics, homeTeamId, awayTeamId) {
  for (const teamStats of statistics) {
    const apiTeamId = teamStats.team.id
    const teamId    = apiTeamId === homeTeamId ? homeTeamId : awayTeamId
    const s         = Object.fromEntries(
      (teamStats.statistics ?? []).map(({ type, value }) => [type, value])
    )

    await db.matchTeamStats.upsert({
      where:  { matchId_teamId: { matchId, teamId } },
      update: buildTeamStatsPayload(s),
      create: { matchId, teamId, ...buildTeamStatsPayload(s) },
    })
  }
}

function buildTeamStatsPayload(s) {
  return {
    possessionPct:       safeFloat(s['Ball Possession']?.replace('%', '')),
    passes:              safeInt(s['Total passes']),
    passesAccurate:      safeInt(s['Passes accurate']),
    shots:               safeInt(s['Total Shots']),
    shotsOnTarget:       safeInt(s['Shots on Goal']),
    shotsOffTarget:      safeInt(s['Shots off Goal']),
    shotsBlocked:        safeInt(s['Blocked Shots']),
    xg:                  safeFloat(s['expected_goals']),
    corners:             safeInt(s['Corner Kicks']),
    foulsCommitted:      safeInt(s['Fouls']),
    offsides:            safeInt(s['Offsides']),
    yellowCards:         safeInt(s['Yellow Cards']),
    redCards:            safeInt(s['Red Cards']),
    saves:               safeInt(s['Goalkeeper Saves']),
    tackles:             safeInt(s['Total Tackles']),
    interceptions:       safeInt(s['Interceptions']),
    blocks:              safeInt(s['Blocks']),
  }
}

// ── Lineups ───────────────────────────────────────────────────────────────────

async function ingestLineups(matchId, lineups, homeTeamId, awayTeamId) {
  await db.matchLineups.deleteMany({ where: { matchId } })

  for (const lineup of lineups) {
    const apiTeamId = lineup.team.id
    const teamId    = apiTeamId === homeTeamId ? homeTeamId : awayTeamId

    const allPlayers = [
      ...(lineup.startXI ?? []).map(p => ({ ...p.player, isStarter: true  })),
      ...(lineup.substitutes ?? []).map(p => ({ ...p.player, isStarter: false })),
    ]

    for (const p of allPlayers) {
      const player = p.id
        ? await db.players.findUnique({ where: { externalId: p.id }, select: { id: true } })
        : null
      if (!player) continue

      await db.matchLineups.create({
        data: {
          matchId,
          teamId,
          playerId:     player.id,
          shirtNumber:  p.number,
          isStarter:    p.isStarter,
          gridPosition: p.pos,
        },
      })
    }
  }
}


/**
 * scripts/ingest/standings.js
 * ─────────────────────────────────────────────────────────────
 * Ingests current league standings (overall, home, away).
 * Should run after fixtures so standings are always consistent
 * with match results in the database.
 * ─────────────────────────────────────────────────────────────
 */

import { apiFetch }                        from './apiClient.js'
import { log, requireSeasonId, requireTeamId } from './utils.js'
import { db }                              from '../../lib/db.js'

export async function ingestStandings(tracked) {
  log.info('Ingesting standings')

  for (const { externalId: leagueId, season } of tracked) {
    const rows     = await apiFetch('/standings', { league: leagueId, season })
    const seasonId = await requireSeasonId(leagueId, season)

    for (const row of rows) {
      for (const standingsGroup of row.league?.standings ?? []) {
        for (const entry of standingsGroup) {
          const teamId = await requireTeamId(entry.team.id)

          // Map group type from form strings available
          // API-Football provides overall / home / away in separate sub-arrays
          // The index matches: [0] = overall, [1] = home, [2] = away
          // But it may vary — the entry always has 'all', 'home', 'away' sub-objects

          for (const [groupType, stats] of [
            ['overall', entry.all],
            ['home',    entry.home],
            ['away',    entry.away],
          ]) {
            await db.standings.upsert({
              where: { seasonId_teamId_groupType: { seasonId, teamId, groupType } },
              update: {
                position:     entry.rank,
                played:       stats.played,
                won:          stats.win,
                drawn:        stats.draw,
                lost:         stats.lose,
                goalsFor:     stats.goals.for,
                goalsAgainst: stats.goals.against,
                points:       entry.points,
                form:         groupType === 'overall' ? (entry.form ?? null) : null,
                updatedAt:    new Date(),
              },
              create: {
                seasonId,
                teamId,
                groupType,
                position:     entry.rank,
                played:       stats.played,
                won:          stats.win,
                drawn:        stats.draw,
                lost:         stats.lose,
                goalsFor:     stats.goals.for,
                goalsAgainst: stats.goals.against,
                points:       entry.points,
                form:         groupType === 'overall' ? (entry.form ?? null) : null,
              },
            })
          }
        }
      }
    }

    log.info(`  ✓ League ${leagueId} standings`)
  }

  log.info('Standings ingestion complete')
}


/**
 * scripts/ingest/playerStats.js
 * ─────────────────────────────────────────────────────────────
 * Ingests player season statistics for all tracked competitions.
 *
 * API-Football returns per-player per-team per-season stats.
 * We map these into both:
 *   1. player_match_stats  — per-match granular stats
 *   2. player_season_stats — pre-aggregated season totals
 *
 * The season totals are stored denormalised for fast leaderboard
 * queries (avoids expensive SUM aggregations on every page load).
 * ─────────────────────────────────────────────────────────────
 */

import { apiFetchAll }                                           from './apiClient.js'
import { log, requireSeasonId, requireTeamId, safeInt, safeFloat,
         processInBatches }                                      from './utils.js'
import { db }                                                    from '../../lib/db.js'

export async function ingestPlayerStats(tracked) {
  log.info('Ingesting player stats')

  for (const { externalId: leagueId, season } of tracked) {
    const rows     = await apiFetchAll('/players', { league: leagueId, season })
    const seasonId = await requireSeasonId(leagueId, season)

    log.info(`  League ${leagueId}: ${rows.length} player-season records`)

    await processInBatches(rows, 100, async (batch) => {
      for (const row of batch) {
        await ingestOnePlayerSeason(row, seasonId)
      }
    })
  }

  log.info('Player stats ingestion complete')
}

async function ingestOnePlayerSeason(row, seasonId) {
  const p     = row.player
  const stats = row.statistics?.[0]
  if (!stats) return

  const player = await db.players.findUnique({
    where:  { externalId: p.id },
    select: { id: true },
  })
  if (!player) return  // Player not ingested yet — skip

  let teamId
  try {
    teamId = await requireTeamId(stats.team.id)
  } catch {
    return  // Team not tracked — skip
  }

  const g = stats.games
  const s = stats.shots
  const go = stats.goals
  const ps = stats.passes
  const tk = stats.tackles
  const d  = stats.duels
  const dr = stats.dribbles
  const fo = stats.fouls
  const c  = stats.cards
  const gk = stats.goalkeeper

  await db.playerSeasonStats.upsert({
    where: { playerId_seasonId_teamId: { playerId: player.id, seasonId, teamId } },
    update: {
      appearances:       safeInt(g.appearences),   // note: API typo is intentional
      starts:            safeInt(g.lineups),
      minutesPlayed:     safeInt(g.minutes),
      goals:             safeInt(go.total)    ?? 0,
      assists:           safeInt(go.assists)  ?? 0,
      shots:             safeInt(s.total)     ?? 0,
      shotsOnTarget:     safeInt(s.on)        ?? 0,
      xg:                safeFloat(go.expected) ?? 0,
      keyPasses:         safeInt(ps.key)      ?? 0,
      passes:            safeInt(ps.total)    ?? 0,
      passesAccurate:    safeInt(ps.accuracy) ?? 0,
      passesProgressive: null,  // Not in API-Football free tier
      tackles:           safeInt(tk.total)    ?? 0,
      tacklesWon:        safeInt(tk.blocks)   ?? 0,
      interceptions:     safeInt(tk.interceptions) ?? 0,
      blocks:            safeInt(tk.blocks)   ?? 0,
      clearances:        null,
      aerialDuelsWon:    safeInt(d.won)       ?? 0,
      foulsCommitted:    safeInt(fo.committed) ?? 0,
      yellowCards:       safeInt(c.yellow)    ?? 0,
      redCards:          safeInt(c.red)       ?? 0,
      saves:             safeInt(gk?.saves?.total),
      cleanSheets:       safeInt(gk?.goals?.conceded === 0 ? null : null),  // derive from matches
      goalsConceded:     safeInt(gk?.goals?.conceded),
      avgRating:         safeFloat(g.rating),
      updatedAt:         new Date(),
    },
    create: {
      playerId:     player.id,
      seasonId,
      teamId,
      appearances:  safeInt(g.appearences)    ?? 0,
      starts:       safeInt(g.lineups)         ?? 0,
      minutesPlayed: safeInt(g.minutes)        ?? 0,
      goals:        safeInt(go.total)          ?? 0,
      assists:      safeInt(go.assists)        ?? 0,
      shots:        safeInt(s.total)           ?? 0,
      shotsOnTarget: safeInt(s.on)             ?? 0,
      xg:           safeFloat(go.expected)     ?? 0,
      keyPasses:    safeInt(ps.key)            ?? 0,
      passes:       safeInt(ps.total)          ?? 0,
      passesAccurate: safeInt(ps.accuracy)     ?? 0,
      tackles:      safeInt(tk.total)          ?? 0,
      tacklesWon:   safeInt(tk.blocks)         ?? 0,
      interceptions: safeInt(tk.interceptions) ?? 0,
      aerialDuelsWon: safeInt(d.won)           ?? 0,
      foulsCommitted: safeInt(fo.committed)    ?? 0,
      yellowCards:  safeInt(c.yellow)          ?? 0,
      redCards:     safeInt(c.red)             ?? 0,
      saves:        safeInt(gk?.saves?.total),
      goalsConceded: safeInt(gk?.goals?.conceded),
      avgRating:    safeFloat(g.rating),
    },
  })
}