from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from firebase_admin import firestore
from datetime import datetime

teachers_bp = Blueprint('teachers', __name__)

@teachers_bp.route('/teachers')
def list_teachers():
    users_ref = firestore.client().collection("users").stream()
    teachers = []
    for doc in users_ref:
        user = doc.to_dict()
        user["id"] = doc.id
        roles = user.get("roles", [])
        if "teacher" in roles:
            teachers.append(user)
    return render_template('teachers.html', teachers=teachers)

@teachers_bp.route('/teacher/<string:teacher_id>')
def teacher_profile(teacher_id):
    doc_ref = firestore.client().collection("users").document(teacher_id)
    doc = doc_ref.get()
    if not doc.exists:
        return "מורה לא נמצא", 404

    teacher = doc.to_dict()
    teacher["id"] = doc.id

    videos_ref = firestore.client().collection("videos").where("uploaded_by", "==", teacher_id).stream()
    videos = []
    for v in videos_ref:
        vid = v.to_dict()
        vid["id"] = v.id
        videos.append(vid)
    most_viewed = videos[:3]  # כרגע פשוט שלושת הראשונים

    created_at = teacher.get("created_at")
    if isinstance(created_at, str):
        from dateutil.parser import parse
        created_at = parse(created_at)

    from datetime import timezone
    days_on_site = (datetime.now(timezone.utc) - created_at).days if created_at else "לא ידוע"

    return render_template("teacher_profile.html", teacher=teacher, videos=most_viewed, days_on_site=days_on_site)

@teachers_bp.route('/edit_teacher_profile/<string:teacher_id>', methods=['GET', 'POST'])
def edit_teacher_profile(teacher_id):
    if 'user_id' not in session or session['user_id'] != teacher_id:
        flash("אין לך הרשאה לגשת לעמוד זה", "error")
        return redirect(url_for('home'))  # שים לב, ייתכן שתצטרך לעדכן ל-url נכון

    doc = firestore.client().collection("users").document(teacher_id).get()
    if not doc.exists:
        return "מורה לא נמצא", 404

    teacher = doc.to_dict()

    if request.method == 'POST':
        instruments = request.form.get('instruments')
        styles = request.form.get('styles')
        is_available_str = request.form.get('is_available')
        is_available = True if is_available_str == 'true' else False
        teaches_online_str = request.form.get('teaches_online')
        teaches_online = True if teaches_online_str == 'true' else False

        firestore.client().collection("users").document(teacher_id).update({
            "instruments": instruments,
            "styles": styles,
            "is_available": is_available,
            "teaches_online": teaches_online
        })

        flash("הפרופיל עודכן בהצלחה!", "success")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    teacher["id"] = teacher_id
    return render_template("edit_teacher_profile.html", teacher=teacher)

import os
import uuid
from google.cloud import storage
from werkzeug.utils import secure_filename

TEMP_UPLOAD_FOLDER = "temp_uploads"
os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)

@teachers_bp.route('/upload_video', methods=['POST'])
def upload_video():
    if 'video_file' not in request.files:
        flash("לא נבחר קובץ וידאו", "error")
        return redirect(request.referrer)

    file = request.files['video_file']
    if file.filename == '':
        flash("לא נבחר קובץ", "error")
        return redirect(request.referrer)

    title = request.form.get('title')
    description = request.form.get('description')
    teacher_id = request.form.get('teacher_id')

    if not all([title, description, teacher_id]):
        flash("שדות חסרים", "error")
        return redirect(request.referrer)

    filename = secure_filename(file.filename)
    temp_path = os.path.join(TEMP_UPLOAD_FOLDER, filename)
    os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)
    file.save(temp_path)

    storage_client = storage.Client.from_service_account_json("music-for-all-f5d9c-firebase-adminsdk-fbsvc-33869b4b24.json")
    bucket = storage_client.bucket("music-for-all-f5d9c.firebasestorage.app")
    blob_name = f"videos/{uuid.uuid4()}_{filename}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(temp_path)
    blob.make_public()

    os.remove(temp_path)

    firestore.client().collection("videos").add({
        "title": title,
        "description": description,
        "url": blob.public_url,
        "uploaded_by": teacher_id,
        "uploaded_at": datetime.utcnow()
    })

    flash("🎉 הסרטון עלה בהצלחה!", "success")
    return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))
