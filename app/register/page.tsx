'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/lib/api'
import Icon from '@/components/Icon'
import { useLang, LangToggle } from '@/lib/i18n'

export default function RegisterPage() {
  const router = useRouter()
  const { lang, setLang, t } = useLang()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t('errName')); return }
    if (!phone.trim() || phone.trim().length < 10) { setError(t('errPhoneValid')); return }
    setLoading(true); setError('')
    try {
      const data = await register(name.trim(), phone.trim())
      localStorage.setItem('farmer_id', data.farmer_id)
      localStorage.setItem('token', data.token)
      localStorage.setItem('farmer_name', data.name)
      router.push('/dashboard')
    } catch (e: any) { setError(e.message || 'Ошибка регистрации') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(180deg, var(--bg-elev), var(--bg))' }}>
      <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeUp 0.5s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <Link href="/" className="brand" style={{ justifyContent: 'center', marginBottom: '30px' }}>
          <span className="brand-mark" style={{ width: '42px', height: '42px', borderRadius: '12px' }}><Icon name="wheat" size={21} /></span>
          <span className="brand-name" style={{ fontSize: '20px' }}>AgroVoice</span>
        </Link>
        <h1 className="display" style={{ fontSize: '27px', marginBottom: '8px', textAlign: 'center' }}>{t('createAccount')}</h1>
        <p style={{ color: 'var(--text2)', fontSize: '15px', marginBottom: '30px', textAlign: 'center' }}>{t('registerSub')}</p>

        <div className="card" style={{ borderRadius: 'var(--r-xl)', padding: '28px', boxShadow: 'var(--shadow-card)' }}>
          {error && (
            <div className="error-box" style={{ marginBottom: '20px' }} role="alert">
              <Icon name="x" size={15} style={{ marginTop: '2px', flexShrink: 0 }} />
              {error}
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="name" className="field-label">{t('nameLabel')}</label>
            <input
              id="name" autoFocus autoComplete="name"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={t('namePlaceholder')}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="phone" className="field-label">{t('phoneLabel')}</label>
            <input
              id="phone" type="tel" inputMode="tel" autoComplete="tel"
              className="input mono"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="+7 700 123 4567"
            />
            <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="check" size={13} style={{ color: 'var(--accent)' }} />
              {t('phoneHint')}
            </p>
          </div>
          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            {loading ? t('creating') : <>{t('createAccount')} <Icon name="arrowRight" size={16} /></>}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14.5px', marginTop: '22px' }}>
          {t('haveAccount')} <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 800 }}>{t('login')}</Link>
        </p>
      </div>
    </div>
  )
}
