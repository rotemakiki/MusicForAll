import firebase_admin
from firebase_admin import credentials, firestore
import json
from datetime import datetime

# Load credentials and initialize Firestore
cred = credentials.Certificate("music-for-all-f5d9c-firebase-adminsdk-fbsvc-33869b4b24.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Function to convert datetime fields to ISO string
def serialize_document(doc_dict):
    def fix_value(value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    return {k: fix_value(v) for k, v in doc_dict.items()}

# Export any collection by name
def export_collection(name):
    docs = db.collection(name).stream()
    return {doc.id: serialize_document(doc.to_dict()) for doc in docs}

# List the collections you want to export
collections = ["users", "songs", "videos"]  # תוכל להוסיף גם "comments", "lessons", וכו'

# Collect all data
data = {col: export_collection(col) for col in collections}

# Save to JSON file
with open("firestore_export.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ Export complete.")
