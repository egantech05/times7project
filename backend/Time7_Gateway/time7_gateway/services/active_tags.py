from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Dict, Iterable, List, Optional, Set


@dataclass
class ActiveTag:
    tidHex: str
    first_seen: datetime
    last_seen: datetime
    epcHex: str


def _utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class ActiveTags:
    def __init__(self, remove_grace_seconds: float) -> None:
        self._tags: Dict[str, ActiveTag] = {}
        self._grace = timedelta(seconds=float(remove_grace_seconds))

    def sync_seen(
        self,
        tidHex: Iterable[str],
        epcHex: Dict[str, str],
        seen_at: Optional[datetime] = None,
    ) -> Set[str]:

        now = _utc(seen_at) if seen_at else datetime.now(timezone.utc)
        seen_now = {str(t) for t in (tidHex or [])}

        new_ids: Set[str] = set()

        # Add new tags, refresh last_seen for existing tags that appear again
        for tidHex in seen_now:
            epcHex = epcHex.get(tidHex) if epcHex else None
            cur = self._tags.get(tidHex)
            if cur is None:
                self._tags[tidHex] = ActiveTag(
                    tidHex=tidHex,
                    first_seen=now,
                    last_seen=now,
                    epcHex=epcHex,
                )
                new_ids.add(tidHex)
            else:
                # Only refresh last_seen 
                cur.last_seen = now
                cur.epcHex = epcHex

        # Remove tags that haven't been seen in the last 2 seconds
        cutoff = now - self._grace
        for tidHex in list(self._tags.keys()):
            if self._tags[tidHex].last_seen < cutoff:
                del self._tags[tidHex]

        return new_ids

    def get_active(self) -> List[ActiveTag]:
        return sorted(self._tags.values(), key=lambda x: x.first_seen, reverse=True)

    def get_active_ids(self) -> List[str]:
        return list(self._tags.keys())
    
    #for debugging
    def snapshot(self) -> dict:
        items = [
            {
                "tidHex": t.tidHex,
                "first_seen": t.first_seen,
                "last_seen": t.last_seen,
                "epcHex": t.epcHex,
            }
            for t in self.get_active()
        ]

        return {"count": len(items), "items": items}
