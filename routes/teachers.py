from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from firebase_admin import firestore
from datetime import datetime

teachers_bp = Blueprint('teachers', __name__)

def _has_teacher_confirmation(teacher_id: str, student_id: str) -> bool:
    doc_id = f"{teacher_id}_{student_id}"
    doc = firestore.client().collection("teacher_confirmations").document(doc_id).get()
    return bool(doc.exists)

def _teacher_song_ids(db, teacher_id: str, limit: int = 200) -> set:
    """Song IDs created by this teacher (best-effort; limited)."""
    ids = set()
    try:
        for doc in db.collection("songs").where("created_by", "==", teacher_id).limit(limit).stream():
            ids.add(doc.id)
    except Exception:
        return set()
    return ids

@teachers_bp.route('/teachers')
def list_teachers():
    # Backward-compatible: keep old URL working, but route users to the unified directory.
    return redirect(url_for("professionals.list_professionals", type="teacher"), code=302)

@teachers_bp.route('/teacher/<string:teacher_id>')
def teacher_profile(teacher_id):
    doc_ref = firestore.client().collection("users").document(teacher_id)
    doc = doc_ref.get()
    if not doc.exists:
        return "מורה לא נמצא", 404

    teacher = doc.to_dict()
    teacher["id"] = doc.id

    db = firestore.client()

    videos_ref = db.collection("videos").where("uploaded_by", "==", teacher_id).stream()
    videos = []
    for v in videos_ref:
        vid = v.to_dict()
        vid["id"] = v.id
        videos.append(vid)

    # Partition by kind: promo videos vs lesson videos
    promo_videos = [v for v in videos if v.get("kind") == "promo"]
    lesson_videos_all = [v for v in videos if v.get("kind") in (None, "", "lesson")]

    # Only "song lesson" videos are allowed in popular section:
    # must be linked to a song created by this teacher.
    teacher_song_ids = _teacher_song_ids(db, teacher_id=teacher_id, limit=300)
    lesson_videos = []
    for v in lesson_videos_all:
        sid = v.get("song_id")
        if not sid:
            continue
        if teacher_song_ids and sid not in teacher_song_ids:
            continue
        lesson_videos.append(v)

    # Sort lesson videos by views desc (fallback 0), then by upload time desc
    def _video_sort_key(v):
        views = v.get("views") or 0
        uploaded_at = v.get("uploaded_at") or v.get("created_at") or ""
        return (views, uploaded_at)

    lesson_videos.sort(key=_video_sort_key, reverse=True)
    most_viewed = lesson_videos[:3]

    # Testimonials (only confirmed students can add)
    viewer_id = session.get("user_id")
    viewer_roles = session.get("roles") or []
    is_confirmed_student = False
    if viewer_id and viewer_id != teacher_id:
        if "admin" in viewer_roles:
            is_confirmed_student = True
        else:
            is_confirmed_student = _has_teacher_confirmation(teacher_id, viewer_id)

    testimonials = []
    try:
        tdocs = list(db.collection("teacher_testimonials").where("teacher_id", "==", teacher_id).stream())
        for tdoc in tdocs:
            t = tdoc.to_dict() or {}
            t["id"] = tdoc.id
            testimonials.append(t)
        testimonials.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    except Exception:
        testimonials = []

    created_at = teacher.get("created_at")
    if isinstance(created_at, str):
        from dateutil.parser import parse
        created_at = parse(created_at)

    from datetime import timezone
    days_on_site = (datetime.now(timezone.utc) - created_at).days if created_at else "לא ידוע"

    return render_template(
        "teacher_profile.html",
        teacher=teacher,
        promo_videos=promo_videos[:3],
        videos=most_viewed,
        testimonials=testimonials[:20],
        can_add_testimonial=bool(is_confirmed_student),
        is_confirmed_student=bool(is_confirmed_student),
        days_on_site=days_on_site,
    )


@teachers_bp.route('/musician/<string:musician_id>')
def musician_profile(musician_id):
    """פרופיל מוסיקאי (אמן) - שירים והופעות."""
    doc_ref = firestore.client().collection("users").document(musician_id)
    doc = doc_ref.get()
    if not doc.exists:
        return "מוסיקאי לא נמצא", 404

    musician = doc.to_dict()
    musician["id"] = doc.id
    roles = musician.get("roles", [])
    if "musician" not in roles and "teacher" not in roles:
        return "משתמש זה אינו מוסיקאי או מורה", 404

    # שירים שהמוסיקאי יצר (ללא order_by כדי לא לדרוש אינדקס)
    songs_ref = firestore.client().collection("songs").where("created_by", "==", musician_id).limit(100).stream()
    songs = []
    for s in songs_ref:
        data = s.to_dict()
        data["id"] = s.id
        if data.get("genres"):
            data["display_genres"] = data["genres"] if isinstance(data["genres"], list) else [data["genres"]]
        else:
            data["display_genres"] = [data.get("genre", "לא צוין")]
        songs.append(data)
    songs.sort(key=lambda x: x.get("created_at") or "", reverse=True)

    created_at = musician.get("created_at")
    if isinstance(created_at, str):
        try:
            from dateutil.parser import parse
            created_at = parse(created_at)
        except Exception:
            created_at = None
    from datetime import timezone
    days_on_site = (datetime.now(timezone.utc) - created_at).days if created_at else 0

    return render_template("musician_profile.html", musician=musician, songs=songs, days_on_site=days_on_site)


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
        language = request.form.get('language')
        location = request.form.get('location')
        is_available_str = request.form.get('is_available')
        is_available = True if is_available_str == 'true' else False
        teaches_online_str = request.form.get('teaches_online')
        teaches_online = True if teaches_online_str == 'true' else False

        firestore.client().collection("users").document(teacher_id).update({
            "instruments": instruments,
            "styles": styles,
            "language": language,
            "location": location,
            "is_available": is_available,
            "teaches_online": teaches_online
        })

        flash("הפרופיל עודכן בהצלחה!", "success")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    teacher["id"] = teacher_id
    return render_template("edit_teacher_profile.html", teacher=teacher)

import os
import uuid
from firebase_config import get_gcs_storage_client
from werkzeug.utils import secure_filename

TEMP_UPLOAD_FOLDER = "temp_uploads"
os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)

@teachers_bp.route('/upload_video', methods=['POST'])
def upload_video():
    # Only the teacher can upload to their profile
    if 'user_id' not in session:
        flash("יש להתחבר כדי להעלות וידאו", "error")
        return redirect(request.referrer)

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
    kind = (request.form.get('kind') or "lesson").strip().lower()

    if not all([title, description, teacher_id]):
        flash("שדות חסרים", "error")
        return redirect(request.referrer)

    if session.get('user_id') != teacher_id:
        flash("אין לך הרשאה להעלות וידאו למורה אחר", "error")
        return redirect(request.referrer)

    if kind not in ("lesson", "promo"):
        kind = "lesson"

    if kind == "promo":
        existing_promos = list(
            firestore.client()
            .collection("videos")
            .where("uploaded_by", "==", teacher_id)
            .where("kind", "==", "promo")
            .stream()
        )
        if len(existing_promos) >= 3:
            flash("אפשר להעלות עד 3 סרטוני תדמית בלבד", "error")
            return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    filename = secure_filename(file.filename)
    temp_path = os.path.join(TEMP_UPLOAD_FOLDER, filename)
    os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)
    file.save(temp_path)

    storage_client = get_gcs_storage_client()
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
        "uploaded_at": datetime.utcnow(),
        "kind": kind,
        "views": 0,
        "watch_seconds": 0,
    })

    flash("🎉 הסרטון עלה בהצלחה!", "success")
    return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))


@teachers_bp.route('/teacher/<string:teacher_id>/confirm', methods=['POST'])
def confirm_teacher(teacher_id):
    if 'user_id' not in session:
        flash("יש להתחבר כדי לאשר מורה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    roles = session.get("roles") or []
    if "student" not in roles and "admin" not in roles:
        flash("רק תלמיד יכול לאשר מורה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    student_id = session.get('user_id')
    doc_id = f"{teacher_id}_{student_id}"
    firestore.client().collection("teacher_confirmations").document(doc_id).set({
        "teacher_id": teacher_id,
        "student_id": student_id,
        "created_at": datetime.utcnow(),
    }, merge=True)

    flash("המורה אושר בהצלחה. עכשיו אפשר לכתוב המלצה.", "success")
    return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))


