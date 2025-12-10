from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

class InMemoryCache:
    def __init__(self):
        self._cache = {}
        self._expiry = {}

    def get(self, key):
        if key in self._cache:
            if datetime.now(timezone.utc) < self._expiry[key]:
                return self._cache[key]
            del self._cache[key]
            del self._expiry[key]
        return None

    def set(self, key, value, timeout=300):
        self._cache[key] = value
        self._expiry[key] = datetime.now(timezone.utc) + timedelta(seconds=timeout)

    def clear_expired(self):
        now = datetime.now(timezone.utc)
        expired_keys = [key for key, expiry in self._expiry.items() if now >= expiry]
        for key in expired_keys:
            del self._cache[key]
            del self._expiry[key]
        return len(expired_keys)

    def clear(self):
        count = len(self._cache)
        self._cache.clear()
        self._expiry.clear()
        return count

class InMemoryAnalytics:
    def __init__(self):
        self.queries = deque(maxlen=1000)
        self.city_counts = defaultdict(int)
        self.query_stats = {
            'total_queries': 0,
            'avg_response_time': 0,
            'endpoints': defaultdict(int)
        }

    def log_query(self, city, country, user_ip, response_time, endpoint):
        query = {
            'city': city,
            'country': country,
            'user_ip': user_ip,
            'response_time_ms': response_time,
            'endpoint': endpoint,
            'timestamp': datetime.now(timezone.utc)
        }
        self.queries.append(query)
        city_key = f"{city}, {country}"
        self.city_counts[city_key] += 1
        self.query_stats['total_queries'] += 1
        self.query_stats['endpoints'][endpoint] += 1
        total_time = sum(q['response_time_ms'] for q in self.queries if q['response_time_ms'])
        total_count = len([q for q in self.queries if q['response_time_ms']])
        if total_count > 0:
            self.query_stats['avg_response_time'] = total_time / total_count

    def get_query_stats(self):
        return dict(self.query_stats)

    def get_popular_cities(self, limit=10):
        sorted_cities = sorted(self.city_counts.items(), key=lambda x: x[1], reverse=True)
        return [{'city': city, 'count': count} for city, count in sorted_cities[:limit]]

class InMemoryFavorites:
    def __init__(self):
        self.favorites = defaultdict(list)

    def get_user_favorites(self, user_ip):
        return self.favorites.get(user_ip, [])

    def add_favorite(self, user_ip, city, country):
        favorite = {'city': city, 'country': country, 'added_at': datetime.now(timezone.utc).isoformat()}
        user_favs = self.favorites[user_ip]
        for fav in user_favs:
            if fav['city'].lower() == city.lower() and fav['country'].lower() == country.lower():
                return False
        user_favs.append(favorite)
        return True

    def remove_favorite(self, user_ip, city, country):
        user_favs = self.favorites[user_ip]
        for index, fav in enumerate(user_favs):
            if fav['city'].lower() == city.lower() and fav['country'].lower() == country.lower():
                del user_favs[index]
                return True
        return False

weather_cache = InMemoryCache()
analytics = InMemoryAnalytics()
favorites = InMemoryFavorites()
