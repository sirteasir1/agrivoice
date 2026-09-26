"""
AgriVoice — Twilio интеграция: SMS + Voice
"""

import os
import re
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

# Русский TTS: Polly.Tatyana (Amazon) — старый voice="alice" устарел
# и требовал транслита. Меняется через env без правки кода.
TWILIO_VOICE = os.environ.get("TWILIO_VOICE", "Polly.Tatyana")
VOICE_LANG = "ru-RU"

# Ленивая инициализация — бэкенд стартует и без ключей Twilio
_client = None


def twilio():
    global _client
    if _client is None:
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            raise Exception(
                "Twilio не настроен: заполните TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN "
                "и TWILIO_PHONE_NUMBER в .env (см. .env.example)"
            )
        from twilio.rest import Client
        _client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return _client


def strip_markdown(text: str) -> str:
    """Gemini любит **жирный** и списки — в SMS и голосе это мусор"""
    text = re.sub(r"[*_`#]+", "", text)
    text = re.sub(r"^\s*[-•]\s*", "", text, flags=re.MULTILINE)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


# ── SMS ──────────────────────────────────────────────────────

def send_sms(to_phone: str, message: str) -> bool:
    try:
        message = strip_markdown(message)
        if len(message) > 1600:
            message = message[:1597] + "..."
        twilio().messages.create(
            body=f"AgriVoice\n{message}",
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone,
        )
        return True
    except Exception as e:
        print(f"[Twilio SMS Error] {str(e)}")
        return False


def send_agent_answer_sms(to_phone: str, answer: str, field_name: str) -> bool:
    return send_sms(to_phone, f"Поле {field_name}:\n{answer}")


def build_sms_response(answer: str) -> str:
    resp = MessagingResponse()
    resp.message(f"AgriVoice\n{strip_markdown(answer)}")
    return str(resp)


def build_sms_error_response(error_text: str) -> str:
    resp = MessagingResponse()
    resp.message(error_text)
    return str(resp)


# ── VOICE ────────────────────────────────────────────────────

def build_voice_welcome(field_name: str, backend_url: str, field_id: str, farmer_id: str) -> str:
    response = VoiceResponse()

    response.say(
        f"Здравствуйте! Это АгриВойс, ваш агроном. "
        f"Расскажите, что происходит на вашем поле {field_name}, после сигнала.",
        language=VOICE_LANG,
        voice=TWILIO_VOICE,
    )

    gather = Gather(
        input="speech",
        language=VOICE_LANG,
        action=f"{backend_url}/twilio/voice/process?field_id={field_id}&farmer_id={farmer_id}",
        method="POST",
        speech_timeout="auto",
        timeout=10,
    )
    gather.say("Говорите сейчас.", language=VOICE_LANG, voice=TWILIO_VOICE)
    response.append(gather)

    response.say(
        "Извините, я вас не услышал. Пожалуйста, перезвоните.",
        language=VOICE_LANG,
        voice=TWILIO_VOICE,
    )

    return str(response)


def build_voice_answer(answer: str, backend_url: str, field_id: str, farmer_id: str) -> str:
    response = VoiceResponse()

    # Произносим ответ (без markdown-символов)
    response.say(strip_markdown(answer), language=VOICE_LANG, voice=TWILIO_VOICE)

    gather = Gather(
        input="speech",
        language=VOICE_LANG,
        action=f"{backend_url}/twilio/voice/process?field_id={field_id}&farmer_id={farmer_id}",
        method="POST",
        speech_timeout="auto",
        timeout=8,
    )
    gather.say("Есть ещё вопросы? Говорите.", language=VOICE_LANG, voice=TWILIO_VOICE)
    response.append(gather)

    response.say("Хорошего урожая! До свидания.", language=VOICE_LANG, voice=TWILIO_VOICE)

    return str(response)


def build_voice_error(error_text: str) -> str:
    response = VoiceResponse()
    response.say(error_text, language=VOICE_LANG, voice=TWILIO_VOICE)
    response.hangup()
    return str(response)


def make_outgoing_call(to_phone: str, twiml_url: str) -> bool:
    try:
        call = twilio().calls.create(
            to=to_phone,
            from_=TWILIO_PHONE_NUMBER,
            url=twiml_url,
        )
        print(f"[Twilio Call] SID: {call.sid}")
        return True
    except Exception as e:
        print(f"[Twilio Call Error] {str(e)}")
        return False
