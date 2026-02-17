from fastapi import APIRouter, Request
from time7_gateway.models.schemas import ScanResult

router = APIRouter()


@router.get("/active-tags", response_model=list[ScanResult])
def active_tags(request: Request):
    active_tags = request.app.state.active_tags
    cache = request.app.state.tag_info_cache

    results: list[ScanResult] = []

    for t in active_tags.get_active():
        cached = cache.get(t.tidHex)
        if cached is None:
            continue

        auth, info = cached
        results.append(
            ScanResult(
                tidHex=t.tidHex,
                epcHex=t.epcHex,
                first_seen=t.first_seen,
                auth=auth,
                info=info,
            )
        )

    return results

@router.get("/reader-status")
def reader_status(request: Request):
    return {"connected": request.app.state.reader_connected}