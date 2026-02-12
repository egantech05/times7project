from datetime import datetime
from time7_gateway.clients.supabase_client import get_supabase
from models.schemas import FullScanEvent

def upsert_latest_tag(tag_id: str, seen_at: datetime, auth: bool, info: str | None):
    sb = get_supabase()
    payload = {
        "id": tag_id,
        "date": seen_at.isoformat(),
        "auth": auth,
        "info": info,
    }
    sb.table("data").upsert(payload).execute()

def upsert_full_tag(FullScanEvent):
    sb = get_supabase()
    payload = FullScanEvent
    sb.table("data").upsert(payload).execute()