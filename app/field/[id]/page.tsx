'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getField, getFieldHistory, sendMessage, Field, Message, getFarmerId, getCropEmoji, formatTime } from '@/lib/api'
import { startListening, stopListening, speak, isSpeechSupported, stopSpeaking } from '@/lib/speech'

type MicState = 'idle' | 'listening' | 'processing'

export default function FieldPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [field, setField] = useState<Field | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [micState, setMicState] = useState<MicState>('idle')
  const [status, setStatus] = useState('Нажмите чтобы говорить')
  const [typingIdx, setTypingIdx] = useState(-1)
  const [mounted, setMounted] = useState(false)  // fix hydration
  const recogRef = useRef<SpeechRecognition | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fix hydration — рендерим только после mount на клиенте
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!getFarmerId()) { router.push('/login'); return }
    Promise.all([
      getField(id).then(setField).catch(() => router.push('/dashboard')),
      getFieldHistory(id).then(setMessages).catch(() => {})
    ]).finally(() => setLoading(false))
  }, [id, mounted])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const submit = useCallback(async (txt: string, ch: 'text' | 'voice') => {
    if (!txt.trim() || sending) return
    const fid = getFarmerId()!
    setMessages(p => [...p, { role: 'user', content: txt.trim(), channel: ch, created_at: new Date().toISOString() }])
    setText(''); setInterim(''); setSending(true); setMicState('processing'); setStatus('Думаю...')
    try {
      const { answer } = await sendMessage(fid, id, txt.trim(), ch)
      setMessages(p => { setTypingIdx(p.length); return [...p, { role: 'assistant', content: answer, channel: ch, created_at: new Date().toISOString() }] })
      setStatus('Готово ✓'); setMicState('idle')
      if (ch === 'voice') await speak(answer)
      setTimeout(() => setStatus('Нажмите чтобы говорить'), 2000)
    } catch (e: any) {
      setMessages(p => [...p, { role: 'assistant', content: `⚠️ ${e.message}`, channel: ch, created_at: new Date().toISOString() }])
      setMicState('idle'); setStatus('Нажмите чтобы говорить')
    } finally { setSending(false) }
  }, [id, sending])

  const handleMic = () => {
    if (micState === 'listening') {
      stopListening(recogRef.current); stopSpeaking()
      setMicState('idle'); setStatus('Нажмите чтобы говорить'); setInterim(''); return
    }
    if (micState !== 'idle') return
    stopSpeaking(); setMicState('listening'); setStatus('Слушаю...')
    recogRef.current = startListening(
      setInterim,
      (final) => { setInterim(''); if (final.trim()) submit(final, 'voice'); else { setMicState('idle'); setStatus('Нажмите чтобы говорить') } },
      (err) => { setMicState('idle'); setStatus('Нажмите чтобы говорить'); setInterim(''); alert(err) }
    )
  }

  // Пока не смонтировано — пустой экран (без мигания)
  if (!mounted) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {/* ХЕДЕР */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(6,10,6,0.95)', backdropFilter: 'blur(16px)', flexShrink: 0, zIndex: 10 }}>
        <Link href="/dashboard"
          style={{ width: '34px', height: '34px', border: '1px solid var(--border2)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', textDecoration: 'none', fontSize: '16px', transition: 'all 0.15s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}>
          ←
        </Link>
        {field ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>{getCropEmoji(field.crop_type)}</span>
              <span style={{ fontWeight: 900, fontSize: '16px', letterSpacing: '-0.2px' }}>{field.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--accent-dim)', border: '1px solid var(--border2)', borderRadius: '100px', color: 'var(--accent)', fontWeight: 700 }}>{field.crop_type}</span>
              <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{field.area_ha} га</span>
              {field.location && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>📍 {field.location}</span>}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, height: '36px', borderRadius: '8px', background: 'var(--bg-card2)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
        )}
      </header>

      {/* СООБЩЕНИЯ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading && [1, 2, 3].map(i => (
          <div key={i} style={{ height: '52px', width: i % 2 ? '55%' : '65%', alignSelf: i % 2 ? 'flex-start' : 'flex-end', borderRadius: '12px' }} className="skeleton" />
        ))}

        {!loading && messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '44px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>🌾</div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px' }}>Начните консультацию</h3>
            <p style={{ color: 'var(--text2)', fontSize: '14px', maxWidth: '300px', lineHeight: 1.6, marginBottom: '24px' }}>
              Голосом или текстом — расскажите что происходит
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Желтеют листья', 'Когда поливать?', 'Чем болеет?'].map(h => (
                <button key={h} onClick={() => { setText(h); inputRef.current?.focus() }}
                  style={{ padding: '8px 14px', background: 'var(--accent-dim)', border: '1px solid var(--border2)', borderRadius: '100px', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 600 }}>
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Bubble key={i} msg={msg} isNew={i >= messages.length - 2} useTyping={i === typingIdx} />
        ))}

        {sending && <TypingDots />}

        {interim && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ padding: '10px 14px', background: 'rgba(74,222,128,0.06)', border: '1px dashed rgba(74,222,128,0.25)', borderRadius: '12px', color: 'var(--text2)', fontSize: '14px', fontStyle: 'italic', maxWidth: '70%' }}>
              {interim}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ПАНЕЛЬ ВВОДА */}
      <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(6,10,6,0.97)', backdropFilter: 'blur(16px)', padding: '14px 20px 18px', flexShrink: 0 }}>
        <p style={{ textAlign: 'center', fontSize: '11px', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.3px', fontFamily: 'JetBrains Mono, monospace', transition: 'color 0.2s', color: micState === 'listening' ? 'var(--accent)' : micState === 'processing' ? 'var(--text2)' : 'var(--text-dim)' }}>
          {status}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submit(text, 'text'))}
            placeholder="Написать агроному..."
            disabled={sending || micState === 'listening'}
            style={{ flex: 1, padding: '13px 16px', background: 'var(--bg-input)', border: '1px solid var(--border2)', borderRadius: '12px', color: 'var(--text)', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s', opacity: micState === 'listening' ? 0.4 : 1 }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border2)'}
          />

          <MicBtn state={micState} onClick={handleMic} disabled={sending && micState !== 'listening'} />

          <button
            onClick={() => submit(text, 'text')}
            disabled={!text.trim() || sending}
            style={{ width: '46px', height: '46px', borderRadius: '12px', border: 'none', background: text.trim() && !sending ? 'var(--accent)' : 'var(--bg-card2)', cursor: text.trim() && !sending ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke={text.trim() && !sending ? '#030703' : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ msg, isNew, useTyping }: { msg: Message; isNew: boolean; useTyping: boolean }) {
  const isUser = msg.role === 'user'
  const [shown, setShown] = useState(!isNew)
  const [display, setDisplay] = useState(useTyping && !isUser ? '' : msg.content)

  useEffect(() => { if (isNew) setTimeout(() => setShown(true), 30) }, [])

  useEffect(() => {
    if (!useTyping || isUser) return
    let i = 0
    const t = setInterval(() => {
      i++
      setDisplay(msg.content.slice(0, i))
      if (i >= msg.content.length) clearInterval(t)
    }, 16)
    return () => clearInterval(t)
  }, [msg.content, useTyping])

  const channelIcon: Record<string, string> = { voice: '🎤', text: '✍️', sms: '📱', call: '📞' }

  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.25s, transform 0.25s' }}>
      {!isUser && (
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
          🌾
        </div>
      )}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{ padding: '12px 15px', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: isUser ? 'linear-gradient(135deg, rgba(74,222,128,0.18), rgba(74,222,128,0.10))' : 'var(--bg-card)', border: `1px solid ${isUser ? 'rgba(74,222,128,0.3)' : 'var(--border2)'}`, borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px' }}>
          {display}
          {useTyping && !isUser && display.length < msg.content.length && (
            <span style={{ display: 'inline-block', width: '2px', height: '14px', background: 'var(--accent)', marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'blink 0.8s step-end infinite' }} />
          )}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', display: 'flex', gap: '5px' }}>
          <span>{channelIcon[msg.channel] || '✍️'}</span>
          {msg.created_at && <span>{formatTime(msg.created_at)}</span>}
        </div>
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>🌾</div>
      <div style={{ padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border2)', borderRadius: '14px 14px 14px 4px', display: 'flex', gap: '5px', alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: `bounce-dot 1.2s ${i * 0.2}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  )
}

function MicBtn({ state, onClick, disabled }: { state: MicState; onClick: () => void; disabled?: boolean }) {
  const listening = state === 'listening'
  const processing = state === 'processing'
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {listening && <>
        <div style={{ position: 'absolute', width: '46px', height: '46px', borderRadius: '50%', border: '2px solid var(--accent)', animation: 'pulse-ring 1.4s ease-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '46px', height: '46px', borderRadius: '50%', border: '2px solid var(--accent)', animation: 'pulse-ring2 1.4s 0.4s ease-out infinite', pointerEvents: 'none' }} />
      </>}
      {processing && (
        <div style={{ position: 'absolute', width: '54px', height: '54px', borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite', pointerEvents: 'none' }} />
      )}
      <button onClick={onClick} disabled={disabled || processing}
        style={{ width: '46px', height: '46px', borderRadius: '50%', background: listening ? 'rgba(74,222,128,0.12)' : 'var(--bg-card2)', border: `2px solid ${listening ? 'var(--accent)' : 'var(--border2)'}`, cursor: disabled || processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', position: 'relative', zIndex: 1, boxShadow: listening ? '0 0 24px rgba(74,222,128,0.25)' : 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="12" rx="3" fill={listening ? 'var(--accent)' : 'var(--text2)'} />
          <path d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11" stroke={listening ? 'var(--accent)' : 'var(--text2)'} strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="18" x2="12" y2="22" stroke={listening ? 'var(--accent)' : 'var(--text2)'} strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="22" x2="15" y2="22" stroke={listening ? 'var(--accent)' : 'var(--text2)'} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
