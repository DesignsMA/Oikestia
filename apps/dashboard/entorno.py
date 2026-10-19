"""Validación de configuración al arrancar (solo APP_ENV=production)."""

import os
import sys


def validar() -> None:
    if os.environ.get("APP_ENV") != "production":
        return

    fallos = []
    secret = os.environ.get("DASH_HANDOFF_SECRET", "")
    if len(secret) < 32:
        fallos.append("DASH_HANDOFF_SECRET vacío o con menos de 32 caracteres")
    url = os.environ.get("APP_PUBLIC_URL", "").rstrip("/")
    if not url.startswith("https://"):
        fallos.append(f"APP_PUBLIC_URL debe ser https:// (valor: {url or 'vacío'})")

    if fallos:
        print(
            "[oikestia] Configuración de producción inválida; el dashboard no arranca:\n"
            + "\n".join(f"  - {f}" for f in fallos),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    validar()
