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
    if 'user_id' in session:
        return render_template('home_user.html')
    else:
        return render_template('home_guest.html')


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
            "roles": [role],
            "password": hashed_password,
            "created_at": datetime.utcnow(),
            "is_logged_in": False,
            "profile_image": "",  # יתעדכן לאחר העלאה

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

        # בדיקה אם המשתמש כבר מחובר ממקום אחר
        if user.get('is_logged_in'):
            flash("המשתמש כבר מחובר ממכשיר אחר!", "error")
            return redirect(url_for('routes.login'))

        # בדיקת סיסמה
        if not check_password_hash(user['password'], password):
            flash("Invalid email or password!", "error")
            return redirect(url_for('routes.login'))

        # התחברות מוצלחת - שמירה ב-session
        session['user_id'] = user_doc.id
        session['username'] = user['username']
        session['roles'] = user['roles']
        session['profile_image'] = user.get('profile_image', '')

        # עדכון במסד: המשתמש מחובר
        db.collection("users").document(user_doc.id).update({"is_logged_in": True})

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
        song["created_by"] = song.get("created_by", None)  # הוספה חשובה!
        all_songs.append(song)

    return render_template('songs.html', songs=all_songs)


@routes.route('/api/add_song', methods=['POST'])
def add_song():
    # הרשאה: רק מורה או מנהל
    user_roles = session.get("roles", [])
    if not ("teacher" in user_roles or "admin" in user_roles):
        return jsonify({"error": "Unauthorized"}), 403

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
        "difficulty": data["difficulty"],                 # נוספה רמת קושי
        "difficulty_approved": False,                     # מסומן תמיד כלא מאושר
        "time_signature": data["time_signature"],
        "bpm": int(data["bpm"]),
        "video_url": data["video_url"],
        "chords": json.dumps(data["chords"]),
        "created_at": datetime.utcnow(),
        "created_by": session.get("user_id"),
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
    song_doc = doc_ref.get()
    if not song_doc.exists:
        return jsonify({"error": "Song not found"}), 404

    song = song_doc.to_dict()
    user_roles = session.get("roles", [])
    if song.get("created_by") != session.get("user_id") and "admin" not in user_roles:
        return jsonify({"error": "Unauthorized"}), 403

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
    # נמשוך את כל המשתמשים
    users_ref = db.collection("users").stream()

    teachers = []
    for doc in users_ref:
        user = doc.to_dict()
        user["id"] = doc.id
        roles = user.get("roles", [])
        if "teacher" in roles:
            teachers.append(user)

    return render_template('teachers.html', teachers=teachers)

@routes.route('/edit_teacher_profile/<string:teacher_id>', methods=['GET', 'POST'])
def edit_teacher_profile(teacher_id):
    if 'user_id' not in session or session['user_id'] != teacher_id:
        flash("אין לך הרשאה לגשת לעמוד זה", "error")
        return redirect(url_for('routes.home'))

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

@routes.route('/logout')
def logout():
    user_id = session.get('user_id')
    if user_id:
        # Update is_logged_in to False in Firestore
        db.collection("users").document(user_id).update({"is_logged_in": False})
    session.clear()
    flash("התנתקת מהמערכת", "success")
    return redirect(url_for('routes.home'))


@routes.route('/profile')
def user_profile():
    if 'user_id' not in session:
        flash("יש להתחבר כדי לגשת לפרופיל", "error")
        return redirect(url_for('routes.login'))

    user_id = session['user_id']
    user_doc = db.collection("users").document(user_id).get()

    if not user_doc.exists:
        return "המשתמש לא נמצא", 404

    user = user_doc.to_dict()
    user["id"] = user_id

    roles = user.get("roles", [])
    if "teacher" in roles:
        return redirect(url_for('routes.teacher_profile', teacher_id=user_id))
    elif "student" in roles:
        return render_template("student_profile.html", student=user)
    elif "admin" in roles:
        # אפשר להוסיף עמוד ניהול בעתיד, כרגע סתם טקסט
        return "Admin profile (להרחיב בהמשך)"
    else:
        return "תפקיד לא מוכר", 400


@routes.route('/api/students/<string:student_id>', methods=['GET'])
def get_student_profile(student_id):
    doc = db.collection("users").document(student_id).get()
    if not doc.exists:
        return jsonify({"error": "Student not found"}), 404

    user = doc.to_dict()
    roles = user.get("roles", [])
    if "student" not in roles:
        return jsonify({"error": "User is not a student"}), 400

    result = {
        "id": student_id,
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "interests": user.get("interests", ""),
        "style": user.get("style", ""),
        "future_learning": user.get("future_learning", "")
    }
    return jsonify(result), 200


