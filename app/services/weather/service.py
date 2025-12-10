# services.py - Business logic services (Database-free version)
import requests
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass

from app.models.cache import weather_cache, analytics, favorites

logger = logging.getLogger(__name__)


@dataclass
class WeatherData:
    """Data class for structured weather information"""
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
    """Service class to handle external weather API calls"""

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = 10

    def fetch_weather_data(self, url: str) -> Dict:
        """Fetch and validate weather data with comprehensive error handling"""
        try:
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()

            # Check if it's an error response from OpenWeatherMap
            # Handle both string and integer cod values
            if 'cod' in data:
                cod_value = data['cod']
                # Convert to int if it's a string
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

        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error when fetching weather data: {e}")
            if e.response.status_code == 401:
                return {'error': 'Ugyldig API-nøkkel'}
            elif e.response.status_code == 404:
                return {'error': 'Byen ble ikke funnet'}
            elif e.response.status_code == 429:
                return {'error': 'For mange forespørsler. Prøv igjen senere.'}
            else:
                return {'error': f'HTTP-feil: {e.response.status_code}'}

        except requests.exceptions.RequestException as e:
            logger.error(f"Request error when fetching weather data: {e}")
            return {'error': 'Feil ved henting av værdata. Prøv igjen senere.'}

        except json.JSONDecodeError:
            logger.error("Invalid JSON response from weather API")
            return {'error': 'Ugyldig respons fra vær-tjenesten'}

        except Exception as e:
            logger.error(f"Unexpected error when fetching weather data: {e}")
            return {'error': 'En uventet feil oppstod. Prøv igjen senere.'}

    def fetch_city_suggestions(self, query: str, limit: int = 8) -> List[Dict]:
        """Fetch city suggestions for autocomplete with improved logic"""
        try:
            # Use the geocoding API for city suggestions with higher limit for better filtering
            url = f"http://api.openweathermap.org/geo/1.0/direct?q={query}&limit=25&appid={self.api_key}"
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()

            suggestions = []
            seen_cities = set()  # Track unique city-country combinations
            seen_names = set()   # Track city names to avoid too many duplicates
            
            # Prioritize by population and importance
            data.sort(key=lambda x: (
                not x.get('name', '').lower().startswith(query.lower()),  # Exact matches first
                x.get('country', '') != 'NO',  # Norwegian cities prioritized
                -(x.get('population', 0) or 0),  # Higher population first
                len(x.get('name', ''))  # Shorter names first
            ))
            
            for item in data:
                city_name = item.get('name', '')
                country = item.get('country', '')
                state = item.get('state', '')
                
                # Skip if we don't have essential data
                if not city_name or not country:
                    continue
                
                # Create unique key for exact deduplication
                unique_key = f"{city_name.lower()}_{country.lower()}_{state.lower()}"
                
                # Skip exact duplicates
                if unique_key in seen_cities:
                    continue
                seen_cities.add(unique_key)
                
                # Limit similar city names to avoid repetition
                city_name_lower = city_name.lower()
                if city_name_lower in seen_names:
                    # Only allow if it's a significantly different location (different country)
                    existing_countries = [s['country'] for s in suggestions if s['name'].lower() == city_name_lower]
                    if country in existing_countries:
                        continue
                
                seen_names.add(city_name_lower)
                
                # Prioritize exact matches at the beginning
                is_exact_match = city_name.lower().startswith(query.lower())
                
                # Calculate relevance score
                relevance_score = 0
                if is_exact_match:
                    relevance_score += 100
                if country == 'NO':
                    relevance_score += 50
                if item.get('population'):
                    relevance_score += min(item.get('population', 0) / 10000, 20)  # Max 20 points for population
                if len(city_name) <= 8:  # Shorter names are often more important
                    relevance_score += 10
                
                # Format display name
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
            
            # Sort by relevance score
            suggestions.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            # Ensure diversity - if we have too many from same country, mix it up
            final_suggestions = []
            country_count = {}
            
            for suggestion in suggestions:
                country = suggestion['country']
                if country_count.get(country, 0) < 3 or len(final_suggestions) < limit // 2:
                    final_suggestions.append(suggestion)
                    country_count[country] = country_count.get(country, 0) + 1
                    
                if len(final_suggestions) >= limit:
                    break
            
            # If we still need more suggestions and have some left, add them
            if len(final_suggestions) < limit:
                for suggestion in suggestions:
                    if suggestion not in final_suggestions:
                        final_suggestions.append(suggestion)
                        if len(final_suggestions) >= limit:
                            break
            
            return final_suggestions[:limit]

        except Exception as e:
            logger.error(f"Error fetching city suggestions: {e}")
            return []

    def reverse_geocode(self, lat: str, lon: str) -> Dict:
        """Reverse geocode coordinates to city name"""
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
            else:
                return {'error': 'Kunne ikke finne stedsnavn for koordinatene'}

        except Exception as e:
            logger.error(f"Error in reverse geocoding: {e}")
            return {'error': 'Feil ved reversering av koordinater'}


class DatabaseCache:
    """Cache service using in-memory storage"""

    @staticmethod
    def get(cache_key: str) -> Optional[Dict]:
        """Get cached weather data"""
        return weather_cache.get(cache_key)

    @staticmethod
    def set(cache_key: str, data: Dict, timeout: int = 300) -> None:
        """Cache weather data"""
        weather_cache.set(cache_key, data, timeout)

    @staticmethod
    def clear_expired() -> int:
        """Clear expired cache entries"""
        return weather_cache.clear_expired()


class WeatherAnalytics:
    """Analytics service using in-memory storage"""

    @staticmethod
    def log_query(city: str, country: str, user_ip: str, response_time: float, endpoint: str) -> None:
        """Log a weather query"""
        analytics.log_query(city, country, user_ip, response_time, endpoint)

    @staticmethod
    def get_query_stats() -> Dict:
        """Get query statistics"""
        return analytics.get_query_stats()

    @staticmethod
    def get_popular_cities(limit: int = 10) -> List[Dict]:
        """Get most popular cities"""
        return analytics.get_popular_cities(limit)


class FavoritesService:
    """Favorites service using in-memory storage"""

    @staticmethod
    def get_user_favorites(user_ip: str) -> List[Dict]:
        """Get user's favorite cities"""
        return favorites.get_user_favorites(user_ip)

    @staticmethod
    def add_favorite(user_ip: str, city: str, country: str) -> bool:
        """Add a favorite city"""
        return favorites.add_favorite(user_ip, city, country)

    @staticmethod
    def remove_favorite(user_ip: str, city: str, country: str) -> bool:
        """Remove a favorite city"""
        return favorites.remove_favorite(user_ip, city, country)
