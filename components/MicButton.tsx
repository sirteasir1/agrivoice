'use client'

import { useState, useRef } from 'react'

type MicState = 'idle' | 'listening' | 'processing'

interface Props {
  state: MicState
  onClick: () => void
  disabled?: boolean
}

export default function MicButton({ state, onClick, disabled }: Props) {
  const [pressed, setPressed] = useState(false)

  const isListening = state === 'listening'
  const isProcessing = state === 'processing'
  const isActive = isListening || isProcessing

  const getColor = () => {
    if (isListening) return 'var(--accent)'
    if (isProcessing) return '#86EFAC'
    return 'var(--text-secondary)'
  }

  const getBg = () => {
    if (isListening) return 'rgba(34,197,94,0.15)'
    if (isProcessing) return 'rgba(134,239,172,0.1)'
    return 'var(--bg-card)'
  }

  const getBorder = () => {
    if (isListening) return 'var(--accent)'
    if (isProcessing) return '#86EFAC'
    return 'var(--border-light)'
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Пульсирующие кольца (только когда слушает) */}
      {isListening && (
        <>
          <style>{`
            @keyframes ring-out {
              0%   { transform: scale(1);   opacity: 0.5; }
              100% { transform: scale(2.4); opacity: 0; }
            }
            @keyframes ring-out-2 {
              0%   { transform: scale(1);   opacity: 0.3; }
              100% { transform: scale(1.9); opacity: 0; }
            }
          `}</style>
          <div style={{
            position: 'absolute',
            width: '72px', height: '72px',
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            animation: 'ring-out 1.4s ease-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            width: '72px', height: '72px',
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            animation: 'ring-out-2 1.4s ease-out 0.4s infinite',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {/* Спиннер обработки */}
      {isProcessing && (
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      )}
      {isProcessing && (
        <div style={{
          position: 'absolute',
          width: '84px', height: '84px',
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#86EFAC',
          animation: 'spin 0.8s linear infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Основная кнопка */}
      <button
        onClick={onClick}
        disabled={disabled || isProcessing}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: getBg(),
          border: `2px solid ${getBorder()}`,
          cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          transform: pressed ? 'scale(0.93)' : 'scale(1)',
          boxShadow: isListening ? '0 0 32px rgba(34,197,94,0.3)' : 'none',
          position: 'relative',
          zIndex: 1,
        }}
        title={isListening ? 'Нажмите чтобы остановить' : 'Нажмите чтобы говорить'}
      >
        {/* Иконка */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isProcessing ? (
            // Иконка обработки — три точки
            <>
              <circle cx="5" cy="12" r="2" fill={getColor()} opacity="0.6" />
              <circle cx="12" cy="12" r="2" fill={getColor()} />
              <circle cx="19" cy="12" r="2" fill={getColor()} opacity="0.6" />
            </>
          ) : (
            // Иконка микрофона
            <>
              <rect x="9" y="2" width="6" height="12" rx="3" fill={getColor()} />
              <path
                d="M5 11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11"
                stroke={getColor()}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line x1="12" y1="18" x2="12" y2="22" stroke={getColor()} strokeWidth="2" strokeLinecap="round" />
              <line x1="9" y1="22" x2="15" y2="22" stroke={getColor()} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}
