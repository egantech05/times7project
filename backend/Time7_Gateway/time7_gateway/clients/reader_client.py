import json
import os
from datetime import datetime, timezone
from time7_gateway.models.schemas import AuthPayload #---NEW

import httpx

from time7_gateway.services.database import upsert_latest_tag


class ImpinjReaderClient:
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url 
        self._client = httpx.AsyncClient(auth=(username, password), timeout=None)

    async def stream_events(self):
        url = f"{self.base_url}/data/stream" 
        async with self._client.stream("GET", url) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line:
                    continue
                yield json.loads(line)

    async def aclose(self):
        await self._client.aclose()

def handle_invalid_tag(
    tag_id,
    epcHex,
    seen_at,
    active_tags,
    cache,
    info_message
):
    auth_payload = "none"
    auth = False
    info = info_message

    active_tags.sync_seen(
        [tag_id],
        seen_at=seen_at
    )

    cache.set(tag_id, auth, info)

    upsert_latest_tag(
        tag_id=tag_id,
        seen_at=seen_at,
        auth=auth,
        info=info
    )
                


async def run_reader_stream(app):
    reader_base_url = os.getenv("READER_BASE_URL", "").strip()
    reader_user = os.getenv("READER_USER", "").strip()
    reader_password = os.getenv("READER_PASSWORD", "").strip()

    client = ImpinjReaderClient(reader_base_url, reader_user, reader_password)

    active_tags = app.state.active_tags
    cache = app.state.tag_info_cache
    ias_lookup = app.state.ias_lookup

    try:
        # Subscribe to data-stream
        async for ev in client.stream_events():
            # Skip if not a valid tagInventoryEvent
            if ev.get("eventType") != "tagInventory":
                continue

            # Save required variables:
            tieDict = ev.get("tagInventoryEvent", {}) # a dict object holding the variables needed for Authentication

            tag_id = tieDict.get("tidHex") # Unique tag identification number
            epcHex = tieDict.get("epcHex") # Product information number

            # Skip if no tag_id:
            if not tag_id:
                continue
            
            # Save timestamp as variable:
            seen_at = datetime.now(timezone.utc)

            # ----- TAG AUTHENTICATION RESPONSE INGESTION -----
            tarDict = tieDict.get("tagAuthenticationResponse", {}) # a dict object holding authentication payload to be sent to IAS
            
            if not tarDict:
                #authentication failed, display tag as invalid
                handle_invalid_tag(
                    tag_id=tag_id,
                    epcHex=epcHex,
                    seen_at=seen_at,
                    active_tags=active_tags,
                    cache=cache,
                    info_message="'tagAuthenticationResponse' not found.")
                continue 

            # Save tagAuthenticationResponse variables:
            messageHex=tarDict.get("messageHex") # Challenge that was sent to the tag, will always be included.
            responseHex=tarDict.get("responseHex") # Always will be included, but will be an empty string if failed/invalid.
            tidHex=tarDict.get("tidHex") # May be empty, if so, use the tag_id variable from above.

           # Final checks:
            if responseHex == "":
                #authentication failed, display tag as invalid
                handle_invalid_tag(
                    tag_id=tag_id,
                    epcHex=epcHex,
                    seen_at=seen_at,
                    active_tags=active_tags,
                    cache=cache,
                    info_message="'responseHex' not found.")
                continue

            # If tidHex was not found inside tagAuthenticationResponse, use tag_id
            if not tidHex:
                tidHex = tag_id
            

            # ----- AUTHENTICATION RESPONSE VALID -----
            # Create auth_payload:
            auth_payload = AuthPayload(
                    messageHex=messageHex,
                    responseHex=responseHex,
                    tidHex=tidHex
                )
            
            # Update active live tags
            active_tags.sync_seen(
                [tag_id], seen_at=seen_at)
            

            # --- SENDING TO IAS ---
            # Check if this event's tag_id exists in the cache:
            if cache.get(tag_id) is None: 
                
                # Send event payload to clients/ias_services.py
                auth, info = ias_lookup(tag_id) 
                # returns auth(bool): true if valid; else false
                #         info(str) : information about the authentication request

                cache.set(tag_id, auth, info)   # IAS results
                upsert_latest_tag(tag_id=tag_id, seen_at=seen_at, auth=auth, info=info) # Sending to database

    finally:
        await client.aclose()