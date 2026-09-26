'use client'
import { useEffect, useState } from 'react'
import { createField, getFarmerId } from '@/lib/api'
import Icon from '@/components/Icon'
import { useLang } from '@/lib/i18n'

const CROPS = ['пшеница', 'кукуруза', 'подсолнух', 'ячмень', 'хлопок']
const EMOJIS: Record<string, string> = { пшеница: '🌾', кукуруза: '🌽', подсолнух: '🌻', ячмень: '🌱', хлопок: '🌿' }

export default function AddFieldModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [crop, setCrop] = useState('пшеница')
  const [area, setArea] = useState('')
  const [loc, setLoc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async () => {
    if (!name.trim()) { setError(t('errFieldName')); return }
    if (!area || isNaN(+area) || +area <= 0) { setError(t('errArea')); return }
    const id = getFarmerId(); if (!id) return
    setLoading(true); setError('')
    try {
      await createField(id, { name: name.trim(), crop_type: crop, area_ha: +area, location: loc.trim() || undefined })
      onAdded()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(48, 40, 20, 0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', animation: 'fadeIn 0.2s ease both' }}>
      <div role="dialog" aria-modal="true" aria-label={t('modalTitle')}
        className="card"
        style={{ borderRadius: 'var(--r-xl)', padding: '32px', width: '100%', maxWidth: '460px', maxHeight: '90dvh', overflowY: 'auto', boxShadow: 'var(--shadow-card)', animation: 'fadeUp 0.25s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 className="display" style={{ fontSize: '21px' }}>{t('modalTitle')}</h2>
          <button onClick={onClose} className="btn-icon" style={{ width: '38px', height: '38px' }} aria-label="×">
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && (
          <div className="error-box" style={{ marginBottom: '20px', fontSize: '13.5px' }} role="alert">{error}</div>
        )}

        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="f-name" className="field-label">{t('fieldNameLabel')}</label>
          <input id="f-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder={t('fieldNamePh')} autoFocus />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <span className="field-label">{t('cropLabel')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(78px, 1fr))', gap: '8px' }}>
            {CROPS.map(c => (
              <button key={c} type="button" onClick={() => setCrop(c)}
                aria-pressed={crop === c}
                style={{
                  padding: '12px 6px', minHeight: '70px',
                  background: crop === c ? 'var(--accent-dim)' : 'var(--bg-input)',
                  border: `1.5px solid ${crop === c ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '12px',
                  color: crop === c ? 'var(--accent)' : 'var(--text2)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 800,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                  transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: '21px' }} aria-hidden="true">{EMOJIS[c]}</span>
                <span>{t(`crop_${c}` as any)}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="f-area" className="field-label">{t('areaLabel')}</label>
          <input id="f-area" className="input mono" type="number" inputMode="decimal" value={area} onChange={e => setArea(e.target.value)} placeholder="40" min="0.1" step="0.1" />
        </div>

        <div style={{ marginBottom: '26px' }}>
          <label htmlFor="f-loc" className="field-label">
            {t('locLabel')} <span style={{ color: 'var(--gold)', fontWeight: 600, textTransform: 'none' }}>{t('locOptional')}</span>
          </label>
          <input id="f-loc" className="input" value={loc} onChange={e => setLoc(e.target.value)} placeholder={t('locPh')} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>{t('cancel')}</button>
          <button onClick={submit} disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
            {loading ? t('adding') : <><Icon name="plus" size={16} /> {t('addBtn')}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
