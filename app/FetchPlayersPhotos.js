/**
 * scripts/fetchPlayerPhotos.js
 * ─────────────────────────────────────────────────────────────
 * Queries API-Football to find the correct player IDs and photo
 * URLs for all players in the 2026-27 seed squads, then patches
 * seed.js with the real data.
 *
 * Run this once to populate seed.js with accurate photos:
 *   node scripts/fetchPlayerPhotos.js
 *
 * Requires: API_FOOTBALL_KEY in .env
 * ─────────────────────────────────────────────────────────────
 */

import 'dotenv/config'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const API_KEY = process.env.API_FOOTBALL_KEY
const BASE    = 'https://v3.football.api-sports.io'
const SEASON  = 2026

if (!API_KEY) {
  console.error('❌ API_FOOTBALL_KEY not set in .env')
  process.exit(1)
}

// ── Rate limiter ──────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))
let lastCall = 0
async function apiFetch(endpoint, params = {}) {
  const gap = 6500 - (Date.now() - lastCall)
  if (gap > 0) await sleep(gap)
  lastCall = Date.now()

  const url = new URL(`${BASE}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY },
  })
  const data = await res.json()
  return data.response ?? []
}

// ── Players to look up ────────────────────────────────────────
// name: used to search, also for display
// team: API-Football team ID (used to narrow search)
// knownId: our current placeholder ID (so we know which to patch)
const PLAYERS_TO_FIND = [
  // Liverpool
  { name: 'Alisson Becker',       team: 40, knownId: 48       },
  { name: 'Virgil van Dijk',      team: 40, knownId: 1082     },
  { name: 'Jeremie Frimpong',     team: 40, knownId: 303963   },
  { name: 'Ryan Gravenberch',     team: 40, knownId: 64898    },
  { name: 'Dominik Szoboszlai',   team: 40, knownId: 35845    },
  { name: 'Alexis Mac Allister',  team: 40, knownId: 50008    },
  { name: 'Florian Wirtz',        team: 40, knownId: 253058   },
  { name: 'Alexander Isak',       team: 40, knownId: 2295     },
  { name: 'Cody Gakpo',           team: 40, knownId: 47232    },
  // Arsenal
  { name: 'David Raya',           team: 42, knownId: 154      },
  { name: 'William Saliba',       team: 42, knownId: 48082    },
  { name: 'Gabriel Magalhaes',    team: 42, knownId: 19220    },
  { name: 'Declan Rice',          team: 42, knownId: 346101   },
  { name: 'Martin Odegaard',      team: 42, knownId: 19782    },
  { name: 'Bukayo Saka',          team: 42, knownId: 18846    },
  { name: 'Gabriel Martinelli',   team: 42, knownId: 19285    },
  { name: 'Viktor Gyokeres',      team: 42, knownId: 198858   },
  { name: 'Eberechi Eze',         team: 42, knownId: 280014   },
  // Man City
  { name: 'Ederson',              team: 50, knownId: 89       },
  { name: 'Rodri',                team: 50, knownId: 903      },
  { name: 'Phil Foden',           team: 50, knownId: 2766     },
  { name: 'Erling Haaland',       team: 50, knownId: 1100     },
  { name: 'Omar Marmoush',        team: 50, knownId: 73952    },
  { name: 'Elliot Anderson',      team: 50, knownId: 388099   },
  { name: 'Matheus Nunes',        team: 50, knownId: 284574   },
  { name: 'Jeremy Doku',          team: 50, knownId: 195566   },
  // Chelsea
  { name: 'Filip Jorgensen',      team: 49, knownId: 388100   },
  { name: 'Levi Colwill',         team: 49, knownId: 18885    },
  { name: 'Reece James',          team: 49, knownId: 2931     },
  { name: 'Moises Caicedo',       team: 49, knownId: 38399    },
  { name: 'Enzo Fernandez',       team: 49, knownId: 186695   },
  { name: 'Cole Palmer',          team: 49, knownId: 69478    },
  { name: 'Nicolas Jackson',      team: 49, knownId: 286699   },
  { name: 'Noni Madueke',         team: 49, knownId: 389012   },
]

// ── Fetch squad from API-Football by team ─────────────────────
async function fetchSquad(teamId) {
  console.log(`  Fetching squad for team ${teamId}...`)
  const rows = await apiFetch('/players/squads', { team: teamId })
  const players = rows[0]?.players ?? []
  return players.map(p => ({
    id:    p.id,
    name:  p.name,
    photo: p.photo,
  }))
}

// ── Fuzzy name match ──────────────────────────────────────────
function normalize(name) {
  return name.toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/ø/g, 'o').replace(/[^a-z ]/g, '').trim()
}

function bestMatch(searchName, squad) {
  const needle = normalize(searchName)
  // Exact match first
  let match = squad.find(p => normalize(p.name) === needle)
  if (match) return match
  // Last name match
  const lastName = needle.split(' ').pop()
  match = squad.find(p => normalize(p.name).endsWith(lastName))
  if (match) return match
  // Substring match
  match = squad.find(p => normalize(p.name).includes(lastName))
  return match ?? null
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Fetching player IDs and photos from API-Football...\n')
  console.log('⚠️  This uses API quota. Free tier has 100 requests/day.')
  console.log('   This script makes 4 requests (one per team).\n')

  // Fetch squads for all 4 teams
  const teamIds   = [...new Set(PLAYERS_TO_FIND.map(p => p.team))]
  const squads    = {}
  for (const teamId of teamIds) {
    squads[teamId] = await fetchSquad(teamId)
  }

  // Match each player
  const results = []
  let found = 0, notFound = 0

  for (const p of PLAYERS_TO_FIND) {
    const squad = squads[p.team] ?? []
    const match = bestMatch(p.name, squad)

    if (match) {
      results.push({
        name:      p.name,
        knownId:   p.knownId,
        realId:    match.id,
        photo:     match.photo,
        idChanged: match.id !== p.knownId,
      })
      const tag = match.id !== p.knownId ? '⚠️  ID CHANGED' : '✓'
      console.log(`${tag} ${p.name}: id=${match.id} photo=${match.photo ? '✓' : '✗'}`)
      found++
    } else {
      results.push({ name: p.name, knownId: p.knownId, realId: null, photo: null, idChanged: false })
      console.log(`✗ NOT FOUND: ${p.name} (team ${p.team})`)
      notFound++
    }
  }

  console.log(`\n📊 Results: ${found} found, ${notFound} not found`)

  // ── Patch seed.js ───────────────────────────────────────────
  const seedPath = resolve('scripts/seed.js')
  let seed = readFileSync(seedPath, 'utf8')

  let patched = 0
  for (const r of results) {
    if (!r.realId) continue

    // Patch external ID if it changed
    if (r.idChanged) {
      const oldIdPattern = new RegExp(`externalId: ${r.knownId},`, 'g')
      if (oldIdPattern.test(seed)) {
        seed = seed.replace(
          new RegExp(`externalId: ${r.knownId},`, 'g'),
          `externalId: ${r.realId},`
        )
        console.log(`  Patched ID: ${r.name} ${r.knownId} → ${r.realId}`)
        patched++
      }
    }

    // Patch photo URL
    if (r.photo) {
      // Replace `photo: null` for this player block
      // Find the line with the player's name and replace the next photo: null
      const nameEscaped = r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const namePattern = new RegExp(
        `(name: '${nameEscaped}'[^}]*?)photo: null`,
        's'
      )
      if (namePattern.test(seed)) {
        seed = seed.replace(namePattern, `$1photo: '${r.photo}'`)
        console.log(`  Patched photo: ${r.name}`)
        patched++
      } else {
        // Also try with encoded chars (Ødegaard etc)
        const altName = r.name.replace('Ø', 'Ø').replace('é', 'é')
        // Already correct — if the name has special chars and didn't match above,
        // it means the photo was already set or name differs. Skip.
      }
    }
  }

  writeFileSync(seedPath, seed, 'utf8')
  console.log(`\n✅ Patched ${patched} entries in scripts/seed.js`)
  console.log('   Re-run npm run db:seed to apply the updated photos.\n')

  // Print summary table
  console.log('┌─────────────────────────────┬──────────┬──────────┬───────────────────────────────────────────────┐')
  console.log('│ Player                      │ Old ID   │ Real ID  │ Photo URL                                     │')
  console.log('├─────────────────────────────┼──────────┼──────────┼───────────────────────────────────────────────┤')
  for (const r of results) {
    const name    = r.name.padEnd(27).slice(0, 27)
    const oldId   = String(r.knownId).padEnd(8)
    const realId  = String(r.realId ?? '?').padEnd(8)
    const photo   = (r.photo ?? 'none').slice(0, 45)
    const changed = r.idChanged ? '⚠️' : ' '
    console.log(`│ ${name} │ ${oldId} │ ${changed}${realId}│ ${photo.padEnd(45)} │`)
  }
  console.log('└─────────────────────────────┴──────────┴──────────┴───────────────────────────────────────────────┘')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})