# services.py - Business logic services
import requests
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass

from models import db, WeatherQuery, WeatherCache, UserFavorite

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
            if 'cod' in data and data['cod'] != 200:
                error_msg = data.get('message', 'Ukjent feil fra vær-API')
                return {'error': error_msg}

            return data

        except requests.exceptions.Timeout:
            logger.error("Request timed out")
            return {'error': 'Forespørselen tok for lang tid. Vennligst prøv igjen senere.'}
        except requests.exceptions.RequestException as e:
            logger.error(f"Network Error: {str(e)}")
            return {'error': 'En nettverksfeil oppstod. Vennligst sjekk internettforbindelsen og prøv igjen.'}
        except requests.exceptions.JSONDecodeError:
            logger.error("Invalid JSON response")
            return {'error': 'Ugyldig respons fra vær-API.'}

    def fetch_city_suggestions(self, query: str) -> List[Dict]:
        """Fetch city suggestions from OpenWeatherMap Geocoding API"""
        try:
            # Sanitize input
            import re
            query = re.sub(r'[^\w\s,-]', '', query).strip()

            if not query or len(query) < 2:
                return []

            url = f"https://api.openweathermap.org/geo/1.0/direct?q={requests.utils.quote(query)}&limit=10&appid={self.api_key}"

            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()

            # Format the response for frontend
            suggestions = []
            for city in data:
                suggestion = {
                    'name': city['name'],
                    'country': city['country'],
                    'state': city.get('state', ''),
                    'lat': city['lat'],
                    'lon': city['lon']
                }
                suggestions.append(suggestion)

            return suggestions

        except Exception as e:
            logger.error(f"Error fetching city suggestions: {e}")
            return []

    def reverse_geocode(self, lat: str, lon: str) -> Dict:
        """Reverse geocode coordinates to get city information"""
        try:
            url = f"https://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={self.api_key}"

            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()

            if data and len(data) > 0:
                location = data[0]
                return {
                    'name': location['name'],
                    'country': location['country'],
                    'state': location.get('state', ''),
                    'lat': location['lat'],
                    'lon': location['lon']
                }
            else:
                return {'error': 'Ingen lokasjon funnet for disse koordinatene'}

        except Exception as e:
            logger.error(f"Error in reverse geocoding: {e}")
            return {'error': 'Kunne ikke bestemme lokasjon'}

    def _validate_weather_response(self, data: Dict) -> bool:
        """Validate that weather response has required fields"""
        # Simplified validation - just check if we have basic data
        return 'name' in data or 'list' in data

    def parse_weather_data(self, raw_data: Dict) -> Optional[WeatherData]:
        """Parse raw API response into structured data"""
        try:
            return WeatherData(
                city=raw_data['name'],
                country=raw_data['sys']['country'],
                temperature=raw_data['main']['temp'],
                feels_like=raw_data['main']['feels_like'],
                humidity=raw_data['main']['humidity'],
                description=raw_data['weather'][0]['description'],
                wind_speed=raw_data['wind']['speed'],
                timestamp=datetime.utcnow(),
                icon=raw_data['weather'][0]['icon']
            )
        except KeyError as e:
            logger.error(f"Missing key in weather data: {e}")
            return None


