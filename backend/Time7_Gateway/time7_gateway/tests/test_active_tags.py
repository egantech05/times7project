from datetime import datetime, timezone, timedelta

import pytest

from time7_gateway.services.active_tags import ActiveTags, _utc


def test_utc_naive_datetime_is_assumed_utc():
    dt = datetime(2026, 2, 12, 10, 0, 0)  # naive
    out = _utc(dt)
    assert out.tzinfo == timezone.utc
    assert out.year == 2026 and out.month == 2 and out.day == 12


def test_utc_converts_aware_datetime_to_utc():
    nzdt = timezone(timedelta(hours=13))
    dt = datetime(2026, 2, 12, 13, 0, 0, tzinfo=nzdt)  # 13:00 NZDT
    out = _utc(dt)
    assert out.tzinfo == timezone.utc
    # 13:00 NZDT == 00:00 UTC
    assert out.hour == 0 and out.minute == 0


def test_sync_seen_returns_new_ids_for_first_time_tags():
    service = ActiveTags(remove_grace_seconds=2.0)
    now = datetime(2026, 2, 12, 0, 0, 0, tzinfo=timezone.utc)

    new_ids = service.sync_seen(["A", "B"], seen_at=now)

    assert new_ids == {"A", "B"}
    assert set(service.get_active_ids()) == {"A", "B"}


def test_sync_seen_does_not_return_existing_tag_as_new_and_updates_last_seen():
    service = ActiveTags(remove_grace_seconds=2.0)
    t1 = datetime(2026, 2, 12, 0, 0, 0, tzinfo=timezone.utc)
    t2 = t1 + timedelta(seconds=1)

    first_new = service.sync_seen(["A"], seen_at=t1)
    assert first_new == {"A"}

    # A appears again
    second_new = service.sync_seen(["A"], seen_at=t2)
    assert second_new == set()  # no new tags

    snap = service.snapshot()
    assert snap["count"] == 1
    assert snap["items"][0]["id"] == "A"
    assert snap["items"][0]["first_seen"] == t1
    assert snap["items"][0]["last_seen"] == t2


def test_sync_seen_removes_tags_not_seen_within_grace_period():
    service = ActiveTags(remove_grace_seconds=2.0)
    t1 = datetime(2026, 2, 12, 0, 0, 0, tzinfo=timezone.utc)

    service.sync_seen(["A"], seen_at=t1)

    # Move time forward beyond grace
    t_late = t1 + timedelta(seconds=10)
    service.sync_seen([], seen_at=t_late)

    assert service.get_active_ids() == []
    assert service.snapshot()["count"] == 0


def test_get_active_sorted_by_first_seen_desc():
    service = ActiveTags(remove_grace_seconds=100.0)  # avoid expiry
    t1 = datetime(2026, 2, 12, 0, 0, 0, tzinfo=timezone.utc)
    t2 = t1 + timedelta(seconds=1)

    service.sync_seen(["A"], seen_at=t1)
    service.sync_seen(["B"], seen_at=t2)

    active = service.get_active()
    assert [t.tag_id for t in active] == ["B", "A"]  # B first (newer first_seen)