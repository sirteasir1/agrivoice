import type { Metadata, Viewport } from 'next'
import { Bitter, Manrope, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// Шрифты самохостятся Next-ом: без запроса к Google Fonts, без FOUT
const bitter = Bitter({ subsets: ['cyrillic', 'cyrillic-ext', 'latin'], variable: '--font-bitter' })
const manrope = Manrope({ subsets: ['cyrillic', 'cyrillic-ext', 'latin'], variable: '--font-manrope' })
const jbMono = JetBrains_Mono({ subsets: ['cyrillic', 'latin'], variable: '--font-jbmono' })

export const metadata: Metadata = {
  title: 'AgroVoice — AI-агроном 24/7',
  description: 'Голосовой AI-агроном для фермеров Казахстана и СНГ. Позвоните или отправьте SMS — даже без интернета. Совет с учётом погоды и расчётом затрат.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f5efdf',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${bitter.variable} ${manrope.variable} ${jbMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
