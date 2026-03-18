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


def get_gcs_storage_client():
    """
    Google Cloud Storage — אותם credentials כמו Firestore.
    בפרודקשן (Render וכו') משתמשים ב-FIREBASE_KEY_BASE64 בלי קובץ JSON על השרת;
    לכן חובה לא להסתמך רק על קבצים על הדיסק (אחרת העלאת תמונת פרופיל נכשלת ו-Firestore לא מתעדכן).
    """
    import base64
    from google.cloud import storage
    from google.oauth2 import service_account

    root = os.path.dirname(os.path.abspath(__file__))
    encoded_key = os.environ.get("FIREBASE_KEY_BASE64")
    if encoded_key:
        try:
            info = json.loads(base64.b64decode(encoded_key))
        except Exception as e:
            raise ValueError(f"FIREBASE_KEY_BASE64 לא תקין: {e}") from e
        creds = service_account.Credentials.from_service_account_info(info)
        return storage.Client(credentials=creds, project=info.get("project_id"))

    for rel in ("secrets/firebase-key.json", "music-for-all-f5d9c-firebase-adminsdk-fbsvc-33869b4b24.json"):
        path = os.path.join(root, rel)
        if os.path.exists(path):
            return storage.Client.from_service_account_json(path)

    raise FileNotFoundError(
        "לא נמצאו credentials ל-Google Storage. "
        "הגדר FIREBASE_KEY_BASE64 או secrets/firebase-key.json"
    )
