from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple


@dataclass
class TagInfo:
    auth: bool
    info: Optional[str]
    fetched_at: datetime


class TagInfoCache:


    #caches IAS results. Avoid repeating checking with IAS

    def __init__(self, cache_ttl_hours: int = 24):
        self.cache_ttl = timedelta(hours=int(cache_ttl_hours))
        self._cache: Dict[str, TagInfo] = {}

    def get(self, tid_hex: str) -> Optional[Tuple[bool, Optional[str]]]:
        cur = self._cache.get(tid_hex)
        if cur is None:
            return None

        now = datetime.now(timezone.utc)
        if now - cur.fetched_at > self.cache_ttl:
            del self._cache[tid_hex]
            return None

        return (cur.auth, cur.info)

    def set(self, tid_hex: str, auth: bool, info: Optional[str]) -> None:
        self._cache[tid_hex] = TagInfo(
            auth=auth,
            info=info,
            fetched_at=datetime.now(timezone.utc),
        )
        
    # for debugging
    def snapshot(self) -> dict:
        items = []
        for tid_hex, value in self._cache.items():
            if isinstance(value, (tuple, list)) and len(value) >= 2:
                auth, info = value[0], value[1]
            else:
                auth = getattr(value, "auth", None)
                info = getattr(value, "info", None)

            items.append({"id": tid_hex, "auth": auth, "info": info})

        items.sort(key=lambda x: x.get("id") or "")
        return {"count": len(items), "items": items}