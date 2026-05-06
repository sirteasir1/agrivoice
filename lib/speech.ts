export const isSpeechSupported = () =>
  typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

export function startListening(
  onInterim: (t: string) => void,
  onFinal: (t: string) => void,
  onError?: (e: string) => void,
): SpeechRecognition | null {
  if (!isSpeechSupported()) { onError?.('Браузер не поддерживает голос. Используйте Chrome.'); return null }
  // @ts-ignore
  const R = window.webkitSpeechRecognition || window.SpeechRecognition
  const r: SpeechRecognition = new R()
  r.lang = 'ru-RU'; r.continuous = false; r.interimResults = true
  r.onresult = (e: any) => {
    const res = e.results[0]; const text = res[0].transcript
    res.isFinal ? onFinal(text) : onInterim(text)
  }
  r.onerror = (e: any) => {
    const msgs: Record<string, string> = {
      'not-allowed': 'Доступ к микрофону запрещён. Разрешите в настройках браузера.',
      'no-speech': 'Речь не распознана. Попробуйте ещё раз.',
      'audio-capture': 'Микрофон не найден.',
    }
    onError?.(msgs[e.error] || `Ошибка: ${e.error}`)
  }
  r.start(); return r
}

export const stopListening = (r: SpeechRecognition | null) => { try { r?.stop() } catch {} }

export function speak(text: string): Promise<void> {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) { resolve(); return }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ru-RU'; u.rate = 0.92; u.pitch = 1
    const voices = window.speechSynthesis.getVoices()
    const ru = voices.find(v => v.lang.startsWith('ru'))
    if (ru) u.voice = ru
    u.onend = () => resolve(); u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

export const stopSpeaking = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }
