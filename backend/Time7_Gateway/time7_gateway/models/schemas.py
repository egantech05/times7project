from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


class ReaderEventBatch(BaseModel):
    tagIds: List[str]

#Scan-Result to be displayed on the Dashboard
class ScanResult(BaseModel):
    id: str
    date: datetime
    auth: bool
    info: Optional[str] = None

#Full Scan Event built from raw reader data stream
class FullScanEvent(BaseModel):
    epc: str
    messageHex: str
    responseHex: str
    tidHex: str
    tid: str
