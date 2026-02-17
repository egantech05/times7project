
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request

from time7_gateway.services.database import upsert_latest_tag

router = APIRouter()


@router.post("/reader/events")
def reader_events(request: Request, payload: Any = Body(...)):
    active_tags = request.app.state.active_tags
    cache = request.app.state.tag_info_cache

    ias_lookup = getattr(request.app.state, "ias_lookup", None)
    if not callable(ias_lookup):
        raise HTTPException(status_code=500, detail="IAS lookup not configured (app.state.ias_lookup)")

    tags_seen = 0
    product_info_fetched = 0

    if isinstance(payload, dict) and "tagIds" in payload:
        now = datetime.now(timezone.utc)

        tidHex = payload.get("tidHex") or []
        tags_seen = len(tidHex)

        active_tags.sync_seen(tidHex, seen_at=now)

        for tidHex in tidHex:
            tidHex = str(tidHex)
            if cache.get(tidHex) is None:
                auth, info = ias_lookup(tidHex)
                cache.set(tidHex, auth, info)
                product_info_fetched += 1
                upsert_latest_tag(tidHex=tidHex, seen_at=now, auth=auth, info=info)

        return {
            "ok": True,
            "tags_seen": tags_seen,
            "product_info_fetched": product_info_fetched,
        }

    raise HTTPException(status_code=400, detail="Invalid payload.") 