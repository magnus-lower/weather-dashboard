
def format_temperature(temp: float, unit: str = 'metric') -> str:
    unit_symbol = '°F' if unit == 'imperial' else '°C'
    return f"{temp:.1f}{unit_symbol}"


def format_wind_speed(speed: float, unit: str = 'metric') -> str:
    unit_symbol = 'mph' if unit == 'imperial' else 'm/s'
    return f"{speed:.1f} {unit_symbol}"
