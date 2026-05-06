'use client'

export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '0 4px' }}>
      {/* Аватар агента */}
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

      {/* Пузырь с точками */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px 16px 16px 4px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
      }}>
        <style>{`
          @keyframes typing-bounce {
            0%, 60%, 100% { transform: translateY(0);   opacity: 0.3; }
            30%            { transform: translateY(-5px); opacity: 1; }
          }
        `}</style>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '7px', height: '7px',
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}
