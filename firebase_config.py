import os
import base64
import json
import tempfile
from firebase_admin import credentials, initialize_app, firestore

def get_firebase_credentials():
    encoded_key = os.environ.get("FIREBASE_KEY_BASE64")
    if not encoded_key:
        raise ValueError("Missing FIREBASE_KEY_BASE64 environment variable")

    decoded_bytes = base64.b64decode(encoded_key)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as temp_file:
        temp_file.write(decoded_bytes)
        temp_file.flush()
        return credentials.Certificate(temp_file.name)

cred = get_firebase_credentials()
firebase_app = initialize_app(cred)
db = firestore.client()
