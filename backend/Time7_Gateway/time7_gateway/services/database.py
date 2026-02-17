from datetime import datetime
from time7_gateway.clients.supabase_client import get_supabase


def upsert_latest_tag(tidHex: str, seen_at: datetime, auth: bool, info: str | None, epcHex: str | None):
    sb = get_supabase()
    payload = {
        "tid_hex": tidHex,
        "first_seen": seen_at.isoformat(),
        "auth": auth,
        "info": info,
        "epc_hex": epcHex,
    }
    sb.table("data").upsert(payload).execute()