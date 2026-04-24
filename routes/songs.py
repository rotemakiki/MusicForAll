from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from firebase_admin import firestore
from datetime import datetime
import json
import re
from utils.permissions import get_roles, can_upload_songs, can_edit_any_content
from utils.song_levels import attach_song_level_fields_with_tables, parse_level_payload, ACCOMPANIMENT_LEVELS, SOLO_LEVELS


def _get_song_levels_config():
    """
    טוען טבלאות רמות מ-Firestore אם קיימות (Admin יכול לערוך),
    אחרת חוזר לברירות המחדל בקוד.
    """
    try:
        db = firestore.client()
        doc = db.collection("site_config").document("song_levels").get()
        if not doc.exists:
            return {"accompaniment_levels": ACCOMPANIMENT_LEVELS, "solo_levels": SOLO_LEVELS}
        data = doc.to_dict() or {}
        acc = data.get("accompaniment_levels") or ACCOMPANIMENT_LEVELS
        solo = data.get("solo_levels") or SOLO_LEVELS
        # Ensure shape is list-like
        if not isinstance(acc, list) or len(acc) < 11:
            acc = ACCOMPANIMENT_LEVELS
        if not isinstance(solo, list) or len(solo) < 11:
            solo = SOLO_LEVELS
        return {"accompaniment_levels": acc, "solo_levels": solo}
    except Exception:
        return {"accompaniment_levels": ACCOMPANIMENT_LEVELS, "solo_levels": SOLO_LEVELS}

songs_bp = Blueprint('songs', __name__)


def youtube_video_id(url):
    """מחלץ מזהה סרטון יוטיוב (11 תווים) מכל פורמט קישור."""
    if not url or not isinstance(url, str):
        return None
    m = re.search(r"(?:youtube\.com/embed/|youtube\.com/v/|youtu\.be/)([a-zA-Z0-9_-]{11})", url)
    if m:
        return m.group(1)
    m = re.search(r"[?&]v=([a-zA-Z0-9_-]{11})", url)
    if m:
        return m.group(1)
    return None


def youtube_watch_url(url):
    """ממיר קישור יוטיוב (embed או watch) ל-URL צפייה סטנדרטי לפתיחה בטאב חדש."""
    vid = youtube_video_id(url)
    return f"https://www.youtube.com/watch?v={vid}" if vid else (url or "")


def youtube_embed_url(url):
    """מחזיר כתובת הטמעה ל־iframe. youtube-nocookie.com עם referrerpolicy תקין."""
    vid = youtube_video_id(url)
    if vid:
        return f"https://www.youtube-nocookie.com/embed/{vid}?rel=0"
    return url or ""

# =============================================================================
# MAIN SONGS ROUTES
# =============================================================================

@songs_bp.route('/songs')
def songs():
    db = firestore.client()
    levels_cfg = _get_song_levels_config()
    accompaniment_levels = levels_cfg["accompaniment_levels"]
    song_docs = db.collection("songs").order_by("created_at", direction=firestore.Query.DESCENDING).stream()

    # For logged-in user: get my_songs IDs and watched (song_views) IDs
    user_my_song_ids = set()
    user_watched_song_ids = set()
    if "user_id" in session:
        user_id = session["user_id"]
        for doc in db.collection("my_songs").where("user_id", "==", user_id).stream():
            user_my_song_ids.add(doc.to_dict().get("song_id"))
        for doc in db.collection("song_views").where("user_id", "==", user_id).stream():
            user_watched_song_ids.add(doc.to_dict().get("song_id"))

    all_songs = []
    for doc in song_docs:
        song = doc.to_dict()
        song["id"] = doc.id
        song["created_by"] = song.get("created_by", None)

        # Serialize created_at for client-side sorting
        created_at = song.get("created_at")
        if created_at:
            song["created_at_iso"] = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)
        else:
            song["created_at_iso"] = ""

        # User-specific flags for sorting
        song["in_my_list"] = song["id"] in user_my_song_ids
        song["watched"] = song["id"] in user_watched_song_ids
        song["avg_rating"] = float(song.get("avg_rating", 0) or 0)

        # Handle genres - support both old single genre and new multiple genres
        if "genres" in song and song["genres"]:
            if isinstance(song["genres"], list):
                song["display_genres"] = song["genres"]
            else:
                # Handle case where genres might be stored as JSON string
                try:
                    song["display_genres"] = json.loads(song["genres"]) if isinstance(song["genres"], str) else [song["genres"]]
                except (json.JSONDecodeError, TypeError):
                    song["display_genres"] = [song["genres"]]
        elif "genre" in song and song["genre"]:
            # Backward compatibility - convert old single genre to list
            song["display_genres"] = [song["genre"]]
        else:
            song["display_genres"] = ["לא צוין"]

        attach_song_level_fields_with_tables(song, accompaniment_levels=accompaniment_levels)
        all_songs.append(song)
    return render_template('songs.html', songs=all_songs)

@songs_bp.route('/add_song')
def add_song_page():
    return render_template('add_song.html')

# =============================================================================
# SONG MANAGEMENT ROUTES
# =============================================================================

