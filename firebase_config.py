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
            error_msg = f"""
[ERROR] Missing Firebase key file: {file_path}

To fix this, you need to:
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to Settings > Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file as: {file_path}

Alternatively, you can set the FIREBASE_KEY_BASE64 environment variable with your Firebase key encoded in Base64.

For more details, see: secrets/README.md
"""
            raise FileNotFoundError(error_msg)

        print(f"[OK] Using Firebase key from file: {file_path}")
        return credentials.Certificate(file_path)

    # ✅ אם המשתנה כן קיים – נטפל בו כ-Base64
    import base64
    print("[OK] Using Firebase key from environment variable.")
    decoded_bytes = base64.b64decode(encoded_key)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".json", mode="wb") as temp_file:
        temp_file.write(decoded_bytes)
        temp_file.flush()
        return credentials.Certificate(temp_file.name)


# אתחול Firebase
cred = get_firebase_credentials()
firebase_app = initialize_app(cred)
db = firestore.client()
