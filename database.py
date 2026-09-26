"""
AgriVoice — Supabase клиент и все запросы к БД
"""

import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")

# Ленивая инициализация: приложение стартует и без ключей,
# а при первом запросе к БД даёт понятную ошибку (удобно при замене БД)
_client = None


class DatabaseNotConfigured(Exception):
    """Отдельный класс, чтобы функции-«глотатели» ошибок его пропускали наверх"""


def db():
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise DatabaseNotConfigured(
                "База данных не настроена: заполните SUPABASE_URL и SUPABASE_KEY в .env "
                "(см. .env.example и supabase_schema.sql)"
            )
        from supabase import create_client
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


# ══════════════════════════════════════════════════════════════
# FARMERS — работа с фермерами
# ══════════════════════════════════════════════════════════════

def get_farmer_by_phone(phone: str) -> Optional[dict]:
    """Найти фермера по номеру телефона"""
    try:
        result = db().table("farmers").select("*").eq("phone", phone).single().execute()
        return result.data
    except DatabaseNotConfigured:
        raise
    except Exception:
        return None


def get_farmer_by_id(farmer_id: str) -> Optional[dict]:
    """Найти фермера по ID"""
    try:
        result = db().table("farmers").select("*").eq("id", farmer_id).single().execute()
        return result.data
    except DatabaseNotConfigured:
        raise
    except Exception:
        return None


def create_farmer(name: str, phone: str) -> Optional[dict]:
    """Создать нового фермера"""
    try:
        result = db().table("farmers").insert({
            "name": name,
            "phone": phone
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise Exception(f"Ошибка создания фермера: {str(e)}")


# ══════════════════════════════════════════════════════════════
# SESSIONS — авторизационные токены
# ══════════════════════════════════════════════════════════════

def create_session(farmer_id: str) -> Optional[dict]:
    """Создать новую сессию для фермера"""
    import uuid
    try:
        token = str(uuid.uuid4())
        result = db().table("sessions").insert({
            "farmer_id": farmer_id,
            "token": token
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise Exception(f"Ошибка создания сессии: {str(e)}")


def get_session_by_token(token: str) -> Optional[dict]:
    """Найти сессию по токену"""
    try:
        result = db().table("sessions").select("*").eq("token", token).single().execute()
        return result.data
    except DatabaseNotConfigured:
        raise
    except Exception:
        return None


# ══════════════════════════════════════════════════════════════
# FIELDS — работа с полями
# ══════════════════════════════════════════════════════════════

def get_fields_by_farmer(farmer_id: str) -> list:
    """Получить все поля фермера"""
    try:
        result = db().table("fields").select("*").eq("farmer_id", farmer_id).order("created_at", desc=False).execute()
        return result.data or []
    except Exception as e:
        raise Exception(f"Ошибка получения полей: {str(e)}")


def get_field_by_id(field_id: str) -> Optional[dict]:
    """Получить данные одного поля"""
    try:
        result = db().table("fields").select("*").eq("id", field_id).single().execute()
        return result.data
    except DatabaseNotConfigured:
        raise
    except Exception:
        return None


def create_field(farmer_id: str, name: str, crop_type: str, area_ha: float, location: Optional[str] = None) -> Optional[dict]:
    """Добавить новое поле"""
    try:
        result = db().table("fields").insert({
            "farmer_id": farmer_id,
            "name": name,
            "crop_type": crop_type,
            "area_ha": area_ha,
            "location": location or ""
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise Exception(f"Ошибка создания поля: {str(e)}")


# ══════════════════════════════════════════════════════════════
# MESSAGES — история чата
# ══════════════════════════════════════════════════════════════

def get_field_history(field_id: str, limit: int = 20) -> list:
    """Получить последние N сообщений поля для контекста"""
    try:
        result = (
            db().table("messages")
            .select("*")
            .eq("field_id", field_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        # Разворачиваем чтобы старые были первыми
        messages = result.data or []
        messages.reverse()
        return messages
    except Exception as e:
        raise Exception(f"Ошибка получения истории: {str(e)}")


def save_message(farmer_id: str, field_id: str, role: str, content: str, channel: str) -> Optional[dict]:
    """Сохранить одно сообщение в историю"""
    try:
        result = db().table("messages").insert({
            "farmer_id": farmer_id,
            "field_id": field_id,
            "role": role,
            "content": content,
            "channel": channel
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise Exception(f"Ошибка сохранения сообщения: {str(e)}")


def save_message_pair(farmer_id: str, field_id: str, question: str, answer: str, channel: str) -> None:
    """Сохранить вопрос и ответ одним запросом (вместо двух round-trip)"""
    try:
        db().table("messages").insert([
            {"farmer_id": farmer_id, "field_id": field_id, "role": "user", "content": question, "channel": channel},
            {"farmer_id": farmer_id, "field_id": field_id, "role": "assistant", "content": answer, "channel": channel},
        ]).execute()
    except Exception as e:
        raise Exception(f"Ошибка сохранения сообщений: {str(e)}")


def get_last_message_for_field(field_id: str) -> Optional[dict]:
    """Получить последнее сообщение поля (одиночный вариант)"""
    try:
        result = (
            db().table("messages")
            .select("content, role, created_at")
            .eq("field_id", field_id)
            .eq("role", "assistant")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        data = result.data
        return data[0] if data else None
    except DatabaseNotConfigured:
        raise
    except Exception:
        return None


def get_last_messages_map(farmer_id: str, per_field_limit: int = 200) -> dict:
    """
    Последнее сообщение агента для КАЖДОГО поля фермера одним запросом.
    Возвращает {field_id: {content, created_at}} — вместо N+1 запросов в дашборде.
    """
    try:
        result = (
            db().table("messages")
            .select("field_id, content, created_at")
            .eq("farmer_id", farmer_id)
            .eq("role", "assistant")
            .order("created_at", desc=True)
            .limit(per_field_limit)
            .execute()
        )
        latest: dict = {}
        for msg in result.data or []:
            # сообщения идут от новых к старым — первое встреченное и есть последнее
            if msg["field_id"] not in latest:
                latest[msg["field_id"]] = msg
        return latest
    except DatabaseNotConfigured:
        raise
    except Exception:
        return {}


def get_monthly_consultations(farmer_id: str) -> int:
    """Подсчитать консультации за текущий месяц"""
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        # Первый день текущего месяца
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

        result = (
            db().table("messages")
            .select("id", count="exact")
            .eq("farmer_id", farmer_id)
            .eq("role", "assistant")
            .gte("created_at", start_of_month)
            .execute()
        )
        return result.count or 0
    except DatabaseNotConfigured:
        raise
    except Exception:
        return 0
