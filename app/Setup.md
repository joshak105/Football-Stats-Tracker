# Data Ingestion — Setup Guide

Everything you need to wire API-Football into your PostgreSQL database.

---

## 1. Install dependencies

```bash
npm install dotenv node-cron
```

---

## 2. Configure environment variables

Create a `.env` file in the project root:

```env
# API-Football
API_FOOTBALL_KEY=your_key_here

# Database (already set from Next.js setup)
DATABASE_URL=postgresql://user:password@localhost:5432/football_tracker

# Optional
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info   # debug | info | warn | error
```

Get a free API key at: https://www.api-football.com

---

## 3. Add scripts to package.json

```json
{
  "scripts": {
    "ingest":            "node scripts/ingest/index.js",
    "ingest:competitions": "node scripts/ingest/index.js --job=competitions",
    "ingest:teams":      "node scripts/ingest/index.js --job=teams",
    "ingest:players":    "node scripts/ingest/index.js --job=players",
    "ingest:fixtures":   "node scripts/ingest/index.js --job=fixtures",
    "ingest:standings":  "node scripts/ingest/index.js --job=standings",
    "ingest:stats":      "node scripts/ingest/index.js --job=playerStats",
    "ingest:live":       "node scripts/ingest/index.js --live",
    "cron":              "node scripts/ingest/cron.js"
  }
}
```

---

## 4. First-time full run

Run jobs in dependency order. On a fresh database this takes
15–40 minutes depending on how many competitions you track and
your API plan's rate limits.

```bash
# Step 1: Competitions + seasons
npm run ingest:competitions

# Step 2: Teams (requires competitions)
npm run ingest:teams

# Step 3: Players (requires teams — slowest step)
npm run ingest:players

# Step 4: Fixtures (requires teams)
npm run ingest:fixtures

# Step 5: Standings + player stats (require fixtures)
npm run ingest:standings
npm run ingest:stats
```

Or run everything at once (same order, automatic):

```bash
npm run ingest
```

---

## 5. File structure

```
scripts/
  ingest/
    index.js                 ← Orchestrator + competition list
    apiClient.js             ← Rate-limited HTTP client with retry
    utils.js                 ← Logger, mappers, upsert helpers
    competitions-teams-players.js  ← competitions, teams, players jobs
    fixtures-standings-stats.js    ← fixtures, standings, playerStats jobs
    live-cron.js             ← Live loop + cron schedule
```

---

## 6. Running in production

### Option A — Cron daemon (recommended for VPS / Railway / Render)

```bash
# Install PM2
npm install -g pm2

# Run the cron daemon (keeps running, executes jobs on schedule)
pm2 start scripts/ingest/cron.js --name ingest-cron

# Run the live scores loop separately
pm2 start scripts/ingest/index.js --name live-scores -- --live

# Save and auto-restart on reboot
pm2 save && pm2 startup
```

### Option B — Vercel Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/standings",  "schedule": "0 4 * * *"   },
    { "path": "/api/cron/fixtures",   "schedule": "0 2,14 * * *" },
    { "path": "/api/cron/stats",      "schedule": "0 5 * * *"   }
  ]
}
```

Then create thin API routes that call the ingestion functions:

```js
// app/api/cron/standings/route.js
import { ingestStandings }      from '@/scripts/ingest/standings'
import { TRACKED_COMPETITIONS } from '@/scripts/ingest/index'

export async function GET(request) {
  // Protect from random callers
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  await ingestStandings(TRACKED_COMPETITIONS)
  return Response.json({ ok: true })
}
```

Set `CRON_SECRET` in your Vercel environment variables.
Vercel automatically sends the secret in the `Authorization` header.

---

## 7. Adding more competitions

Edit `TRACKED_COMPETITIONS` in `scripts/ingest/index.js`:

```js
export const TRACKED_COMPETITIONS = [
  { externalId: 39,  name: 'Premier League',  season: 2026/27},
  { externalId: 140, name: 'La Liga',          season: 2026/27},
  // Add more here ↓
  { externalId: 848, name: 'Championship',     season: 2026/27},
  { externalId: 307, name: 'Saudi Pro League', season: 2026/27 },
]
```

API-Football league IDs: https://www.api-football.com/documentation-v3#tag/Leagues

After adding a league, run the full ingestion chain for it:

```bash
npm run ingest
```

---

## 8. API-Football rate limits

| Plan      | Requests/day | Requests/min |
|-----------|-------------|-------------|
| Free      | 100         | 10          |
| Starter   | 7,500       | 30          |
| Pro       | Unlimited   | 300         |
| Enterprise| Unlimited   | Unlimited   |

The `apiClient.js` enforces a minimum 6.5s gap between requests,
which respects the 10 req/min free tier limit with a buffer.

On a paid plan, reduce `MIN_GAP_MS` in `apiClient.js`:
- Starter (30 req/min): set to `2100`
- Pro (300 req/min):    set to `250`

---

## 9. Monitoring

Every API request is logged to the `sync_log` table. Query it to
see job health:

```sql
-- Last 20 sync events
SELECT entity_type, status, records_fetched, duration_ms, synced_at
FROM sync_log
ORDER BY synced_at DESC
LIMIT 20;

-- Failed jobs in the last 24 hours
SELECT *
FROM sync_log
WHERE status = 'error'
  AND synced_at > NOW() - INTERVAL '24 hours'
ORDER BY synced_at DESC;

-- Average response times by endpoint
SELECT entity_type,
       COUNT(*)               AS requests,
       AVG(duration_ms)::int  AS avg_ms,
       MAX(duration_ms)       AS max_ms
FROM sync_log
WHERE status = 'success'
GROUP BY entity_type
ORDER BY avg_ms DESC;
```

---

## 10. Troubleshooting

**"Team with externalId=X not found"**
→ Run `npm run ingest:teams` before `npm run ingest:fixtures`.
   Jobs must run in order.

**"API 429 rate limited"**
→ You've hit the per-minute limit. `apiClient.js` auto-retries
   after the `retry-after` header delay. If it keeps happening,
   increase `MIN_GAP_MS`.

**"Low API quota: N requests remaining today"**
→ You're close to the daily free-tier limit (100 req/day).
   Reduce `TRACKED_COMPETITIONS` or upgrade your plan.

**Player stats missing xG**
→ API-Football's `expected_goals` field is only on Pro+ plans.
   On free/starter, `xg` will be null. You can compute an
   approximation from `shots × 0.1` as a rough fallback.

**Standings not matching the official table**
→ Run `npm run ingest:fixtures` first to ensure all match
   results are in the DB, then re-run `npm run ingest:standings`.
