"""Firma y verificación de tokens de traspaso.

Formato: base64url(payload JSON) + "." + base64url(HMAC-SHA256).
El mismo esquema lo emite la web en app/api/dashboard/route.ts.
"""

import base64
import hashlib
import hmac
import json
import time


def _b64url(datos: bytes) -> str:
    return base64.urlsafe_b64encode(datos).decode("ascii").rstrip("=")


def _leer_b64url(texto: str) -> bytes:
    return base64.urlsafe_b64decode(texto + "=" * (-len(texto) % 4))


def firmar(payload: dict, secreto: str) -> str:
    cuerpo = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    firma = hmac.new(secreto.encode("utf-8"), cuerpo.encode("ascii"), hashlib.sha256).digest()
    return f"{cuerpo}.{_b64url(firma)}"


def verificar_token(token: str, secreto: str) -> dict | None:
    """Devuelve el payload si la firma y la caducidad son válidas."""
    if not token or not secreto or "." not in token:
        return None
    cuerpo, firma = token.rsplit(".", 1)
    esperada = hmac.new(secreto.encode("utf-8"), cuerpo.encode("ascii"), hashlib.sha256).digest()
    try:
        recibida = _leer_b64url(firma)
    except Exception:
        return None
    if not hmac.compare_digest(esperada, recibida):
        return None
    try:
        payload = json.loads(_leer_b64url(cuerpo))
    except Exception:
        return None
    if not isinstance(payload, dict):
        return None
    if payload.get("rol") != "owner" or not payload.get("sub"):
        return None
    exp = payload.get("exp")
    if not isinstance(exp, int) or exp < int(time.time()):
        return None
    return payload


def cookie_larga(payload: dict, secreto: str, duracion_s: int = 8 * 3600) -> str:
    """Re-firma el payload con caducidad extendida para la cookie de sesión."""
    largo = dict(payload)
    largo["exp"] = int(time.time()) + duracion_s
    return firmar(largo, secreto)
