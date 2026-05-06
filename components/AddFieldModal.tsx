'use client'
import { useState } from 'react'
import { createField, getFarmerId } from '@/lib/api'

const CROPS = ['пшеница', 'кукуруза', 'подсолнух', 'ячмень', 'хлопок']
const EMOJIS: Record<string, string> = { пшеница: '🌾', кукуруза: '🌽', подсолнух: '🌻', ячмень: '🌱', хлопок: '🌿' }

export default function AddFieldModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [crop, setCrop] = useState('пшеница')
  const [area, setArea] = useState('')
  const [loc, setLoc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) { setError('Введите название поля'); return }
    if (!area || isNaN(+area) || +area <= 0) { setError('Введите площадь в гектарах'); return }
    const id = getFarmerId(); if (!id) return
    setLoading(true); setError('')
    try {
      await createField(id, { name: name.trim(), crop_type: crop, area_ha: +area, location: loc.trim() || undefined })
      onAdded()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', animation: 'fadeUp 0.25s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.3px' }}>Добавить поле</h2>
          <button onClick={onClose} style={{ width: '32px', height: '32px', background: 'none', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--text2)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', marginBottom: '20px' }}>{error}</div>}

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px', letterSpacing: '0.8px' }}>НАЗВАНИЕ ПОЛЯ</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Северное, Участок №3..."
            style={{ width: '100%', padding: '12px 13px', background: 'var(--bg-input)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--text)', fontSize: '14px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border2)'} />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px', letterSpacing: '0.8px' }}>КУЛЬТУРА</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
            {CROPS.map(c => (
              <button key={c} onClick={() => setCrop(c)} style={{ padding: '10px 6px', background: crop === c ? 'var(--accent-dim)' : 'var(--bg-input)', border: `1px solid ${crop === c ? 'var(--accent)' : 'var(--border2)'}`, borderRadius: '10px', color: crop === c ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}>
                <span style={{ fontSize: '18px' }}>{EMOJIS[c]}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px', letterSpacing: '0.8px' }}>ПЛОЩАДЬ (ГА)</label>
          <input type="number" value={area} onChange={e => setArea(e.target.value)} placeholder="40" min="0.1" step="0.1"
            style={{ width: '100%', padding: '12px 13px', background: 'var(--bg-input)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--text)', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border2)'} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px', letterSpacing: '0.8px' }}>МЕСТОПОЛОЖЕНИЕ <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(необязательно)</span></label>
          <input value={loc} onChange={e => setLoc(e.target.value)} placeholder="Акмолинская обл."
            style={{ width: '100%', padding: '12px 13px', background: 'var(--bg-input)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--text)', fontSize: '14px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border2)'} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px', background: 'none', border: '1px solid var(--border2)', borderRadius: '10px', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700 }}>Отмена</button>
          <button onClick={submit} disabled={loading} style={{ flex: 2, padding: '13px', background: loading ? 'var(--accent2)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: '#030703', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 800, opacity: loading ? 0.8 : 1 }}>
            {loading ? 'Добавляем...' : '+ Добавить поле'}
          </button>
        </div>
      </div>
    </div>
  )
}
