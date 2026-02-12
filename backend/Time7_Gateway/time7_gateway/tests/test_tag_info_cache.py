import types
from datetime import datetime, timezone, timedelta

import pytest


# from time7_gateway.services.tag_info_cache import TagInfoCache
from time7_gateway.services import tag_info_cache as mod
from time7_gateway.services.tag_info_cache import TagInfoCache


def test_get_returns_none_when_cache_miss():
    cache = TagInfoCache(cache_ttl_hours=24)
    assert cache.get("tag-1") is None


def test_set_then_get_returns_cached_tuple():
    cache = TagInfoCache(cache_ttl_hours=24)
    cache.set("tag-1", auth=True, info="ok")
    assert cache.get("tag-1") == (True, "ok")


def test_get_returns_none_and_deletes_when_expired(monkeypatch):
    cache = TagInfoCache(cache_ttl_hours=24)

    t0 = datetime(2026, 2, 12, 0, 0, 0, tzinfo=timezone.utc)
   
    t1 = t0 + timedelta(hours=25)

    
    class FakeDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
          
            return t1 if tz else t1.replace(tzinfo=None)

  
    cache.set("tag-1", True, "ok")
    cache._cache["tag-1"].fetched_at = t0

    monkeypatch.setattr(mod, "datetime", FakeDateTime)


    assert cache.get("tag-1") is None
    assert "tag-1" not in cache._cache


def test_get_returns_value_when_not_expired(monkeypatch):
    cache = TagInfoCache(cache_ttl_hours=24)

    t0 = datetime(2026, 2, 12, 0, 0, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(hours=23)

    class FakeDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return t1 if tz else t1.replace(tzinfo=None)

    cache.set("tag-1", True, "ok")
    cache._cache["tag-1"].fetched_at = t0

    monkeypatch.setattr(mod, "datetime", FakeDateTime)

    assert cache.get("tag-1") == (True, "ok")
    assert "tag-1" in cache._cache



def test_snapshot_sorted_and_counts_items_if_snapshot_is_method():
   
    cache = TagInfoCache()
    cache.set("b", False, None)
    cache.set("a", True, "info")

 
    snap = cache.snapshot()
    assert snap["count"] == 2
    assert [x["id"] for x in snap["items"]] == ["a", "b"]


def test_snapshot_as_module_function_if_not_method():
 
    cache = TagInfoCache()
    cache.set("b", False, None)
    cache.set("a", True, "info")

    snap = mod.snapshot(cache)
    assert snap["count"] == 2
    assert [x["id"] for x in snap["items"]] == ["a", "b"]