@routes.route('/api/students/<string:student_id>', methods=['PATCH'])
def update_student_profile(student_id):
    if 'user_id' not in session or session['user_id'] != student_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()

    updated_fields = {
        "username": data.get("username", ""),
        "interests": data.get("interests", ""),
        "style": data.get("style", ""),
        "future_learning": data.get("future_learning", "")
    }

    db.collection("users").document(student_id).update(updated_fields)
    return jsonify({"message": "Profile updated successfully"}), 200

@routes.route('/edit_song/<string:song_id>', methods=['GET', 'POST'])
def edit_song(song_id):
    if 'user_id' not in session:
        flash("יש להתחבר כדי לערוך שיר", "error")
        return redirect(url_for('routes.login'))

    doc = db.collection("songs").document(song_id).get()
    if not doc.exists:
        return "שיר לא נמצא", 404

    song = doc.to_dict()

    user_roles = session.get("roles", [])
    if song.get("created_by") != session["user_id"] and "admin" not in user_roles:
        flash("אין לך הרשאה לערוך שיר זה", "error")
        return redirect(url_for('routes.songs'))


    if request.method == 'POST':
        data = request.form
        updated_fields = {
            "title": data.get("title"),
            "artist": data.get("artist"),
            "key": data.get("key"),
            "key_type": data.get("key_type"),
            "time_signature": data.get("time_signature"),
            "bpm": int(data.get("bpm", 120)),
            "video_url": data.get("video_url")
        }
        db.collection("songs").document(song_id).update(updated_fields)
        flash("🎵 השיר עודכן בהצלחה!", "success")
        return redirect(url_for('routes.chords', song_id=song_id))

    song["id"] = song_id
    return render_template("edit_song.html", song=song)

@routes.route('/tutorials')
def tutorials():
    return render_template('tutorials.html')

@routes.route('/upload_profile_image', methods=['POST'])
def upload_profile_image():
    if 'user_id' not in session:
        flash("יש להתחבר כדי להעלות תמונה", "error")
        return redirect(url_for('routes.login'))

    file = request.files.get('profile_image')
    user_id = request.form.get('user_id')

    if not file or not user_id:
        flash("חסר קובץ או מזהה משתמש", "error")
        return redirect(request.referrer)

    if session['user_id'] != user_id:
        flash("אין לך הרשאה לשנות תמונה זו", "error")
        return redirect(url_for('routes.home'))

    # שמירת קובץ זמנית
    filename = secure_filename(file.filename)
    temp_path = os.path.join(TEMP_UPLOAD_FOLDER, filename)
    os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)
    file.save(temp_path)

    # העלאה ל-Firebase
    storage_client = storage.Client.from_service_account_json("music-for-all-f5d9c-firebase-adminsdk-fbsvc-33869b4b24.json")
    bucket = storage_client.bucket("music-for-all-f5d9c.firebasestorage.app")
    blob_name = f"profile_images/{user_id}_{uuid.uuid4().hex}_{filename}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(temp_path)
    blob.make_public()

    # ניקוי
    os.remove(temp_path)

    # עדכון במסד
    db.collection("users").document(user_id).update({
        "profile_image": blob.public_url
    })

    flash("📸 תמונת הפרופיל עודכנה בהצלחה!", "success")

    # הפנייה חכמה
    if "teacher" in session.get("roles", []):
        return redirect(url_for('routes.teacher_profile', teacher_id=user_id))
    else:
        return redirect(url_for('routes.user_profile'))

from flask import request
from datetime import datetime

@routes.route('/info', methods=['GET', 'POST'])
def info_page():
    # שליפת כל הפוסטים מ־Firestore (מסודרים מהחדש לישן)
    print("SESSION:", dict(session))
    posts_ref = db.collection("info_posts").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    posts = []
    for doc in posts_ref:
        post = doc.to_dict()
        # שמים מחבר (אם אפשר) וגם תאריך בפורמט datetime
        author_id = post.get("created_by")
        author_name = "מנהל"
        if author_id:
            user_doc = db.collection("users").document(author_id).get()
            if user_doc.exists:
                user = user_doc.to_dict()
                author_name = user.get("username", "מנהל")
        # המרה ל־datetime אם צריך
        created_at = post.get("created_at")
        if isinstance(created_at, str):
            from dateutil.parser import parse
            created_at = parse(created_at)
        post["author_name"] = author_name
        post["created_at"] = created_at
        posts.append(post)

    # טיפול בפרסום פוסט חדש (רק למנהל)
    roles = session.get("roles", [])
    if request.method == 'POST' and "admin" in roles:
        content = request.form.get("content", "").strip()
        if content:
            db.collection("info_posts").add({
                "content": content,
                "created_at": datetime.utcnow(),
                "created_by": session.get("user_id")
            })
            flash("הפוסט פורסם בהצלחה!", "success")
            return redirect(url_for('routes.info_page'))

    return render_template("info.html", posts=posts)
