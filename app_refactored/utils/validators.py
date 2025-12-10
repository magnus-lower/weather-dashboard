"""Validation helpers for incoming requests."""
from __future__ import annotations

import re
from typing import Optional, Tuple


def validate_coordinates(lat: str, lon: str) -> tuple[bool, Optional[str]]:
    try:
        lat_val = float(lat)
        lon_val = float(lon)
        if not (-90 <= lat_val <= 90):
            return False, "Breddegrad må være mellom -90 og 90"
        if not (-180 <= lon_val <= 180):
            return False, "Lengdegrad må være mellom -180 og 180"
        return True, None
    except (ValueError, TypeError):
        return False, "Koordinater må være gyldige tall"


def validate_city_name(city: str) -> tuple[bool, Optional[str]]:
    if not city or not city.strip():
        return False, "Bynavn kan ikke være tomt"
    city = city.strip()
    if len(city) < 2:
        return False, "Bynavn må være minst 2 tegn"
    if len(city) > 100:
        return False, "Bynavn er for langt"
    if not re.match(
        r"^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽæøå\s\-'.,]+$",
        city,
    ):
        return False, "Bynavn inneholder ugyldige tegn"
    return True, None


def validate_country_code(country: str) -> tuple[bool, Optional[str]]:
    if not country:
        return True, None
    country = country.strip().upper()
    if len(country) != 2:
        return False, "Landkode må være 2 tegn (ISO 3166-1 alpha-2)"
    if not re.match(r"^[A-Z]{2}$", country):
        return False, "Landkode må kun inneholde bokstaver"
    return True, None


def sanitize_input(value: str) -> str:
    if not value:
        return ""
    cleaned = re.sub(r"<[^>]*>", "", value)
    cleaned = re.sub(r"[;'\"\\]", "", cleaned)
    return cleaned.strip()
