"""
AgriVoice — Twilio интеграция: SMS + Voice
"""

import os
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()

# Twilio клиент
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")  # +1XXXXXXXXXX

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


# ══════════════════════════════════════════════════════════════
# SMS — отправка исходящих SMS
# ══════════════════════════════════════════════════════════════

def send_sms(to_phone: str, message: str) -> bool:
    """
    Отправить SMS фермеру.
    
    Args:
        to_phone: номер получателя (формат: +77001234567)
        message: текст сообщения
    
    Returns:
        True если отправлено успешно
    """
    try:
        # Обрезаем длинные сообщения до лимита SMS
        if len(message) > 1600:
            message = message[:1597] + "..."

        twilio_client.messages.create(
            body=f"AgriVoice 🌾\n{message}",
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone,
        )
        return True
    except Exception as e:
        print(f"[Twilio SMS Error] {str(e)}")
        return False


def send_agent_answer_sms(to_phone: str, answer: str, field_name: str) -> bool:
    """
    Отправить ответ агента через SMS с указанием поля.
    
    Args:
        to_phone: номер фермера
        answer: ответ агронома
        field_name: название поля для контекста
    """
    message = f"Поле «{field_name}»:\n{answer}"
    return send_sms(to_phone, message)


# ══════════════════════════════════════════════════════════════
# ВХОДЯЩИЙ SMS WEBHOOK — обработка TwiML ответа
# ══════════════════════════════════════════════════════════════

def build_sms_response(answer: str) -> str:
    """
    Построить TwiML ответ на входящий SMS.
    Twilio ожидает XML в ответ на webhook.
    
    Args:
        answer: ответ агронома
    
    Returns:
        TwiML XML строка
    """
    resp = MessagingResponse()
    resp.message(f"AgriVoice 🌾\n{answer}")
    return str(resp)


def build_sms_error_response(error_text: str) -> str:
    """TwiML ответ с ошибкой"""
    resp = MessagingResponse()
    resp.message(error_text)
    return str(resp)


# ══════════════════════════════════════════════════════════════
# VOICE — исходящие звонки
# ══════════════════════════════════════════════════════════════

def make_outgoing_call(to_phone: str, twiml_url: str) -> bool:
    """
    Инициировать исходящий звонок фермеру.
    
    Args:
        to_phone: номер фермера
        twiml_url: URL который Twilio запросит для TwiML инструкций
    
    Returns:
        True если звонок инициирован
    """
    try:
        call = twilio_client.calls.create(
            to=to_phone,
            from_=TWILIO_PHONE_NUMBER,
            url=twiml_url,
        )
        print(f"[Twilio Call] SID: {call.sid} → {to_phone}")
        return True
    except Exception as e:
        print(f"[Twilio Call Error] {str(e)}")
        return False


# ══════════════════════════════════════════════════════════════
# ВХОДЯЩИЙ ЗВОНОК — TwiML для голосового диалога
# ══════════════════════════════════════════════════════════════

def build_voice_welcome(field_name: str, backend_url: str, field_id: str, farmer_id: str) -> str:
    """
    TwiML для приветствия при входящем звонке.
    Записывает речь фермера и отправляет на /twilio/voice/process.
    
    Args:
        field_name: название поля
        backend_url: базовый URL бэкенда (для callback)
        field_id: ID поля
        farmer_id: ID фермера
    
    Returns:
        TwiML XML строка
    """
    response = VoiceResponse()

    # Приветствие
    response.say(
        f"Здравствуйте! Это AgriVoice, ваш AI-агроном. "
        f"Скажите, что происходит на вашем поле {field_name}, после сигнала.",
        language="ru-RU",
        voice="Polly.Tatyana",  # Русский голос Amazon Polly через Twilio
    )

    # Собираем речь фермера
    gather = Gather(
        input="speech",
        language="ru-RU",
        action=f"{backend_url}/twilio/voice/process?field_id={field_id}&farmer_id={farmer_id}",
        method="POST",
        speech_timeout="auto",
        timeout=10,
    )
    gather.say("Говорите сейчас.", language="ru-RU", voice="Polly.Tatyana")
    response.append(gather)

    # Если не услышали — повторяем
    response.say(
        "Извините, я не услышал. Пожалуйста, перезвоните.",
        language="ru-RU",
        voice="Polly.Tatyana",
    )

    return str(response)


def build_voice_answer(answer: str, backend_url: str, field_id: str, farmer_id: str) -> str:
    """
    TwiML для произнесения ответа агронома и продолжения диалога.
    
    Args:
        answer: ответ агронома от Gemini
        backend_url: базовый URL бэкенда
        field_id: ID поля
        farmer_id: ID фермера
    
    Returns:
        TwiML XML строка
    """
    response = VoiceResponse()

    # Произносим ответ
    response.say(answer, language="ru-RU", voice="Polly.Tatyana")

    # Предлагаем задать ещё вопрос
    gather = Gather(
        input="speech",
        language="ru-RU",
        action=f"{backend_url}/twilio/voice/process?field_id={field_id}&farmer_id={farmer_id}",
        method="POST",
        speech_timeout="auto",
        timeout=8,
    )
    gather.say(
        "Есть ещё вопросы? Говорите.",
        language="ru-RU",
        voice="Polly.Tatyana",
    )
    response.append(gather)

    # Завершение разговора
    response.say(
        "Хорошего урожая! До свидания.",
        language="ru-RU",
        voice="Polly.Tatyana",
    )

    return str(response)


def build_voice_error(error_text: str) -> str:
    """TwiML для ошибки при звонке"""
    response = VoiceResponse()
    response.say(error_text, language="ru-RU", voice="Polly.Tatyana")
    response.hangup()
    return str(response)
