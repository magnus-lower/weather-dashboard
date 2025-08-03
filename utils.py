# utils.py - Utility functions
import re
from datetime import datetime
from flask import request
from typing import Optional


def make_cache_key(city: str = None, country: str = None, lat: str = None, lon: str = None) -> str:
    """Generate cache key for weather requests"""
    if city and country:
        # For city-based requests
        current_hour = datetime.now().hour
        return f"weather:city:{city.lower()}:{country.lower()}:{current_hour}"
    elif lat and lon:
        # For coordinate-based requests
        current_hour = datetime.now().hour
        return f"weather:coords:{lat}:{lon}:{current_hour}"
    else:
        # Fallback to request args
        city = request.args.get('city', '').lower()
        country = request.args.get('country', '').lower()
        lat = request.args.get('lat', '')
        lon = request.args.get('lon', '')
        current_hour = datetime.now().hour

        if city:
            return f"weather:city:{city}:{country}:{current_hour}"
        else:
            return f"weather:coords:{lat}:{lon}:{current_hour}"


def get_user_ip() -> str:
    """Get user IP address with proxy support"""
    # Check for forwarded IP (from proxy/load balancer)
    forwarded_for = request.environ.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        # Take the first IP if multiple are listed
        return forwarded_for.split(',')[0].strip()

    # Check other common headers
    real_ip = request.environ.get('HTTP_X_REAL_IP')
    if real_ip:
        return real_ip

    # Fall back to remote address
    return request.remote_addr or 'unknown'


def validate_coordinates(lat: str, lon: str) -> tuple[bool, Optional[str]]:
    """Validate latitude and longitude values"""
    try:
        lat_float = float(lat)
        lon_float = float(lon)

        if not (-90 <= lat_float <= 90):
            return False, "Breddegrad må være mellom -90 og 90"

        if not (-180 <= lon_float <= 180):
            return False, "Lengdegrad må være mellom -180 og 180"

        return True, None

    except (ValueError, TypeError):
        return False, "Koordinater må være gyldige tall"


def validate_city_name(city: str) -> tuple[bool, Optional[str]]:
    """Validate city name input"""
    if not city or not city.strip():
        return False, "Bynavn kan ikke være tomt"

    # Remove extra spaces and check length
    city = city.strip()
    if len(city) < 2:
        return False, "Bynavn må være minst 2 tegn"

    if len(city) > 100:
        return False, "Bynavn er for langt"

    # Check for valid characters (letters, spaces, hyphens, apostrophes, commas)
    if not re.match(
            r"^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽæøå\s\-'.,]+$",
            city):
        return False, "Bynavn inneholder ugyldige tegn"

    return True, None


def validate_country_code(country: str) -> tuple[bool, Optional[str]]:
    """Validate country code (ISO 3166-1 alpha-2)"""
    if not country:
        return True, None  # Country is optional, defaults to 'NO'

    country = country.strip().upper()

    if len(country) != 2:
        return False, "Landkode må være 2 tegn (ISO 3166-1 alpha-2)"

    if not re.match(r"^[A-Z]{2}$", country):
        return False, "Landkode må kun inneholde bokstaver"

    return True, None


def sanitize_input(input_string: str) -> str:
    """Sanitize user input to prevent injection attacks"""
    if not input_string:
        return ""

    # Remove any potential script tags or HTML
    sanitized = re.sub(r'<[^>]*>', '', input_string)

    # Remove SQL injection patterns
    sanitized = re.sub(r'[;\'"\\]', '', sanitized)

    # Trim whitespace
    sanitized = sanitized.strip()

    return sanitized


def format_temperature(temp: float, unit: str = 'metric') -> str:
    """Format temperature with appropriate unit symbol"""
    unit_symbol = '°F' if unit == 'imperial' else '°C'
    return f"{temp:.1f}{unit_symbol}"


def format_wind_speed(speed: float, unit: str = 'metric') -> str:
    """Format wind speed with appropriate unit"""
    unit_symbol = 'mph' if unit == 'imperial' else 'm/s'
    return f"{speed:.1f} {unit_symbol}"


def calculate_response_time(start_time: datetime) -> float:
    """Calculate response time in milliseconds"""
    end_time = datetime.utcnow()
    delta = end_time - start_time
    return delta.total_seconds() * 1000


def is_valid_api_key(api_key: str) -> bool:
    """Basic validation for API key format"""
    if not api_key:
        return False

    # OpenWeatherMap API keys are typically 32 character hex strings
    return len(api_key) == 32 and re.match(r'^[a-f0-9]{32}$', api_key, re.IGNORECASE)


def get_client_info() -> dict:
    """Get client information for analytics"""
    return {
        'ip': get_user_ip(),
        'user_agent': request.headers.get('User-Agent', 'Unknown'),
        'referrer': request.headers.get('Referer', 'Direct'),
        'timestamp': datetime.utcnow().isoformat()
    }