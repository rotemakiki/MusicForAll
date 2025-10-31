import os
import json
import tempfile
from firebase_admin import credentials, initialize_app, firestore

def get_firebase_credentials():
    """
    Loads Firebase service account credentials.
    Priority:
    1. FIREBASE_KEY_BASE64 environment variable (if exists)
    2. JSON file located at secrets/firebase-key.json
    """

    encoded_key = os.environ.get("FIREBASE_KEY_BASE64")

    # ✅ אם המשתנה לא מוגדר – נשתמש בקובץ JSON המקומי
    if not encoded_key:
        file_path = os.path.join(os.path.dirname(__file__), "secrets", "firebase-key.json")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Missing Firebase key file: {file_path}")

        print(f"🔑 Using Firebase key from file: {file_path}")
        return credentials.Certificate(file_path)

    # ✅ אם המשתנה כן קיים – נטפל בו כ-Base64
    import base64
    print("🔑 Using Firebase key from environment variable.")
    decoded_bytes = base64.b64decode(encoded_key)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".json", mode="wb") as temp_file:
        temp_file.write(decoded_bytes)
        temp_file.flush()
        return credentials.Certificate(temp_file.name)


# אתחול Firebase
cred = get_firebase_credentials()
firebase_app = initialize_app(cred)
db = firestore.client()