@songs_bp.route('/edit_song/<string:song_id>', methods=['GET', 'POST'])
def edit_song(song_id):
    if 'user_id' not in session:
        flash("יש להתחבר כדי לערוך שיר", "error")
        return redirect(url_for('auth.login'))

    doc = firestore.client().collection("songs").document(song_id).get()
    if not doc.exists:
        return "שיר לא נמצא", 404

    song = doc.to_dict()
    user_roles = get_roles(session)
    if song.get("created_by") != session["user_id"] and not can_edit_any_content(user_roles):
        flash("אין לך הרשאה לערוך שיר זה", "error")
        return redirect(url_for('songs.songs'))

    if request.method == 'POST':
        data = request.form
        updated_fields = {
            "title": data.get("title"),
            "artist": data.get("artist"),
            "key": data.get("key"),
            "key_type": data.get("key_type"),
            "secondary_key": data.get("secondary_key", ""),
            "secondary_key_type": data.get("secondary_key_type", ""),
            "time_signature": data.get("time_signature"),
            "bpm": int(data.get("bpm", 120)),
            "video_url": data.get("video_url"),
            "song_version": data.get("song_version", ""),
            "original_artist": data.get("original_artist", "")
        }
        firestore.client().collection("songs").document(song_id).update(updated_fields)
        flash("🎵 השיר עודכן בהצלחה!", "success")
        return redirect(url_for('songs.play_song', song_id=song_id))

    song["id"] = song_id

    # Handle genres for edit form - support both old and new format
    if "genres" in song and song["genres"]:
        if isinstance(song["genres"], list):
            song["genres"] = song["genres"]
        else:
            try:
                song["genres"] = json.loads(song["genres"]) if isinstance(song["genres"], str) else [song["genres"]]
            except (json.JSONDecodeError, TypeError):
                song["genres"] = [song["genres"]]
    elif "genre" in song and song["genre"]:
        # Convert old single genre to new format
        song["genres"] = [song["genre"]]
    else:
        song["genres"] = []

    # Parse chords safely
    try:
        chords_str = song.get("chords", "[]")
        if isinstance(chords_str, str):
            song["chords"] = json.loads(chords_str)
        else:
            song["chords"] = chords_str if chords_str else []
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing chords for song {song_id}: {e}")
        song["chords"] = []

    # Parse loops safely
    try:
        loops_str = song.get("loops", "[]")
        if isinstance(loops_str, str):
            song["loops"] = json.loads(loops_str)
        else:
            song["loops"] = loops_str if loops_str else []
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing loops for song {song_id}: {e}")
        song["loops"] = []

    levels_cfg = _get_song_levels_config()
    attach_song_level_fields_with_tables(song, accompaniment_levels=levels_cfg["accompaniment_levels"])

    return render_template("edit_song.html", song=song)

@songs_bp.route('/play/<string:song_id>')
def play_song(song_id):
    db = firestore.client()
    doc = db.collection("songs").document(song_id).get()
    if not doc.exists:
        return "שיר לא נמצא", 404

    # Record view for logged-in user (for "songs I watched" sort)
    if "user_id" in session:
        try:
            user_id = session["user_id"]
            # Avoid duplicate views in same session; we store one per user+song (latest view)
            q = (
                db.collection("song_views")
                .where("user_id", "==", user_id)
                .where("song_id", "==", song_id)
                .limit(1)
            )
            existing = list(q.stream())
            if not existing:
                db.collection("song_views").add({
                    "user_id": user_id,
                    "song_id": song_id,
                    "viewed_at": datetime.utcnow(),
                })
            else:
                existing[0].reference.update({"viewed_at": datetime.utcnow()})
        except Exception as e:
            print(f"Error recording song view: {e}")

    song = doc.to_dict()
    song["id"] = doc.id

    # Handle genres for display - support both old and new format
    if "genres" in song and song["genres"]:
        if isinstance(song["genres"], list):
            song["display_genres"] = song["genres"]
        else:
            try:
                song["display_genres"] = json.loads(song["genres"]) if isinstance(song["genres"], str) else [song["genres"]]
            except (json.JSONDecodeError, TypeError):
                song["display_genres"] = [song["genres"]]
    elif "genre" in song and song["genre"]:
        # Backward compatibility
        song["display_genres"] = [song["genre"]]
        song["genre"] = song["genre"]  # Keep for template compatibility
    else:
        song["display_genres"] = ["לא צוין"]
        song["genre"] = "לא צוין"  # Keep for template compatibility

    # Parse chord data
    chords_list = []
    try:
        chords_str = song.get("chords", "[]")
        if isinstance(chords_str, str):
            chords_list = json.loads(chords_str)
        else:
            chords_list = chords_str if chords_str else []
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing chords for song {song_id}: {e}")
        chords_list = []

    # Parse loops data
    loops_data = []
    try:
        loops_str = song.get("loops", "[]")
        if isinstance(loops_str, str):
            loops_data = json.loads(loops_str)
        else:
            loops_data = loops_str if loops_str else []
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing loops for song {song_id}: {e}")
        loops_data = []

    levels_cfg = _get_song_levels_config()
    attach_song_level_fields_with_tables(song, accompaniment_levels=levels_cfg["accompaniment_levels"])

    try:
        beats_per_measure = int(song["time_signature"].split("/")[0])
    except:
        beats_per_measure = 4

    can_watch_videos = "user_id" in session
    roles = get_roles(session) if "user_id" in session else []
    can_see_teacher_notes = ("teacher" in roles) or ("admin" in roles)
    video_url = song.get("video_url", "")
    tutorial_url = song.get("tutorial_video_url", "")
    # קישור לצפייה ביוטיוב (לפתיחה בטאב חדש)
    video_watch_url = youtube_watch_url(video_url) if video_url else ""
    tutorial_watch_url = youtube_watch_url(tutorial_url) if tutorial_url else ""
    # כתובת הטמעה לנגן באתר (youtube-nocookie.com – מגדילה סיכוי שהסרטון ינוגן)
    video_embed_url = youtube_embed_url(video_url) if video_url else ""
    tutorial_embed_url = youtube_embed_url(tutorial_url) if tutorial_url else ""
    # #region agent log
    try:
        vid = youtube_video_id(video_url) if video_url else None
        log_line = json.dumps({"id": "log_play_song_embed", "timestamp": int(datetime.now().timestamp() * 1000), "location": "songs.py:play_song", "message": "video embed url built", "data": {"video_url": video_url[:80] if video_url else "", "vid": vid, "video_embed_url": (video_embed_url[:80] if video_embed_url else "")}, "hypothesisId": "A"}) + "\n"
        open(r"c:\Users\rotem\Desktop\MusicForAll\.cursor\debug.log", "a", encoding="utf-8").write(log_line)
    except Exception:
        pass
    # #endregion
    # העברת כל הנתונים הנדרשים לטמפלייט המעודכן
    return render_template("play_song.html", song={
        "id": song_id,
        "title": song["title"],
        "artist": song["artist"],
        "genre": song.get("genre", ", ".join(song["display_genres"])),  # For template compatibility
        "genres": song["display_genres"],  # New field for multiple genres
        "language": song.get("language", ""),
        "key": song["key"],
        "key_type": song["key_type"],
        "secondary_key": song.get("secondary_key", ""),
        "secondary_key_type": song.get("secondary_key_type", ""),
        "accompaniment_level": song["accompaniment_level"],
        "lead_level": song["lead_level"],
        "accompaniment_level_title": song["accompaniment_level_title"],
        "accompaniment_level_description": song["accompaniment_level_description"],
        "difficulty_approved": song.get("difficulty_approved", False),
        "time_signature": song["time_signature"],
        "bpm": song["bpm"],
        "video_url": video_url,
        "tutorial_video_url": tutorial_url,
        "video_embed_url": video_embed_url,
        "tutorial_embed_url": tutorial_embed_url,
        "video_watch_url": video_watch_url,
        "tutorial_watch_url": tutorial_watch_url,
        "song_version": song.get("song_version", ""),
        "original_artist": song.get("original_artist", ""),
        "chords": chords_list,
        "loops": loops_data,
        "beats": beats_per_measure,
        "created_by": song.get("created_by", None),
        "teacher_notes": song.get("teacher_notes", song.get("notes", "")),
        "student_notes": song.get("student_notes", ""),
        "note_tags": song.get("note_tags", []),
        "easy_capo_fret": int(song.get("easy_capo_fret") or 0),
        "play_method": song.get("play_method", "boxes"),
        "tabs_text": song.get("tabs_text", ""),
        "chords_lyrics_text": song.get("chords_lyrics_text", ""),
        "lyrics_text": song.get("lyrics_text", ""),
    }, can_watch_videos=can_watch_videos, can_see_teacher_notes=can_see_teacher_notes, is_localhost=request.host.startswith("localhost") or "127.0.0.1" in request.host)


