from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models.models import db, User, Video, Song
from datetime import datetime
from flask import session
import json  # נוסיף כדי לפרש אקורדים בפורמט JSON
from firebase_admin import firestore
from datetime import timezone


routes = Blueprint('routes', __name__)


@routes.route('/')
def home():
    return render_template('home.html')

from firebase_config import db

@routes.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        role = request.form['role']

        # בדיקה אם קיים אימייל
        existing_users = db.collection("users").where("email", "==", email).get()
        if existing_users:
            flash("Email is already registered!", "error")
            return redirect(url_for('routes.register'))

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

        new_user = {
            "username": username,
            "email": email,
            "role": role,
            "password": hashed_password,
            "created_at": datetime.utcnow()
        }

        # תוספת למורה: השדות האלו ימולאו רק מאוחר יותר בעריכת פרופיל
        if role == 'teacher':
            new_user["instruments"] = ""
            new_user["styles"] = ""
            new_user["is_available"] = False

        # יצירת משתמש במסד
        db.collection("users").add(new_user)

        if role == 'teacher':
            # נקבל את ה-ID של המורה החדש
            doc_ref = db.collection("users").where("email", "==", email).get()[0]
            return redirect(url_for('routes.edit_teacher_profile', teacher_id=doc_ref.id))
        #dskdaskdas


        flash("Registration successful! Please log in.", "success")
        return redirect(url_for('routes.login'))

    return render_template('register.html')


@routes.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        # שליפת משתמש לפי אימייל
        user_query = db.collection("users").where("email", "==", email).get()

        if not user_query:
            flash("Invalid email or password!", "error")
            return redirect(url_for('routes.login'))

        user_doc = user_query[0]
        user = user_doc.to_dict()

        # בדיקת סיסמה
        if not check_password_hash(user['password'], password):
            flash("Invalid email or password!", "error")
            return redirect(url_for('routes.login'))

        # התחברות מוצלחת
        flash("Login successful!", "success")
        return redirect(url_for('routes.home'))

    return render_template('login.html')


@routes.route('/videos')
def videos():
    return render_template('videos.html')

@routes.route('/api/videos')
def api_videos():
    videos = Video.query.all()

    if not videos:
        print("No videos found in database!")  # Debugging
        return jsonify([])

    videos_list = [{"title": v.title, "description": v.description, "url": v.url} for v in videos]
    return jsonify(videos_list)

@routes.route('/chords/<string:song_id>')
def chords(song_id):
    doc = db.collection("songs").document(song_id).get()

    if not doc.exists:
        return "שיר לא נמצא", 404

    song = doc.to_dict()
    song["id"] = doc.id

    return render_template('chords.html', song=song)


@routes.route('/songs')
def songs():
    song_docs = db.collection("songs").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    all_songs = []

    for doc in song_docs:
        song = doc.to_dict()
        song["id"] = doc.id
        all_songs.append(song)

    return render_template('songs.html', songs=all_songs)


