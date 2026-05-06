'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFields, getStats, Field, Stats, formatDate, getCropEmoji } from '@/lib/api'
import AddFieldModal from '@/components/AddFieldModal'

export default function DashboardPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [fields, setFields] = useState<Field[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('farmer_id')
    const n = localStorage.getItem('farmer_name')
    if (!id) { router.push('/login'); return }
    setName(n || 'Фермер')
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'rgba(6,10,6,0.92)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--accent-dim)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>🌾</div>
          <span style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.3px' }}>AgriVoice</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text2)' }}>{name} 👋</span>
          <button onClick={() => { localStorage.clear(); router.push('/') }}
            style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}>
            Выйти
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {/* СТАТИСТИКА */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '40px' }}>
          {[
            { icon: '🌾', val: loading ? '—' : String(stats?.total_fields ?? 0), label: 'Полей', sub: 'активных' },
            { icon: '💬', val: loading ? '—' : String(stats?.monthly_consultations ?? 0), label: 'Консультаций', sub: 'за этот месяц' },
            { icon: '⏱', val: loading ? '—' : (stats?.last_activity ? formatDate(stats.last_activity) : '—'), label: 'Последний запрос', sub: '' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', animation: `fadeUp 0.5s ${i * 0.08}s ease both` }}>
              <div style={{ fontSize: '20px', marginBottom: '12px' }}>{s.icon}</div>
              <div style={{ fontSize: '30px', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', lineHeight: 1, marginBottom: '6px' }}>{s.val}</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* ЗАГОЛОВОК */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.3px' }}>
            Мои поля
            {!loading && fields.length > 0 && <span style={{ marginLeft: '8px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)', fontWeight: 400 }}>{fields.length}</span>}
          </h2>
          <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#030703', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(74,222,128,0.2)', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#86efac'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            + Добавить поле
          </button>
        </div>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '14px' }}>
            {[1, 2].map(i => <div key={i} style={{ height: '180px', borderRadius: '16px' }} className="skeleton" />)}
          </div>
        )}

        {!loading && fields.length === 0 && (
          <div style={{ padding: '80px 24px', textAlign: 'center', border: '1px dashed var(--border2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>🌱</div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Добавьте первое поле</h3>
            <p style={{ color: 'var(--text2)', marginBottom: '28px' }}>Агент запомнит всю историю и будет давать точные советы</p>
            <button onClick={() => setShowModal(true)} style={{ padding: '14px 28px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#030703', fontWeight: 800, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}>
              + Добавить поле
            </button>
          </div>
        )}

        {!loading && fields.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '14px' }}>
            {fields.map((f, i) => <FieldCard key={f.id} field={f} index={i} onClick={() => router.push(`/field/${f.id}`)} />)}
          </div>
        )}
      </main>

      {showModal && <AddFieldModal onClose={() => setShowModal(false)} onAdded={reload} />}
    </div>
  )
}

function FieldCard({ field, index, onClick }: { field: Field; index: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ padding: '24px', cursor: 'pointer', background: hovered ? 'var(--bg-card2)' : 'var(--bg-card)', border: `1px solid ${hovered ? 'var(--border2)' : 'var(--border)'}`, borderRadius: '16px', transition: 'all 0.2s', transform: hovered ? 'translateY(-3px)' : 'translateY(0)', boxShadow: hovered ? 'var(--shadow-green)' : 'none', animation: `fadeUp 0.5s ${index * 0.06}s ease both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--accent-dim)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{getCropEmoji(field.crop_type)}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.2px' }}>{field.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{field.crop_type}</div>
          </div>
        </div>
        <div style={{ padding: '4px 10px', background: 'var(--accent-dim)', border: '1px solid var(--border2)', borderRadius: '100px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', fontWeight: 600 }}>{field.area_ha} га</div>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '20px', minHeight: '40px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {field.last_agent_message ? `🌾 ${field.last_agent_message}` : <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Консультаций ещё не было</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{formatDate(field.last_activity || field.created_at)}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: hovered ? 'var(--accent)' : 'var(--text2)', transition: 'color 0.15s' }}>Открыть →</span>
      </div>
    </div>
  )
}
