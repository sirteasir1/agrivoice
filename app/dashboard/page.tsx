'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFields, getStats, Field, Stats, formatDate, getCropEmoji } from '@/lib/api'
import AddFieldModal from '@/components/AddFieldModal'
import Icon from '@/components/Icon'
import { useLang, LangToggle } from '@/lib/i18n'

export default function DashboardPage() {
  const router = useRouter()
  const { lang, setLang, t } = useLang()
  const [name, setName] = useState('')
  const [fields, setFields] = useState<Field[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('farmer_id')
    const n = localStorage.getItem('farmer_name')
    if (!id) { router.push('/login'); return }
    setName(n || '')
    load(id)
  }, [router])

  const load = async (id: string) => {
    setLoading(true)
    try {
      const [f, s] = await Promise.all([getFields(id), getStats(id)])
      setFields(f); setStats(s)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const reload = () => {
    setShowModal(false)
    const id = localStorage.getItem('farmer_id')
    if (id) load(id)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 6) return t('greetNight')
    if (h < 12) return t('greetMorning')
    if (h < 18) return t('greetDay')
    return t('greetEvening')
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <header className="navbar">
        <div className="brand">
          <span className="brand-mark"><Icon name="wheat" size={18} /></span>
          <span className="brand-name">AgroVoice</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LangToggle lang={lang} setLang={setLang} />
          <button onClick={() => { localStorage.clear(); router.push('/') }}
            className="btn btn-danger-ghost btn-sm" aria-label={t('logout')}>
            <Icon name="logOut" size={15} /> {t('logout')}
          </button>
        </div>
      </header>

      <main className="wrap" style={{ paddingTop: '40px', paddingBottom: '64px' }}>
        {/* ПРИВЕТСТВИЕ */}
        <div style={{ marginBottom: '32px', animation: 'fadeUp 0.4s ease both' }}>
          <h1 className="display" style={{ fontSize: 'clamp(23px, 3vw, 31px)', marginBottom: '6px' }}>
            {greeting()}{name ? `, ${name.split(' ')[0]}` : ''}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '15.5px' }}>{t('dashSub')}</p>
        </div>

        {/* СТАТИСТИКА */}
        <div className="grid-stats" style={{ marginBottom: '44px' }}>
          {([
            ['layoutGrid', loading ? '—' : String(stats?.total_fields ?? 0), 'statFields', 'statFieldsSub'],
            ['messageCircle', loading ? '—' : String(stats?.monthly_consultations ?? 0), 'statConsults', 'statConsultsSub'],
            ['clock', loading ? '—' : (stats?.last_activity ? formatDate(stats.last_activity, lang) : '—'), 'statLast', null],
          ] as const).map(([icon, val, label, sub], i) => (
            <div key={i} className="card" style={{ padding: '24px', display: 'flex', gap: '18px', alignItems: 'center', animation: `fadeUp 0.5s ${i * 0.08}s ease both` }}>
              <span className="icon-box" style={{ width: '48px', height: '48px' }}>
                <Icon name={icon} size={21} />
              </span>
              <div>
                <div className="mono" style={{ fontSize: '25px', fontWeight: 700, color: 'var(--accent)', lineHeight: 1.1 }}>{val}</div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '3px' }}>
                  {t(label)}
                  {sub && <span style={{ color: 'var(--text3)', fontWeight: 500 }}> · {t(sub)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ЗАГОЛОВОК СПИСКА */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <h2 className="display" style={{ fontSize: '21px' }}>
            {t('myFields')}
            {!loading && fields.length > 0 && (
              <span className="mono" style={{ marginLeft: '10px', fontSize: '14px', color: 'var(--text3)', fontWeight: 400 }}>{fields.length}</span>
            )}
          </h2>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> {t('addField')}
          </button>
        </div>

        {loading && (
          <div className="grid-fields">
            {[1, 2].map(i => <div key={i} style={{ height: '186px', borderRadius: '16px' }} className="skeleton" />)}
          </div>
        )}

        {!loading && fields.length === 0 && (
          <div style={{ padding: '80px 24px', textAlign: 'center', border: '2px dashed #d8ceac', borderRadius: '22px', background: 'var(--bg-elev)' }}>
            <span className="icon-box icon-box-gold" style={{ width: '68px', height: '68px', borderRadius: '20px', marginBottom: '20px', animation: 'float 3s ease-in-out infinite' }}>
              <Icon name="sprout" size={32} />
            </span>
            <h3 className="display" style={{ fontSize: '21px', marginBottom: '10px' }}>{t('emptyTitle')}</h3>
            <p style={{ color: 'var(--text2)', marginBottom: '28px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
              {t('emptySub')}
            </p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              <Icon name="plus" size={16} /> {t('addField')}
            </button>
          </div>
        )}

        {!loading && fields.length > 0 && (
          <div className="grid-fields">
            {fields.map((f, i) => (
              <FieldCard key={f.id} field={f} index={i} lang={lang} t={t} onClick={() => router.push(`/field/${f.id}`)} />
            ))}
          </div>
        )}
      </main>

      {showModal && <AddFieldModal onClose={() => setShowModal(false)} onAdded={reload} />}
    </div>
  )
}

function FieldCard({ field, index, lang, t, onClick }: {
  field: Field; index: number; lang: 'ru' | 'kk'; t: (k: any) => string; onClick: () => void
}) {
  const cropLabel = t(`crop_${field.crop_type.toLowerCase()}` as any)
  return (
    <div onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className="card card-hover"
      style={{ padding: '24px', cursor: 'pointer', animation: `fadeUp 0.5s ${index * 0.06}s ease both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <span className="icon-box" style={{ width: '46px', height: '46px', fontSize: '22px' }} aria-hidden="true">
            {getCropEmoji(field.crop_type)}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="display" style={{ fontWeight: 800, fontSize: '16.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{field.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>{cropLabel}</div>
          </div>
        </div>
        <span className="pill mono" style={{ flexShrink: 0 }}>{field.area_ha} {t('ha')}</span>
      </div>

      <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.55, marginBottom: '18px', minHeight: '43px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {field.last_agent_message
          ? field.last_agent_message
          : <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>{t('noConsults')}</span>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <span className="mono" style={{ fontSize: '12px', color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Icon name="clock" size={12} />
          {formatDate(field.last_activity || field.created_at, lang)}
        </span>
        <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {t('open')} <Icon name="chevronRight" size={14} />
        </span>
      </div>
    </div>
  )
}
