"""Consultas de estadísticas del dashboard (Fase 7).

Devuelve métricas globales del sitio y métricas del propietario,
todo desde MongoDB (users, listings, leads, messages).
"""

from datetime import datetime, timedelta, timezone

from bson import ObjectId


def _agrupar(col, match: dict, campo: str) -> dict:
    out = {}
    for d in col.aggregate([{"$match": match}, {"$group": {"_id": f"${campo}", "n": {"$sum": 1}}}]):
        out[str(d["_id"]) if d["_id"] is not None else "sin dato"] = d["n"]
    return out


def calcular(db, owner_id: ObjectId) -> dict:
    users = db.users
    listings = db.listings
    leads = db.leads
    messages = db.messages

    sitio = {
        "usuarios": users.count_documents({}),
        "publicaciones": listings.count_documents({}),
        "leads": leads.count_documents({}),
        "mensajes": messages.count_documents({}),
    }

    mios = {"owner": owner_id}
    pubs_total = listings.count_documents(mios)
    pubs_activas = listings.count_documents({**mios, "estado": "publicada"})
    por_estado = _agrupar(listings, mios, "estado")
    por_operacion = _agrupar(listings, mios, "operacion")
    por_tipo = _agrupar(listings, mios, "tipoPropiedad")

    filtro_leads = {"listingId": {"$in": listings.distinct("_id", mios)}}
    leads_total = leads.count_documents(filtro_leads)
    leads_nuevo = leads.count_documents({**filtro_leads, "estado": "nuevo"})
    visitas = leads.count_documents({**filtro_leads, "tipo": "visita"})
    por_estado_lead = _agrupar(leads, filtro_leads, "estado")

    ids_leads = leads.distinct("_id", filtro_leads)
    mensajes_mios = messages.count_documents({"leadId": {"$in": ids_leads}})

    # Leads por día (últimos 30 días, en UTC) con días sin datos a 0.
    desde = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=29)
    por_dia = {
        d["_id"]: d["n"]
        for d in leads.aggregate(
            [
                {"$match": {**filtro_leads, "creado": {"$gte": desde}}},
                {
                    "$group": {
                        "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$creado"}},
                        "n": {"$sum": 1},
                    }
                },
            ]
        )
    }
    serie = []
    for i in range(30):
        dia = desde + timedelta(days=i)
        clave = dia.strftime("%Y-%m-%d")
        serie.append({"dia": dia.strftime("%d/%m"), "n": por_dia.get(clave, 0)})

    ultimos_leads = [
        {
            "creado": d.get("creado"),
            "publicacion": d.get("listingTitulo") or d.get("listingSlug") or "—",
            "tipo": d.get("tipo", "mensaje"),
            "estado": d.get("estado") or "nuevo",
            "nombre": d.get("fullname") or "Interesado",
        }
        for d in leads.find(filtro_leads).sort("creado", -1).limit(8)
    ]

    pubs_tabla = [
        {
            "titulo": d.get("titulo", "—"),
            "operacion": d.get("operacion", "—"),
            "precio": d.get("precio"),
            "estado": d.get("estado", "—"),
            "creado": d.get("creado"),
        }
        for d in listings.find(mios).sort("creado", -1).limit(8)
    ]

    return {
        "sitio": sitio,
        "dueno": {
            "pubs_total": pubs_total,
            "pubs_activas": pubs_activas,
            "por_estado": por_estado,
            "por_operacion": por_operacion,
            "por_tipo": por_tipo,
            "leads_total": leads_total,
            "leads_nuevo": leads_nuevo,
            "visitas": visitas,
            "por_estado_lead": por_estado_lead,
            "mensajes": mensajes_mios,
            "serie": serie,
            "ultimos_leads": ultimos_leads,
            "pubs_tabla": pubs_tabla,
        },
    }
