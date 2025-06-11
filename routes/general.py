from flask import Blueprint, request, redirect, url_for, flash, session
from firebase_admin import firestore
import os
import uuid
from google.cloud import storage
from werkzeug.utils import secure_filename

general_bp = Blueprint('general', __name__)

@general_bp.route('/upload_profile_image', methods=['POST'])
def upload_profile_image():
    if 'user_id' not in session:
        flash("יש להתחבר כדי להעלות תמונה", "error")
        return redirect(url_for('auth.login'))

    file = request.files.get('profile_image')
    user_id = request.form.get('user_id')

    if not file or not user_id:
        flash("חסר קובץ או מזהה משתמש", "error")
        return redirect(request.referrer)

    # רק המשתמש עצמו (או בעתיד אדמין) יכול לעדכן
    if session['user_id'] != user_id:
        flash("אין לך הרשאה לשנות תמונה זו", "error")
        return redirect(url_for('home'))

    # שמירת הקובץ זמנית
    TEMP_UPLOAD_FOLDER = "temp_uploads"
    os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)
    filename = secure_filename(file.filename)
    temp_path = os.path.join(TEMP_UPLOAD_FOLDER, filename)
    file.save(temp_path)

    # העלאה ל־Firebase Storage
    storage_client = storage.Client.from_service_account_json("music-for-all-f5d9c-firebase-adminsdk-fbsvc-33869b4b24.json")
    bucket = storage_client.bucket("music-for-all-f5d9c.firebasestorage.app")
    blob_name = f"profile_images/{user_id}_{uuid.uuid4().hex}_{filename}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(temp_path)
    blob.make_public()

    # מחיקת הקובץ הזמני
    os.remove(temp_path)

    # עדכון URL במסד
    firestore.client().collection("users").document(user_id).update({
        "profile_image": blob.public_url
    })

    flash("📸 תמונת הפרופיל עודכנה בהצלחה!", "success")

    # הפניה אוטומטית לפרופיל הנכון
    # (מבוסס על session. אם צריך, אפשר למשוך roles מה־DB)
    roles = session.get("roles", [])
    if "teacher" in roles:
        return redirect(url_for('teachers.teacher_profile', teacher_id=user_id))
    elif "student" in roles:
        return redirect(url_for('students.user_profile'))
    else:
        return redirect(url_for('home'))
