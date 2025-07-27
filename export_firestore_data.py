import firebase_admin
from firebase_admin import credentials, firestore
import json
from datetime import datetime
import os
import base64

# טען את מפתח ה-Firebase מהסביבה (Base64)
encoded_key = os.environ.get("FIREBASE_KEY_BASE64")
if not encoded_key:
    raise ValueError("Missing FIREBASE_KEY_BASE64 environment variable")

# המר את המפתח לקובץ זמני
temp_path = "secrets/temp_key.json"
decoded_key = base64.b64decode(encoded_key)
os.makedirs("secrets", exist_ok=True)
with open(temp_path, "wb") as f:
    f.write(decoded_key)

# אתחול Firebase עם הקובץ הזמני
cred = credentials.Certificate(temp_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

# פונקציה להמרת תאריכים ל-ISO
def serialize_document(doc_dict):
    def fix_value(value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value
    return {k: fix_value(v) for k, v in doc_dict.items()}

# ייצוא אוסף לפי שם
def export_collection(name):
    docs = db.collection(name).stream()
    return {doc.id: serialize_document(doc.to_dict()) for doc in docs}

# רשימת הקולקציות לייצוא
collections = ["users", "songs", "videos"]  # ניתן להוסיף נוספים

# איסוף כל המידע
data = {col: export_collection(col) for col in collections}

# שמירה לקובץ JSON
with open("firestore_export.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ Export complete.")
