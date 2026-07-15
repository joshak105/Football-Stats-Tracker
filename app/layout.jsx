import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: {
    default:  'FootballTracker',
    template: '%s | FootballTracker',
  },
  description: 'Live scores, stats, standings, and player profiles for football fans.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
