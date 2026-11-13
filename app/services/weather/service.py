import logging
from typing import Dict, List, Optional
import requests
from app.core.cache import analytics, weather_cache

logger = logging.getLogger(__name__)

class WeatherAPIService:
    def __init__(self, api_key: str, base_url: str, timeout: int = 10):
        self.api_key = api_key
        self.base_url = base_url.replace('http://', 'https://').rstrip('/') + '/'
        self.timeout = timeout
        self.session = requests.Session()
        # urllib3 debug messages include request targets, which contain the API key.
        logging.getLogger('urllib3').setLevel(logging.WARNING)

    def _get_json(self, url: str, params: Dict):
        response = self.session.get(
            url, params={**params, 'appid': self.api_key},
            timeout=self.timeout, allow_redirects=False
        )
        response.raise_for_status()
        if 300 <= response.status_code < 400:
            raise ValueError("Unexpected upstream redirect")
        return response.json()

    @staticmethod
    def _api_error(error: Exception) -> Dict:
        # Exception strings and tracebacks may contain credential-bearing URLs.
        logger.warning("Weather API request failed (%s)", type(error).__name__)
        if isinstance(error, requests.exceptions.Timeout):
            return {'error': 'Forespørselen tok for lang tid. Prøv igjen senere.', 'status_code': 504}
        if isinstance(error, requests.exceptions.ConnectionError):
            return {'error': 'Kunne ikke koble til vær-tjenesten. Sjekk internettforbindelsen.', 'status_code': 502}
        if isinstance(error, requests.exceptions.HTTPError):
            status = error.response.status_code if error.response is not None else 502
            messages = {
                401: 'Ugyldig API-nøkkel',
                404: 'Byen ble ikke funnet',
                429: 'For mange forespørsler. Prøv igjen senere.'
            }
            return {'error': messages.get(status, 'Feil ved henting av værdata. Prøv igjen senere.'),
                    'status_code': status if status in (404, 429) else 502}
        if isinstance(error, (ValueError, requests.exceptions.JSONDecodeError)):
            return {'error': 'Ugyldig respons fra vær-tjenesten', 'status_code': 502}
        return {'error': 'Feil ved henting av værdata. Prøv igjen senere.', 'status_code': 502}

    def fetch_weather_data(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        try:
            if endpoint not in ('weather', 'forecast'):
                raise ValueError("Invalid weather endpoint")
            data = self._get_json(self.base_url + endpoint, params or {})
            if not isinstance(data, dict):
                raise ValueError("Invalid weather response")
            if str(data.get('cod', 200)) != '200':
                status = str(data.get('cod'))
                messages = {'404': 'Byen ble ikke funnet', '429': 'For mange forespørsler. Prøv igjen senere.'}
                return {'error': messages.get(status, 'Feil fra vær-tjenesten'),
                        'status_code': int(status) if status in messages else 502}
            return data
        except (requests.exceptions.RequestException, ValueError) as error:
            return self._api_error(error)

    def fetch_city_suggestions(self, query: str, limit: int = 8) -> List[Dict] | Dict:
        try:
            data = self._get_json(
                "https://api.openweathermap.org/geo/1.0/direct",
                {'q': query, 'limit': 5}
            )
            if not isinstance(data, list):
                raise ValueError("Invalid geocoding response")
            suggestions: List[Dict] = []
            seen_cities = set()
            seen_names = set()
            data.sort(key=lambda item: (
                not item.get('name', '').lower().startswith(query.lower()),
                item.get('country', '') != 'NO',
                -(item.get('population', 0) or 0),
                len(item.get('name', ''))
            ))
            for item in data:
                city_name = item.get('name', '')
                country = item.get('country', '')
                state = item.get('state', '')
                if not city_name or not country:
                    continue
                unique_key = f"{city_name.lower()}_{country.lower()}_{state.lower()}"
                if unique_key in seen_cities:
                    continue
                seen_cities.add(unique_key)
                city_name_lower = city_name.lower()
                if city_name_lower in seen_names:
                    existing_countries = [suggestion['country'] for suggestion in suggestions if suggestion['name'].lower() == city_name_lower]
                    if country in existing_countries:
                        continue
                seen_names.add(city_name_lower)
                is_exact_match = city_name.lower().startswith(query.lower())
                relevance_score = 0
                if is_exact_match:
                    relevance_score += 100
                if country == 'NO':
                    relevance_score += 50
                if item.get('population'):
                    relevance_score += min(item.get('population', 0) / 10000, 20)
                if len(city_name) <= 8:
                    relevance_score += 10
                display_name = city_name
                if state and state != city_name:
                    display_name = f"{city_name}, {state}, {country}"
                else:
                    display_name = f"{city_name}, {country}"
                suggestion = {
                    'name': city_name,
                    'country': country,
                    'state': state,
                    'lat': item.get('lat'),
                    'lon': item.get('lon'),
                    'is_exact_match': is_exact_match,
                    'relevance_score': relevance_score,
                    'population': item.get('population', 0),
                    'display_name': display_name
                }
                suggestions.append(suggestion)
            suggestions.sort(key=lambda suggestion: suggestion['relevance_score'], reverse=True)
            final_suggestions: List[Dict] = []
            country_count: Dict[str, int] = {}
            for suggestion in suggestions:
                country = suggestion['country']
                if country_count.get(country, 0) < 3 or len(final_suggestions) < limit // 2:
                    final_suggestions.append(suggestion)
                    country_count[country] = country_count.get(country, 0) + 1
                if len(final_suggestions) >= limit:
                    break
            if len(final_suggestions) < limit:
                for suggestion in suggestions:
                    if suggestion not in final_suggestions:
                        final_suggestions.append(suggestion)
                        if len(final_suggestions) >= limit:
                            break
            return final_suggestions[:limit]
        except (requests.exceptions.RequestException, ValueError, TypeError, KeyError, AttributeError) as error:
            return self._api_error(error)

    def reverse_geocode(self, lat: str, lon: str) -> Dict:
        try:
            data = self._get_json(
                "https://api.openweathermap.org/geo/1.0/reverse",
                {'lat': lat, 'lon': lon, 'limit': 1}
            )
            if not isinstance(data, list):
                raise ValueError("Invalid geocoding response")
            if data:
                location = data[0]
                return {
                    'city': location.get('name', 'Ukjent'),
                    'country': location.get('country', 'Ukjent'),
                    'state': location.get('state', '')
                }
            return {'error': 'Kunne ikke finne stedsnavn for koordinatene'}
        except (requests.exceptions.RequestException, ValueError, TypeError, KeyError, AttributeError) as error:
            return self._api_error(error)

class DatabaseCache:
    @staticmethod
    def get(cache_key: str) -> Optional[Dict]:
        return weather_cache.get(cache_key)

    @staticmethod
    def set(cache_key: str, data: Dict, timeout: int = 300) -> None:
        weather_cache.set(cache_key, data, timeout)

    @staticmethod
    def clear_expired() -> int:
        return weather_cache.clear_expired()

class WeatherAnalytics:
    @staticmethod
    def log_query(city: str, country: str, user_ip: str, response_time: float, endpoint: str) -> None:
        analytics.log_query(city, country, user_ip, response_time, endpoint)

    @staticmethod
    def get_query_stats() -> Dict:
        return analytics.get_query_stats()

    @staticmethod
    def get_popular_cities(limit: int = 10) -> List[Dict]:
        return analytics.get_popular_cities(limit)
