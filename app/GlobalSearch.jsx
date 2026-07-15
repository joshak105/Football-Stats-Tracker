'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter }   from 'next/navigation'
import Image           from 'next/image'

const RECENT_KEY    = 'ft_recent_searches'
const MAX_RECENT    = 6
const DEBOUNCE_MS   = 300

const POS_BADGES = {
  goalkeeper: { label: 'GK',  bg: '#fef9c3', color: '#854d0e' },
  defender:   { label: 'DEF', bg: '#dbeafe', color: '#1e40af' },
  midfielder: { label: 'MID', bg: '#dcfce7', color: '#166534' },
  forward:    { label: 'FWD', bg: '#fee2e2', color: '#991b1b' },
}

// ── Recent searches storage ───────────────────────────────────────────────────

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

function addRecent(item) {
  try {
    const existing = getRecent().filter(r => r.href !== item.href)
    const next = [item, ...existing].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

function clearRecent() {
  try { localStorage.removeItem(RECENT_KEY) } catch {}
}

// ── Result item ───────────────────────────────────────────────────────────────

function ResultItem({ item, isActive, onSelect, onMouseEnter }) {
  const badge = item.position ? POS_BADGES[item.position] : null

  return (
    <li
      className={`search-result ${isActive ? 'search-result--active' : ''}`}
      role="option"
      aria-selected={isActive}
      onMouseDown={onSelect}
      onMouseEnter={onMouseEnter}
    >
      {/* Logo / photo */}
      <div className="search-result__avatar">
        {item.imageUrl
          ? <Image src={item.imageUrl} alt="" width={28} height={28} className={`search-result__img ${item.type === 'player' ? 'search-result__img--round' : ''}`} />
          : <span className="search-result__initials">{item.label.slice(0, 2).toUpperCase()}</span>
        }
      </div>

      {/* Text */}
      <div className="search-result__text">
        <span className="search-result__label">{item.label}</span>
        {item.sub && <span className="search-result__sub">{item.sub}</span>}
      </div>

      {/* Position badge for players */}
      {badge && (
        <span
          className="search-result__badge"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      )}

      {/* Arrow */}
      <i className="ti ti-arrow-right search-result__arrow" aria-hidden="true" />
    </li>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count }) {
  return (
    <div className="search-section-header" role="presentation">
      {label}
      {count != null && <span className="search-section-count">{count}</span>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @param {{ onClose: () => void }} props
 */
export default function GlobalSearch({ onClose }) {
  const router                      = useRouter()
  const inputRef                    = useRef(null)
  const listRef                     = useRef(null)

  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState(null)   // null = not searched yet
  const [loading,    setLoading]    = useState(false)
  const [activeIdx,  setActiveIdx]  = useState(-1)
  const [recent,     setRecent]     = useState([])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
    setRecent(getRecent())
  }, [])

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Search ──────────────────────────────────────────────────────────────────
  const abortRef = useRef(null)

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults(null); setLoading(false); return }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`, { signal: abortRef.current.signal })
      const data = await res.json()
      setResults(data)
      setActiveIdx(-1)
    } catch (err) {
      if (err.name !== 'AbortError') setResults({ error: true })
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => search(query), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, search])

  // ── Flatten results for keyboard nav ────────────────────────────────────────
  const flatItems = results
    ? [
        ...(results.players ?? []).map(p => ({
          type:     'player',
          href:     `/players/${p.id}`,
          label:    p.name,
          sub:      `${p.team ?? ''} · ${p.nationality ?? ''}`.replace(/^ · | · $/, ''),
          imageUrl: p.photoUrl,
          position: p.position,
        })),
        ...(results.teams ?? []).map(t => ({
          type:     'team',
          href:     `/teams/${t.id}`,
          label:    t.name,
          sub:      t.competition ?? t.country,
          imageUrl: t.logoUrl,
        })),
        ...(results.competitions ?? []).map(c => ({
          type:     'competition',
          href:     `/leagues/${c.externalId}`,
          label:    c.name,
          sub:      c.country,
          imageUrl: c.logoUrl,
        })),
      ]
    : []

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!flatItems.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      navigateTo(flatItems[activeIdx])
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigateTo = useCallback((item) => {
    addRecent(item)
    setRecent(getRecent())
    router.push(item.href)
    onClose()
  }, [router, onClose])

  // ── Show recent or results ──────────────────────────────────────────────────
  const showRecent  = !query.trim() && recent.length > 0
  const showResults = !!query.trim()
  const noResults   = showResults && !loading && flatItems.length === 0

  return (
    <div className="search-overlay" role="dialog" aria-label="Search" aria-modal="true">
      {/* Backdrop */}
      <div className="search-overlay__backdrop" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="search-panel">

        {/* Input row */}
        <div className="search-input-row">
          <i className="ti ti-search search-input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="search-input"
            placeholder="Search players, teams, competitions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="search-listbox"
            aria-activedescendant={activeIdx >= 0 ? `sr-${activeIdx}` : undefined}
          />
          {loading && <span className="search-spinner" aria-hidden="true" />}
          {query && (
            <button
              className="search-clear"
              onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus() }}
              aria-label="Clear search"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
          <button className="search-esc-btn" onClick={onClose} aria-label="Close search">
            Esc
          </button>
        </div>

        {/* Results */}
        <ul
          ref={listRef}
          id="search-listbox"
          className="search-results"
          role="listbox"
          aria-label="Search results"
        >

          {/* Recent searches */}
          {showRecent && (
            <>
              <div className="search-section-header search-section-header--with-action">
                <span>Recent</span>
                <button
                  className="search-clear-recent"
                  onClick={() => { clearRecent(); setRecent([]) }}
                >
                  Clear
                </button>
              </div>
              {recent.map((item, i) => (
                <ResultItem
                  key={item.href}
                  item={item}
                  isActive={false}
                  onSelect={() => navigateTo(item)}
                  onMouseEnter={() => {}}
                />
              ))}
            </>
          )}

          {/* Live results */}
          {showResults && !loading && (
            <>
              {results?.players?.length > 0 && (
                <>
                  <SectionHeader label="Players" count={results.players.length} />
                  {results.players.map((p, i) => {
                    const item = flatItems.find(f => f.href === `/players/${p.id}`)
                    const idx  = flatItems.indexOf(item)
                    return (
                      <ResultItem
                        key={p.id}
                        item={item}
                        isActive={activeIdx === idx}
                        onSelect={() => navigateTo(item)}
                        onMouseEnter={() => setActiveIdx(idx)}
                      />
                    )
                  })}
                </>
              )}

              {results?.teams?.length > 0 && (
                <>
                  <SectionHeader label="Teams" count={results.teams.length} />
                  {results.teams.map(t => {
                    const item = flatItems.find(f => f.href === `/teams/${t.id}`)
                    const idx  = flatItems.indexOf(item)
                    return (
                      <ResultItem
                        key={t.id}
                        item={item}
                        isActive={activeIdx === idx}
                        onSelect={() => navigateTo(item)}
                        onMouseEnter={() => setActiveIdx(idx)}
                      />
                    )
                  })}
                </>
              )}

              {results?.competitions?.length > 0 && (
                <>
                  <SectionHeader label="Competitions" count={results.competitions.length} />
                  {results.competitions.map(c => {
                    const item = flatItems.find(f => f.href === `/leagues/${c.externalId}`)
                    const idx  = flatItems.indexOf(item)
                    return (
                      <ResultItem
                        key={c.id}
                        item={item}
                        isActive={activeIdx === idx}
                        onSelect={() => navigateTo(item)}
                        onMouseEnter={() => setActiveIdx(idx)}
                      />
                    )
                  })}
                </>
              )}

              {noResults && (
                <li className="search-empty" role="option" aria-selected="false">
                  No results for "<strong>{query}</strong>"
                </li>
              )}
            </>
          )}

          {/* Empty state (no query, no recent) */}
          {!showRecent && !showResults && (
            <li className="search-hint" role="option" aria-selected="false">
              <i className="ti ti-search" aria-hidden="true" />
              Search for a player, team, or competition
            </li>
          )}

        </ul>

        {/* Footer hint */}
        <div className="search-footer" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}


// ── API Route ─────────────────────────────────────────────────────────────────
// Save as: app/api/search/route.js
//
// import { NextResponse } from 'next/server'
// import { db }           from '@/lib/db'
//
// export async function GET(request) {
//   const { searchParams } = new URL(request.url)
//   const q     = searchParams.get('q')?.trim()
//   const limit = Math.min(Number(searchParams.get('limit') ?? 5), 10)
//
//   if (!q || q.length < 2) return NextResponse.json({ players: [], teams: [], competitions: [] })
//
//   // Run all three searches in parallel
//   const [players, teams, competitions] = await Promise.all([
//
//     // Trigram similarity search on player names
//     db.$queryRaw`
//       SELECT id, name, position, photo_url AS "photoUrl",
//              (SELECT t.name FROM player_teams pt JOIN teams t ON t.id = pt.team_id
//               WHERE pt.player_id = p.id AND pt.is_current = true LIMIT 1) AS team,
//              (SELECT c.name FROM player_teams pt JOIN teams t ON t.id = pt.team_id
//               JOIN countries c ON c.id = t.country_id
//               WHERE pt.player_id = p.id AND pt.is_current = true LIMIT 1) AS nationality
//       FROM players p
//       WHERE p.search_vector @@ plainto_tsquery('english', ${q})
//          OR similarity(p.name, ${q}) > 0.2
//       ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', ${q})) DESC,
//                similarity(p.name, ${q}) DESC
//       LIMIT ${limit}
//     `,
//
//     // Team search
//     db.$queryRaw`
//       SELECT t.id, t.name, t.logo_url AS "logoUrl",
//              co.name AS competition, c.name AS country
//       FROM teams t
//       LEFT JOIN countries c ON c.id = t.country_id
//       LEFT JOIN season_teams st ON st.team_id = t.id
//       LEFT JOIN seasons se ON se.id = st.season_id AND se.is_current = true
//       LEFT JOIN competitions co ON co.id = se.competition_id
//       WHERE t.search_vector @@ plainto_tsquery('english', ${q})
//          OR similarity(t.name, ${q}) > 0.25
//       GROUP BY t.id, t.name, t.logo_url, co.name, c.name
//       ORDER BY similarity(t.name, ${q}) DESC
//       LIMIT ${limit}
//     `,
//
//     // Competition search
//     db.$queryRaw`
//       SELECT c.id, c.name, c.logo_url AS "logoUrl", c.external_id AS "externalId",
//              co.name AS country
//       FROM competitions c
//       LEFT JOIN countries co ON co.id = c.country_id
//       WHERE c.is_active = true
//         AND (c.name ILIKE ${'%' + q + '%'} OR c.short_name ILIKE ${'%' + q + '%'})
//       ORDER BY c.name
//       LIMIT ${limit}
//     `,
//   ])
//
//   return NextResponse.json({ players, teams, competitions })
// }
//
//
// ── /api/live-count/route.js ──────────────────────────────────────────────────
//
// import { NextResponse } from 'next/server'
// import { db }           from '@/lib/db'
//
// export async function GET() {
//   const count = await db.matches.count({
//     where: { status: { in: ['live', 'half_time'] } }
//   })
//   return NextResponse.json({ count }, {
//     headers: { 'Cache-Control': 'no-store' }
//   })
// }