@songs_bp.route('/admin/song-levels', methods=['GET', 'POST'])
def admin_song_levels():
    """עריכת טבלאות רמות (ליווי + סולו) — לאדמין בלבד."""
    if 'user_id' not in session:
        flash("יש להתחבר כדי לגשת לעמוד זה", "error")
        return redirect(url_for('auth.login'))

    roles = get_roles(session)
    if "admin" not in (roles or []):
        flash("אין לך הרשאה לגשת לעמוד זה", "error")
        return redirect(url_for('songs.songs'))

    db = firestore.client()
    cfg = _get_song_levels_config()

    if request.method == 'POST':
        acc_json = (request.form.get("accompaniment_levels_json") or "").strip()
        solo_json = (request.form.get("solo_levels_json") or "").strip()
        try:
            acc_levels = json.loads(acc_json)
            solo_levels = json.loads(solo_json)
            if not isinstance(acc_levels, list) or len(acc_levels) < 11:
                raise ValueError("טבלת רמות ליווי חייבת להיות מערך באורך 11 (0–10).")
            if not isinstance(solo_levels, list) or len(solo_levels) < 11:
                raise ValueError("טבלת רמות סולו חייבת להיות מערך באורך 11 (0–10).")
            db.collection("site_config").document("song_levels").set({
                "accompaniment_levels": acc_levels,
                "solo_levels": solo_levels,
                "updated_at": datetime.utcnow(),
                "updated_by": session.get("user_id"),
            }, merge=True)
            flash("הטבלאות עודכנו בהצלחה", "success")
            return redirect(url_for('songs.admin_song_levels'))
        except Exception as e:
            flash(f"שגיאה בשמירת הטבלאות: {e}", "error")
            cfg = {"accompaniment_levels": ACCOMPANIMENT_LEVELS, "solo_levels": SOLO_LEVELS}

    return render_template(
        "admin_song_levels.html",
        accompaniment_levels=cfg["accompaniment_levels"],
        solo_levels=cfg["solo_levels"],
        accompaniment_levels_json=json.dumps(cfg["accompaniment_levels"], ensure_ascii=False, indent=2),
        solo_levels_json=json.dumps(cfg["solo_levels"], ensure_ascii=False, indent=2),
    )


