"""
AgriVoice — Погода по местоположению поля (Open-Meteo, бесплатно, без ключа)
"""

import time
import httpx

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# кэш: geocode навсегда (в рамках процесса), прогноз — 30 минут
_geo_cache: dict[str, tuple[float, float] | None] = {}
_forecast_cache: dict[str, tuple[float, dict]] = {}
FORECAST_TTL = 30 * 60

# Расшифровка weather_code Open-Meteo (WMO)
WMO_RU = {
    0: "ясно", 1: "малооблачно", 2: "переменная облачность", 3: "пасмурно",
    45: "туман", 48: "изморозь",
    51: "морось", 53: "морось", 55: "сильная морось",
    61: "небольшой дождь", 63: "дождь", 65: "сильный дождь",
    66: "ледяной дождь", 67: "ледяной дождь",
    71: "небольшой снег", 73: "снег", 75: "сильный снег", 77: "снежные зёрна",
    80: "ливень", 81: "ливень", 82: "сильный ливень",
    85: "снегопад", 86: "сильный снегопад",
    95: "гроза", 96: "гроза с градом", 99: "гроза с градом",
}
WMO_KK = {
    0: "ашық", 1: "аз бұлтты", 2: "бұлтты", 3: "тұманды",
    45: "тұман", 48: "қырау",
    51: "сіркіреген жаңбыр", 53: "сіркіреген жаңбыр", 55: "қатты сіркіреу",
    61: "аздаған жаңбыр", 63: "жаңбыр", 65: "қатты жаңбыр",
    66: "мұзды жаңбыр", 67: "мұзды жаңбыр",
    71: "аздаған қар", 73: "қар", 75: "қатты қар", 77: "қар түйірлері",
    80: "нөсер", 81: "нөсер", 82: "қатты нөсер",
    85: "қар жауады", 86: "қатты қар жауады",
    95: "найзағай", 96: "бұршақты найзағай", 99: "бұршақты найзағай",
}


# Области КЗ (стем названия ru/kk → координаты обл. центра):
# Open-Meteo геокодит города, но не области, поэтому фолбэк-словарь
KZ_REGIONS: dict[str, tuple[float, float]] = {
    "акмолин": (53.28, 69.39), "ақмола": (53.28, 69.39),
    "актюбин": (50.28, 57.17), "ақтөбе": (50.28, 57.17),
    "алматин": (43.87, 77.06), "алматы обл": (43.87, 77.06),
    "атырау": (47.12, 51.88),
    "восточно-казахстан": (49.95, 82.61), "шығыс қазақстан": (49.95, 82.61), "вко": (49.95, 82.61),
    "жамбыл": (42.90, 71.37),
    "западно-казахстан": (51.23, 51.37), "батыс қазақстан": (51.23, 51.37), "зко": (51.23, 51.37),
    "караганд": (49.80, 73.10), "қарағанды": (49.80, 73.10),
    "костанай": (53.21, 63.62), "қостанай": (53.21, 63.62),
    "кызылорд": (44.85, 65.51), "қызылорда": (44.85, 65.51),
    "мангистау": (43.65, 51.16), "маңғыстау": (43.65, 51.16),
    "павлодар": (52.29, 76.95),
    "северо-казахстан": (54.87, 69.15), "солтүстік қазақстан": (54.87, 69.15), "ско": (54.87, 69.15),
    "туркестан": (43.30, 68.25), "түркістан": (43.30, 68.25),
    "улытау": (47.78, 67.71), "ұлытау": (47.78, 67.71),
    "абай": (50.41, 80.25),
    "жетысу": (45.02, 78.37), "жетісу": (45.02, 78.37),
    "астана": (51.17, 71.43),
    "шымкент": (42.32, 69.59),
}


def geocode(location: str) -> tuple[float, float] | None:
    """Название местности → (lat, lon). Сначала области КЗ, потом Open-Meteo."""
    key = location.strip().lower()
    if key in _geo_cache:
        return _geo_cache[key]

    for stem, coords in KZ_REGIONS.items():
        if stem in key:
            _geo_cache[key] = coords
            return coords

    # Open-Meteo лучше находит без слов "обл.", "область", "район"
    query = (
        location.replace("обл.", "").replace("область", "")
        .replace("облысы", "").replace("район", "").replace("ауданы", "")
        .strip()
    )
    coords = None
    try:
        with httpx.Client(timeout=6) as client:
            for lang in ("ru", "en"):
                resp = client.get(GEOCODE_URL, params={
                    "name": query, "count": 1, "language": lang, "format": "json",
                })
                results = resp.json().get("results") or []
                if results:
                    coords = (results[0]["latitude"], results[0]["longitude"])
                    break
    except Exception as e:
        print(f"[Weather] Ошибка геокодинга '{location}': {e}")

    _geo_cache[key] = coords
    return coords


def get_field_weather(field: dict) -> dict | None:
    """Прогноз на 5 дней для поля. None если нет местоположения или ошибка."""
    location = (field.get("location") or "").strip()
    if not location:
        return None

    cached = _forecast_cache.get(location.lower())
    if cached and time.time() - cached[0] < FORECAST_TTL:
        return cached[1]

    coords = geocode(location)
    if not coords:
        return None

    try:
        with httpx.Client(timeout=6) as client:
            resp = client.get(FORECAST_URL, params={
                "latitude": coords[0],
                "longitude": coords[1],
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,"
                         "precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
                "timezone": "auto",
                "forecast_days": 5,
            })
            daily = resp.json()["daily"]
    except Exception as e:
        print(f"[Weather] Ошибка прогноза '{location}': {e}")
        return None

    days = []
    for i in range(len(daily["time"])):
        code = daily["weather_code"][i]
        days.append({
            "date": daily["time"][i],
            "code": code,
            "desc_ru": WMO_RU.get(code, "—"),
            "desc_kk": WMO_KK.get(code, "—"),
            "t_max": round(daily["temperature_2m_max"][i]),
            "t_min": round(daily["temperature_2m_min"][i]),
            "precip_mm": round(daily["precipitation_sum"][i] or 0, 1),
            "precip_prob": daily["precipitation_probability_max"][i],
            "wind_max": round(daily["wind_speed_10m_max"][i]),
        })

    weather = {"location": location, "lat": coords[0], "lon": coords[1], "days": days}
    _forecast_cache[location.lower()] = (time.time(), weather)
    return weather


def weather_for_prompt(weather: dict | None) -> str:
    """Компактная сводка для системного промпта агронома."""
    if not weather:
        return "нет данных (местоположение поля не указано)"
    lines = []
    for d in weather["days"]:
        lines.append(
            f"{d['date']}: {d['desc_ru']}, {d['t_min']}…{d['t_max']}°C, "
            f"осадки {d['precip_mm']} мм ({d['precip_prob']}%), ветер до {d['wind_max']} км/ч"
        )
    return "\n".join(lines)
