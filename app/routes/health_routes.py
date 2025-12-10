from datetime import datetime, timezone

from flask import jsonify

from app.services.weather.service import DatabaseCache
from app.models.cache import weather_cache, analytics, favorites


def register_health_routes(app, cache, logger):
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint for monitoring"""
        # Clean up expired cache entries
        expired_count = DatabaseCache.clear_expired()

        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'version': '1.2.0',
            'mode': 'in-memory',
            'cache_cleaned': expired_count
        })

    @app.route('/clear_cache', methods=['POST'])
    def clear_cache():
        """Clear all cache entries"""
        try:
            # Clear in-memory cache
            cache_count = weather_cache.clear()

            # Clear Flask cache
            cache.clear()

            logger.info("Alle cacher tømt")
            return jsonify({
                'message': 'Alle cacher tømt',
                'cleared_entries': cache_count
            })
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return jsonify({'error': 'Kunne ikke tømme cache'}), 500

    return app


def register_error_handlers(app, logger):
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Endepunkt ikke funnet'}), 404

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Ugyldig forespørsel'}), 400

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({'error': 'Intern serverfeil'}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Unhandled Exception: {str(e)}", exc_info=True)
        return jsonify({'error': 'En uventet feil oppstod. Vennligst prøv igjen senere.'}), 500

    return app
