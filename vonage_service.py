"""
AgriVoice — Vonage интеграция: звонки (NCCO) + SMS
Замена Twilio: у Vonage вебхуки отвечают JSON-массивом NCCO вместо TwiML.
"""

import os
import time
import uuid as uuid_lib

import httpx
import jwt
from dotenv import load_dotenv

load_dotenv()

VONAGE_API_KEY = os.environ.get("VONAGE_API_KEY", "")
VONAGE_API_SECRET = os.environ.get("VONAGE_API_SECRET", "")
VONAGE_PHONE_NUMBER = os.environ.get("VONAGE_PHONE_NUMBER", "")
VONAGE_APPLICATION_ID = os.environ.get("VONAGE_APPLICATION_ID", "")
VONAGE_PRIVATE_KEY_PATH = os.environ.get("VONAGE_PRIVATE_KEY_PATH", "vonage_private.key")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

VOICE_LANG = "ru-RU"

from twilio_service import strip_markdown  # тот же чистильщик markdown


def normalize_phone(raw: str) -> str:
    """Vonage шлёт номера без плюса: 77087645571 → +77087645571"""
    raw = (raw or "").strip().replace(" ", "")
    return raw if raw.startswith("+") else f"+{raw}"


# ── NCCO (сценарии звонка) ────────────────────────────────────

def _talk(text: str) -> dict:
    return {"action": "talk", "text": strip_markdown(text), "language": VOICE_LANG, "style": 0}


def _listen(field_id: str, farmer_id: str) -> dict:
    return {
        "action": "input",
        "type": ["speech"],
        "speech": {"language": VOICE_LANG, "endOnSilence": 1.5, "saveAudio": False},
        "eventUrl": [f"{BACKEND_URL}/vonage/voice/asr?field_id={field_id}&farmer_id={farmer_id}"],
        "eventMethod": "POST",
    }


def ncco_welcome(field_name: str, field_id: str, farmer_id: str) -> list:
    return [
        _talk(
            f"Здравствуйте! Это АгриВойс, ваш агроном. "
            f"Расскажите, что происходит на вашем поле {field_name}, после сигнала."
        ),
        _listen(field_id, farmer_id),
    ]


def ncco_answer(answer: str, field_id: str, farmer_id: str) -> list:
    return [
        _talk(answer),
        _talk("Есть ещё вопросы? Говорите."),
        _listen(field_id, farmer_id),
    ]


def ncco_error(text: str) -> list:
    return [_talk(text)]


def ncco_goodbye() -> list:
    return [_talk("Хорошего урожая! До свидания.")]


# ── SMS ──────────────────────────────────────────────────────

def send_sms(to_phone: str, message: str) -> bool:
    try:
        message = strip_markdown(message)
        if len(message) > 1000:
            message = message[:997] + "..."
        resp = httpx.post("https://rest.nexmo.com/sms/json", data={
            "api_key": VONAGE_API_KEY,
            "api_secret": VONAGE_API_SECRET,
            "from": VONAGE_PHONE_NUMBER or "AgriVoice",
            "to": to_phone.lstrip("+"),
            "text": message,
            "type": "unicode",
        }, timeout=10)
        status = resp.json()["messages"][0]["status"]
        if status != "0":
            print(f"[Vonage SMS] статус {status}: {resp.text}")
        return status == "0"
    except Exception as e:
        print(f"[Vonage SMS Error] {e}")
        return False


def send_agent_answer_sms(to_phone: str, answer: str, field_name: str) -> bool:
    return send_sms(to_phone, f"Поле {field_name}:\n{answer}")


# ── Исходящий звонок ─────────────────────────────────────────

def _app_jwt() -> str:
    with open(VONAGE_PRIVATE_KEY_PATH) as f:
        private_key = f.read()
    now = int(time.time())
    return jwt.encode(
        {
            "application_id": VONAGE_APPLICATION_ID,
            "iat": now,
            "exp": now + 300,
            "jti": str(uuid_lib.uuid4()),
        },
        private_key,
        algorithm="RS256",
    )


def make_outgoing_call(to_phone: str, ncco: list) -> bool:
    """Позвонить фермеру и проиграть NCCO-сценарий"""
    try:
        resp = httpx.post(
            "https://api.nexmo.com/v1/calls",
            headers={"Authorization": f"Bearer {_app_jwt()}"},
            json={
                "to": [{"type": "phone", "number": to_phone.lstrip("+")}],
                "from": {"type": "phone", "number": (VONAGE_PHONE_NUMBER or "12016496754").lstrip("+")},
                "ncco": ncco,
            },
            timeout=15,
        )
        print(f"[Vonage Call] {resp.status_code}: {resp.text[:200]}")
        return resp.status_code in (200, 201)
    except Exception as e:
        print(f"[Vonage Call Error] {e}")
        return False
