# models.py - In-memory data structures (Database-free version)
from datetime import datetime, timedelta
from collections import defaultdict, deque
import json


class InMemoryCache:
    """Simple in-memory cache implementation"""

    def __init__(self):
        self._cache = {}
        self._expiry = {}

    def get(self, key):
        """Get cached value if not expired"""
        if key in self._cache:
            if datetime.utcnow() < self._expiry[key]:
                return self._cache[key]
            else:
                # Remove expired entry
                del self._cache[key]
                del self._expiry[key]
        return None

    def set(self, key, value, timeout=300):
        """Set cached value with expiry"""
        self._cache[key] = value
        self._expiry[key] = datetime.utcnow() + timedelta(seconds=timeout)

    def clear_expired(self):
        """Remove expired entries"""
        now = datetime.utcnow()
        expired_keys = [key for key, expiry in self._expiry.items() if now >= expiry]
        for key in expired_keys:
            del self._cache[key]
            del self._expiry[key]
        return len(expired_keys)

    def clear(self):
        """Clear all cache entries"""
        count = len(self._cache)
        self._cache.clear()
        self._expiry.clear()
        return count


class InMemoryAnalytics:
    """Simple in-memory analytics tracking"""

    def __init__(self):
        self.queries = deque(maxlen=1000)  # Keep last 1000 queries
        self.city_counts = defaultdict(int)
        self.query_stats = {
            'total_queries': 0,
            'avg_response_time': 0,
            'endpoints': defaultdict(int)
        }

    def log_query(self, city, country, user_ip, response_time, endpoint):
        """Log a weather query"""
        query = {
            'city': city,
            'country': country,
            'user_ip': user_ip,
            'response_time_ms': response_time,
            'endpoint': endpoint,
            'timestamp': datetime.utcnow()
        }

        self.queries.append(query)
        city_key = f"{city}, {country}"
        self.city_counts[city_key] += 1

        # Update stats
        self.query_stats['total_queries'] += 1
        self.query_stats['endpoints'][endpoint] += 1

        # Calculate running average response time
        total_time = sum(q['response_time_ms'] for q in self.queries if q['response_time_ms'])
        total_count = len([q for q in self.queries if q['response_time_ms']])
        if total_count > 0:
            self.query_stats['avg_response_time'] = total_time / total_count

    def get_query_stats(self):
        """Get query statistics"""
        return dict(self.query_stats)

    def get_popular_cities(self, limit=10):
        """Get most popular cities"""
        sorted_cities = sorted(self.city_counts.items(), key=lambda x: x[1], reverse=True)
        return [{'city': city, 'count': count} for city, count in sorted_cities[:limit]]


class InMemoryFavorites:
    """Simple in-memory favorites storage"""

    def __init__(self):
        self.favorites = defaultdict(list)  # user_ip -> list of favorites

    def get_user_favorites(self, user_ip):
        """Get favorites for a user"""
        return self.favorites.get(user_ip, [])

    def add_favorite(self, user_ip, city, country):
        """Add a favorite city for user"""
        favorite = {'city': city, 'country': country, 'added_at': datetime.utcnow().isoformat()}

        # Check if already exists
        user_favs = self.favorites[user_ip]
        for fav in user_favs:
            if fav['city'].lower() == city.lower() and fav['country'].lower() == country.lower():
                return False  # Already exists

        user_favs.append(favorite)
        return True

    def remove_favorite(self, user_ip, city, country):
        """Remove a favorite city for user"""
        user_favs = self.favorites[user_ip]
        for i, fav in enumerate(user_favs):
            if fav['city'].lower() == city.lower() and fav['country'].lower() == country.lower():
                del user_favs[i]
                return True
        return False


# Global instances
weather_cache = InMemoryCache()
analytics = InMemoryAnalytics()
favorites = InMemoryFavorites()
