# Dashboard de estadísticas (Dash) .
# Acceso por token HMAC de traspaso desde la web (cookie de 8 h) y
# métricas reales de MongoDB: sitio, publicaciones, leads y mensajes.

import os
from datetime import datetime

from bson import ObjectId
from flask import has_request_context, make_response, redirect, request
from pymongo import MongoClient

import dash
from dash import dcc, html
import plotly.graph_objects as go

from auth import cookie_larga, verificar_token
from entorno import validar
from stats import calcular

validar()

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://mongo:27017")
MONGODB_DB = os.environ.get("MONGODB_DB", "oikestia")
DASH_HANDOFF_SECRET = os.environ.get("DASH_HANDOFF_SECRET", "")
APP_PUBLIC_URL = os.environ.get("APP_PUBLIC_URL", "http://localhost:3000").rstrip("/")
TOKEN_COOKIE = "oikestia_dash"

AZUL = "#1f3a5f"
VERDE = "#1b7f4e"
AMBAR = "#b45309"
GRIS = "#6b7280"
BORDE = "#d9dee5"

client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client[MONGODB_DB]

app = dash.Dash(__name__, title="Oikestia — Estadísticas")
server = app.server


def _denegado(motivo: str):
    destino = APP_PUBLIC_URL + "/propietario"
    html_txt = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Acceso no autorizado</title>
