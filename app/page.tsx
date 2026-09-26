'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/Icon'
import { useLang, LangToggle } from '@/lib/i18n'

export default function LandingPage() {
  const router = useRouter()
  const { lang, setLang, t } = useLang()

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('farmer_id')) {
      router.push('/dashboard')
    }
  }, [router])

  // появление секций при прокрутке
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.12 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* NAV */}
      <nav className="navbar">
        <Link href="/" className="brand">
          <span className="brand-mark"><Icon name="wheat" size={19} /></span>
          <span className="brand-name">AgroVoice</span>
        </Link>
        <div className="nav-links-desktop" style={{ display: 'flex', gap: '4px' }}>
          <a href="#offline" className="nav-link">{t('navHow')}</a>
          <a href="#channels" className="nav-link">{t('navChannels')}</a>
          <a href="#features" className="nav-link">{t('navFeatures')}</a>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <LangToggle lang={lang} setLang={setLang} />
          <Link href="/login" className="btn btn-ghost btn-sm">{t('login')}</Link>
          <Link href="/register" className="btn btn-primary btn-sm">{t('start')} <Icon name="arrowRight" size={15} /></Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="wrap" style={{ padding: '76px 24px 40px', position: 'relative', zIndex: 1 }}>
          <div className="hero-split">
            <div>
              <h1 className="display" style={{ fontSize: 'clamp(32px, 4.6vw, 52px)', marginBottom: '24px', animation: 'fadeUp 0.5s 0.1s ease both' }}>
                {t('h1a')}{' '}
                <span className="hl">{t('h1b')}</span>
              </h1>
              <p style={{ fontSize: '18px', color: 'var(--text2)', lineHeight: 1.7, maxWidth: '500px', marginBottom: '36px', animation: 'fadeUp 0.5s 0.2s ease both' }}>
                {t('heroSub')}
              </p>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', animation: 'fadeUp 0.5s 0.3s ease both' }}>
                <Link href="/register" className="btn btn-primary btn-lg">
                  {t('tryFree')} <Icon name="arrowRight" size={17} />
                </Link>
                <Link href="/login" className="btn btn-ghost btn-lg">{t('loginAccount')}</Link>
              </div>
              <div style={{ display: 'flex', gap: '22px', marginTop: '38px', flexWrap: 'wrap', animation: 'fadeUp 0.5s 0.4s ease both' }}>
                {([['smartphone', 'heroF1'], ['cloudSun', 'heroF2'], ['banknote', 'heroF3']] as const).map(([icon, key]) => (
                  <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text2)', fontWeight: 700 }}>
                    <Icon name={icon} size={16} style={{ color: 'var(--gold)' }} />
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>

            {/* МОКАП: SMS-переписка на кнопочном */}
            <div style={{ animation: 'fadeUp 0.6s 0.3s ease both' }}>
              <SmsMock t={t} />
            </div>
          </div>
        </div>
        <FieldScape />
      </section>

      {/* БЕЗ ИНТЕРНЕТА — киллер-фича */}
      <section id="offline" style={{ background: 'linear-gradient(180deg, #3f7040 0%, var(--accent2) 80px, var(--accent2) calc(100% - 120px), var(--bg) 100%)', color: '#f2f6e8' }}>
        <div className="wrap" style={{ padding: '92px 24px 104px' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', marginBottom: '14px', color: '#fdfbef' }}>{t('offlineTitle')}</h2>
            <p style={{ fontSize: '17px', color: 'rgba(242,246,232,0.75)', maxWidth: '520px', margin: '0 auto' }}>{t('offlineSub')}</p>
          </div>
          <div className="grid-steps reveal">
            {([['phoneCall', 'os1t', 'os1d'], ['mic', 'os2t', 'os2d'], ['sprout', 'os3t', 'os3d']] as const).map(([icon, tt, dd], i) => (
              <div key={i} style={{ padding: '32px 28px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '13px', background: 'rgba(224,166,58,0.2)', color: '#e8b54a' }}>
                    <Icon name={icon} size={22} />
                  </span>
                  <span className="mono" style={{ fontSize: '14px', color: 'rgba(242,246,232,0.4)', fontWeight: 600 }}>0{i + 1}</span>
                </div>
                <div className="display" style={{ fontSize: '19px', fontWeight: 800, marginBottom: '10px', color: '#fdfbef' }}>{t(tt)}</div>
                <div style={{ fontSize: '15px', color: 'rgba(242,246,232,0.75)', lineHeight: 1.65 }}>{t(dd)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Ornament />

      {/* КАНАЛЫ */}
      <section id="channels" className="wrap" style={{ padding: '72px 24px' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: '44px' }}>
          <h2 className="display" style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', marginBottom: '12px' }}>{t('channelsTitle')}</h2>
          <p style={{ color: 'var(--text2)', fontSize: '16px' }}>{t('channelsSub')}</p>
        </div>
        <div className="grid-channels reveal">
          {([['phoneCall', 'ch1', 'ch1d', true], ['smartphone', 'ch2', 'ch2d', true], ['mic', 'ch3', 'ch3d', false], ['type', 'ch4', 'ch4d', false]] as const).map(([icon, l, d, offline], i) => (
            <div key={i} className="card card-hover" style={{ padding: '28px 22px', textAlign: 'center', position: 'relative' }}>
              {offline && (
                <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', color: 'var(--gold)', background: 'var(--gold-soft)', padding: '3px 9px', borderRadius: '100px', textTransform: 'uppercase' }}>
                  offline
                </span>
              )}
              <span className={`icon-box ${offline ? 'icon-box-gold' : ''}`} style={{ width: '50px', height: '50px', marginBottom: '16px' }}>
                <Icon name={icon} size={23} />
              </span>
              <div className="display" style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>{t(l)}</div>
              <div style={{ fontSize: '13.5px', color: 'var(--text3)', lineHeight: 1.5 }}>{t(d)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ВОЗМОЖНОСТИ */}
      <section id="features" style={{ background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 18%, var(--bg-elev) 82%, var(--bg) 100%)' }}>
        <div className="wrap" style={{ padding: '88px 24px' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '44px' }}>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', marginBottom: '12px' }}>{t('featTitle')}</h2>
            <p style={{ color: 'var(--text2)', fontSize: '16px' }}>{t('featSub')}</p>
          </div>
          <div className="grid-feature reveal">
            {([['cloudSun', 'feat1t', 'feat1d'], ['banknote', 'feat2t', 'feat2d'], ['brain', 'feat3t', 'feat3d'], ['languages', 'feat4t', 'feat4d']] as const).map(([icon, tt, dd], i) => (
              <div key={i} className="card card-hover" style={{ padding: '30px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <span className="icon-box" style={{ width: '48px', height: '48px' }}>
                  <Icon name={icon} size={22} />
                </span>
                <div>
                  <div className="display" style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>{t(tt)}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text2)', lineHeight: 1.65 }}>{t(dd)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Ornament />

      {/* CTA */}
      <section className="wrap-sm" style={{ padding: '72px 24px 88px' }}>
        <div className="reveal" style={{ position: 'relative', overflow: 'hidden', padding: '56px 32px', textAlign: 'center', background: 'linear-gradient(160deg, #fffdf4, #f4ebd2)', border: '1px solid var(--border)', borderRadius: '24px', boxShadow: 'var(--shadow-card)' }}>
          {/* мягкое солнечное свечение */}
          <div aria-hidden="true" style={{ position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)', width: '460px', height: '300px', background: 'radial-gradient(ellipse, rgba(224,166,58,0.22) 0%, transparent 65%)', pointerEvents: 'none', animation: 'sun-breathe 7s ease-in-out infinite' }} />
          <div style={{ position: 'relative' }}>
            <h2 className="display" style={{ fontSize: 'clamp(24px, 3.5vw, 34px)', marginBottom: '14px' }}>
              {t('ctaTitle')}
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '16px', maxWidth: '440px', margin: '0 auto 32px' }}>
              {t('ctaSub')}
            </p>
            <Link href="/register" className="btn btn-primary btn-lg">
              {t('ctaBtn')} <Icon name="arrowRight" size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '28px 0', background: 'linear-gradient(180deg, var(--bg), var(--bg-elev))' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="brand">
            <span className="brand-mark" style={{ width: '30px', height: '30px' }}><Icon name="wheat" size={16} /></span>
            <span className="brand-name" style={{ fontSize: '15px' }}>AgroVoice</span>
          </div>
          <span style={{ color: 'var(--text3)', fontSize: '13.5px' }}>{t('tagline')} · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}

/* мокап SMS-переписки с живой печатью ответа агронома */
function SmsMock({ t }: { t: (k: any) => string }) {
  const answer = t('mockA')
  // фазы: q — виден вопрос, dots — агроном «печатает», typing — печатает текст, done
  const [phase, setPhase] = useState<'q' | 'dots' | 'typing' | 'done'>('q')
  const [shown, setShown] = useState('')

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setPhase('done'); setShown(answer); return }
    let raf = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setPhase('dots'), 900))
    timers.push(setTimeout(() => setPhase('typing'), 2100))
    setShown('')
    return () => { timers.forEach(clearTimeout); cancelAnimationFrame(raf) }
  }, [answer])

  useEffect(() => {
    if (phase !== 'typing') return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setShown(answer.slice(0, i))
      if (i >= answer.length) { clearInterval(id); setPhase('done') }
    }, 22)
    return () => clearInterval(id)
  }, [phase, answer])

  return (
    <div className="card" style={{ padding: '20px', borderRadius: '20px', boxShadow: 'var(--shadow-card)', maxWidth: '440px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '14px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
        <span className="icon-box icon-box-gold" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
          <Icon name="smartphone" size={17} />
        </span>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: '14.5px', fontWeight: 800 }}>AgroVoice</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text3)' }}>{t('mockTitle')}</div>
        </div>
        <span className="pill">
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'glow-pulse 2s ease-in-out infinite' }} />
          24/7
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '210px' }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '88%', padding: '11px 14px', fontSize: '13.5px', lineHeight: 1.55, background: '#e2eeda', border: '1px solid #c4dcb5', borderRadius: '14px 14px 4px 14px', color: 'var(--text)', animation: 'fadeUp 0.4s ease both' }}>
          {t('mockQ')}
        </div>

        {phase === 'dots' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', animation: 'fadeUp 0.3s ease both' }}>
            <span className="brand-mark" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }}>
              <Icon name="wheat" size={13} />
            </span>
            <div style={{ padding: '13px 16px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px', display: 'flex', gap: '5px', alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: `bounce-dot 1.2s ${i * 0.2}s ease-in-out infinite`, display: 'inline-block' }} />
              ))}
            </div>
          </div>
        )}

        {(phase === 'typing' || phase === 'done') && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', animation: 'fadeUp 0.3s ease both' }}>
            <span className="brand-mark" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }}>
              <Icon name="wheat" size={13} />
            </span>
            <div style={{ maxWidth: '88%', padding: '12px 14px', fontSize: '13.5px', lineHeight: 1.6, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px', color: 'var(--text)' }}>
              {shown}
              {phase === 'typing' && (
                <span style={{ display: 'inline-block', width: '2px', height: '13px', background: 'var(--accent)', marginLeft: '1px', verticalAlign: 'text-bottom', animation: 'blink 0.8s step-end infinite' }} />
              )}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '36px', color: 'var(--text-dim)', fontSize: '11.5px', animation: 'fadeIn 0.4s ease both' }}>
            <Icon name="check" size={12} style={{ color: 'var(--accent)' }} />
            SMS · 0:47
          </div>
        )}
      </div>
    </div>
  )
}