@teachers_bp.route('/teacher/<string:teacher_id>/testimonial', methods=['POST'])
def add_testimonial(teacher_id):
    if 'user_id' not in session:
        flash("יש להתחבר כדי לכתוב המלצה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    roles = session.get("roles") or []
    if "student" not in roles and "admin" not in roles:
        flash("רק תלמיד יכול לכתוב המלצה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    student_id = session.get('user_id')
    if not _has_teacher_confirmation(teacher_id, student_id) and "admin" not in roles:
        flash("רק תלמיד שאישר את המורה יכול לכתוב המלצה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    text = (request.form.get("text") or "").strip()
    if len(text) < 10:
        flash("המלצה קצרה מדי (מינימום 10 תווים)", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    firestore.client().collection("teacher_testimonials").add({
        "teacher_id": teacher_id,
        "student_id": student_id,
        "student_name": session.get("username"),
        "text": text,
        "created_at": datetime.utcnow(),
    })

    flash("תודה! ההמלצה נוספה.", "success")
    return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

@teachers_bp.route('/teacher/<string:teacher_id>/testimonial-video', methods=['POST'])
def add_testimonial_video(teacher_id):
    """Upload a testimonial video (confirmed students only)."""
    if 'user_id' not in session:
        flash("יש להתחבר כדי להעלות סרטון המלצה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    roles = session.get("roles") or []
    if "student" not in roles and "admin" not in roles:
        flash("רק תלמיד יכול להעלות סרטון המלצה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    student_id = session.get('user_id')
    if not _has_teacher_confirmation(teacher_id, student_id) and "admin" not in roles:
        flash("רק תלמיד שאישר את המורה יכול להעלות סרטון המלצה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    if 'video_file' not in request.files:
        flash("לא נבחר קובץ וידאו", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    file = request.files['video_file']
    if not file or not file.filename:
        flash("לא נבחר קובץ", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    title = (request.form.get('title') or "").strip()
    text = (request.form.get('text') or "").strip()
    if len(title) < 2:
        flash("חסרה כותרת לסרטון ההמלצה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    import os
    import uuid
    from firebase_config import get_gcs_storage_client
    from werkzeug.utils import secure_filename

    filename = secure_filename(file.filename)
    temp_dir = TEMP_UPLOAD_FOLDER
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{filename}")
    file.save(temp_path)

    try:
        storage_client = get_gcs_storage_client()
        bucket = storage_client.bucket("music-for-all-f5d9c.firebasestorage.app")
        blob_name = f"testimonials/{teacher_id}/{uuid.uuid4()}_{filename}"
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(temp_path)
        blob.make_public()
        public_url = blob.public_url
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass

    firestore.client().collection("teacher_testimonials").add({
        "teacher_id": teacher_id,
        "student_id": student_id,
        "student_name": session.get("username"),
        "title": title,
        "text": text,
        "video_url": public_url,
        "created_at": datetime.utcnow(),
    })

    flash("🎥 סרטון ההמלצה עלה בהצלחה!", "success")
    return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))


@teachers_bp.route('/teacher/<string:teacher_id>/payments')
def teacher_payments(teacher_id):
    # Private: teacher can view only their own dashboard (admin allowed).
    if 'user_id' not in session:
        flash("יש להתחבר כדי לצפות בדאשבורד תשלומים", "error")
        return redirect(url_for('auth.login'))

    roles = session.get("roles") or []
    if session.get("user_id") != teacher_id and "admin" not in roles:
        flash("אין לך הרשאה לצפות בדאשבורד זה", "error")
        return redirect(url_for('teachers.teacher_profile', teacher_id=teacher_id))

    videos_ref = firestore.client().collection("videos").where("uploaded_by", "==", teacher_id).stream()
    videos = []
    total_views = 0
    total_watch_seconds = 0
    for v in videos_ref:
        data = v.to_dict()
        if data.get("kind") == "promo":
            continue
        views = int(data.get("views") or 0)
        watch_seconds = int(data.get("watch_seconds") or 0)
        total_views += views
        total_watch_seconds += watch_seconds
        videos.append({**data, "id": v.id, "views": views, "watch_seconds": watch_seconds})

    watch_minutes = total_watch_seconds / 60.0
    views_score = total_views
    quality_score = watch_minutes
    total_score = 0.5 * views_score + 0.5 * quality_score

    return render_template(
        "teacher_payments.html",
        teacher_id=teacher_id,
        total_views=total_views,
        total_watch_minutes=round(watch_minutes, 1),
        views_score=round(views_score, 1),
        quality_score=round(quality_score, 1),
        total_score=round(total_score, 1),
        videos=sorted(videos, key=lambda x: (x.get("views", 0), x.get("watch_seconds", 0)), reverse=True)[:20],
    )