<style>body{{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f9;color:#1f2937}}
.c{{max-width:30rem;padding:2rem;background:#fff;border:1px solid {BORDE};border-radius:12px;text-align:center}}
h1{{font-size:1.15rem;margin:0 0 .6rem}}p{{color:{GRIS};font-size:.95rem;line-height:1.5}}a{{color:{AZUL};font-weight:600}}</style>
</head><body><div class="c"><h1>Acceso no autorizado</h1><p>{motivo}</p><p><a href="{destino}">Volver a Oikestia</a></p></div></body></html>"""
    return html_txt, 401, {"Content-Type": "text/html; charset=utf-8"}


@server.before_request
def _guard():
    # Cierre de sesión del dashboard.
    if request.path == "/salir":
        resp = make_response(redirect(APP_PUBLIC_URL + "/propietario", 303))
        resp.delete_cookie(TOKEN_COOKIE)
        return resp

    # Traspaso desde la web: ?token=... (uso corto, 5 min).
    if request.args.get("token"):
        payload = verificar_token(request.args["token"], DASH_HANDOFF_SECRET)
        if payload is None or not ObjectId.is_valid(str(payload.get("sub", ""))):
            return _denegado("El enlace de acceso no es válido o ya expiró. "
                             "Vuelve a tu panel de propietario y pulsa «Ver estadísticas».")
        resp = make_response(redirect("/", 303))
        resp.set_cookie(
            TOKEN_COOKIE,
            cookie_larga(payload, DASH_HANDOFF_SECRET),
            httponly=True,
            samesite="Lax",
            path="/",
        )
        return resp

    # Sesión del dashboard en cookie (8 h).
    payload = verificar_token(request.cookies.get(TOKEN_COOKIE, ""), DASH_HANDOFF_SECRET)
    if payload is None or not ObjectId.is_valid(str(payload.get("sub", ""))):
        return _denegado("Tu sesión del dashboard expiró. "
                         "Vuelve a tu panel de propietario y pulsa «Ver estadísticas».")
    return None


@server.after_request
def _headers_seguridad(resp):
    # El dashboard no se embebe ni carga recursos externos.
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    resp.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
        "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; connect-src 'self'",
    )
    resp.headers.setdefault("X-XSS-Protection", "0")
    return resp


# ---------- piezas del layout ----------

def _tarjeta(valor, etiqueta, acento=AZUL):
    return html.Div(
        [
            html.Div(str(valor), style={"fontSize": "1.7rem", "fontWeight": "700", "color": acento}),
            html.Div(etiqueta, style={"fontSize": ".78rem", "color": GRIS, "marginTop": ".15rem"}),
        ],
        style={
            "background": "#fff",
            "border": f"1px solid {BORDE}",
            "borderRadius": "10px",
            "padding": ".85rem 1rem",
            "minWidth": "9rem",
            "flex": "1 1 9rem",
        },
    )


def _fila(*tarjetas):
    return html.Div(list(tarjetas), style={"display": "flex", "flexWrap": "wrap", "gap": ".75rem"})


def _fecha(v):
    if isinstance(v, datetime):
        return v.strftime("%d/%m/%Y")
    if isinstance(v, str) and len(v) >= 10:
        return v[:10]
    return "—"


def _precio(v):
    if isinstance(v, (int, float)):
        return f"${v:,.0f} MXN"
    return str(v) if v else "—"


def _tabla(columnas, filas):
    head = html.Tr([html.Th(c, style={"textAlign": "left", "padding": ".5rem .7rem"}) for c in columnas])
    body = [
        html.Tr(
            [html.Td(f, style={"padding": ".5rem .7rem", "borderTop": f"1px solid {BORDE}"}) for f in fila]
        )
        for fila in filas
    ]
    return html.Table(
        [html.Thead(head), html.Tbody(body)],
        style={"width": "100%", "borderCollapse": "collapse", "fontSize": ".9rem", "background": "#fff",
               "border": f"1px solid {BORDE}", "borderRadius": "10px", "overflow": "hidden"},
    )


def _panel(titulo, contenido):
    return html.Div(
        [html.H3(titulo, style={"fontSize": ".95rem", "margin": "0 0 .6rem", "color": AZUL}), contenido],
        style={"background": "#f9fafb", "border": f"1px solid {BORDE}", "borderRadius": "10px",
               "padding": "1rem", "flex": "1 1 22rem"},
    )


def _fig_serie(serie):
    fig = go.Figure(go.Bar(
        x=[d["dia"] for d in serie],
        y=[d["n"] for d in serie],
        marker_color=AZUL,
        hovertemplate="%{x}: %{y} lead(s)<extra></extra>",
    ))
    fig.update_layout(
        margin=dict(l=8, r=8, t=8, b=8),
        height=250,
        yaxis=dict(dtick=1, gridcolor="#eef1f4"),
        xaxis=dict(tickangle=-45, showgrid=False),
        showlegend=False,
    )
    return fig


def _fig_pie(etiquetas, valores, colores):
    fig = go.Figure(go.Pie(labels=etiquetas, values=valores, hole=0.45,
                           marker=dict(colors=colores),
                           textinfo="label+value",
                           hovertemplate="%{label}: %{value}<extra></extra>"))
    fig.update_layout(margin=dict(l=8, r=8, t=8, b=8), height=250, showlegend=False)
    return fig


COLORES_ESTADO = {
    "publicada": VERDE,
    "pausada": AMBAR,
    "borrador": "#93c5fd",
    "vendida": "#8b5cf6",
    "rentada": "#8b5cf6",
}


def construir_layout():
    # Dash valida el layout al arrancar, fuera de contexto de request.
    if not has_request_context():
        return html.Div()

    payload = verificar_token(request.cookies.get(TOKEN_COOKIE, ""), DASH_HANDOFF_SECRET)
    if payload is None:
        return html.Div()

    try:
        stats = calcular(db, ObjectId(str(payload["sub"])))
        error = None
    except Exception as exc:  # noqa: BLE001 — se muestra en pantalla
        stats = None
        error = f"No se pudieron consultar las estadísticas: {exc}"

    nombre = str(payload.get("name") or "propietario")
    header = html.Div(
        [
            html.Div(
                [
                    html.H1("Oikestia — Estadísticas", style={"margin": 0, "fontSize": "1.3rem"}),
                    html.Div(f"Sesión de {nombre}", style={"color": GRIS, "fontSize": ".9rem"}),
                ]
            ),
            html.Div(
                [
                    html.A("Volver a Oikestia", href=APP_PUBLIC_URL + "/propietario",
                           style={"color": AZUL, "fontWeight": "600", "marginRight": "1rem",
                                  "textDecoration": "none", "fontSize": ".9rem"}),
                    html.A("Salir", href="/salir",
                           style={"color": AMBAR, "fontWeight": "600", "textDecoration": "none",
                                  "fontSize": ".9rem"}),
                ]
            ),
        ],
        style={"display": "flex", "justifyContent": "space-between", "alignItems": "center",
               "marginBottom": "1.1rem", "flexWrap": "wrap", "gap": ".6rem"},
    )

    if error:
        aviso = html.Div(error, style={"background": "#fef2f2", "border": "1px solid #fecaca",
                                       "color": "#991b1b", "padding": "1rem", "borderRadius": "10px"})
        return html.Div([header, aviso], style={"maxWidth": "72rem", "margin": "0 auto",
                                                "padding": "1.25rem", "fontFamily": "system-ui, sans-serif"})

    s = stats["sitio"]
    d = stats["dueno"]

    seccion_sitio = html.Section(
        [
            html.H2("El sitio hoy", style={"fontSize": ".82rem", "textTransform": "uppercase",
                                           "letterSpacing": ".06em", "color": GRIS, "margin": "0 0 .6rem"}),
            _fila(
                _tarjeta(s["usuarios"], "usuarios registrados"),
                _tarjeta(s["publicaciones"], "publicaciones"),
                _tarjeta(s["leads"], "solicitudes (leads)"),
                _tarjeta(s["mensajes"], "mensajes"),
            ),
        ]
    )

    seccion_dueno = html.Section(
        [
            html.H2("Tus métricas", style={"fontSize": ".82rem", "textTransform": "uppercase",
                                           "letterSpacing": ".06em", "color": GRIS,
                                           "margin": "1.3rem 0 .6rem"}),
            _fila(
                _tarjeta(d["pubs_activas"], "publicaciones activas", VERDE),
                _tarjeta(d["pubs_total"], "publicaciones totales"),
                _tarjeta(d["leads_total"], "interesados", AZUL),
                _tarjeta(d["leads_nuevo"], "sin responder", AMBAR if d["leads_nuevo"] else GRIS),
                _tarjeta(d["visitas"], "visitas solicitadas", AZUL),
                _tarjeta(d["mensajes"], "mensajes en tus hilos"),
            ),
        ]
    )

    if d["pubs_total"] == 0:
        vacio = html.Div(
            "Aún no tienes publicaciones. Crea la primera desde tu panel para ver tus estadísticas.",
            style={"background": "#fff", "border": f"1px dashed {BORDE}", "borderRadius": "10px",
                   "padding": "1.4rem", "textAlign": "center", "color": GRIS, "marginTop": "1.3rem"},
        )
        return html.Div(
            [header, seccion_sitio, seccion_dueno, vacio],
            style={"maxWidth": "72rem", "margin": "0 auto", "padding": "1.25rem",
                   "fontFamily": "system-ui, sans-serif"},
        )

    estado_lbl = {"publicada": "Publicadas", "pausada": "Pausadas", "borrador": "Borradores",
                  "vendida": "Vendidas", "rentada": "Rentadas"}
    pub_estado = d["por_estado"]
    fig_estado = _fig_pie(
        [estado_lbl.get(k, k) for k in pub_estado],
        list(pub_estado.values()),
        [COLORES_ESTADO.get(k, GRIS) for k in pub_estado],
    )

    op_lbl = {"venta": "En venta", "renta": "En renta"}
    fig_op = _fig_pie(
        [op_lbl.get(k, k) for k in d["por_operacion"]],
        list(d["por_operacion"].values()),
        [AZUL, VERDE],
    )

    gridd = html.Div(
        [
            _panel("Interesados por día (30 días)", dcc.Graph(figure=_fig_serie(d["serie"]),
                                                              config={"displayModeBar": False})),
            _panel("Tus publicaciones por estado", dcc.Graph(figure=fig_estado,
                                                             config={"displayModeBar": False})),
            _panel("Operaciones", dcc.Graph(figure=fig_op, config={"displayModeBar": False})),
        ],
        style={"display": "flex", "flexWrap": "wrap", "gap": "1rem", "marginTop": "1.3rem"},
    )

    tabla_leads = _tabla(
        ["Fecha", "Publicación", "Tipo", "Estado", "Interesado"],
        [
            [
                _fecha(x["creado"]),
                x["publicacion"],
                "Visita" if x["tipo"] == "visita" else "Mensaje",
                "Respondido" if x["estado"] == "respondido" else "Nuevo",
                x["nombre"],
            ]
            for x in d["ultimos_leads"]
        ],
    )

    tabla_pubs = _tabla(
        ["Publicación", "Operación", "Precio", "Estado", "Creada"],
        [
            [
                x["titulo"],
                str(x["operacion"]).capitalize(),
                _precio(x["precio"]),
                str(x["estado"]).capitalize(),
                _fecha(x["creado"]),
            ]
            for x in d["pubs_tabla"]
        ],
    )

    tablas = html.Div(
        [
            _panel("Últimos interesados", tabla_leads),
            _panel("Tus publicaciones recientes", tabla_pubs),
        ],
        style={"display": "flex", "flexWrap": "wrap", "gap": "1rem", "marginTop": "1rem"},
    )

    return html.Div(
        [header, seccion_sitio, seccion_dueno, gridd, tablas],
        style={"maxWidth": "72rem", "margin": "0 auto", "padding": "1.25rem",
               "fontFamily": "system-ui, sans-serif", "color": "#1f2937"},
    )


app.layout = construir_layout


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8050)
