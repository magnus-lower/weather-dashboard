# run.py - Application entry point
import os
from app import create_app

# Create app with environment-based config
config_name = os.environ.get('FLASK_CONFIG', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    # Development server
    app.run(
        debug=app.config['DEBUG'],
        host='127.0.0.1',
        port=5000
    )