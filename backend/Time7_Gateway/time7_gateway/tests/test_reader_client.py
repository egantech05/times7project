"""
Unit Tests for time7_gateway/clients/reader_client.py
=======================================================

TEST CHECKLIST
==============
ImpinjReaderClient
  [ ] 1.  __init__ correctly sets base_url
  [ ] 2.  __init__ creates httpx.AsyncClient with correct Basic Auth credentials
  [ ] 3.  stream_events constructs the correct URL (/data/stream)
  [ ] 4.  stream_events calls raise_for_status()
  [ ] 5.  stream_events skips empty lines
  [ ] 6.  stream_events correctly yields parsed JSON dicts
  [ ] 7.  aclose closes the underlying httpx client

handle_invalid_tag
  [ ] 8.  calls active_tags.sync_seen with the correct tag_id and seen_at
  [ ] 9.  calls cache.set(tag_id, False, info_message)
  [ ] 10. calls upsert_latest_tag with auth=False and the correct info
  [ ] 11. does not raise an exception

run_reader_stream — event filtering
  [ ] 12. events where eventType != "tagInventory" are skipped (no cache/db calls)
  [ ] 13. events where tag_id (tidHex) is empty are skipped

run_reader_stream — missing tagAuthenticationResponse
  [ ] 14. empty tarDict triggers handle_invalid_tag with the correct info message
  [ ] 15. empty tarDict does not call ias_lookup

run_reader_stream — empty responseHex
  [ ] 16. responseHex == "" triggers handle_invalid_tag with the correct info message
  [ ] 17. responseHex == "" does not call ias_lookup

run_reader_stream — tidHex fallback logic
  [ ] 18. when tidHex is absent from tarDict, the outer tag_id is used instead

run_reader_stream — IAS cache logic
  [ ] 19. a cache hit skips ias_lookup entirely
  [ ] 20. a cache miss calls ias_lookup exactly once
  [ ] 21. the ias_lookup result is correctly written to the cache
  [ ] 22. the ias_lookup result is correctly written to the database (upsert_latest_tag)

run_reader_stream — active_tags
  [ ] 23. a valid event calls active_tags.sync_seen
  [ ] 24. AuthPayload is constructed with the correct messageHex/responseHex/tidHex

run_reader_stream — resource cleanup
  [ ] 25. client.aclose() is called on normal exit
  [ ] 26. client.aclose() is still called on exception (finally block)
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

# ── Module under test ─────────────────────────────────────────────────────────
MODULE = "time7_gateway.clients.reader_client"


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def make_valid_event(tid="TID123", epc="EPC456", message="AABBCC",
                     response="DDEEFF", tid_in_tar="TID123"):
    """Build a complete, valid tagInventory event dict."""
    tar = {"messageHex": message, "responseHex": response}
    if tid_in_tar is not None:
        tar["tidHex"] = tid_in_tar
    return {
        "eventType": "tagInventory",
        "tagInventoryEvent": {
            "tidHex": tid,
            "epcHex": epc,
            "tagAuthenticationResponse": tar,
        },
    }


def make_app_state(cache_hit=None):
    """Return a mock FastAPI app with the three required state objects."""
    app = MagicMock()
    app.state.active_tags = MagicMock()
    app.state.tag_info_cache = MagicMock()
    app.state.ias_lookup = MagicMock(return_value=(True, "authentic"))
    # cache.get returns None by default (cache miss); override via cache_hit
    app.state.tag_info_cache.get.return_value = cache_hit
    return app


# ═══════════════════════════════════════════════════════════════════════════════
# 1-7  ImpinjReaderClient
# ═══════════════════════════════════════════════════════════════════════════════

class TestImpinjReaderClient:

    # [✓] 1
    def test_init_sets_base_url(self):
        from time7_gateway.clients.reader_client import ImpinjReaderClient
        with patch(f"{MODULE}.httpx.AsyncClient"):
            c = ImpinjReaderClient("http://reader", "user", "pass")
        assert c.base_url == "http://reader"

    # [✓] 2
    def test_init_creates_async_client_with_basic_auth(self):
        from time7_gateway.clients.reader_client import ImpinjReaderClient
        with patch(f"{MODULE}.httpx.AsyncClient") as mock_cls:
            ImpinjReaderClient("http://reader", "admin", "secret")
        mock_cls.assert_called_once_with(auth=("admin", "secret"), timeout=None)

    # [✓] 3 & 4 & 5 & 6
    @pytest.mark.asyncio
    async def test_stream_events_yields_parsed_json_and_skips_empty(self):
        from time7_gateway.clients.reader_client import ImpinjReaderClient

        lines = ['', '{"eventType":"tagInventory"}', '', '{"eventType":"other"}']

        async def fake_aiter_lines():
            for line in lines:
                yield line

        mock_response = AsyncMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.aiter_lines = fake_aiter_lines
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=False)

        mock_client = MagicMock()
        mock_client.stream.return_value = mock_response

        with patch(f"{MODULE}.httpx.AsyncClient", return_value=mock_client):
            c = ImpinjReaderClient("http://reader", "u", "p")
            results = [ev async for ev in c.stream_events()]

        # Empty lines are skipped; two parsed dicts are returned
        assert len(results) == 2
        assert results[0] == {"eventType": "tagInventory"}
        mock_client.stream.assert_called_once_with("GET", "http://reader/data/stream")
        mock_response.raise_for_status.assert_called_once()

    # [✓] 7
    @pytest.mark.asyncio
    async def test_aclose_closes_client(self):
        from time7_gateway.clients.reader_client import ImpinjReaderClient
        mock_inner = AsyncMock()
        with patch(f"{MODULE}.httpx.AsyncClient", return_value=mock_inner):
            c = ImpinjReaderClient("http://reader", "u", "p")
            await c.aclose()
        mock_inner.aclose.assert_awaited_once()


# ═══════════════════════════════════════════════════════════════════════════════
# 8-11  handle_invalid_tag
# ═══════════════════════════════════════════════════════════════════════════════

class TestHandleInvalidTag:

    def _call(self, info_message="test error"):
        from time7_gateway.clients.reader_client import handle_invalid_tag
        active_tags = MagicMock()
        cache = MagicMock()
        seen_at = datetime(2024, 1, 1, tzinfo=timezone.utc)

        with patch(f"{MODULE}.upsert_latest_tag") as mock_db:
            handle_invalid_tag(
                tidHex="TID1",
                epcHex="EPC1",
                seen_at=seen_at,
                active_tags=active_tags,
                cache=cache,
                info_message=info_message,
            )
        return active_tags, cache, mock_db, seen_at

    # [✓] 8
    def test_calls_sync_seen_with_tag_id_and_seen_at(self):
        active_tags, _, _, seen_at = self._call()
        active_tags.sync_seen.assert_called_once_with(["TID1"], epcHex={"TID1": "EPC1"}, seen_at=seen_at)

    # [✓] 9
    def test_sets_cache_auth_false(self):
        _, cache, _, _ = self._call("some error")
        cache.set.assert_called_once_with("TID1", False, "some error")

    # [✓] 10
    def test_upserts_db_auth_false(self):
        _, _, mock_db, seen_at = self._call("db error")
        mock_db.assert_called_once_with(
            tidHex="TID1", seen_at=seen_at, auth=False, info="db error", epcHex="EPC1"
        )

    # [✓] 11
    def test_does_not_raise(self):
        self._call()


# ═══════════════════════════════════════════════════════════════════════════════
# 12-26  run_reader_stream
# ═══════════════════════════════════════════════════════════════════════════════

class TestRunReaderStream:

    def _patch_client(self, events):
        """Patch stream_events to yield the given list of event dicts."""
        async def fake_stream(self_inner, on_connect=None):
            if on_connect:
                on_connect()
            for ev in events:
                yield ev

        return patch(
            f"{MODULE}.ImpinjReaderClient.stream_events",
            new=fake_stream,
        )

    def _patch_aclose(self):
        return patch(
            f"{MODULE}.ImpinjReaderClient.aclose",
            new_callable=AsyncMock,
        )

    async def _run(self, events, app=None):
        from time7_gateway.clients.reader_client import run_reader_stream
        if app is None:
            app = make_app_state()
        with self._patch_client(events), self._patch_aclose(), \
             patch(f"{MODULE}.upsert_latest_tag") as mock_db, \
             patch.dict("os.environ", {
                 "READER_BASE_URL": "http://reader",
                 "READER_USER": "u",
                 "READER_PASSWORD": "p",
             }):
            await run_reader_stream(app)
        return app, mock_db

    # [✓] 12 — Non-tagInventory events are skipped
    @pytest.mark.asyncio
    async def test_skips_non_tag_inventory_events(self):
        events = [{"eventType": "heartbeat"}, {"eventType": "status"}]
        app, mock_db = await self._run(events)
        app.state.tag_info_cache.set.assert_not_called()
        mock_db.assert_not_called()

    # [✓] 13 — Event with empty tag_id is skipped
    @pytest.mark.asyncio
    async def test_skips_event_with_no_tag_id(self):
        events = [{"eventType": "tagInventory", "tagInventoryEvent": {"tidHex": ""}}]
        app, mock_db = await self._run(events)
        mock_db.assert_not_called()

    # [✓] 14 — Missing tagAuthenticationResponse triggers handle_invalid_tag
    @pytest.mark.asyncio
    async def test_missing_tar_calls_handle_invalid(self):
        events = [{
            "eventType": "tagInventory",
            "tagInventoryEvent": {"tidHex": "TID1", "epcHex": "EPC1"},
        }]
        app, mock_db = await self._run(events)
        mock_db.assert_called_once()
        _, kwargs = mock_db.call_args
        assert kwargs["auth"] is False
        assert "tagAuthResponse" in kwargs["info"]

    # [✓] 15 — Missing tar does not call ias_lookup
    @pytest.mark.asyncio
    async def test_missing_tar_does_not_call_ias(self):
        events = [{
            "eventType": "tagInventory",
            "tagInventoryEvent": {"tidHex": "TID1"},
        }]
        app, _ = await self._run(events)
        app.state.ias_lookup.assert_not_called()

    # [✓] 16 — Empty responseHex triggers handle_invalid_tag
    @pytest.mark.asyncio
    async def test_empty_response_hex_calls_handle_invalid(self):
        ev = make_valid_event(response="")
        app, mock_db = await self._run([ev])
        mock_db.assert_called_once()
        _, kwargs = mock_db.call_args
        assert kwargs["auth"] is False
        assert "responseHex" in kwargs["info"]

    # [✓] 17 — Empty responseHex does not call ias_lookup
    @pytest.mark.asyncio
    async def test_empty_response_hex_does_not_call_ias(self):
        ev = make_valid_event(response="")
        app, _ = await self._run([ev])
        app.state.ias_lookup.assert_not_called()

    # [✓] 18 — Missing tidHex in tar falls back to outer tag_id
    @pytest.mark.asyncio
    async def test_fallback_tid_hex_uses_tag_id(self):
        ev = make_valid_event(tid="OUTER_TID", tid_in_tar=None)
        app = make_app_state()
        with self._patch_client([ev]), self._patch_aclose(), \
             patch(f"{MODULE}.upsert_latest_tag"), \
             patch(f"{MODULE}.AuthPayload") as mock_payload, \
             patch.dict("os.environ", {
                 "READER_BASE_URL": "http://r", "READER_USER": "u", "READER_PASSWORD": "p"
             }):
            from time7_gateway.clients.reader_client import run_reader_stream
            await run_reader_stream(app)

        _, kwargs = mock_payload.call_args
        assert kwargs["tidHex"] == "OUTER_TID"

    # [✓] 19 — Cache hit skips ias_lookup
    @pytest.mark.asyncio
    async def test_cache_hit_skips_ias_lookup(self):
        ev = make_valid_event()
        app = make_app_state(cache_hit=(True, "cached"))
        with self._patch_client([ev]), self._patch_aclose(), \
             patch(f"{MODULE}.upsert_latest_tag"), \
             patch.dict("os.environ", {
                 "READER_BASE_URL": "http://r", "READER_USER": "u", "READER_PASSWORD": "p"
             }):
            from time7_gateway.clients.reader_client import run_reader_stream
            await run_reader_stream(app)

        app.state.ias_lookup.assert_not_called()

    # [✓] 20 — Cache miss calls ias_lookup exactly once
    @pytest.mark.asyncio
    async def test_cache_miss_calls_ias_once(self):
        ev = make_valid_event()
        app, _ = await self._run([ev])
        app.state.ias_lookup.assert_called_once()

    # [✓] 21 — IAS result is written to the cache
    @pytest.mark.asyncio
    async def test_ias_result_written_to_cache(self):
        ev = make_valid_event(tid="TID99", tid_in_tar="TID99")
        app = make_app_state()
        app.state.ias_lookup.return_value = (True, "ok")
        app, _ = await self._run([ev], app=app)
        app.state.tag_info_cache.set.assert_called_once_with("TID99", True, "ok")

    # [✓] 22 — IAS result is written to the database
    @pytest.mark.asyncio
    async def test_ias_result_written_to_db(self):
        ev = make_valid_event(tid="TID88", tid_in_tar="TID88")
        app = make_app_state()
        app.state.ias_lookup.return_value = (False, "fake")
        app, mock_db = await self._run([ev], app=app)
        _, kwargs = mock_db.call_args
        assert kwargs["tidHex"] == "TID88"
        assert kwargs["auth"] is False
        assert kwargs["info"] == "fake"

    # [✓] 23 — Valid event calls active_tags.sync_seen
    @pytest.mark.asyncio
    async def test_valid_event_calls_sync_seen(self):
        ev = make_valid_event(tid="TID77", tid_in_tar="TID77")
        app, _ = await self._run([ev])
        app.state.active_tags.sync_seen.assert_called()
        args, _ = app.state.active_tags.sync_seen.call_args
        assert "TID77" in args[0]

    # [✓] 24 — AuthPayload is built with the correct fields
    @pytest.mark.asyncio
    async def test_auth_payload_fields(self):
        ev = make_valid_event(message="MSG", response="RESP", tid_in_tar="TID_TAR")
        app = make_app_state()
        with self._patch_client([ev]), self._patch_aclose(), \
             patch(f"{MODULE}.upsert_latest_tag"), \
             patch(f"{MODULE}.AuthPayload") as mock_payload, \
             patch.dict("os.environ", {
                 "READER_BASE_URL": "http://r", "READER_USER": "u", "READER_PASSWORD": "p"
             }):
            from time7_gateway.clients.reader_client import run_reader_stream
            await run_reader_stream(app)

        mock_payload.assert_called_once_with(
            messageHex="MSG", responseHex="RESP", tidHex="TID_TAR"
        )

    # [✓] 25 — aclose is called on normal exit
    @pytest.mark.asyncio
    async def test_aclose_called_on_normal_exit(self):
        from time7_gateway.clients.reader_client import run_reader_stream
        app = make_app_state()
        with self._patch_client([]), \
             patch(f"{MODULE}.ImpinjReaderClient.aclose", new_callable=AsyncMock) as mock_close, \
             patch(f"{MODULE}.upsert_latest_tag"), \
             patch.dict("os.environ", {
                 "READER_BASE_URL": "http://r", "READER_USER": "u", "READER_PASSWORD": "p"
             }):
            await run_reader_stream(app)
        mock_close.assert_awaited_once()

    # [✓] 26 — aclose is still called on exception (finally block)
    @pytest.mark.asyncio
    async def test_aclose_called_on_exception(self):
        from time7_gateway.clients.reader_client import run_reader_stream, ImpinjReaderClient
        app = make_app_state()

        async def boom(self_inner, on_connect=None):
            raise RuntimeError("stream error")
            yield  # make it an async generator

        with patch.object(ImpinjReaderClient, "stream_events", new=boom), \
             patch(f"{MODULE}.ImpinjReaderClient.aclose", new_callable=AsyncMock) as mock_close, \
             patch(f"{MODULE}.upsert_latest_tag"), \
             patch.dict("os.environ", {
                 "READER_BASE_URL": "http://r", "READER_USER": "u", "READER_PASSWORD": "p"
             }):
            with pytest.raises(RuntimeError):
                await run_reader_stream(app)

        mock_close.assert_awaited_once()