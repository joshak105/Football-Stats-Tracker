 
import { NextResponse } from 'next/server'
 
const API_KEY = process.env.API_FOOTBALL_KEY
const BASE    = 'https://v3.football.api-sports.io'
 
function mapStatus(short) {
  const MAP = {
    'NS':'scheduled','TBD':'scheduled',
    '1H':'live','2H':'live','ET':'live','P':'live','BT':'live','LIVE':'live',
    'HT':'half_time',
    'FT':'finished','AET':'finished','PEN':'finished','AWD':'finished','WO':'finished',
    'PST':'postponed','SUSP':'postponed',
    'CANC':'cancelled','ABD':'abandoned',
  }
  return MAP[short] ?? 'scheduled'
}
 
function mapEventType(type, detail) {
  if (type === 'Goal') {
    if (detail === 'Own Goal')       return 'own_goal'
    if (detail === 'Penalty')        return 'penalty_scored'
    if (detail === 'Missed Penalty') return 'penalty_missed'
    return 'goal'
  }
  if (type === 'Card') {
    if (detail === 'Yellow Card')     return 'yellow_card'
    if (detail === 'Red Card')        return 'red_card'
    if (detail === 'Yellow Red Card') return 'yellow_red_card'
  }
  if (type === 'subst') return 'substitution_in'
  return 'goal'
}
 
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const competitionId    = searchParams.get('competitionId')
  const liveOnly         = searchParams.get('liveOnly') === 'true'
  const date             = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
 
  if (!API_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 })
  }
 
  try {
    const params = new URLSearchParams()
    if (liveOnly) {
      params.set('live', competitionId ? String(competitionId) : 'all')
    } else {
      params.set('date', date)
      if (competitionId) params.set('league', competitionId)
      params.set('season', '2024')
    }
 
    const res = await fetch(`${BASE}/fixtures?${params}`, {
      headers: { 'x-apisports-key': API_KEY },
      next:    { revalidate: liveOnly ? 30 : 300 },
    })
 
    if (!res.ok) {
      return NextResponse.json({ error: `API-Football error: ${res.status}` }, { status: 502 })
    }
 
    const data = await res.json()
 
    if (data.errors && Object.keys(data.errors).length > 0) {
      return NextResponse.json({ error: JSON.stringify(data.errors) }, { status: 400 })
    }
 
    const matches = (data.response ?? []).map(fixture => ({
      id:              fixture.fixture.id,
      status:          mapStatus(fixture.fixture.status.short),
      kickoffAt:       fixture.fixture.date,
      minute:          fixture.fixture.status.elapsed,
      extraMinute:     fixture.fixture.status.extra,
      matchweek:       fixture.league.round,
      competitionName: fixture.league.name,
      competitionLogo: fixture.league.logo,
      homeTeam: {
        id:        fixture.teams.home.id,
        name:      fixture.teams.home.name,
        shortName: fixture.teams.home.name,
        logoUrl:   fixture.teams.home.logo,
      },
      awayTeam: {
        id:        fixture.teams.away.id,
        name:      fixture.teams.away.name,
        shortName: fixture.teams.away.name,
        logoUrl:   fixture.teams.away.logo,
      },
      homeScore:   fixture.goals.home,
      awayScore:   fixture.goals.away,
      homeScoreHt: fixture.score.halftime.home,
      awayScoreHt: fixture.score.halftime.away,
      events: (fixture.events ?? []).map((e, idx) => ({
        id:                idx,
        type:              mapEventType(e.type, e.detail),
        minute:            e.time.elapsed,
        extraMinute:       e.time.extra,
        playerName:        e.player?.name ?? '',
        relatedPlayerName: e.assist?.name ?? null,
        teamId:            e.team?.id,
      })),
    }))
 
    return NextResponse.json({ matches, lastUpdated: new Date().toISOString() })
 
  } catch (err) {
    console.error('[/api/live-scores]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}