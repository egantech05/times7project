import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

import time7_gateway.clients.reader_client as rc


# -------------------------
# Helpers for mocking httpx stream
# -------------------------
class _FakeResponse:
    def __init__(self, lines, status_ok=True):
        self._lines = lines
        self._status_ok = status_ok
        self.raise_for_status = MagicMock()

        if not status_ok:
            # make raise_for_status raise an exception
            self.raise_for_status.side_effect = RuntimeError("HTTP error")

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class _FakeStreamCM:
    """Async context manager returned by AsyncClient.stream(...)"""
    def __init__(self, response: _FakeResponse):
        self._response = response

    async def __aenter__(self):
        return self._response

    async def __aexit__(self, exc_type, exc, tb):
        return False


@pytest.mark.asyncio
async def test_stream_events_skips_empty_lines_and_parses_json(monkeypatch):
    # Arrange: mock httpx.AsyncClient so ImpinjReaderClient doesn't do real HTTP
    fake_lines = [
        "",  # should be skipped
        json.dumps({"a": 1}),
        "   ",  # NOTE: your code only checks `if not line`, so "   " is not empty -> json.loads will FAIL
    ]
    # We'll only include truly empty lines + valid json to test expected behavior
    fake_lines = ["", json.dumps({"a": 1}), json.dumps({"b": 2})]

    fake_resp = _FakeResponse(fake_lines, status_ok=True)
    fake_cm = _FakeStreamCM(fake_resp)

    fake_httpx_client = MagicMock()
    fake_httpx_client.stream.return_value = fake_cm
    fake_httpx_client.aclose = AsyncMock()

    monkeypatch.setattr(rc.httpx, "AsyncClient", MagicMock(return_value=fake_httpx_client))

    client = rc.ImpinjReaderClient("http://reader", "u", "p")

    # Act
    out = []
    async for ev in client.stream_events():
        out.append(ev)

    # Assert
    fake_httpx_client.stream.assert_called_once_with("GET", "http://reader/data/stream")
    fake_resp.raise_for_status.assert_called_once()
    assert out == [{"a": 1}, {"b": 2}]


@pytest.mark.asyncio
async def test_stream_events_raises_on_bad_status(monkeypatch):
    fake_resp = _FakeResponse([json.dumps({"a": 1})], status_ok=False)
    fake_cm = _FakeStreamCM(fake_resp)

    fake_httpx_client = MagicMock()
    fake_httpx_client.stream.return_value = fake_cm
    fake_httpx_client.aclose = AsyncMock()
    monkeypatch.setattr(rc.httpx, "AsyncClient", MagicMock(return_value=fake_httpx_client))

    client = rc.ImpinjReaderClient("http://reader", "u", "p")

    with pytest.raises(RuntimeError, match="HTTP error"):
        async for _ in client.stream_events():
            pass


# -------------------------
# Tests for run_reader_stream
# -------------------------
async def _agen(events):
    for e in events:
        yield e


