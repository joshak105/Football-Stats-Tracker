/**
 * scripts/ingest/competitions.js
 * ─────────────────────────────────────────────────────────────
 * Ingests competition metadata and season records.
 * Runs first — everything else depends on competitions existing.
 * ─────────────────────────────────────────────────────────────
 */

import { apiFetch }         from './apiClient.js'
import { log, upsertCompetition } from './utils.js'
import { db }               from '../../lib/db.js'

export async function ingestCompetitions(tracked) {
  log.info(`Ingesting ${tracked.length} competitions`)

  for (const { externalId, season: targetYear } of tracked) {
    const rows = await apiFetch('/leagues', { id: externalId, season: targetYear })

    for (const row of rows) {
      const league  = row.league
      const country = row.country

      // Upsert country
      let countryId = null
      if (country?.name) {
        const c = await db.countries.upsert({
          where:  { code: (country.code ?? country.name.slice(0, 3)).toUpperCase() },
          update: { name: country.name, flagUrl: country.flag },
          create: {
            name:    country.name,
            code:    (country.code ?? country.name.slice(0, 3)).toUpperCase(),
            flagUrl: country.flag,
          },
        })
        countryId = c.id
      }

      // Upsert competition
      const compId = await upsertCompetition({
        externalId: league.id,
        name:       league.name,
        shortName:  null,
        type:       league.type === 'League' ? 'league' : 'cup',
        logoUrl:    league.logo,
        countryId,
      })

      // Upsert each season the API returns for this competition
      for (const s of row.seasons ?? []) {
        const isCurrent = s.year === targetYear && s.current === true
        await db.seasons.upsert({
          where:  { competitionId_label: { competitionId: compId, label: `${s.year}/${String(s.year + 1).slice(2)}` } },
          update: { isCurrent, startDate: s.start ? new Date(s.start) : null, endDate: s.end ? new Date(s.end) : null },
          create: {
            competitionId: compId,
            externalId:    null,
            label:         `${s.year}/${String(s.year + 1).slice(2)}`,
            yearStart:     s.year,
            yearEnd:       s.year + 1,
            isCurrent,
            startDate:     s.start ? new Date(s.start) : null,
            endDate:       s.end   ? new Date(s.end)   : null,
          },
        })
      }

      log.info(`  ✓ ${league.name} (${targetYear})`)
    }
  }

  log.info('Competitions ingestion complete')
}


/**
 * scripts/ingest/teams.js
 * ─────────────────────────────────────────────────────────────
 * Ingests all teams + venues for tracked competitions.
 * Must run after competitions.js.
 * ─────────────────────────────────────────────────────────────
 */

import { apiFetch }                                     from './apiClient.js'
import { log, upsertTeam, requireSeasonId, safeInt }   from './utils.js'
import { db }                                           from '../../lib/db.js'

export async function ingestTeams(tracked) {
  log.info('Ingesting teams')

  for (const { externalId: leagueId, season } of tracked) {
    const rows = await apiFetch('/teams', { league: leagueId, season })
    const seasonId = await requireSeasonId(leagueId, season)

    for (const row of rows) {
      const t = row.team
      const v = row.venue

      // Upsert venue
      let venueId = null
      if (v?.id) {
        const venue = await db.venues.upsert({
          where:  { externalId: v.id },
          update: { name: v.name, city: v.city, capacity: v.capacity, image_url: v.image },
          create: {
            externalId: v.id,
            name:       v.name,
            city:       v.city,
            capacity:   v.capacity,
            imageUrl:   v.image,
          },
        })
        venueId = venue.id
      }

      // Upsert team
      const teamId = await upsertTeam({
        externalId:  t.id,
        name:        t.name,
        shortName:   t.name,
        tla:         t.code,
        logoUrl:     t.logo,
        foundedYear: safeInt(t.founded),
        isNational:  t.national ?? false,
        venueId,
      })

      // Link team to this season
      await db.seasonTeams.upsert({
        where:  { seasonId_teamId: { seasonId, teamId } },
        update: {},
        create: { seasonId, teamId },
      })
    }

    log.info(`  ✓ League ${leagueId}: ${rows.length} teams`)
  }

  log.info('Teams ingestion complete')
}


/**
 * scripts/ingest/players.js
 * ─────────────────────────────────────────────────────────────
 * Ingests player profiles for all teams in tracked competitions.
 * This is typically the slowest job — API-Football paginates at
 * 20 players per page and most teams have 25+ players.
 *
 * Strategy: fetch by team+season rather than by competition to
 * get accurate squad data including shirt numbers.
 * ─────────────────────────────────────────────────────────────
 */

import { apiFetch, apiFetchAll }                    from './apiClient.js'
import { log, upsertPlayer, mapPosition, safeInt }  from './utils.js'
import { db }                                       from '../../lib/db.js'

export async function ingestPlayers(tracked) {
  log.info('Ingesting players')

  for (const { externalId: leagueId, season } of tracked) {
    // Get all teams for this competition from our DB
    const seasonTeams = await db.seasonTeams.findMany({
      where:   { season: { competition: { externalId: leagueId }, yearStart: season } },
      include: { team: true },
    })

    log.info(`  League ${leagueId}: processing ${seasonTeams.length} teams`)

    for (const { team, seasonId } of seasonTeams) {
      const rows = await apiFetchAll('/players', {
        team:   team.externalId,
        season,
      })

      for (const row of rows) {
        const p       = row.player
        const stats   = row.statistics?.[0]

        // Upsert nationality
        let nationalityId = null
        if (p.nationality) {
          const country = await db.countries.findFirst({ where: { name: p.nationality } })
          nationalityId = country?.id ?? null
        }

        // Upsert player
        const playerId = await upsertPlayer({
          externalId:   p.id,
          name:         p.name,
          firstName:    p.firstname,
          lastName:     p.lastname,
          dateOfBirth:  p.birth?.date ? new Date(p.birth.date) : null,
          nationalityId,
          position:     mapPosition(p.position),
          heightCm:     p.height ? safeInt(p.height.replace('cm', '').trim()) : null,
          weightKg:     p.weight ? safeInt(p.weight.replace('kg', '').trim()) : null,
          photoUrl:     p.photo,
          isActive:     true,
        })

        // Link player to team (current squad)
        await db.playerTeams.upsert({
          where:  { playerId_teamId: { playerId, teamId: team.id } },
          update: {
            shirtNumber: stats?.games?.number ?? null,
            isCurrent:   true,
          },
          create: {
            playerId,
            teamId:      team.id,
            shirtNumber: stats?.games?.number ?? null,
            isCurrent:   true,
            joinedDate:  null,
          },
        })
      }

      log.info(`    ✓ ${team.name}: ${rows.length} players`)
    }
  }

  log.info('Players ingestion complete')
}