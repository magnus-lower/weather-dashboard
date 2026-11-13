from flask import has_request_context, request


def make_cache_key(city: str = None, country: str = None, lat: str = None,
                   lon: str = None, unit: str = None, endpoint: str = 'weather') -> str:
    if city is None and lat is None and has_request_context():
        city = request.args.get('city', '')
        country = request.args.get('country', '')
        lat = request.args.get('lat', '')
        lon = request.args.get('lon', '')
    if unit is None:
        unit = request.args.get('unit', 'metric') if has_request_context() else 'metric'
    if city:
        return f"{endpoint}:city:{city.lower()}:{(country or '').lower()}:{unit}"
    return f"{endpoint}:coords:{lat}:{lon}:{unit}"
