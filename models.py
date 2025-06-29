# models.py - Database models
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class WeatherQuery(db.Model):
    """Track weather queries for analytics"""
    __tablename__ = 'weather_queries'

    id = db.Column(db.Integer, primary_key=True)
    city = db.Column(db.String(100), nullable=False, index=True)
    country = db.Column(db.String(10), nullable=False)
    query_time = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    user_ip = db.Column(db.String(45))  # Support IPv6
    response_time_ms = db.Column(db.Float)
    endpoint = db.Column(db.String(50))  # Track which endpoint was used

    def __repr__(self):
        return f'<WeatherQuery {self.city}, {self.country}>'


class WeatherCache(db.Model):
    """Custom weather data cache with database persistence"""
    __tablename__ = 'weather_cache'

    id = db.Column(db.Integer, primary_key=True)
    cache_key = db.Column(db.String(200), unique=True, nullable=False, index=True)
    data = db.Column(db.Text, nullable=False)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)

    def __repr__(self):
        return f'<WeatherCache {self.cache_key}>'


class UserFavorite(db.Model):
    """Store user favorite cities (backend tracking)"""
    __tablename__ = 'user_favorites'

    id = db.Column(db.Integer, primary_key=True)
    user_ip = db.Column(db.String(45), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(10), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_ip', 'city', 'country'),)

    def __repr__(self):
        return f'<UserFavorite {self.city}, {self.country}>'