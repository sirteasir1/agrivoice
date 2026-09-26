# 🌾 AgriVoice — AI-агроном для фермеров

> Агроном отвечает на звонок. **Даже без интернета.**
> Позвоните или отправьте SMS с кнопочного телефона — AI знает ваше поле,
> погоду над ним и ответит по-русски или по-казахски с расчётом затрат в тенге.

---

## Возможности

- 📞 **Звонок** — агент отвечает голосом (Twilio Voice, работает без интернета)
- 📱 **SMS** — вопрос-ответ на кнопочном телефоне (Twilio SMS)
- 🎤 **Голос на сайте** — Web Speech API (ru / kk)
- 💬 **Чат на сайте** — вся история консультаций
- 🌦 **Погода по полю** — прогноз Open-Meteo на 5 дней по местоположению поля; агент сам предупреждает «завтра дождь — не опрыскивайте»
- 💰 **Экономика** — к каждой рекомендации: цена препарата, расход на га, итог в ₸
- 🇰🇿 **Два языка** — интерфейс и ответы агента на русском и казахском
- 🧠 **Память поля** — агент помнит историю болезней и обработок

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 14 (App Router), кастомная дизайн-система |
| Backend | FastAPI (Python 3.12) |
| AI | Gemini 2.5 Flash |
| DB | Supabase (PostgreSQL) |
| Погода | Open-Meteo (бесплатно, без ключа) |
| SMS + Звонки | Twilio (голос Polly.Tatyana) |
| Деплой | Vercel (frontend) + Railway / любой Docker (backend) |

Репозиторий — монорепо в одной папке: `app/`, `components/`, `lib/` — фронтенд;
`main.py`, `database.py`, `gemini.py`, `weather.py`, `twilio_service.py` — бэкенд.

---

## Быстрый старт

### 1. Supabase — новая БД (5 минут)

1. [supabase.com](https://supabase.com) → **New project** (регион EU ближе к КЗ)
2. **SQL Editor** → вставь целиком `supabase_schema.sql` → **Run**
3. **Project Settings → Data API**: скопируй Project URL и anon-ключ

### 2. Backend

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # заполни ключи
uvicorn main:app --reload --port 8000
```

Бэкенд стартует даже без ключей — просто вернёт понятную ошибку
при первом обращении к неподключённому сервису.

### 3. Frontend

```bash
npm install
cp .env.local.example .env.local
npm run dev                   # http://localhost:3000
```

---

## Настройка Twilio (новый аккаунт)

1. Регистрация: [twilio.com/try-twilio](https://twilio.com/try-twilio) (trial даёт ~$15)
2. **Console → Account Info** → скопируй `Account SID` и `Auth Token` в `.env`
3. **Phone Numbers → Buy a Number** → купи US-номер `+1...` (~$1/мес) → в `.env` как `TWILIO_PHONE_NUMBER`
4. Вебхуки на номере (нужен публичный `BACKEND_URL`; локально — `ngrok http 8000`):
   - **Messaging** → A message comes in → Webhook (POST) → `https://<backend>/twilio/sms`
   - **Voice & Fax** → A call comes in → Webhook (POST) → `https://<backend>/twilio/voice/incoming`
5. ⚠️ На trial-аккаунте звонки/SMS работают **только на верифицированные номера**:
   **Phone Numbers → Verified Caller IDs** → добавь свой номер.
   Апгрейд ($20) снимает ограничение и убирает голосовую заставку в начале звонка.

### Формат SMS от фермера

```
мои поля                    → список полей
поле 1: желтеют листья      → вопрос по полю №1
поле Северное: чем лечить   → вопрос по полю "Северное"
любой другой текст          → вопрос по первому полю
```

---

## API эндпоинты

```
POST /auth/register          { name, phone }
POST /auth/login             { phone }

GET  /farmer/{id}/fields     список полей (+последний ответ агента)
POST /farmer/{id}/fields     { name, crop_type, area_ha, location? }
GET  /field/{id}             данные поля
GET  /field/{id}/history     история чата
GET  /field/{id}/weather     прогноз погоды на 5 дней (Open-Meteo)

POST /agent/message          { farmer_id, field_id, text, channel, lang }
GET  /farmer/{id}/stats      статистика дашборда

POST /twilio/sms             webhook входящих SMS
POST /twilio/voice/incoming  webhook входящих звонков
POST /twilio/voice/process   обработка речи в звонке
POST /farmer/{id}/call       инициировать звонок фермеру
POST /farmer/{id}/sms        отправить SMS с ответом агента
```

---

## Демо-сценарий

1. Лендинг → переключи РУС / ҚАЗ в шапке
2. Регистрация (имя + номер)
3. Дашборд → «Добавить поле»: Северное, пшеница, 40 га, **Акмолинская обл.** (локация включает погоду)
4. Открыть поле → полоска прогноза на 5 дней под шапкой
5. 🎤 «У пшеницы желтеют нижние листья» → ответ с препаратом, дозировкой, **затратами в ₸** и оговоркой по погоде
6. Переключи на ҚАЗ и спроси по-казахски — агент ответит на казахском
7. Позвони на Twilio-номер — тот же агент голосом по телефону
8. Отправь SMS «поле 1: чем обработать?» — ответ придёт в SMS