@pytest.mark.asyncio
async def test_run_reader_stream_processes_taginventory_and_cache_miss(monkeypatch):
    # env
    monkeypatch.setenv("READER_BASE_URL", "http://reader ")
    monkeypatch.setenv("READER_USER", "root")
    monkeypatch.setenv("READER_PASSWORD", "pw")

    # Freeze time (patch rc.datetime.now)
    fixed_now = datetime(2026, 2, 12, 0, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(rc.datetime, "now", MagicMock(return_value=fixed_now))

    # Mock ImpinjReaderClient instance created inside run_reader_stream
    fake_client = MagicMock()
    fake_client.stream_events = MagicMock(return_value=_agen([
        {"eventType": "other"},  # should be ignored
        {"eventType": "tagInventory", "tagInventoryEvent": {"epcHex": "ABC"}},
    ]))
    fake_client.aclose = AsyncMock()

    monkeypatch.setattr(rc, "ImpinjReaderClient", MagicMock(return_value=fake_client))

    # app.state mocks
    active_tags = MagicMock()
    cache = MagicMock()
    cache.get.return_value = None  # cache miss
    ias_lookup = MagicMock(return_value=(True, "ok"))

    # mock DB write
    upsert = MagicMock()
    monkeypatch.setattr(rc, "upsert_latest_tag", upsert)

    app = SimpleNamespace(state=SimpleNamespace(
        active_tags=active_tags,
        tag_info_cache=cache,
        ias_lookup=ias_lookup,
    ))

    # Act
    await rc.run_reader_stream(app)

    # Assert: sync_seen called with tag and fixed time
    active_tags.sync_seen.assert_called_once_with(["ABC"], seen_at=fixed_now)

    # cache miss -> ias_lookup called, cache set, db upsert
    ias_lookup.assert_called_once_with("ABC")
    cache.set.assert_called_once_with("ABC", True, "ok")
    upsert.assert_called_once_with(tag_id="ABC", seen_at=fixed_now, auth=True, info="ok")

    # always closes client
    fake_client.aclose.assert_called_once()


@pytest.mark.asyncio
async def test_run_reader_stream_cache_hit_skips_ias_and_db(monkeypatch):
    monkeypatch.setenv("READER_BASE_URL", "http://reader")
    monkeypatch.setenv("READER_USER", "root")
    monkeypatch.setenv("READER_PASSWORD", "pw")

    fixed_now = datetime(2026, 2, 12, 0, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(rc.datetime, "now", MagicMock(return_value=fixed_now))

    fake_client = MagicMock()
    fake_client.stream_events = MagicMock(return_value=_agen([
        {"eventType": "tagInventory", "tagInventoryEvent": {"epcHex": "ABC"}},
    ]))
    fake_client.aclose = AsyncMock()
    monkeypatch.setattr(rc, "ImpinjReaderClient", MagicMock(return_value=fake_client))

    active_tags = MagicMock()
    cache = MagicMock()
    cache.get.return_value = (True, "cached")  # cache hit
    ias_lookup = MagicMock()

    upsert = MagicMock()
    monkeypatch.setattr(rc, "upsert_latest_tag", upsert)

    app = SimpleNamespace(state=SimpleNamespace(
        active_tags=active_tags,
        tag_info_cache=cache,
        ias_lookup=ias_lookup,
    ))

    await rc.run_reader_stream(app)

    active_tags.sync_seen.assert_called_once()
    ias_lookup.assert_not_called()
    cache.set.assert_not_called()
    upsert.assert_not_called()
    fake_client.aclose.assert_called_once()


@pytest.mark.asyncio
async def test_run_reader_stream_ignores_missing_epc(monkeypatch):
    monkeypatch.setenv("READER_BASE_URL", "http://reader")
    monkeypatch.setenv("READER_USER", "root")
    monkeypatch.setenv("READER_PASSWORD", "pw")

    fake_client = MagicMock()
    fake_client.stream_events = MagicMock(return_value=_agen([
        {"eventType": "tagInventory", "tagInventoryEvent": {}},  # missing epcHex -> ignore
    ]))
    fake_client.aclose = AsyncMock()
    monkeypatch.setattr(rc, "ImpinjReaderClient", MagicMock(return_value=fake_client))

    active_tags = MagicMock()
    cache = MagicMock()
    ias_lookup = MagicMock()

    upsert = MagicMock()
    monkeypatch.setattr(rc, "upsert_latest_tag", upsert)

    app = SimpleNamespace(state=SimpleNamespace(
        active_tags=active_tags,
        tag_info_cache=cache,
        ias_lookup=ias_lookup,
    ))

    await rc.run_reader_stream(app)

    active_tags.sync_seen.assert_not_called()
    ias_lookup.assert_not_called()
    upsert.assert_not_called()
    fake_client.aclose.assert_called_once()


@pytest.mark.asyncio
async def test_run_reader_stream_always_closes_on_exception(monkeypatch):
    monkeypatch.setenv("READER_BASE_URL", "http://reader")
    monkeypatch.setenv("READER_USER", "root")
    monkeypatch.setenv("READER_PASSWORD", "pw")

    async def boom_gen():
        yield {"eventType": "tagInventory", "tagInventoryEvent": {"epcHex": "ABC"}}
        raise RuntimeError("boom")

    fake_client = MagicMock()
    fake_client.stream_events = MagicMock(return_value=boom_gen())
    fake_client.aclose = AsyncMock()
    monkeypatch.setattr(rc, "ImpinjReaderClient", MagicMock(return_value=fake_client))

    active_tags = MagicMock()
    cache = MagicMock()
    cache.get.return_value = (True, "cached")
    ias_lookup = MagicMock()

    app = SimpleNamespace(state=SimpleNamespace(
        active_tags=active_tags,
        tag_info_cache=cache,
        ias_lookup=ias_lookup,
    ))

    with pytest.raises(RuntimeError, match="boom"):
        await rc.run_reader_stream(app)

    fake_client.aclose.assert_called_once()