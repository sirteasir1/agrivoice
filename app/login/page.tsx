'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!phone.trim()) { setError('Введите номер телефона'); return }
    setLoading(true); setError('')
    try {
      const data = await login(phone.trim())
      localStorage.setItem('farmer_id', data.farmer_id)
      localStorage.setItem('token', data.token)
      localStorage.setItem('farmer_name', data.name)
      router.push('/dashboard')
    } catch (e: any) { setError(e.message || 'Ошибка входа') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(74,222,128,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1, animation: 'fadeUp 0.5s ease both' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '32px', justifyContent: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-dim)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🌾</div>
          <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.4px' }}>AgriVoice</span>
        </Link>
        <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '8px', textAlign: 'center' }}>С возвращением</h1>
        <p style={{ color: 'var(--text2)', fontSize: '15px', marginBottom: '32px', textAlign: 'center' }}>Введите номер телефона для входа</p>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '28px' }}>
          {error && <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#fca5a5', fontSize: '14px', marginBottom: '20px' }}>{error}</div>}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px', letterSpacing: '0.8px' }}>НОМЕР ТЕЛЕФОНА</label>
            <input type="tel" value={phone} autoFocus onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="+7 700 123 4567"
              style={{ width: '100%', padding: '13px 14px', background: 'var(--bg-input)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--text)', fontSize: '15px', fontFamily: 'JetBrains Mono, monospace', outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border2)'} />
          </div>
          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '15px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#030703', fontSize: '15px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.75 : 1 }}>
            {loading ? 'Входим...' : 'Войти →'}
          </button>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14px', marginTop: '20px' }}>
          Нет аккаунта? <Link href="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
