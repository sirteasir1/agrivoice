'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getField, getFieldHistory, getFieldWeather, sendMessage, Field, Message, Weather, getFarmerId, getCropEmoji, formatTime } from '@/lib/api'
import { startListening, stopListening, speak, stopSpeaking } from '@/lib/speech'
import Icon from '@/components/Icon'
import { useLang, LangToggle } from '@/lib/i18n'

type MicState = 'idle' | 'listening' | 'processing'

const weatherIcon = (code: number): string => {
  if (code === 0) return 'sun'
  if (code <= 2) return 'cloudSun'
  if (code === 3) return 'cloud'
  if (code <= 48) return 'cloudFog'
  if (code <= 67) return 'cloudRain'
  if (code <= 77) return 'cloudSnow'
  if (code <= 82) return 'cloudRain'
  if (code <= 86) return 'cloudSnow'
  return 'cloudLightning'
}

export default function FieldPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const { lang, setLang, t } = useLang()
  const [field, setField] = useState<Field | null>(null)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [micState, setMicState] = useState<MicState>('idle')
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'done'>('idle')
  const [typingIdx, setTypingIdx] = useState(-1)
  const [mounted, setMounted] = useState(false)  // fix hydration
  const recogRef = useRef<SpeechRecognition | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const statusText = { idle: t('micIdle'), listening: t('micListening'), thinking: t('micThinking'), done: t('micDone') }[status]

  // Fix hydration — рендерим только после mount на клиенте
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!getFarmerId()) { router.push('/login'); return }
    Promise.all([
      getField(id).then(setField).catch(() => router.push('/dashboard')),
      getFieldHistory(id).then(setMessages).catch(() => {})
    ]).finally(() => setLoading(false))
    getFieldWeather(id).then(setWeather).catch(() => {})  // нет локации — просто без погоды
  }, [id, mounted])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const submit = useCallback(async (txt: string, ch: 'text' | 'voice') => {
    if (!txt.trim() || sending) return
    const fid = getFarmerId()!
    setMessages(p => [...p, { role: 'user', content: txt.trim(), channel: ch, created_at: new Date().toISOString() }])
    setText(''); setInterim(''); setSending(true); setMicState('processing'); setStatus('thinking')
    try {
      const { answer } = await sendMessage(fid, id, txt.trim(), ch, lang)
      setMessages(p => { setTypingIdx(p.length); return [...p, { role: 'assistant', content: answer, channel: ch, created_at: new Date().toISOString() }] })
      setStatus('done'); setMicState('idle')
      if (ch === 'voice') await speak(answer, lang)
      setTimeout(() => setStatus('idle'), 2000)
    } catch (e: any) {
      setMessages(p => [...p, { role: 'assistant', content: `⚠️ ${e.message}`, channel: ch, created_at: new Date().toISOString() }])
      setMicState('idle'); setStatus('idle')
    } finally { setSending(false) }
  }, [id, sending, lang])

  const handleMic = () => {
    if (micState === 'listening') {
      stopListening(recogRef.current); stopSpeaking()
      setMicState('idle'); setStatus('idle'); setInterim(''); return
    }
    if (micState !== 'idle') return
    stopSpeaking(); setMicState('listening'); setStatus('listening')
    recogRef.current = startListening(
      setInterim,
      (final) => { setInterim(''); if (final.trim()) submit(final, 'voice'); else { setMicState('idle'); setStatus('idle') } },
      (err) => { setMicState('idle'); setStatus('idle'); setInterim(''); alert(err) },
      lang,
    )
  }

  // Пока не смонтировано — пустой экран (без мигания)
  if (!mounted) return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      {/* ХЕДЕР */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'rgba(250,246,234,0.94)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px' }}>
          <Link href="/dashboard" className="btn-icon" style={{ width: '40px', height: '40px', borderRadius: '10px' }} aria-label={t('back')}>
            <Icon name="arrowLeft" size={17} />
          </Link>
          {field ? (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="icon-box" style={{ width: '42px', height: '42px', fontSize: '20px' }} aria-hidden="true">
                {getCropEmoji(field.crop_type)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="display" style={{ fontWeight: 800, fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{field.name}</div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '2px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 800 }}>{t(`crop_${field.crop_type.toLowerCase()}` as any)}</span>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--text3)' }}>{field.area_ha} {t('ha')}</span>
                  {field.location && (
                    <span style={{ fontSize: '12px', color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Icon name="mapPin" size={11} />{field.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, height: '40px' }} className="skeleton" />
          )}
          <LangToggle lang={lang} setLang={setLang} />
        </div>

        {/* ПОГОДА НА 5 ДНЕЙ */}
        {weather && (
          <div style={{ padding: '0 20px 12px' }}>
            <div className="weather-strip">
              {weather.days.map((d, i) => (
                <div key={d.date} className="weather-day" title={lang === 'kk' ? d.desc_kk : d.desc_ru}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text3)', textTransform: 'capitalize', marginBottom: '6px' }}>
                    {i === 0
                      ? t('today')
                      : new Date(d.date + 'T00:00').toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { weekday: 'short' })}
                  </div>
                  <Icon name={weatherIcon(d.code)} size={22} style={{ color: d.code === 0 ? 'var(--gold)' : 'var(--accent)', marginBottom: '4px' }} />
                  <div className="mono" style={{ fontSize: '12.5px', fontWeight: 600 }}>
                    {d.t_max}° <span style={{ color: 'var(--text-dim)' }}>{d.t_min}°</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '3px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Icon name="droplets" size={9} />{d.precip_prob}%</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Icon name="wind" size={9} />{d.wind_max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* СООБЩЕНИЯ */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' }}>
          {loading && [1, 2, 3].map(i => (
            <div key={i} style={{ height: '52px', width: i % 2 ? '55%' : '65%', alignSelf: i % 2 ? 'flex-start' : 'flex-end', borderRadius: '12px' }} className="skeleton" />
          ))}

          {!loading && messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
              <span className="icon-box icon-box-gold" style={{ width: '66px', height: '66px', borderRadius: '18px', marginBottom: '20px', animation: 'float 3s ease-in-out infinite' }}>
                <Icon name="sprout" size={31} />
              </span>
              <h3 className="display" style={{ fontSize: '20px', marginBottom: '10px' }}>{t('chatEmptyTitle')}</h3>
              <p style={{ color: 'var(--text2)', fontSize: '15px', maxWidth: '330px', lineHeight: 1.6, marginBottom: '26px' }}>
                {t('chatEmptySub')}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[t('hint1'), t('hint2'), t('hint3')].map(h => (
                  <button key={h} className="chip" onClick={() => { setText(h); inputRef.current?.focus() }}>
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} isNew={i >= messages.length - 2} useTyping={i === typingIdx} t={t} />
          ))}

          {sending && <TypingDots />}

          {interim && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(46,107,52,0.06)', border: '1.5px dashed var(--border3)', borderRadius: '14px', color: 'var(--text2)', fontSize: '14px', fontStyle: 'italic', maxWidth: '70%' }}>
                {interim}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ПАНЕЛЬ ВВОДА */}
      <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(250,246,234,0.97)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '12px 20px 16px' }}>
          <p className="mono" aria-live="polite" style={{ textAlign: 'center', fontSize: '11.5px', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.3px', transition: 'color 0.2s', color: micState === 'listening' ? 'var(--accent)' : micState === 'processing' ? 'var(--gold)' : 'var(--text-dim)' }}>
            {statusText}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              ref={inputRef}
              className="input"
              style={{ borderRadius: '14px', opacity: micState === 'listening' ? 0.4 : 1 }}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submit(text, 'text'))}
              placeholder={t('inputPlaceholder')}
              disabled={sending || micState === 'listening'}
              aria-label={t('inputPlaceholder')}
            />

            <MicBtn state={micState} onClick={handleMic} disabled={sending && micState !== 'listening'} />

            <button
              onClick={() => submit(text, 'text')}
              disabled={!text.trim() || sending}
              aria-label="→"
              style={{ width: '50px', height: '50px', borderRadius: '14px', border: 'none', background: text.trim() && !sending ? 'var(--accent)' : 'var(--bg-card2)', color: text.trim() && !sending ? '#fdfbef' : 'var(--text-dim)', cursor: text.trim() && !sending ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0, boxShadow: text.trim() && !sending ? '0 4px 14px rgba(46,107,52,0.3)' : 'none' }}>
              <Icon name="send" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bubble({ msg, isNew, useTyping, t }: { msg: Message; isNew: boolean; useTyping: boolean; t: (k: any) => string }) {
  const isUser = msg.role === 'user'
  const [shown, setShown] = useState(!isNew)
  const [display, setDisplay] = useState(useTyping && !isUser ? '' : msg.content)

  useEffect(() => { if (isNew) setTimeout(() => setShown(true), 30) }, [])

  useEffect(() => {
    if (!useTyping || isUser) return
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplay(msg.content.slice(0, i))
      if (i >= msg.content.length) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [msg.content, useTyping])

  const channelIcon: Record<string, string> = { voice: 'mic', text: 'type', sms: 'smartphone', call: 'phone' }
  const channelKey: Record<string, string> = { voice: 'chVoice', text: 'chText', sms: 'chSms', call: 'chCall' }

  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '10px', opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.25s, transform 0.25s' }}>
      {!isUser && (
        <span className="brand-mark" style={{ width: '32px', height: '32px', borderRadius: '50%' }}>
          <Icon name="wheat" size={15} />
        </span>
      )}
      <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{ padding: '12px 16px', fontSize: '15px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: isUser ? '#e2eeda' : 'var(--bg-card)', border: `1px solid ${isUser ? '#c4dcb5' : 'var(--border)'}`, borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px', boxShadow: 'var(--shadow-soft)' }}>
          {display}
          {useTyping && !isUser && display.length < msg.content.length && (
            <span style={{ display: 'inline-block', width: '2px', height: '14px', background: 'var(--accent)', marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'blink 0.8s step-end infinite' }} />
          )}
        </div>
        <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <Icon name={channelIcon[msg.channel] || 'type'} size={10} />
          <span>{t(channelKey[msg.channel] || 'chText')}</span>
          {msg.created_at && <span>· {formatTime(msg.created_at)}</span>}
        </div>
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
      <span className="brand-mark" style={{ width: '32px', height: '32px', borderRadius: '50%' }}>
        <Icon name="wheat" size={15} />
      </span>
      <div style={{ padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: '5px', alignItems: 'center' }}>
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
        <div style={{ position: 'absolute', width: '50px', height: '50px', borderRadius: '50%', border: '2px solid var(--accent)', animation: 'pulse-ring 1.4s ease-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '50px', height: '50px', borderRadius: '50%', border: '2px solid var(--accent)', animation: 'pulse-ring2 1.4s 0.4s ease-out infinite', pointerEvents: 'none' }} />
      </>}
      {processing && (
        <div style={{ position: 'absolute', width: '58px', height: '58px', borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--gold)', animation: 'spin 0.7s linear infinite', pointerEvents: 'none' }} />
      )}
      <button onClick={onClick} disabled={disabled || processing}
        aria-label="🎙"
        style={{ width: '50px', height: '50px', borderRadius: '50%', background: listening ? 'var(--accent)' : 'var(--bg-card)', border: `2px solid ${listening ? 'var(--accent)' : 'var(--border)'}`, color: listening ? '#fdfbef' : 'var(--text2)', cursor: disabled || processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', position: 'relative', zIndex: 1, boxShadow: listening ? '0 4px 18px rgba(46,107,52,0.35)' : 'var(--shadow-soft)' }}>
        <Icon name="mic" size={19} />
      </button>
    </div>
  )
}