@songs_bp.route('/api/songs/<string:song_id>/album-image', methods=['POST'])
def upload_song_album_image(song_id):
    """העלאת תמונת אלבום לשיר — היוצר או אדמין."""
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    db = firestore.client()
    doc = db.collection("songs").document(song_id).get()
    if not doc.exists:
        return jsonify({"success": False, "error": "Song not found"}), 404

    song = doc.to_dict() or {}
    roles = get_roles(session)
    if song.get("created_by") != session.get("user_id") and "admin" not in (roles or []):
        return jsonify({"success": False, "error": "Forbidden"}), 403

    if 'image_file' not in request.files:
        return jsonify({"success": False, "error": "Missing image_file"}), 400
    f = request.files['image_file']
    if not f or not f.filename:
        return jsonify({"success": False, "error": "No file selected"}), 400

    import os
    import uuid
    from werkzeug.utils import secure_filename
    from firebase_config import get_gcs_storage_client

    filename = secure_filename(f.filename)
    ext = os.path.splitext(filename)[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        return jsonify({"success": False, "error": "Unsupported file type"}), 400

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{filename}")
    f.save(temp_path)

    try:
        storage_client = get_gcs_storage_client()
        bucket = storage_client.bucket("music-for-all-f5d9c.firebasestorage.app")
        blob_name = f"song_album_images/{song_id}/{uuid.uuid4()}_{filename}"
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(temp_path)
        blob.make_public()
        public_url = blob.public_url
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass

    db.collection("songs").document(song_id).update({
        "album_image_url": public_url,
        "album_image_updated_at": datetime.utcnow(),
        "album_image_updated_by": session.get("user_id"),
    })

    return jsonify({"success": True, "album_image_url": public_url})

# Legacy chord route - redirect to player
@songs_bp.route('/chords/<string:song_id>')
def chords(song_id):
    return redirect(url_for('songs.play_song', song_id=song_id))

# =============================================================================
# CHORD EDITING ROUTES
# =============================================================================

@songs_bp.route('/add-chords')
def add_chords_page():
    return render_template('add_chords_base.html')

@songs_bp.route('/add-chords-lyrics')
def add_chords_lyrics_page():
    # return target (default back to add song)
    return_to = request.args.get("return") or "/add_song"
    return render_template('add_chords_lyrics.html', return_to=return_to)

@songs_bp.route('/add-tabs')
def add_tabs_page():
    return_to = request.args.get("return") or "/add_song"
    return render_template('add_tabs.html', return_to=return_to)

@songs_bp.route('/add-lyrics')
def add_lyrics_page():
    return_to = request.args.get("return") or "/add_song"
    return render_template('add_lyrics.html', return_to=return_to)

@songs_bp.route('/edit-chords/<string:song_id>')
def edit_chords_for_song(song_id):
    """עמוד עריכת אקורדים לשיר ספציפי"""
    if 'user_id' not in session:
        flash("יש להתחבר כדי לערוך שיר", "error")
        return redirect(url_for('auth.login'))

    doc = firestore.client().collection("songs").document(song_id).get()
    if not doc.exists:
        return "שיר לא נמצא", 404

    song = doc.to_dict()
    user_roles = get_roles(session)
    if song.get("created_by") != session["user_id"] and not can_edit_any_content(user_roles):
        flash("אין לך הרשאה לערוך שיר זה", "error")
        return redirect(url_for('songs.songs'))

    # Parse chord data
    chords_list = []
    try:
        chords_str = song.get("chords", "[]")
        if isinstance(chords_str, str):
            chords_list = json.loads(chords_str)
        else:
            chords_list = chords_str if chords_str else []
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing chords for song {song_id}: {e}")
        chords_list = []

    # Parse loops data
    loops_data = []
    try:
        loops_str = song.get("loops", "[]")
        if isinstance(loops_str, str):
            loops_data = json.loads(loops_str)
        else:
            loops_data = loops_str if loops_str else []
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing loops for song {song_id}: {e}")
        loops_data = []

    return render_template('edit_chords_song.html', song={
        "id": song_id,
        "title": song["title"],
        "artist": song["artist"],
        "chords": chords_list,
        "loops": loops_data
    })

# =============================================================================
# API ENDPOINTS - SONG MANAGEMENT
# =============================================================================

@songs_bp.route('/api/add_song', methods=['POST'])
def add_song():
    user_roles = get_roles(session)
    if not can_upload_songs(user_roles):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    required_fields = ["title", "artist", "genres", "key", "key_type", "time_signature", "bpm", "video_url", "chords"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing or empty field: {field}"}), 400

    # Validate genres - must be array
    genres_data = data.get("genres", [])
    if not isinstance(genres_data, list) or len(genres_data) == 0:
        return jsonify({"error": "יש לבחור לפחות ז'אנר אחד"}), 400

    acc = parse_level_payload(data.get("accompaniment_level"))
    lead = parse_level_payload(data.get("lead_level"))
    if acc is None or lead is None:
        return jsonify({"error": "יש לבחור רמת ליווי וסולו בין 0 ל-10"}), 400

    # Handle loops data if provided
    loops_data = data.get("loops", [])

    teacher_notes = data.get("teacher_notes", data.get("notes", ""))  # backward compatible
    student_notes = data.get("student_notes", "")
    note_tags = data.get("note_tags", [])
    easy_capo_fret = data.get("easy_capo_fret", 0)
    try:
        easy_capo_fret = int(easy_capo_fret or 0)
    except (TypeError, ValueError):
        easy_capo_fret = 0

    new_song = {
        "title": data["title"],
        "artist": data["artist"],
        "genres": genres_data,  # Store as array
        "language": data.get("language", ""),  # Optional - song language (basic for now)
        "key": data["key"],
        "key_type": data["key_type"],
        "secondary_key": data.get("secondary_key", ""),  # Optional - for songs with multiple keys
        "secondary_key_type": data.get("secondary_key_type", ""),
        "accompaniment_level": acc,
        "lead_level": lead,
        "difficulty_approved": False,
        "time_signature": data["time_signature"],
        "bpm": int(data["bpm"]),
        "video_url": data["video_url"],
        "tutorial_video_url": data.get("tutorial_video_url", ""),  # Optional field
        "chords": json.dumps(data["chords"]),
        "loops": json.dumps(loops_data),
        "song_version": data.get("song_version", ""),  # Optional field
        "original_artist": data.get("original_artist", ""),  # Optional field - for cover songs
        "notes": data.get("notes", ""),  # Optional field (legacy)
        "teacher_notes": teacher_notes,
        "student_notes": student_notes,
        "note_tags": note_tags if isinstance(note_tags, list) else [],
        "easy_capo_fret": easy_capo_fret,
        # play methods (optional)
        "play_method": data.get("play_method", "boxes"),
        "tabs_text": data.get("tabs_text", ""),
        "chords_lyrics_text": data.get("chords_lyrics_text", ""),
        "lyrics_text": data.get("lyrics_text", ""),
        "created_at": datetime.utcnow(),
        "created_by": session.get("user_id"),
    }

    song_ref = firestore.client().collection("songs").add(new_song)
    song_id = song_ref[1].id

    return jsonify({"message": "Song added successfully!", "song_id": song_id}), 201

@songs_bp.route('/api/edit_song/<string:song_id>', methods=['PUT'])
def edit_song_api(song_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    doc = firestore.client().collection("songs").document(song_id).get()
    if not doc.exists:
        return jsonify({"error": "Song not found"}), 404

    song = doc.to_dict()
    user_roles = get_roles(session)
    if song.get("created_by") != session["user_id"] and not can_edit_any_content(user_roles):
        return jsonify({"error": "Unauthorized - you can only edit your own songs"}), 403

    data = request.get_json()
    required_fields = ["title", "artist", "genres", "key", "key_type", "time_signature", "bpm", "video_url", "chords"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing or empty field: {field}"}), 400

    # Validate genres - must be array
    genres_data = data.get("genres", [])
    if not isinstance(genres_data, list) or len(genres_data) == 0:
        return jsonify({"error": "יש לבחור לפחות ז'אנר אחד"}), 400

    acc = parse_level_payload(data.get("accompaniment_level"))
    lead = parse_level_payload(data.get("lead_level"))
    if acc is None or lead is None:
        return jsonify({"error": "יש לבחור רמת ליווי וסולו בין 0 ל-10"}), 400

    # Handle loops data if provided
    loops_data = data.get("loops", [])

    teacher_notes = data.get("teacher_notes", data.get("notes", ""))
    student_notes = data.get("student_notes", "")
    note_tags = data.get("note_tags", [])
    easy_capo_fret = data.get("easy_capo_fret", 0)
    try:
        easy_capo_fret = int(easy_capo_fret or 0)
    except (TypeError, ValueError):
        easy_capo_fret = 0

    updated_fields = {
        "title": data["title"],
        "artist": data["artist"],
        "genres": genres_data,  # Store as array
        "language": data.get("language", ""),  # Optional - song language (basic for now)
        "key": data["key"],
        "key_type": data["key_type"],
        "secondary_key": data.get("secondary_key", ""),
        "secondary_key_type": data.get("secondary_key_type", ""),
        "accompaniment_level": acc,
        "lead_level": lead,
        "time_signature": data["time_signature"],
        "bpm": int(data["bpm"]),
        "video_url": data["video_url"],
        "tutorial_video_url": data.get("tutorial_video_url", ""),  # Optional field
        "chords": json.dumps(data["chords"]),
        "loops": json.dumps(loops_data),
        "song_version": data.get("song_version", ""),  # Optional field
        "original_artist": data.get("original_artist", ""),  # Optional field - for cover songs
        "notes": data.get("notes", ""),  # Optional field (legacy)
        "teacher_notes": teacher_notes,
        "student_notes": student_notes,
        "note_tags": note_tags if isinstance(note_tags, list) else [],
        "easy_capo_fret": easy_capo_fret,
        # play methods (optional)
        "play_method": data.get("play_method", "boxes"),
        "tabs_text": data.get("tabs_text", ""),
        "chords_lyrics_text": data.get("chords_lyrics_text", ""),
        "lyrics_text": data.get("lyrics_text", ""),
        "updated_at": datetime.utcnow()
    }
    firestore.client().collection("songs").document(song_id).update(updated_fields)
    return jsonify({"message": "השיר עודכן בהצלחה!"}), 200

@songs_bp.route('/api/delete_song/<string:song_id>', methods=['DELETE'])
def delete_song(song_id):
    doc_ref = firestore.client().collection("songs").document(song_id)
    song_doc = doc_ref.get()
    if not song_doc.exists:
        return jsonify({"error": "Song not found"}), 404

    song = song_doc.to_dict()
    user_roles = get_roles(session)
    if song.get("created_by") != session.get("user_id") and not can_edit_any_content(user_roles):
        return jsonify({"error": "Unauthorized"}), 403

    doc_ref.delete()
    return jsonify({"message": "Song deleted successfully!"}), 200

def _genre_display_line(song):
    """מחרוזת ז'אנר לכרטיסי שיר (API/בית)."""
    genres = song.get("genres")
    if isinstance(genres, list) and genres:
        return ", ".join(genres)
    if isinstance(genres, str):
        try:
            lj = json.loads(genres)
            return ", ".join(lj) if isinstance(lj, list) else genres
        except (json.JSONDecodeError, TypeError):
            return genres or song.get("genre") or "ללא ז'אנר"
    return song.get("genre") or "ללא ז'אנר"


def _song_card_payload(song, doc_id):
    """שדות מינימליים לכרטיס בדף הבית (בלי אקורדים כבדים)."""
    out = {
        "id": doc_id,
        "title": song.get("title") or "",
        "artist": song.get("artist") or "",
        "key": song.get("key") or "",
        "key_type": song.get("key_type") or "",
        "bpm": song.get("bpm") or 0,
        "genre": _genre_display_line(song),
    }
    return out


@songs_bp.route('/api/recent_songs')
def get_recent_songs():
    """השירים האחרונים שהועלו לאתר (לפי created_at), לא מוגבל לשבוע."""
    try:
        db = firestore.client()
        recent_songs_docs = (
            db.collection("songs")
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(24)
            .stream()
        )
        recent_songs = []
        for doc in recent_songs_docs:
            song = doc.to_dict() or {}
            recent_songs.append(_song_card_payload(song, doc.id))

        return jsonify({"songs": recent_songs, "success": True})
    except Exception as e:
        print(f"Error fetching recent songs: {e}")
        return jsonify({"songs": [], "success": False, "error": str(e)})


@songs_bp.route('/api/recently_viewed_songs')
def get_recently_viewed_songs():
    """שירים שצפית בהם לאחרונה (מחוברים: לפי song_views; אורחים יקבלו רשימה ריקה וישתמשו ב-localStorage)."""
    if "user_id" not in session:
        return jsonify({"songs": [], "success": True, "logged_in": False})

    user_id = session["user_id"]
    db = firestore.client()

    def _view_ts(data):
        v = data.get("viewed_at")
        if v is None:
            return 0.0
        try:
            if hasattr(v, "timestamp"):
                return float(v.timestamp())
        except (TypeError, ValueError, OSError):
            pass
        if isinstance(v, str):
            try:
                from dateutil.parser import parse as parse_dt

                return parse_dt(v).timestamp()
            except Exception:
                return 0.0
        return 0.0

    try:
        docs = list(db.collection("song_views").where("user_id", "==", user_id).stream())
        docs.sort(key=lambda d: _view_ts(d.to_dict() or {}), reverse=True)
        seen_ids = set()
        songs = []
        for doc in docs:
            data = doc.to_dict() or {}
            sid = data.get("song_id")
            if not sid or sid in seen_ids:
                continue
            seen_ids.add(sid)
            sdoc = db.collection("songs").document(sid).get()
            if not sdoc.exists:
                continue
            song = sdoc.to_dict() or {}
            songs.append(_song_card_payload(song, sdoc.id))
            if len(songs) >= 24:
                break

        return jsonify({"songs": songs, "success": True, "logged_in": True})
    except Exception as e:
        print(f"Error fetching recently viewed songs: {e}")
        return jsonify({"songs": [], "success": False, "logged_in": True, "error": str(e)})


@songs_bp.route('/api/songs/<string:song_id>/rate', methods=['POST'])
def rate_song(song_id):
    """API לדירוג שיר (1–5). מעדכן דירוג ממוצע בשדה avg_rating של השיר."""
    if "user_id" not in session:
        return jsonify({"success": False, "error": "יש להתחבר כדי לדרג"}), 401

    data = request.get_json() or {}
    rating = data.get("rating")
    if rating is None:
        return jsonify({"success": False, "error": "חסר דירוג"}), 400
    try:
        rating = float(rating)
        if rating < 1 or rating > 5:
            return jsonify({"success": False, "error": "דירוג חייב להיות בין 1 ל-5"}), 400
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "דירוג לא תקין"}), 400

    db = firestore.client()
    song_ref = db.collection("songs").document(song_id)
    if not song_ref.get().exists:
        return jsonify({"success": False, "error": "שיר לא נמצא"}), 404

    user_id = session["user_id"]
    ratings_ref = db.collection("song_ratings").where("user_id", "==", user_id).where("song_id", "==", song_id).limit(1).get()

    if ratings_ref:
        ratings_ref[0].reference.update({"rating": rating, "updated_at": datetime.utcnow()})
    else:
        db.collection("song_ratings").add({
            "user_id": user_id,
            "song_id": song_id,
            "rating": rating,
            "created_at": datetime.utcnow()
        })

    # Recompute avg_rating for song
    all_ratings = db.collection("song_ratings").where("song_id", "==", song_id).stream()
    ratings_list = [r.to_dict().get("rating", 0) for r in all_ratings]
    avg_rating = round(sum(ratings_list) / len(ratings_list), 1) if ratings_list else 0
    song_ref.update({"avg_rating": avg_rating})

    return jsonify({"success": True, "avg_rating": avg_rating})

# =============================================================================
# API ENDPOINTS - SONG DATA ACCESS
# =============================================================================

@songs_bp.route('/api/get_song/<string:song_id>', methods=['GET'])
def get_song_data(song_id):
    """API endpoint לטעינת נתוני שיר עבור עריכת אקורדים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    doc = firestore.client().collection("songs").document(song_id).get()
    if not doc.exists:
        return jsonify({"error": "Song not found"}), 404

    song = doc.to_dict()
    user_roles = get_roles(session)

    # בדוק הרשאות עריכה
    if song.get("created_by") != session["user_id"] and not can_edit_any_content(user_roles):
        return jsonify({"error": "Unauthorized - you can only edit your own songs"}), 403

    # Parse chords safely
    chords_data = []
    try:
        chords_str = song.get("chords", "[]")
        if isinstance(chords_str, str):
            chords_data = json.loads(chords_str)
        else:
            chords_data = chords_str if chords_str else []
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing chords for song {song_id}: {e}")
        chords_data = []

    # Parse loops safely
    loops_data = []
    try:
        loops_str = song.get("loops", "[]")
        if isinstance(loops_str, str):
            loops_data = json.loads(loops_str)
        else:
            loops_data = loops_str if loops_str else []
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing loops for song {song_id}: {e}")
        loops_data = []

    return jsonify({
        "id": song_id,
        "title": song["title"],
        "artist": song["artist"],
        "chords": chords_data,
        "loops": loops_data,
        "success": True
    }), 200

@songs_bp.route('/api/songs/<string:song_id>/complete', methods=['GET'])
def get_song_complete_data(song_id):
    """API endpoint לטעינת נתוני שיר מלאים עבור מערכת האקורדים החדשה"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        doc = firestore.client().collection("songs").document(song_id).get()
        if not doc.exists:
            return jsonify({"error": "Song not found"}), 404

        song = doc.to_dict()
        user_roles = get_roles(session)

        # בדוק הרשאות עריכה
        if song.get("created_by") != session["user_id"] and not can_edit_any_content(user_roles):
            return jsonify({"error": "Unauthorized - you can only edit your own songs"}), 403

        # Parse chords safely
        chords_data = []
        try:
            chords_str = song.get("chords", "[]")
            if isinstance(chords_str, str):
                chords_data = json.loads(chords_str)
            else:
                chords_data = chords_str if chords_str else []
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error parsing chords for song {song_id}: {e}")
            chords_data = []

        # Parse loops safely
        loops_data = []
        try:
            loops_str = song.get("loops", "[]")
            if isinstance(loops_str, str):
                loops_data = json.loads(loops_str)
            else:
                loops_data = loops_str if loops_str else []
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error parsing loops for song {song_id}: {e}")
            loops_data = []

        # Parse song structure if exists
        structure_data = []
        try:
            structure_str = song.get("song_structure", "[]")
            if isinstance(structure_str, str):
                structure_data = json.loads(structure_str)
            else:
                structure_data = structure_str if structure_str else []
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error parsing song structure for song {song_id}: {e}")
            structure_data = []

        return jsonify({
            "id": song_id,
            "title": song["title"],
            "artist": song["artist"],
            "chords": chords_data,
            "loops": loops_data,
            "structure": structure_data,
            "metadata": {
                "created_at": song.get("created_at"),
                "updated_at": song.get("updated_at"),
                "created_by": song.get("created_by")
            },
            "success": True
        }), 200

    except Exception as e:
        print(f"Error loading complete song data for {song_id}: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

# =============================================================================
# API ENDPOINTS - ADVANCED CHORD & LOOP MANAGEMENT
# =============================================================================

@songs_bp.route('/api/songs/<string:song_id>/chords-loops', methods=['PUT'])
def update_song_chords_loops(song_id):
    """API endpoint לעדכון אקורדים ולופים של שיר קיים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        doc = firestore.client().collection("songs").document(song_id).get()
        if not doc.exists:
            return jsonify({"error": "Song not found"}), 404

        song = doc.to_dict()
        user_roles = get_roles(session)

        # בדוק הרשאות עריכה
        if song.get("created_by") != session["user_id"] and not can_edit_any_content(user_roles):
            return jsonify({"error": "Unauthorized - you can only edit your own songs"}), 403

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # עדכן השדות
        updated_fields = {
            "updated_at": datetime.utcnow()
        }

        # עדכן אקורדים אם קיימים
        if "chords" in data:
            updated_fields["chords"] = json.dumps(data["chords"])

        # עדכן לופים אם קיימים
        if "loops" in data:
            updated_fields["loops"] = json.dumps(data["loops"])

        # עדכן מבנה שיר אם קיים
        if "structure" in data:
            updated_fields["song_structure"] = json.dumps(data["structure"])

        # שמור בדטאבייס
        firestore.client().collection("songs").document(song_id).update(updated_fields)

        return jsonify({
            "message": "Song chords and loops updated successfully!",
            "song_id": song_id,
            "updated_fields": list(updated_fields.keys()),
            "success": True
        }), 200

    except Exception as e:
        print(f"Error updating song chords/loops for {song_id}: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@songs_bp.route('/api/songs/new/chords-loops', methods=['POST'])
def create_song_with_chords_loops():
    """API endpoint ליצירת שיר חדש עם אקורדים ולופים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    user_roles = get_roles(session)
    if not can_upload_songs(user_roles):
        return jsonify({"error": "Unauthorized - insufficient permissions"}), 403

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # וולידציה בסיסית
        required_fields = ["title", "artist"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # יצירת השיר החדש
        acc = parse_level_payload(data.get("accompaniment_level"))
        lead = parse_level_payload(data.get("lead_level"))
        if acc is None:
            acc = 1
        if lead is None:
            lead = 0

        new_song = {
            "title": data["title"],
            "artist": data["artist"],
            "genres": data.get("genres", []),  # Support multiple genres
            "key": data.get("key", "C"),
            "key_type": data.get("key_type", "major"),
            "secondary_key": data.get("secondary_key", ""),
            "secondary_key_type": data.get("secondary_key_type", ""),
            "accompaniment_level": acc,
            "lead_level": lead,
            "difficulty_approved": False,
            "time_signature": data.get("time_signature", "4/4"),
            "bpm": int(data.get("bpm", 120)),
            "video_url": data.get("video_url", ""),
            "chords": json.dumps(data.get("chords", [])),
            "loops": json.dumps(data.get("loops", [])),
            "song_structure": json.dumps(data.get("structure", [])),
            "created_at": datetime.utcnow(),
            "created_by": session.get("user_id"),
        }

        song_ref = firestore.client().collection("songs").add(new_song)
        song_id = song_ref[1].id

        return jsonify({
            "message": "Song created successfully with chords and loops!",
            "song_id": song_id,
            "success": True
        }), 201

    except Exception as e:
        print(f"Error creating new song with chords/loops: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@songs_bp.route('/api/songs/<string:song_id>/loops', methods=['GET'])
def get_song_loops(song_id):
    """API endpoint לטעינת לופים של שיר ספציפי"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        doc = firestore.client().collection("songs").document(song_id).get()
        if not doc.exists:
            return jsonify({"error": "Song not found"}), 404

        song = doc.to_dict()
        user_roles = get_roles(session)

        # בדוק הרשאות קריאה
        if song.get("created_by") != session["user_id"] and not can_edit_any_content(user_roles):
            return jsonify({"error": "Unauthorized - you can only access your own songs"}), 403

        # Parse loops safely
        loops_data = []
        try:
            loops_str = song.get("loops", "[]")
            if isinstance(loops_str, str):
                loops_data = json.loads(loops_str)
            else:
                loops_data = loops_str if loops_str else []
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error parsing loops for song {song_id}: {e}")
            loops_data = []

        return jsonify({
            "song_id": song_id,
            "loops": loops_data,
            "count": len(loops_data),
            "success": True
        }), 200

    except Exception as e:
        print(f"Error loading loops for song {song_id}: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@songs_bp.route('/api/songs/<string:song_id>/structure', methods=['GET'])
def get_song_structure(song_id):
    """API endpoint לטעינת מבנה השיר"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        doc = firestore.client().collection("songs").document(song_id).get()
        if not doc.exists:
            return jsonify({"error": "Song not found"}), 404

        song = doc.to_dict()
        user_roles = get_roles(session)

        # בדוק הרשאות קריאה
        if song.get("created_by") != session["user_id"] and not can_edit_any_content(user_roles):
            return jsonify({"error": "Unauthorized - you can only access your own songs"}), 403

        # Parse song structure safely
        structure_data = []
        try:
            structure_str = song.get("song_structure", "[]")
            if isinstance(structure_str, str):
                structure_data = json.loads(structure_str)
            else:
                structure_data = structure_str if structure_str else []
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error parsing song structure for song {song_id}: {e}")
            structure_data = []

        return jsonify({
            "song_id": song_id,
            "structure": structure_data,
            "count": len(structure_data),
            "success": True
        }), 200

    except Exception as e:
        print(f"Error loading song structure for {song_id}: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@songs_bp.route('/api/songs/<string:song_id>/structure', methods=['PUT'])
def update_song_structure(song_id):
    """API endpoint לעדכון מבנה השיר"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        doc = firestore.client().collection("songs").document(song_id).get()
        if not doc.exists:
            return jsonify({"error": "Song not found"}), 404

        song = doc.to_dict()
        user_roles = get_roles(session)

        # בדוק הרשאות עריכה
        if song.get("created_by") != session["user_id"] and not can_edit_any_content(user_roles):
            return jsonify({"error": "Unauthorized - you can only edit your own songs"}), 403

        data = request.get_json()
        if not data or "structure" not in data:
            return jsonify({"error": "Missing structure data"}), 400

        # עדכן מבנה השיר
        updated_fields = {
            "song_structure": json.dumps(data["structure"]),
            "updated_at": datetime.utcnow()
        }

        firestore.client().collection("songs").document(song_id).update(updated_fields)

        return jsonify({
            "message": "Song structure updated successfully!",
            "song_id": song_id,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error updating song structure for {song_id}: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

# =============================================================================
# API ENDPOINTS - CHORD VALIDATION & UTILITIES
# =============================================================================

@songs_bp.route('/api/chords/validate', methods=['POST'])
def validate_chord():
    """API endpoint לולידציה של אקורד"""
    try:
        data = request.get_json()
        if not data or "chord" not in data:
            return jsonify({"error": "Missing chord data", "valid": False}), 400

        chord_name = data["chord"]

        # ולידציה בסיסית של אקורד
        if chord_name == "—":  # Empty chord
            return jsonify({"valid": True, "chord": chord_name}), 200

        # בדיקה אם האקורד מתחיל באות תקינה
        root_letters = ["A", "B", "C", "D", "E", "F", "G"]
        if not chord_name or chord_name[0] not in root_letters:
            return jsonify({"valid": False, "error": "Invalid root note"}), 200

        # בדיקה בסיסית נוספת - האקורד לא ארוך מדי
        if len(chord_name) > 10:
            return jsonify({"valid": False, "error": "Chord name too long"}), 200

        return jsonify({"valid": True, "chord": chord_name}), 200

    except Exception as e:
        print(f"Error validating chord: {e}")
        return jsonify({"error": "Internal server error", "valid": False}), 500

@songs_bp.route('/api/chords/recent', methods=['GET'])
def get_recent_chords():
    """API endpoint לטעינת אקורדים שנוספו לאחרונה"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        user_id = session['user_id']

        # כרגע נחזיר רשימה ריקה - בעתיד אפשר לשמור במסד נתונים
        # או לחלץ מהשירים של המשתמש
        recent_chords = []

        return jsonify({
            "chords": recent_chords,
            "user_id": user_id,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error loading recent chords: {e}")
        return jsonify({"error": "Internal server error", "chords": []}), 500

@songs_bp.route('/api/chords/recent', methods=['POST'])
def save_recent_chords():
    """API endpoint לשמירת אקורדים שנוספו לאחרונה"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        data = request.get_json()
        if not data or "chords" not in data:
            return jsonify({"error": "Missing chords data"}), 400

        user_id = session['user_id']
        chords = data["chords"]

        # כרגע רק נחזיר הצלחה - בעתיד אפשר לשמור במסד נתונים
        # בטבלה נפרדת של recent_chords או בפרופיל המשתמש

        return jsonify({
            "message": "Recent chords saved successfully",
            "user_id": user_id,
            "count": len(chords),
            "success": True
        }), 200

    except Exception as e:
        print(f"Error saving recent chords: {e}")
        return jsonify({"error": "Internal server error"}), 500