class WeatherAnalytics:
    """Analytics service for weather queries"""

    @staticmethod
    def log_query(city: str, country: str, user_ip: str, response_time_ms: float, endpoint: str):
        """Log weather query for analytics"""
        try:
            query = WeatherQuery(
                city=city,
                country=country,
                user_ip=user_ip,
                response_time_ms=response_time_ms,
                endpoint=endpoint
            )
            db.session.add(query)
            db.session.commit()
        except Exception as e:
            logger.error(f"Error logging query: {e}")
            db.session.rollback()

    @staticmethod
    def get_popular_cities(limit: int = 10) -> List[Dict]:
        """Get most queried cities"""
        try:
            result = db.session.query(
                WeatherQuery.city,
                WeatherQuery.country,
                db.func.count(WeatherQuery.id).label('query_count')
            ).group_by(
                WeatherQuery.city, WeatherQuery.country
            ).order_by(
                db.func.count(WeatherQuery.id).desc()
            ).limit(limit).all()

            return [
                {'city': city, 'country': country, 'query_count': count}
                for city, country, count in result
            ]
        except Exception as e:
            logger.error(f"Error getting popular cities: {e}")
            return []

    @staticmethod
    def get_query_stats() -> Dict:
        """Get comprehensive query statistics"""
        try:
            total_queries = WeatherQuery.query.count()
            today_queries = WeatherQuery.query.filter(
                WeatherQuery.query_time >= datetime.utcnow().date()
            ).count()

            avg_response_time = db.session.query(
                db.func.avg(WeatherQuery.response_time_ms)
            ).scalar() or 0

            # Get queries by endpoint
            endpoint_stats = db.session.query(
                WeatherQuery.endpoint,
                db.func.count(WeatherQuery.id).label('count')
            ).group_by(WeatherQuery.endpoint).all()

            return {
                'total_queries': total_queries,
                'today_queries': today_queries,
                'avg_response_time_ms': round(avg_response_time, 2),
                'endpoint_usage': {endpoint: count for endpoint, count in endpoint_stats}
            }
        except Exception as e:
            logger.error(f"Error getting query stats: {e}")
            return {'error': 'Kan ikke hente statistikk'}


class DatabaseCache:
    """Custom database-backed cache implementation"""

    @staticmethod
    def get(key: str) -> Optional[Dict]:
        """Get cached data if not expired"""
        try:
            cached = WeatherCache.query.filter_by(cache_key=key).first()
            if cached and cached.expires_at > datetime.utcnow():
                return json.loads(cached.data)
            elif cached:
                # Clean up expired cache
                db.session.delete(cached)
                db.session.commit()
            return None
        except Exception as e:
            logger.error(f"Error getting cached data: {e}")
            return None

    @staticmethod
    def set(key: str, data: Dict, timeout: int = 300):
        """Store data in database cache"""
        try:
            expires_at = datetime.utcnow() + timedelta(seconds=timeout)

            # Remove existing cache entry
            existing = WeatherCache.query.filter_by(cache_key=key).first()
            if existing:
                db.session.delete(existing)

            # Add new cache entry
            cached = WeatherCache(
                cache_key=key,
                data=json.dumps(data),
                expires_at=expires_at
            )
            db.session.add(cached)
            db.session.commit()
        except Exception as e:
            logger.error(f"Error setting cache: {e}")
            db.session.rollback()

    @staticmethod
    def clear_expired():
        """Clean up expired cache entries"""
        try:
            expired_count = WeatherCache.query.filter(
                WeatherCache.expires_at < datetime.utcnow()
            ).delete()
            db.session.commit()
            logger.info(f"Cleared {expired_count} expired cache entries")
            return expired_count
        except Exception as e:
            logger.error(f"Error clearing expired cache: {e}")
            db.session.rollback()
            return 0


class FavoritesService:
    """Service to manage user favorites (backend tracking)"""

    @staticmethod
    def add_favorite(user_ip: str, city: str, country: str) -> bool:
        """Add city to user favorites"""
        try:
            favorite = UserFavorite(
                user_ip=user_ip,
                city=city,
                country=country
            )
            db.session.add(favorite)
            db.session.commit()
            return True
        except Exception as e:
            logger.error(f"Error adding favorite: {e}")
            db.session.rollback()
            return False

    @staticmethod
    def remove_favorite(user_ip: str, city: str, country: str) -> bool:
        """Remove city from user favorites"""
        try:
            favorite = UserFavorite.query.filter_by(
                user_ip=user_ip,
                city=city,
                country=country
            ).first()
            if favorite:
                db.session.delete(favorite)
                db.session.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error removing favorite: {e}")
            db.session.rollback()
            return False

    @staticmethod
    def get_user_favorites(user_ip: str) -> List[Dict]:
        """Get user's favorite cities"""
        try:
            favorites = UserFavorite.query.filter_by(user_ip=user_ip).all()
            return [
                {
                    'city': fav.city,
                    'country': fav.country,
                    'added_at': fav.added_at.isoformat()
                }
                for fav in favorites
            ]
        except Exception as e:
            logger.error(f"Error getting user favorites: {e}")
            return []