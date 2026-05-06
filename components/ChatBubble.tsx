'use client'

import { useEffect, useState } from 'react'
import { Message, formatTime } from '@/lib/api'

interface Props {
  message: Message
  isNew?: boolean           // Новое сообщение — с анимацией появления
  useTypingEffect?: boolean // Печатать посимвольно (только для assistant)
}

const CHANNEL_ICON: Record<string, string> = {
  voice: '🎤',
  text:  '✍️',
  sms:   '📱',
  call:  '📞',
}

export default function ChatBubble({ message, isNew = false, useTypingEffect = false }: Props) {
  const isUser = message.role === 'user'
  const [displayText, setDisplayText] = useState(
    useTypingEffect && !isUser ? '' : message.content
  )
  const [visible, setVisible] = useState(!isNew)

  // Анимация появления
  useEffect(() => {
    if (isNew) {
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [isNew])

  // Typing effect для ответа агента
  useEffect(() => {
    if (!useTypingEffect || isUser) return
    let i = 0
    const text = message.content
    const interval = setInterval(() => {
      i++
      setDisplayText(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, 18) // Скорость печатания (мс на символ)
    return () => clearInterval(interval)
  }, [message.content, useTypingEffect, isUser])

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '0 4px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : `translateY(${isUser ? '-4px' : '4px'})`,
      transition: 'opacity 0.3s ease, transform 0.3s ease',
    }}>
      {/* Аватар агента */}
      {!isUser && (
        <div style={{
          width: '32px', height: '32px',
          borderRadius: '50%',
          background: 'var(--accent-dim)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          flexShrink: 0,
          marginTop: '2px',
        }}>
          🌾
        </div>
      )}

      {/* Контент */}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* Пузырь */}
        <div style={{
          padding: '13px 16px',
          background: isUser
            ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.12))'
            : 'var(--bg-card)',
          border: `1px solid ${isUser ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
          borderRadius: isUser
            ? '16px 16px 4px 16px'
            : '16px 16px 16px 4px',
          color: 'var(--text-primary)',
          fontSize: '15px',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {displayText}
          {/* Курсор пока печатает */}
          {useTypingEffect && !isUser && displayText.length < message.content.length && (
            <span style={{
              display: 'inline-block',
              width: '2px',
              height: '16px',
              background: 'var(--accent)',
              marginLeft: '2px',
              verticalAlign: 'text-bottom',
              animation: 'blink 0.8s step-end infinite',
            }} />
          )}
        </div>

        {/* Мета-информация */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <span>{CHANNEL_ICON[message.channel] || '✍️'}</span>
          {message.created_at && (
            <span>{formatTime(message.created_at)}</span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
