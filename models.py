"""
AgriVoice — Pydantic модели для FastAPI
"""

from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


# ── Авторизация ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    phone: str

class LoginRequest(BaseModel):
    phone: str

class AuthResponse(BaseModel):
    farmer_id: str
    token: str
    name: str


# ── Поля ─────────────────────────────────────────────────────

class CreateFieldRequest(BaseModel):
    name: str
    crop_type: str        # пшеница / кукуруза / подсолнух / ячмень / хлопок
    area_ha: float
    location: Optional[str] = None

class FieldResponse(BaseModel):
    id: str
    farmer_id: str
    name: str
    crop_type: str
    area_ha: float
    location: Optional[str]
    created_at: str


# ── Агент ─────────────────────────────────────────────────────

class AgentMessageRequest(BaseModel):
    farmer_id: str
    field_id: str
    text: str
    channel: str          # 'voice' | 'text' | 'sms' | 'call'

class AgentMessageResponse(BaseModel):
    answer: str
    field_id: str
    channel: str


# ── История ───────────────────────────────────────────────────

class MessageRecord(BaseModel):
    id: str
    role: str
    content: str
    channel: str
    created_at: str


# ── Twilio входящий SMS ────────────────────────────────────────

class TwilioSMSWebhook(BaseModel):
    From: str             # номер телефона фермера
    Body: str             # текст сообщения
    MessageSid: Optional[str] = None
