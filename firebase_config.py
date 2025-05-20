# firebase_config.py

import firebase_admin
from firebase_admin import credentials, firestore


# Load credentials from the JSON file
cred = credentials.Certificate("music-for-all-f5d9c-firebase-adminsdk-fbsvc-33869b4b24.json")
firebase_admin.initialize_app(cred)

# Create Firestore client
db = firestore.client()
