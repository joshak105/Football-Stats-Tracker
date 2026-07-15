/**
 * app/scores/page.jsx
 * Renders at /scores — live and today's match scores.
 */
import LiveScores from '@/components/LiveScores'

export const metadata = { title: 'Live Scores' }

export default function ScoresPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 0 2rem' }}>
      <LiveScores />
    </div>
  )
}