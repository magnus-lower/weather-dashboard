from datetime import datetime
from flask import request


def make_cache_key(city: str = None, country: str = None, lat: str = None, lon: str = None) -> str:
    if city and country:
        current_hour = datetime.now().hour
        return f"weather:city:{city.lower()}:{country.lower()}:{current_hour}"
    if lat and lon:
        current_hour = datetime.now().hour
        return f"weather:coords:{lat}:{lon}:{current_hour}"
    city = request.args.get('city', '').lower()
    country = request.args.get('country', '').lower()
    lat = request.args.get('lat', '')
    lon = request.args.get('lon', '')
    current_hour = datetime.now().hour
    if city:
        return f"weather:city:{city}:{country}:{current_hour}"
    return f"weather:coords:{lat}:{lon}:{current_hour}"
