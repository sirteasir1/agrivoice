"""
AgriVoice — Логика авторизации (регистрация и вход)
"""

from database import (
    get_farmer_by_phone,
    create_farmer,
    create_session,
)
from models import RegisterRequest, LoginRequest, AuthResponse


def register_farmer(data: RegisterRequest) -> AuthResponse:
    """
    Регистрация нового фермера.
    
    Args:
        data: { name, phone }
    
    Returns:
        AuthResponse с farmer_id, token, name
    
    Raises:
        Exception если номер уже занят
    """
    # Проверяем что номер ещё не существует
    existing = get_farmer_by_phone(data.phone)
    if existing:
        raise Exception("Этот номер телефона уже зарегистрирован")

    # Создаём фермера
    farmer = create_farmer(name=data.name, phone=data.phone)
    if not farmer:
        raise Exception("Ошибка при создании аккаунта, попробуйте снова")

    # Создаём сессию
    session = create_session(farmer_id=farmer["id"])
    if not session:
        raise Exception("Ошибка при создании сессии")

    return AuthResponse(
        farmer_id=farmer["id"],
        token=session["token"],
        name=farmer["name"],
    )


def login_farmer(data: LoginRequest) -> AuthResponse:
    """
    Вход существующего фермера по номеру телефона.
    
    Args:
        data: { phone }
    
    Returns:
        AuthResponse с farmer_id, token, name
    
    Raises:
        Exception если номер не найден
    """
    # Ищем фермера
    farmer = get_farmer_by_phone(data.phone)
    if not farmer:
        raise Exception("Номер не зарегистрирован. Пожалуйста, зарегистрируйтесь.")

    # Создаём новую сессию
    session = create_session(farmer_id=farmer["id"])
    if not session:
        raise Exception("Ошибка входа, попробуйте снова")

    return AuthResponse(
        farmer_id=farmer["id"],
        token=session["token"],
        name=farmer["name"],
    )
