from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Dict, Iterable, List, Optional, Set


@dataclass
class ActiveTag:
    tidHex: str
    first_seen: datetime
    last_seen: datetime
    epcHex: Optional[str] = None
    messageHex: Optional[str] = None
    responseHex: Optional[str] = None


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
        epcHex: Optional[Dict[str, str]] = None,
        messageHex: Optional[Dict[str, str]] = None,
        responseHex: Optional[Dict[str, str]] = None,
        seen_at: Optional[datetime] = None,
    ) -> Set[str]:

        now = _utc(seen_at) if seen_at else datetime.now(timezone.utc)
        seen_now: Set[str] = {str(t) for t in (tidHex or [])}

        new_ids: Set[str] = set()

        for tid in seen_now:
            epc_val = epcHex.get(tid) if epcHex else None
            msg_val = messageHex.get(tid) if messageHex else None
            resp_val = responseHex.get(tid) if responseHex else None

            cur = self._tags.get(tid)
            if cur is None:
                self._tags[tid] = ActiveTag(
                    tidHex=tid,
                    first_seen=now,
                    last_seen=now,
                    epcHex=epc_val,
                    messageHex=msg_val,
                    responseHex=resp_val,
                )
                new_ids.add(tid)
            else:
             
                cur.last_seen = now
                if epcHex is not None:
                    cur.epcHex = epc_val
                if messageHex is not None:
                    cur.messageHex = msg_val
                if responseHex is not None:
                    cur.responseHex = resp_val


        self.remove_inactive(now=now)
        return new_ids

    def remove_inactive(self, now: Optional[datetime] = None) -> int:
        now_utc = _utc(now) if now else datetime.now(timezone.utc)
        cutoff = now_utc - self._grace

        removed = 0
        for tid in list(self._tags.keys()):
            if self._tags[tid].last_seen < cutoff:
                del self._tags[tid]
                removed += 1
        return removed

    def get_active(self) -> List[ActiveTag]:
        self.remove_inactive()
        return sorted(self._tags.values(), key=lambda x: x.first_seen, reverse=True)

    def get_active_ids(self) -> List[str]:
        self.remove_inactive()
        return list(self._tags.keys())

    def snapshot(self) -> dict:
        self.remove_inactive()
        items = [
            {
                "tidHex": t.tidHex,
                "first_seen": t.first_seen,
                "last_seen": t.last_seen,
                "epcHex": t.epcHex,
                "messageHex": t.messageHex,
                "responseHex": t.responseHex,
            }
            for t in self.get_active()
        ]
        return {"count": len(items), "items": items}