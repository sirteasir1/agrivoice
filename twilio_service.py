"""
AgriVoice — Twilio интеграция: SMS + Voice
"""

import os
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


# ── SMS ──────────────────────────────────────────────────────

def send_sms(to_phone: str, message: str) -> bool:
    try:
        if len(message) > 1600:
            message = message[:1597] + "..."
        twilio_client.messages.create(
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
    resp.message(f"AgriVoice\n{answer}")
    return str(resp)


def build_sms_error_response(error_text: str) -> str:
    resp = MessagingResponse()
    resp.message(error_text)
    return str(resp)


# ── VOICE ────────────────────────────────────────────────────

def build_voice_welcome(field_name: str, backend_url: str, field_id: str, farmer_id: str) -> str:
    response = VoiceResponse()

    # Используем alice — поддерживает русский язык бесплатно
    response.say(
        f"Zdravstvuyte! Eto AgriVoice, vash AI agronom. "
        f"Skazhite, chto proiskhodit na vashem pole {field_name}, posle signala.",
        language="ru-RU",
        voice="alice",
    )

    gather = Gather(
        input="speech",
        language="ru-RU",
        action=f"{backend_url}/twilio/voice/process?field_id={field_id}&farmer_id={farmer_id}",
        method="POST",
        speech_timeout="auto",
        timeout=10,
    )
    gather.say("Govorite seychas.", language="ru-RU", voice="alice")
    response.append(gather)

    response.say(
        "Izvinite, ya ne uslyshal. Pozhaluista, perezvonite.",
        language="ru-RU",
        voice="alice",
    )

    return str(response)


def build_voice_answer(answer: str, backend_url: str, field_id: str, farmer_id: str) -> str:
    response = VoiceResponse()

    # Произносим ответ
    response.say(answer, language="ru-RU", voice="alice")

    gather = Gather(
        input="speech",
        language="ru-RU",
        action=f"{backend_url}/twilio/voice/process?field_id={field_id}&farmer_id={farmer_id}",
        method="POST",
        speech_timeout="auto",
        timeout=8,
    )
    gather.say("Est eshche voprosy? Govorite.", language="ru-RU", voice="alice")
    response.append(gather)

    response.say("Khoroshego urozhaya! Do svidaniya.", language="ru-RU", voice="alice")

    return str(response)


def build_voice_error(error_text: str) -> str:
    response = VoiceResponse()
    response.say(error_text, language="ru-RU", voice="alice")
    response.hangup()
    return str(response)


def make_outgoing_call(to_phone: str, twiml_url: str) -> bool:
    try:
        call = twilio_client.calls.create(
            to=to_phone,
            from_=TWILIO_PHONE_NUMBER,
            url=twiml_url,
        )
        print(f"[Twilio Call] SID: {call.sid}")
        return True
    except Exception as e:
        print(f"[Twilio Call Error] {str(e)}")
        return False
