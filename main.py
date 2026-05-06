"""
AgriVoice — FastAPI Backend
Все эндпоинты: Auth, Fields, Agent, Twilio SMS/Voice webhooks
"""

import os
from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from dotenv import load_dotenv

from models import (
    RegisterRequest, LoginRequest, AuthResponse,
    CreateFieldRequest, FieldResponse,
    AgentMessageRequest, AgentMessageResponse,
    MessageRecord,
)
from auth import register_farmer, login_farmer
from database import (
    get_fields_by_farmer, get_field_by_id, create_field,
    get_field_history, save_message,
    get_last_message_for_field, get_monthly_consultations,
    get_farmer_by_phone, get_farmer_by_id,
)
from gemini import ask_gemini, ask_gemini_simple
from twilio_service import (
    build_sms_response, build_sms_error_response,
    build_voice_welcome, build_voice_answer, build_voice_error,
    send_agent_answer_sms,
)
from prompts import (
    SMS_NOT_REGISTERED, SMS_NO_FIELDS,
    SMS_FIELD_NOT_FOUND, SMS_FIELDS_LIST_HEADER,
)

load_dotenv()

# ── Инициализация FastAPI ─────────────────────────────────────
app = FastAPI(
    title="AgriVoice API",
    description="AI-агроном для фермеров Казахстана",
    version="1.0.0",
)

# ── CORS — разрешаем запросы с фронтенда ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://agrivoice.vercel.app",
        os.environ.get("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")


# ══════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"status": "ok", "service": "AgriVoice API", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}


# ══════════════════════════════════════════════════════════════
# AUTH — регистрация и вход
# ══════════════════════════════════════════════════════════════

