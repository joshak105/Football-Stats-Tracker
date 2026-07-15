import Link        from 'next/link'
import LiveScores  from '@/components/LiveScores'

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <h1 className="home-hero__title">Football, tracked properly.</h1>
        <p className="home-hero__sub">
          Live scores, league tables, and player stats — updated in real time.
        </p>
      </section>

      <LiveScores />

      <nav className="home-quicklinks" aria-label="Quick links">
        <Link href="/leagues/39" className="home-quicklink">League tables →</Link>
        <Link href="/players"    className="home-quicklink">Player stats →</Link>
        <Link href="/compare"    className="home-quicklink">Compare teams →</Link>
      </nav>
    </div>
  )
}
