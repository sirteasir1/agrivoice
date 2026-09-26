// Web Speech API отсутствует в стандартных DOM-типах TypeScript
interface SpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: ((e: any) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface Window {
  SpeechRecognition: { new (): SpeechRecognition }
  webkitSpeechRecognition: { new (): SpeechRecognition }
}
