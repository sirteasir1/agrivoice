'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LandingPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('farmer_id')) {
      router.push('/dashboard')
    }
  }, [router])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.35 + 0.05,
      p: Math.random() * Math.PI * 2,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.p += 0.012
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(74,222,128,${p.a * (0.6 + 0.4 * Math.sin(p.p))})`
        ctx.fill()
      })
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 90) {
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(74,222,128,${0.05 * (1 - d / 90)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current) }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '500px', background: 'radial-gradient(ellipse, rgba(74,222,128,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* NAV */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '1px solid var(--border)', background: 'rgba(6,10,6,0.85)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-dim)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌾</div>
            <span style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '-0.4px' }}>AgriVoice</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/login" style={{ padding: '8px 18px', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--text2)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Войти</Link>
            <Link href="/register" style={{ padding: '8px 18px', background: 'var(--accent2)', borderRadius: '8px', color: '#030703', textDecoration: 'none', fontSize: '14px', fontWeight: 800 }}>Начать →</Link>
          </div>
        </nav>

        {/* HERO */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', border: '1px solid var(--border2)', borderRadius: '100px', fontSize: '11px', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.8px', background: 'var(--accent-dim)', marginBottom: '28px', animation: 'fadeUp 0.5s ease both' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'blink 2s ease-in-out infinite' }} />
            AI-АГРОНОМ ДЛЯ КАЗАХСТАНА И СНГ
          </div>
          <h1 style={{ fontSize: 'clamp(44px, 7vw, 80px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', marginBottom: '28px', animation: 'fadeUp 0.5s 0.1s ease both' }}>
            Агроном в кармане.{' '}
            <span style={{ background: 'linear-gradient(135deg, #4ade80, #86efac)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Всегда на связи.
            </span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text2)', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto 48px', animation: 'fadeUp 0.5s 0.2s ease both' }}>
            Голосом, текстом, SMS или звонком — AI знает историю каждого поля и даёт конкретный совет за секунды.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.5s 0.3s ease both' }}>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 32px', background: 'var(--accent)', borderRadius: '12px', color: '#030703', textDecoration: 'none', fontWeight: 800, fontSize: '16px', boxShadow: '0 0 48px rgba(74,222,128,0.25)' }}>
              🚀 Попробовать бесплатно
            </Link>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '16px 32px', border: '1px solid var(--border2)', borderRadius: '12px', color: 'var(--text2)', textDecoration: 'none', fontWeight: 700, fontSize: '16px' }}>
              Войти в аккаунт
            </Link>
          </div>
        </section>

        {/* КАНАЛЫ */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
            {[
              { icon: '🎤', label: 'Голос в браузере', desc: 'Web Speech API' },
              { icon: '✍️', label: 'Текстовый чат', desc: 'На сайте' },
              { icon: '📱', label: 'SMS', desc: 'Twilio' },
              { icon: '📞', label: 'Звонок', desc: 'Twilio Voice' },
            ].map((c, i) => (
              <div key={i} style={{ padding: '28px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '28px', marginBottom: '12px', display: 'block', animation: `float 3s ${i * 0.4}s ease-in-out infinite` }}>{c.icon}</span>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* КАК РАБОТАЕТ */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 100px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '48px' }}>Три шага до ответа</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {[
              { n: '01', icon: '🌾', t: 'Добавьте поле', d: 'Укажите культуру и площадь. Агент запомнит всю историю болезней и обработок.' },
              { n: '02', icon: '🎤', t: 'Опишите проблему', d: 'Голосом, текстом, SMS или звонком. Говорите как соседу — агент всё поймёт.' },
              { n: '03', icon: '💊', t: 'Получите совет', d: 'Конкретный ответ: препарат, дозировка, сроки. Без воды.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '32px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', transition: 'all 0.2s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-green)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', fontWeight: 700, marginBottom: '16px' }}>── {s.n}</div>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{s.icon}</div>
                <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '10px' }}>{s.t}</div>
                <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.6 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌾</span>
            <span style={{ fontWeight: 900, fontSize: '15px' }}>AgriVoice</span>
          </div>
          <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>AI-агроном для фермеров Казахстана и СНГ</span>
        </footer>
      </div>
    </div>
  )
}
