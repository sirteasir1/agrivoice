"""
AgriVoice — Supabase клиент и все запросы к БД
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

# Инициализация Supabase клиента
SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ══════════════════════════════════════════════════════════════
# FARMERS — работа с фермерами
# ══════════════════════════════════════════════════════════════

def get_farmer_by_phone(phone: str) -> Optional[dict]:
    """Найти фермера по номеру телефона"""
    try:
        result = supabase.table("farmers").select("*").eq("phone", phone).single().execute()
        return result.data
    except Exception:
        return None


def get_farmer_by_id(farmer_id: str) -> Optional[dict]:
    """Найти фермера по ID"""
    try:
        result = supabase.table("farmers").select("*").eq("id", farmer_id).single().execute()
        return result.data
    except Exception:
        return None


def create_farmer(name: str, phone: str) -> Optional[dict]:
    """Создать нового фермера"""
    try:
        result = supabase.table("farmers").insert({
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
        result = supabase.table("sessions").insert({
            "farmer_id": farmer_id,
            "token": token
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise Exception(f"Ошибка создания сессии: {str(e)}")


def get_session_by_token(token: str) -> Optional[dict]:
    """Найти сессию по токену"""
    try:
        result = supabase.table("sessions").select("*").eq("token", token).single().execute()
        return result.data
    except Exception:
        return None


# ══════════════════════════════════════════════════════════════
# FIELDS — работа с полями
# ══════════════════════════════════════════════════════════════

def get_fields_by_farmer(farmer_id: str) -> list:
    """Получить все поля фермера"""
    try:
        result = supabase.table("fields").select("*").eq("farmer_id", farmer_id).order("created_at", desc=False).execute()
        return result.data or []
    except Exception as e:
        raise Exception(f"Ошибка получения полей: {str(e)}")


def get_field_by_id(field_id: str) -> Optional[dict]:
    """Получить данные одного поля"""
    try:
        result = supabase.table("fields").select("*").eq("id", field_id).single().execute()
        return result.data
    except Exception:
        return None


def create_field(farmer_id: str, name: str, crop_type: str, area_ha: float, location: Optional[str] = None) -> Optional[dict]:
    """Добавить новое поле"""
    try:
        result = supabase.table("fields").insert({
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
            supabase.table("messages")
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
    """Сохранить сообщение в историю"""
    try:
        result = supabase.table("messages").insert({
            "farmer_id": farmer_id,
            "field_id": field_id,
            "role": role,
            "content": content,
            "channel": channel
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise Exception(f"Ошибка сохранения сообщения: {str(e)}")


def get_last_message_for_field(field_id: str) -> Optional[dict]:
    """Получить последнее сообщение поля (для карточек в дашборде)"""
    try:
        result = (
            supabase.table("messages")
            .select("content, role, created_at")
            .eq("field_id", field_id)
            .eq("role", "assistant")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        data = result.data
        return data[0] if data else None
    except Exception:
        return None


def get_monthly_consultations(farmer_id: str) -> int:
    """Подсчитать консультации за текущий месяц"""
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        # Первый день текущего месяца
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

        result = (
            supabase.table("messages")
            .select("id", count="exact")
            .eq("farmer_id", farmer_id)
            .eq("role", "assistant")
            .gte("created_at", start_of_month)
            .execute()
        )
        return result.count or 0
    except Exception:
        return 0
