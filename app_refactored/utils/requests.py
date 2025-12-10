"""Request-related helpers for Flask context and outbound HTTP calls."""
from __future__ import annotations

import logging
from typing import Dict, List

import requests
from flask import request as flask_request

logger = logging.getLogger(__name__)


def get_user_ip() -> str:
    """Return the best-effort IP address for the active request."""

    forwarded_for = flask_request.environ.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = flask_request.environ.get("HTTP_X_REAL_IP")
    if real_ip:
        return real_ip
    return flask_request.remote_addr or "unknown"


def get_client_info() -> Dict[str, str]:
    """Collect limited client metadata for analytics logging."""

    return {
        "ip": get_user_ip(),
        "user_agent": flask_request.headers.get("User-Agent", "Unknown"),
        "referrer": flask_request.headers.get("Referer", "Direct"),
    }


def http_get_json(url: str, timeout: int = 10) -> Dict | List:
    """Perform an HTTP GET returning JSON with normalized error responses."""

    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        logger.error("Timeout when fetching %s", url)
        return {"error": "Forespørselen tok for lang tid. Prøv igjen senere."}
    except requests.exceptions.ConnectionError:
        logger.error("Connection error when fetching %s", url)
        return {"error": "Kunne ikke koble til vær-tjenesten. Sjekk internettforbindelsen."}
    except requests.exceptions.HTTPError as exc:
        logger.error("HTTP error when fetching %s: %s", url, exc)
        status = exc.response.status_code if exc.response else None
        if status == 401:
            return {"error": "Ugyldig API-nøkkel"}
        if status == 404:
            return {"error": "Ressursen ble ikke funnet"}
        if status == 429:
            return {"error": "For mange forespørsler. Prøv igjen senere."}
        return {"error": f"HTTP-feil: {status}"}
    except ValueError:
        logger.error("Invalid JSON response from %s", url)
        return {"error": "Ugyldig respons fra tjenesten"}
    except requests.exceptions.RequestException as exc:
        logger.error("Request error when fetching %s: %s", url, exc)
        return {"error": "Feil ved henting av data. Prøv igjen senere."}
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.error("Unexpected error when fetching %s: %s", url, exc)
        return {"error": "En uventet feil oppstod. Prøv igjen senere."}


__all__ = ["get_user_ip", "get_client_info", "http_get_json"]
