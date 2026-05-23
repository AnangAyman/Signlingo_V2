import type { Metadata, Viewport } from 'next'
import { Nunito, Nunito_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthSessionHydrator } from '@/components/common/AuthSessionHydrator'
import { I18nProvider } from '@/components/common/I18nProvider'
import './globals.css'

const nunito = Nunito({ 
  subsets: ["latin"],
  variable: '--font-nunito',
  display: 'swap',
});

const nunitoSans = Nunito_Sans({ 
  subsets: ["latin"],
  variable: '--font-nunito-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SignLingo - Learn Sign Language the Fun Way',
  description: 'Master sign language through gamified lessons, AI hand recognition, and competitive leagues. Start your sign language journey today!',
  keywords: ['sign language', 'ASL', 'learning', 'gamification', 'education', 'accessibility'],
  authors: [{ name: 'SignLingo Team' }],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5C242' },
    { media: '(prefers-color-scheme: dark)', color: '#2D1B4E' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${nunitoSans.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <I18nProvider>
          <AuthSessionHydrator />
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </I18nProvider>
      </body>
    </html>
  )
}
