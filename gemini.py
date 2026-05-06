"""
AgriVoice — Gemini API (google-generativeai)
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv
from prompts import AGRONOMIST_SYSTEM_PROMPT

load_dotenv()

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))


def build_system_prompt(field: dict) -> str:
    return AGRONOMIST_SYSTEM_PROMPT.format(
        field_name=field.get("name", ""),
        crop_type=field.get("crop_type", ""),
        area_ha=field.get("area_ha", ""),
        location=field.get("location") or "не указано",
    )


def history_to_gemini(history: list) -> list:
    """Конвертировать историю БД в формат Gemini"""
    result = []
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        result.append({"role": role, "parts": [{"text": msg["content"]}]})
    return result


async def ask_gemini(field: dict, history: list, user_text: str) -> str:
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=build_system_prompt(field),
        )
        chat = model.start_chat(history=history_to_gemini(history))
        response = chat.send_message(user_text)
        return response.text.strip()
    except Exception as e:
        raise Exception(f"Ошибка Gemini API: {str(e)}")


async def ask_gemini_simple(question: str, context: str = "") -> str:
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=f"Ты агроном. Отвечай 1-2 предложения, конкретно. {context}",
        )
        response = model.generate_content(question)
        return response.text.strip()
    except Exception as e:
        raise Exception(f"Ошибка Gemini: {str(e)}")