/* декоративный пейзаж: холмы, живое солнце, качающиеся колосья + параллакс */
function FieldScape() {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30)
  const sunRef = useRef<SVGGElement>(null)
  const farRef = useRef<SVGPathElement>(null)
  const nearRef = useRef<SVGPathElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        // слои движутся с разной скоростью — эффект глубины
        if (sunRef.current) sunRef.current.style.transform = `translateY(${y * 0.22}px)`
        if (farRef.current) farRef.current.style.transform = `translateY(${y * 0.1}px)`
        if (nearRef.current) nearRef.current.style.transform = `translateY(${y * 0.045}px)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div ref={wrapRef} aria-hidden="true" style={{ lineHeight: 0, marginTop: '8px' }}>
      <svg viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" style={{ width: '100%', height: 'clamp(100px, 15vw, 210px)', display: 'block' }}>
        {/* солнце с вращающимися лучами (параллакс-слой) */}
        <g ref={sunRef} style={{ willChange: 'transform' }}>
          <g style={{ transformOrigin: '1150px 58px', animation: 'ray-spin 60s linear infinite' }}>
            {rays.map(a => (
              <line key={a} x1="1150" y1="58" x2="1150" y2="8"
                stroke="#e8b54a" strokeWidth="2.5" strokeLinecap="round" opacity="0.28"
                transform={`rotate(${a} 1150 58)`} />
            ))}
          </g>
          <circle cx="1150" cy="58" r="52" fill="#e8b54a" style={{ transformOrigin: '1150px 58px', animation: 'sun-breathe 6s ease-in-out infinite' }} opacity="0.18" />
          <circle cx="1150" cy="58" r="34" fill="#e8b54a" opacity="0.9" />
        </g>

        {/* дальние холмы (параллакс-слой) */}
        <path ref={farRef} style={{ willChange: 'transform' }} d="M0 140 Q 240 70 520 118 T 1040 108 T 1440 122 V210 H0 Z" fill="#a9bf7e" opacity="0.55" />
        {/* ближние холмы (параллакс-слой) */}
        <path ref={nearRef} style={{ willChange: 'transform' }} d="M0 168 Q 320 108 660 148 T 1440 152 V210 H0 Z" fill="#7fa055" opacity="0.8" />
        {/* поле */}
        <path d="M0 186 Q 480 158 900 178 T 1440 180 V200 H0 Z" fill="#3f7040" />

        {/* колосья, качаются на ветру */}
        {[70, 110, 150, 190, 1250, 1290, 1330, 1370].map((x, i) => (
          <g key={i} transform={`translate(${x} ${148 + (i % 3) * 6})`}
            style={{ transformOrigin: `${x}px 200px`, animation: `sway-stalk ${3.2 + (i % 4) * 0.5}s ease-in-out ${i * 0.3}s infinite` }}>
            <line x1="0" y1="44" x2="0" y2="4" stroke="#c9891d" strokeWidth="2.4" strokeLinecap="round" />
            {[8, 15, 22, 29].map(y => (
              <g key={y}>
                <path d={`M0 ${y} q -7 -4 -9 -11`} stroke="#d19a2e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <path d={`M0 ${y} q 7 -4 9 -11`} stroke="#d19a2e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              </g>
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
}

/* казахский орнамент «қошқар мүйіз» (бараньи рога) — культурный разделитель */
function Ornament() {
  return (
    <div className="wrap" style={{ padding: '8px 24px' }}>
      <svg className="ornament" viewBox="0 0 480 26" preserveAspectRatio="xMidYMid meet" aria-hidden="true" fill="none">
        <defs>
          <pattern id="qoshqar" x="0" y="0" width="60" height="26" patternUnits="userSpaceOnUse">
            <path d="M30 13 C 30 4, 18 4, 18 12 C 18 18, 24 18, 24 13 M30 13 C 30 4, 42 4, 42 12 C 42 18, 36 18, 36 13 M30 13 L30 22"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <circle cx="30" cy="13" r="1.6" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="480" height="26" fill="url(#qoshqar)" />
      </svg>
    </div>
  )
}
