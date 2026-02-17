from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


class ReaderEventBatch(BaseModel):
    tagIds: List[str]

#Scan-Result to be displayed on the Dashboard
class ScanResult(BaseModel):
    tidHex: str
    epcHex: str
    first_seen: datetime
    auth: bool
    info: Optional[str] = None

# Authentication payload to be sent to IAS
class AuthPayload(BaseModel):
    messageHex: str
    responseHex: str
    tidHex: str