@app.post("/auth/register", response_model=AuthResponse)
def register(data: RegisterRequest):
    """
    Регистрация нового фермера.
    body: { name: str, phone: str }
    """
    try:
        # Нормализуем номер телефона
        phone = data.phone.strip().replace(" ", "").replace("-", "")
        data.phone = phone
        return register_farmer(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/login", response_model=AuthResponse)
def login(data: LoginRequest):
    """
    Вход по номеру телефона.
    body: { phone: str }
    """
    try:
        phone = data.phone.strip().replace(" ", "").replace("-", "")
        data.phone = phone
        return login_farmer(data)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# ══════════════════════════════════════════════════════════════
# FIELDS — управление полями
# ══════════════════════════════════════════════════════════════

@app.get("/farmer/{farmer_id}/fields")
def get_fields(farmer_id: str):
    """
    Список всех полей фермера + последнее сообщение агента для каждого.
    """
    try:
        fields = get_fields_by_farmer(farmer_id)
        result = []
        for field in fields:
            # Добавляем последнее сообщение агента для превью в карточке
            last_msg = get_last_message_for_field(field["id"])
            result.append({
                **field,
                "last_agent_message": last_msg["content"][:120] if last_msg else None,
                "last_activity": last_msg["created_at"] if last_msg else field["created_at"],
            })
        return {"fields": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/farmer/{farmer_id}/fields")
def add_field(farmer_id: str, data: CreateFieldRequest):
    """
    Добавить новое поле фермеру.
    body: { name, crop_type, area_ha, location? }
    """
    try:
        field = create_field(
            farmer_id=farmer_id,
            name=data.name,
            crop_type=data.crop_type,
            area_ha=data.area_ha,
            location=data.location,
        )
        if not field:
            raise Exception("Ошибка создания поля")
        return field
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/field/{field_id}")
def get_field(field_id: str):
    """Данные одного поля"""
    field = get_field_by_id(field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Поле не найдено")
    return field


@app.get("/field/{field_id}/history")
def get_history(field_id: str, limit: int = 50):
    """История сообщений поля"""
    try:
        messages = get_field_history(field_id, limit=limit)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
# DASHBOARD STATS — статистика для дашборда
# ══════════════════════════════════════════════════════════════

@app.get("/farmer/{farmer_id}/stats")
def get_stats(farmer_id: str):
    """
    Статистика для дашборда: поля, консультации, последняя активность.
    """
    try:
        fields = get_fields_by_farmer(farmer_id)
        monthly = get_monthly_consultations(farmer_id)

        # Последняя активность — ищем самое свежее сообщение
        last_activity = None
        for field in fields:
            last_msg = get_last_message_for_field(field["id"])
            if last_msg:
                if not last_activity or last_msg["created_at"] > last_activity:
                    last_activity = last_msg["created_at"]

        return {
            "total_fields": len(fields),
            "monthly_consultations": monthly,
            "last_activity": last_activity,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
# AGENT — главный эндпоинт AI-агронома
# ══════════════════════════════════════════════════════════════

@app.post("/agent/message", response_model=AgentMessageResponse)
async def agent_message(data: AgentMessageRequest):
    """
    Главный эндпоинт: фермер задаёт вопрос, Gemini отвечает.
    
    Логика:
    1. Достать данные поля из БД
    2. Достать последние 20 сообщений этого поля
    3. Вызвать Gemini с историей и системным промптом
    4. Сохранить оба сообщения в БД
    5. Вернуть ответ
    """
    # Проверяем что поле существует
    field = get_field_by_id(data.field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Поле не найдено")

    # Получаем историю поля для контекста
    try:
        history = get_field_history(data.field_id, limit=20)
    except Exception:
        history = []  # Если история недоступна — продолжаем без неё

    # Запрашиваем ответ у Gemini
    try:
        answer = await ask_gemini(
            field=field,
            history=history,
            user_text=data.text,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI временно недоступен: {str(e)}")

    # Сохраняем сообщение фермера в историю
    try:
        save_message(
            farmer_id=data.farmer_id,
            field_id=data.field_id,
            role="user",
            content=data.text,
            channel=data.channel,
        )
    except Exception as e:
        print(f"[Warning] Не удалось сохранить сообщение пользователя: {e}")

    # Сохраняем ответ агента в историю
    try:
        save_message(
            farmer_id=data.farmer_id,
            field_id=data.field_id,
            role="assistant",
            content=answer,
            channel=data.channel,
        )
    except Exception as e:
        print(f"[Warning] Не удалось сохранить ответ агента: {e}")

    return AgentMessageResponse(
        answer=answer,
        field_id=data.field_id,
        channel=data.channel,
    )


# ══════════════════════════════════════════════════════════════
# TWILIO SMS WEBHOOK — входящие SMS от фермеров
# ══════════════════════════════════════════════════════════════
#
# Настройка в Twilio Console:
# Phone Numbers → Manage → Active Numbers → твой номер
# Messaging → "A message comes in" → Webhook → POST
# URL: https://your-backend.railway.app/twilio/sms
#

@app.post("/twilio/sms")
async def twilio_sms_webhook(request: Request):
    """
    Webhook для входящих SMS через Twilio.
    
    Формат SMS от фермера:
    - "мои поля" — список полей
    - "поле 1: вопрос" — вопрос по первому полю
    - "поле Северное: вопрос" — вопрос по полю с именем
    - Любой текст — вопрос по первому полю
    """
    # Twilio отправляет form data
    form_data = await request.form()
    from_phone = form_data.get("From", "").strip().replace(" ", "+")
    if not from_phone.startswith("+"):
        from_phone = "+" + from_phone
    body = form_data.get("Body", "").strip()

    print(f"[SMS] От {from_phone}: {body}")

    # Ищем фермера по номеру телефона
    farmer = get_farmer_by_phone(from_phone)
    if not farmer:
        # Нормализуем номер и пробуем ещё раз
        normalized = from_phone.lstrip("+")
        farmer = get_farmer_by_phone(f"+{normalized}")

    if not farmer:
        xml_response = build_sms_error_response(SMS_NOT_REGISTERED)
        return Response(content=xml_response, media_type="application/xml")

    farmer_id = farmer["id"]
    farmer_name = farmer["name"]
    body_lower = body.lower()

    # Команда "мои поля" — отправляем список
    if any(cmd in body_lower for cmd in ["мои поля", "список полей", "поля"]):
        fields = get_fields_by_farmer(farmer_id)
        if not fields:
            xml_response = build_sms_error_response(SMS_NO_FIELDS)
            return Response(content=xml_response, media_type="application/xml")

        fields_text = SMS_FIELDS_LIST_HEADER
        for i, field in enumerate(fields, 1):
            fields_text += f"{i}. {field['name']} — {field['crop_type']}, {field['area_ha']} га\n"
        fields_text += "\nОтправьте: 'поле 1: ваш вопрос'"

        xml_response = build_sms_response(fields_text)
        return Response(content=xml_response, media_type="application/xml")

    # Определяем поле — ищем паттерн "поле N:" или "поле Имя:"
    fields = get_fields_by_farmer(farmer_id)
    if not fields:
        xml_response = build_sms_error_response(SMS_NO_FIELDS)
        return Response(content=xml_response, media_type="application/xml")

    target_field = None
    question_text = body

    # Парсим "поле X: вопрос"
    if body_lower.startswith("поле "):
        parts = body.split(":", 1)
        if len(parts) == 2:
            field_ref = parts[0].replace("поле", "").replace("Поле", "").strip()
            question_text = parts[1].strip()

            # Пробуем по номеру (1, 2, 3...)
            if field_ref.isdigit():
                idx = int(field_ref) - 1
                if 0 <= idx < len(fields):
                    target_field = fields[idx]
            else:
                # Пробуем по имени
                for f in fields:
                    if field_ref.lower() in f["name"].lower():
                        target_field = f
                        break

    # Если не нашли конкретное поле — берём первое
    if not target_field:
        target_field = fields[0]

    # Получаем историю поля
    try:
        history = get_field_history(target_field["id"], limit=10)
    except Exception:
        history = []

    # Запрашиваем ответ у Gemini (краткий для SMS)
    try:
        answer = await ask_gemini_simple(
            question=question_text,
            context=f"Поле: {target_field['name']}, {target_field['crop_type']}, {target_field['area_ha']} га",
        )
    except Exception as e:
        xml_response = build_sms_error_response(
            f"AgriVoice: Ошибка обработки запроса. Попробуйте позже."
        )
        return Response(content=xml_response, media_type="application/xml")

    # Сохраняем в историю
    try:
        save_message(farmer_id, target_field["id"], "user", question_text, "sms")
        save_message(farmer_id, target_field["id"], "assistant", answer, "sms")
    except Exception as e:
        print(f"[Warning] Не удалось сохранить SMS историю: {e}")

    # Отправляем ответ через TwiML
    response_text = f"Поле «{target_field['name']}»:\n{answer}"
    xml_response = build_sms_response(response_text)
    return Response(content=xml_response, media_type="application/xml")


# ══════════════════════════════════════════════════════════════
# TWILIO VOICE WEBHOOK — входящие и исходящие звонки
# ══════════════════════════════════════════════════════════════
#
# Настройка в Twilio Console:
# Phone Numbers → твой номер → Voice & Fax
# "A call comes in" → Webhook → POST
# URL: https://your-backend.railway.app/twilio/voice/incoming
#

@app.post("/twilio/voice/incoming")
async def twilio_voice_incoming(request: Request):
    """
    Webhook для входящего звонка.
    Приветствует фермера, просит назвать вопрос.
    """
    form_data = await request.form()
    from_phone = form_data.get("From", "").strip().replace(" ", "+")
    if not from_phone.startswith("+"):
        from_phone = "+" + from_phone

    print(f"[Voice Call] Входящий от {from_phone}")

    # Ищем фермера
    if not from_phone.startswith("+"):
        from_phone = "+" + from_phone
    farmer = get_farmer_by_phone(from_phone)
    if not farmer:
        farmer = get_farmer_by_phone("+" + from_phone.lstrip("0"))
    if not farmer:
        xml_response = build_voice_error(
            "Ваш номер не зарегистрирован в AgriVoice. "
            "Пожалуйста, зайдите на сайт для регистрации."
        )
        return Response(content=xml_response, media_type="application/xml")

    # Получаем поля фермера
    fields = get_fields_by_farmer(farmer["id"])
    if not fields:
        xml_response = build_voice_error(
            "У вас нет добавленных полей. "
            "Пожалуйста, добавьте поле на сайте AgriVoice."
        )
        return Response(content=xml_response, media_type="application/xml")

    # Берём первое поле (для упрощения)
    field = fields[0]

    # Возвращаем TwiML приветствие
    xml_response = build_voice_welcome(
        field_name=field["name"],
        backend_url=BACKEND_URL,
        field_id=field["id"],
        farmer_id=farmer["id"],
    )
    return Response(content=xml_response, media_type="application/xml")


@app.post("/twilio/voice/process")
async def twilio_voice_process(request: Request, field_id: str, farmer_id: str):
    """
    Webhook для обработки речи фермера.
    Получает транскрипцию, запрашивает Gemini, озвучивает ответ.
    """
    form_data = await request.form()
    speech_result = form_data.get("SpeechResult", "")
    confidence = form_data.get("Confidence", "0")

    print(f"[Voice] Речь фермера: '{speech_result}' (уверенность: {confidence})")

    if not speech_result:
        xml_response = build_voice_error(
            "Извините, я не смог разобрать вашу речь. Пожалуйста, попробуйте ещё раз."
        )
        return Response(content=xml_response, media_type="application/xml")

    # Достаём данные поля
    field = get_field_by_id(field_id)
    if not field:
        xml_response = build_voice_error("Поле не найдено. Проверьте настройки на сайте.")
        return Response(content=xml_response, media_type="application/xml")

    # Получаем историю поля
    try:
        history = get_field_history(field_id, limit=10)
    except Exception:
        history = []

    # Запрашиваем Gemini
    try:
        answer = await ask_gemini(
            field=field,
            history=history,
            user_text=speech_result,
        )
    except Exception as e:
        xml_response = build_voice_error(
            "Произошла ошибка. Пожалуйста, попробуйте позже."
        )
        return Response(content=xml_response, media_type="application/xml")

    # Сохраняем в историю
    try:
        save_message(farmer_id, field_id, "user", speech_result, "call")
        save_message(farmer_id, field_id, "assistant", answer, "call")
    except Exception as e:
        print(f"[Warning] Не удалось сохранить историю звонка: {e}")

    # Возвращаем TwiML с ответом и возможностью продолжить диалог
    xml_response = build_voice_answer(
        answer=answer,
        backend_url=BACKEND_URL,
        field_id=field_id,
        farmer_id=farmer_id,
    )
    return Response(content=xml_response, media_type="application/xml")


# ══════════════════════════════════════════════════════════════
# ИСХОДЯЩИЙ ЗВОНОК — триггер с фронтенда
# ══════════════════════════════════════════════════════════════

@app.post("/farmer/{farmer_id}/call")
async def trigger_call(farmer_id: str):
    """
    Инициировать звонок фермеру.
    Полезно для нотификаций: агент сам позвонит с советом.
    """
    farmer = get_farmer_by_id(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail="Фермер не найден")

    fields = get_fields_by_farmer(farmer_id)
    if not fields:
        raise HTTPException(status_code=400, detail="У фермера нет полей")

    field = fields[0]
    twiml_url = f"{BACKEND_URL}/twilio/voice/incoming"

    from twilio_service import make_outgoing_call
    success = make_outgoing_call(
        to_phone=farmer["phone"],
        twiml_url=twiml_url,
    )

    if not success:
        raise HTTPException(status_code=503, detail="Ошибка Twilio при звонке")

    return {"status": "calling", "to": farmer["phone"]}


# ══════════════════════════════════════════════════════════════
# ОТПРАВИТЬ SMS ВРУЧНУЮ (для дашборда)
# ══════════════════════════════════════════════════════════════

@app.post("/farmer/{farmer_id}/sms")
async def send_manual_sms(farmer_id: str, data: AgentMessageRequest):
    """
    Отправить SMS с ответом агента на телефон фермера.
    Используется когда нужно уведомить вне браузера.
    """
    farmer = get_farmer_by_id(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail="Фермер не найден")

    field = get_field_by_id(data.field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Поле не найдено")

    # Получаем ответ агента
    try:
        history = get_field_history(data.field_id, limit=10)
        answer = await ask_gemini(field=field, history=history, user_text=data.text)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Сохраняем в историю
    try:
        save_message(farmer_id, data.field_id, "user", data.text, "sms")
        save_message(farmer_id, data.field_id, "assistant", answer, "sms")
    except Exception:
        pass

    # Отправляем SMS
    from twilio_service import send_agent_answer_sms
    success = send_agent_answer_sms(
        to_phone=farmer["phone"],
        answer=answer,
        field_name=field["name"],
    )

    return {"answer": answer, "sms_sent": success}


# ══════════════════════════════════════════════════════════════
# ЗАПУСК (dev)
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
