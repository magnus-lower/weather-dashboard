import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import requests
from app.core.cache import analytics, favorites, weather_cache

logger = logging.getLogger(__name__)

@dataclass
class WeatherData:
    city: str
    country: str
    temperature: float
    feels_like: float
    humidity: int
    description: str
    wind_speed: float
    timestamp: datetime
    icon: str

class WeatherAPIService:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = 10

    def fetch_weather_data(self, url: str) -> Dict:
        try:
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()
            if 'cod' in data:
                cod_value = data['cod']
                if isinstance(cod_value, str):
                    try:
                        cod_value = int(cod_value)
                    except ValueError:
                        pass
                if cod_value != 200:
                    error_msg = data.get('message', 'Ukjent feil fra vær-API')
                    return {'error': error_msg}
            return data
        except requests.exceptions.Timeout:
            logger.error("Timeout when fetching weather data")
            return {'error': 'Forespørselen tok for lang tid. Prøv igjen senere.'}
        except requests.exceptions.ConnectionError:
            logger.error("Connection error when fetching weather data")
            return {'error': 'Kunne ikke koble til vær-tjenesten. Sjekk internettforbindelsen.'}
        except requests.exceptions.HTTPError as error:
            logger.error(f"HTTP error when fetching weather data: {error}")
            if error.response.status_code == 401:
                return {'error': 'Ugyldig API-nøkkel'}
            if error.response.status_code == 404:
                return {'error': 'Byen ble ikke funnet'}
            if error.response.status_code == 429:
                return {'error': 'For mange forespørsler. Prøv igjen senere.'}
            return {'error': f'HTTP-feil: {error.response.status_code}'}
        except requests.exceptions.RequestException as error:
            logger.error(f"Request error when fetching weather data: {error}")
            return {'error': 'Feil ved henting av værdata. Prøv igjen senere.'}
        except json.JSONDecodeError:
            logger.error("Invalid JSON response from weather API")
            return {'error': 'Ugyldig respons fra vær-tjenesten'}
        except Exception as error:
            logger.error(f"Unexpected error when fetching weather data: {error}")
            return {'error': 'En uventet feil oppstod. Prøv igjen senere.'}

    def fetch_city_suggestions(self, query: str, limit: int = 8) -> List[Dict]:
        try:
            url = f"http://api.openweathermap.org/geo/1.0/direct?q={query}&limit=25&appid={self.api_key}"
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()
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
        except Exception as error:
            logger.error(f"Error fetching city suggestions: {error}")
            return []

    def reverse_geocode(self, lat: str, lon: str) -> Dict:
        try:
            url = f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={self.api_key}"
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()
            if data:
                location = data[0]
                return {
                    'city': location.get('name', 'Ukjent'),
                    'country': location.get('country', 'Ukjent'),
                    'state': location.get('state', '')
                }
            return {'error': 'Kunne ikke finne stedsnavn for koordinatene'}
        except Exception as error:
            logger.error(f"Error in reverse geocoding: {error}")
            return {'error': 'Feil ved reversering av koordinater'}

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

class FavoritesService:
    @staticmethod
    def get_user_favorites(user_ip: str) -> List[Dict]:
        return favorites.get_user_favorites(user_ip)

    @staticmethod
    def add_favorite(user_ip: str, city: str, country: str) -> bool:
        return favorites.add_favorite(user_ip, city, country)

    @staticmethod
    def remove_favorite(user_ip: str, city: str, country: str) -> bool:
        return favorites.remove_favorite(user_ip, city, country)
