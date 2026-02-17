from __future__ import annotations

import asyncio
from pathlib import Path
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()

# ----- SWITCH SIMULATOR DATA-STREAM -----
# datastream1 = tagAuthenticationResponse DISABLED
# datasteam2 = tagAuthenticationResponse ENABLED but INCOMPATIBLE
# datastream3 = tagAuthenticationResponse ENABLED & COMPATIBLE with INCORRECT RESPONSE
# datastream4 = tagAuthenticationResponse ENABLED & COMPATIBLE with CORRECT RESPONSE
DATA_FILE = Path(__file__).with_name("datastream5.ndjson")# use "datastream1", "datastream2", "datastream3", or "datastream4"


async def ndjson_line_stream(loop: bool = True, rate_hz: float = 20.0) -> AsyncIterator[bytes]:

    delay = 0.0 if rate_hz <= 0 else 1.0 / rate_hz

    while True:

        with DATA_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

            
                yield (line + "\n").encode("utf-8")

                if delay:
                    await asyncio.sleep(delay)

        if not loop:
            break


@router.get("/data/stream")
async def data_stream(loop: bool = True, rate_hz: float = 20.0):

    return StreamingResponse(
        ndjson_line_stream(loop=loop, rate_hz=rate_hz),
        media_type="application/x-ndjson",
    )