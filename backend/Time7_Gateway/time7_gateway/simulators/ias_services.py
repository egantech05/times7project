from typing import Dict, Tuple
from time7_gateway.models.schemas import AuthPayload
from time7_gateway.utilities.simulate_encryption import generate_response

def mock_ias_lookup(auth_payload: AuthPayload) -> Tuple[bool, str]:
    tidHex = auth_payload.tidHex # The tag_id
    messageHex = auth_payload.messageHex # The challenge message sent to the tag from the Reader
    responseHex = auth_payload.responseHex # The response given by the tag
    # TO AUTHENTICATE:
    # 1. IAS holds the correct encryption key for the tag 
    # 2. Checks if the tag gave the correct response to the challenge
    # 3. Returns True if the tag returned the correct response, else returns False

    # encryption key (fake, dummy key) = add together every digit of tidHex, caesar cipher each digit for the challenge forward by that amount --> response
    expected_response = generate_response(tidHex, messageHex)

    if expected_response == responseHex:
        return True, "Authentication Passed"
    else:
        return False, "Authentication Failed"
    