@routes.route('/api/add_song', methods=['POST'])
def add_song():
    data = request.get_json()

    required_fields = ["title", "artist", "key", "key_type", "time_signature", "bpm", "video_url", "chords"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing or empty field: {field}"}), 400

    new_song = {
        "title": data["title"],
        "artist": data["artist"],
        "key": data["key"],
        "key_type": data["key_type"],
        "time_signature": data["time_signature"],
        "bpm": int(data["bpm"]),
        "video_url": data["video_url"],
        "chords": json.dumps(data["chords"]),  # הפתרון לשגיאה
        "created_at": datetime.utcnow()
    }


    # שמירה ב-Firestore
    song_ref = db.collection("songs").add(new_song)
    song_id = song_ref[1].id

    return jsonify({"message": "Song added successfully!", "song_id": song_id}), 201


@routes.route('/add_song')
def add_song_page():
    return render_template('add_song.html')

@routes.route('/play/<string:song_id>')
def play_song(song_id):
    doc = db.collection("songs").document(song_id).get()

    if not doc.exists:
        return "שיר לא נמצא", 404

    song = doc.to_dict()
    song["id"] = doc.id

    chords_list = json.loads(song["chords"])  # Decode JSON string back to list

    try:
        beats_per_measure = int(song["time_signature"].split("/")[0])
    except:
        beats_per_measure = 4

    return render_template("play_song.html", song={
        "id": song_id,
        "title": song["title"],
        "bpm": song["bpm"],
        "chords": chords_list,
        "beats": beats_per_measure
    })

@routes.route('/add-chords')
def add_chords_page():
    return render_template('add_chords.html')

@routes.route('/api/delete_song/<string:song_id>', methods=['DELETE'])
def delete_song(song_id):
    doc_ref = db.collection("songs").document(song_id)
    if not doc_ref.get().exists:
        return jsonify({"error": "Song not found"}), 404

    doc_ref.delete()
    return jsonify({"message": "Song deleted successfully!"}), 200


@routes.route('/teacher/<string:teacher_id>')
def teacher_profile(teacher_id):
    # שליפת מסמך מורה לפי ID
    doc_ref = db.collection("users").document(teacher_id)
    doc = doc_ref.get()

    if not doc.exists:
        return "מורה לא נמצא", 404

    teacher = doc.to_dict()
    teacher["id"] = doc.id

    # שליפת סרטונים שהמורה העלה
    videos_ref = db.collection("videos").where("uploaded_by", "==", teacher_id).stream()
    videos = []
    for v in videos_ref:
        vid = v.to_dict()
        vid["id"] = v.id
        videos.append(vid)

    most_viewed = videos[:3]  # כרגע פשוט שלושת הראשונים

    # חישוב ותק בימים
    created_at = teacher.get("created_at")
    if isinstance(created_at, str):
        from dateutil.parser import parse
        created_at = parse(created_at)

    days_on_site = (datetime.now(timezone.utc) - created_at).days if created_at else "לא ידוע"

    return render_template("teacher_profile.html", teacher=teacher, videos=most_viewed, days_on_site=days_on_site)


from firebase_config import db

@routes.route('/teachers')
def list_teachers():
    # Fetch all documents from 'users' collection where role == 'teacher'
    teachers_ref = db.collection("users").where("role", "==", "teacher").stream()

    teachers = []
    for doc in teachers_ref:
        teacher = doc.to_dict()
        teacher["id"] = doc.id
        teachers.append(teacher)

    return render_template('teachers.html', teachers=teachers)



@routes.route('/edit_teacher_profile/<string:teacher_id>', methods=['GET', 'POST'])
def edit_teacher_profile(teacher_id):
    doc = db.collection("users").document(teacher_id).get()
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


        db.collection("users").document(teacher_id).update({
            "instruments": instruments,
            "styles": styles,
            "is_available": is_available,
            "teaches_online": teaches_online
        })

        flash("הפרופיל עודכן בהצלחה!", "success")
        return redirect(url_for('routes.teacher_profile', teacher_id=teacher_id))

    teacher["id"] = teacher_id
    return render_template("edit_teacher_profile.html", teacher=teacher)

import os
import uuid
from google.cloud import storage
from werkzeug.utils import secure_filename

# נתיב לתיקייה זמנית לשמירת קובץ לפני העלאה
TEMP_UPLOAD_FOLDER = "temp_uploads"
os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)

@routes.route('/upload_video', methods=['POST'])
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

    # שמירת הקובץ זמנית
    filename = secure_filename(file.filename)
    temp_path = os.path.join("temp_uploads", filename)
    os.makedirs("temp_uploads", exist_ok=True)
    file.save(temp_path)

    storage_client = storage.Client.from_service_account_json("music-for-all-f5d9c-firebase-adminsdk-fbsvc-33869b4b24.json")
    bucket = storage_client.bucket("music-for-all-f5d9c.firebasestorage.app")
    blob_name = f"videos/{uuid.uuid4()}_{filename}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(temp_path)
    blob.make_public()

    # מחיקת קובץ זמני
    os.remove(temp_path)

    # שמירה במסד
    db.collection("videos").add({
        "title": title,
        "description": description,
        "url": blob.public_url,
        "uploaded_by": teacher_id,
        "uploaded_at": datetime.utcnow()
    })

    flash("🎉 הסרטון עלה בהצלחה!", "success")
    return redirect(url_for('routes.teacher_profile', teacher_id=teacher_id))
