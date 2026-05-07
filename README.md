# 🌾 AgriVoice — AI-агроном для фермеров

> Голосовой AI-агроном который помнит каждое ваше поле.  
> Gemini 2.5 Flash + Twilio SMS/Voice + Next.js + FastAPI

---

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 14 (App Router), TailwindCSS |
| Backend | FastAPI (Python) |
| AI | Gemini 2.0 Flash (Google AI) |
| DB | Supabase (PostgreSQL) |
| Голос (браузер) | Web Speech API |
| SMS + Звонки | Twilio |
| Деплой | Vercel (frontend) + Railway (backend) |

---

## Быстрый старт

### 1. Supabase — создать БД

Открой **Supabase SQL Editor** и выполни `supabase_schema.sql`

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Заполни .env своими ключами
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Укажи NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Открой `http://localhost:3000` 🚀

---

## ENV переменные

### Backend `.env`

```
GEMINI_API_KEY=AIza...          # Google AI Studio
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
TWILIO_ACCOUNT_SID=ACxx...
TWILIO_AUTH_TOKEN=xx...
TWILIO_PHONE_NUMBER=+12345678901
BACKEND_URL=https://your-app.railway.app
FRONTEND_URL=https://agrivoice.vercel.app
```

### Frontend `.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Twilio настройка

### SMS Webhook
Twilio Console → Phone Numbers → твой номер → **Messaging**  
`A message comes in` → Webhook (POST) → `https://your-backend/twilio/sms`

### Voice Webhook  
Twilio Console → Phone Numbers → твой номер → **Voice & Fax**  
`A call comes in` → Webhook (POST) → `https://your-backend/twilio/voice/incoming`

### Формат SMS от фермера
```
мои поля                    → список полей
поле 1: желтеют листья      → вопрос по полю №1
поле Северное: чем лечить   → вопрос по полю "Северное"
```

---

## API эндпоинты

```
POST /auth/register          { name, phone }
POST /auth/login             { phone }

GET  /farmer/{id}/fields     список полей
POST /farmer/{id}/fields     { name, crop_type, area_ha, location? }
GET  /field/{id}             данные поля
GET  /field/{id}/history     история чата

POST /agent/message          { farmer_id, field_id, text, channel }
GET  /farmer/{id}/stats      статистика дашборда

POST /twilio/sms             webhook входящих SMS
POST /twilio/voice/incoming  webhook входящих звонков
POST /twilio/voice/process   обработка речи в звонке
POST /farmer/{id}/call       инициировать звонок фермеру
POST /farmer/{id}/sms        отправить SMS с ответом агента
```

---

## Демо сценарий

1. Открыть сайт → красивый Landing с частицами
2. Зарегистрироваться (имя + номер)
3. Dashboard → добавить поле "Северное", пшеница, 40 га
4. Открыть поле → чат
5. Нажать 🎤 → сказать "у меня желтеют нижние листья пшеницы"
6. Агент отвечает голосом + текстом
7. Написать: "какой препарат и сколько?"
8. Агент помнит контекст — отвечает конкретно
9. Выйти и войти снова — история сохранена ✓
10. Позвонить на Twilio номер — агент отвечает голосом по телефону ✓
11. Отправить SMS — получить ответ в SMS ✓
