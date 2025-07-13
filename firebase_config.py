# firebase_config.py

import firebase_admin
from firebase_admin import credentials, firestore


# Load credentials from the JSON file
cred = credentials.Certificate("secrets/firebase-key.json")
firebase_admin.initialize_app(cred)

# Create Firestore client
db = firestore.client()
