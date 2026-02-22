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

    async def stream_events(self, on_connect=None):
    #async def stream_events(self):
        url = f"{self.base_url}/data/stream" 
        async with self._client.stream("GET", url) as r:
            r.raise_for_status()
            
            if on_connect:
               on_connect()

            async for line in r.aiter_lines():
                if not line:
                    continue
                yield json.loads(line)

    async def aclose(self):
        await self._client.aclose()

def handle_invalid_tag(
    tidHex,
    epcHex,
    seen_at,
    active_tags,
    cache,
    info_message
):
    auth = False
    info = info_message

    active_tags.sync_seen(
        [tidHex],
        epcHex={tidHex: epcHex},
        seen_at=seen_at
    )

    cache.set(tidHex, auth, info)

    upsert_latest_tag(
        tidHex=tidHex,
        seen_at=seen_at,
        auth=auth,
        info=info,
        epcHex=epcHex,
    )
                


async def run_reader_stream(app):
    reader_base_url = os.getenv("READER_BASE_URL", "").strip()
    reader_user = os.getenv("READER_USER", "").strip()
    reader_password = os.getenv("READER_PASSWORD", "").strip()

    client = ImpinjReaderClient(reader_base_url, reader_user, reader_password)

    

    active_tags = app.state.active_tags
    cache = app.state.tag_info_cache
    ias_lookup = app.state.ias_lookup
    
    # reader status flag
    app.state.reader_connected = False
    def mark_connected():
        app.state.reader_connected = True
     
      

    try:
        
        # Subscribe to data-stream
        async for ev in client.stream_events(on_connect=mark_connected):
        #async for ev in client.stream_events():
            # Skip if not a valid tagInventoryEvent
            
            if ev.get("eventType") != "tagInventory":
                
                continue

            # Save required variables:
            tieDict = ev.get("tagInventoryEvent", {}) # a dict object holding the variables needed for Authentication

            tidHex = tieDict.get("tidHex") # Unique tag identification number
            epcHex = tieDict.get("epcHex") # Product information number



            # Skip if no tidHex:
            if not tidHex:
                continue
            
            # Save timestamp as variable:
            seen_at = datetime.now(timezone.utc)
            
            #tid Hex from inventory event
            tidHex_from_event = tidHex
            
            # ----- TAG AUTHENTICATION RESPONSE INGESTION -----
            tarDict = tieDict.get("tagAuthenticationResponse", {}) # a dict object holding authentication payload to be sent to IAS
            
            if not tarDict:
                #authentication failed, display tag as invalid
                handle_invalid_tag(
                    tidHex=tidHex_from_event,
                    epcHex=epcHex,
                    seen_at=seen_at,
                    active_tags=active_tags,
                    cache=cache,
                    info_message="Authentication Disabled")
                continue 

            # Save tagAuthenticationResponse variables:
            messageHex=tarDict.get("messageHex") # Challenge that was sent to the tag, will always be included.
            responseHex=tarDict.get("responseHex") # Always will be included, but will be an empty string if failed/invalid.
            tidHex=tarDict.get("tidHex") # May be empty, if so, use the tidHex variable from above.
            
            # If tidHex was not found inside tagAuthenticationResponse, use tidHex
            if not tidHex:
                tidHex = tidHex_from_event

           # Final checks:
            if responseHex == "":
                #unable to authenticate due to missing responseHex. marked as incompatible tag
                handle_invalid_tag(
                    tidHex=tidHex,
                    epcHex=epcHex,
                    seen_at=seen_at,
                    active_tags=active_tags,
                    cache=cache,
                    info_message="Unsupported Tag")
                continue

            # ----- AUTHENTICATION RESPONSE VALID -----
            # Create auth_payload:
            auth_payload = AuthPayload(
                    messageHex=messageHex,
                    responseHex=responseHex,
                    tidHex=tidHex
                )
            
            # Update active live tags
            active_tags.sync_seen(
                [tidHex],
                epcHex={tidHex: epcHex},
                seen_at=seen_at
            )
            

            # --- SENDING TO IAS ---
            # Check if this event's tidHex exists in the cache:
            if cache.get(tidHex) is None: 
                
                # Send event payload to clients/ias_services.py
                auth, info = ias_lookup(auth_payload) 
                # returns auth(bool): true if valid; else false
                #         info(str) : information about the authentication request

                cache.set(tidHex, auth, info)   # IAS results
                upsert_latest_tag(tidHex=tidHex, seen_at=seen_at, auth=auth, info=info,epcHex=epcHex) # Sending to database

    finally:
        await client.aclose()
        app.state.reader_connected = False #reader status
