const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json', ...opts.headers }, ...opts })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Ошибка сервера')
  return data as T
}

export interface AuthResponse { farmer_id: string; token: string; name: string }
export const register = (name: string, phone: string) =>
  req<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, phone }) })
export const login = (phone: string) =>
  req<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ phone }) })

export interface Field {
  id: string; farmer_id: string; name: string; crop_type: string
  area_ha: number; location?: string; created_at: string
  last_agent_message?: string; last_activity?: string
}
export const getFields = (id: string) =>
  req<{ fields: Field[] }>(`/farmer/${id}/fields`).then(d => d.fields)
export const getField = (id: string) => req<Field>(`/field/${id}`)
export const createField = (farmer_id: string, body: { name: string; crop_type: string; area_ha: number; location?: string }) =>
  req<Field>(`/farmer/${farmer_id}/fields`, { method: 'POST', body: JSON.stringify(body) })

export interface Stats { total_fields: number; monthly_consultations: number; last_activity: string | null }
export const getStats = (id: string) => req<Stats>(`/farmer/${id}/stats`)

export interface Message { id?: string; role: 'user' | 'assistant'; content: string; channel: string; created_at?: string }
export const sendMessage = (farmer_id: string, field_id: string, text: string, channel: 'text' | 'voice') =>
  req<{ answer: string }>('/agent/message', { method: 'POST', body: JSON.stringify({ farmer_id, field_id, text, channel }) })
export const getFieldHistory = (field_id: string) =>
  req<{ messages: Message[] }>(`/field/${field_id}/history?limit=100`).then(d => d.messages)

export const getFarmerId = () => typeof window !== 'undefined' ? localStorage.getItem('farmer_id') : null

export const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export const formatDate = (d: string) => {
  const date = new Date(d), now = new Date()
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  if (days < 7) return `${days}д назад`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export const CROP_EMOJI: Record<string, string> = { пшеница: '🌾', кукуруза: '🌽', подсолнух: '🌻', хлопок: '🌿', ячмень: '🌱' }
export const getCropEmoji = (c: string) => CROP_EMOJI[c.toLowerCase()] || '🌿'
