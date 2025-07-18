from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from firebase_admin import firestore
from datetime import datetime
import json

songs_bp = Blueprint('songs', __name__)

@songs_bp.route('/songs')
def songs():
    song_docs = firestore.client().collection("songs").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    all_songs = []
    for doc in song_docs:
        song = doc.to_dict()
        song["id"] = doc.id
        song["created_by"] = song.get("created_by", None)
        all_songs.append(song)
    return render_template('songs.html', songs=all_songs)

@songs_bp.route('/api/add_song', methods=['POST'])
def add_song():
    user_roles = session.get("roles", [])
    if not ("teacher" in user_roles or "admin" in user_roles):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    required_fields = ["title", "artist" , "genre", "key", "key_type", "time_signature", "bpm", "video_url", "chords"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing or empty field: {field}"}), 400

    # Handle loops data if provided
    loops_data = data.get("loops", [])

    new_song = {
        "title": data["title"],
        "artist": data["artist"],
        "genre": data["genre"],
        "key": data["key"],
        "key_type": data["key_type"],
        "difficulty": data["difficulty"],
        "difficulty_approved": False,
        "time_signature": data["time_signature"],
        "bpm": int(data["bpm"]),
        "video_url": data["video_url"],
        "chords": json.dumps(data["chords"]),
        "loops": json.dumps(loops_data),
        "created_at": datetime.utcnow(),
        "created_by": session.get("user_id"),
    }

    song_ref = firestore.client().collection("songs").add(new_song)
    song_id = song_ref[1].id

    return jsonify({"message": "Song added successfully!", "song_id": song_id}), 201

@songs_bp.route('/add_song')
def add_song_page():
    return render_template('add_song.html')

# מיזוג - route האקורדים הישן מפנה לנגן
@songs_bp.route('/chords/<string:song_id>')
def chords(song_id):
    return redirect(url_for('songs.play_song', song_id=song_id))

@songs_bp.route('/edit_song/<string:song_id>', methods=['GET', 'POST'])
def edit_song(song_id):
    if 'user_id' not in session:
        flash("יש להתחבר כדי לערוך שיר", "error")
        return redirect(url_for('auth.login'))

    doc = firestore.client().collection("songs").document(song_id).get()
    if not doc.exists:
        return "שיר לא נמצא", 404

    song = doc.to_dict()
    user_roles = session.get("roles", [])
    if song.get("created_by") != session["user_id"] and "admin" not in user_roles:
        flash("אין לך הרשאה לערוך שיר זה", "error")
        return redirect(url_for('songs.songs'))

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
        firestore.client().collection("songs").document(song_id).update(updated_fields)
        flash("🎵 השיר עודכן בהצלחה!", "success")
        return redirect(url_for('songs.play_song', song_id=song_id))

    song["id"] = song_id

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

    return render_template("edit_song.html", song=song)

@songs_bp.route('/api/edit_song/<string:song_id>', methods=['PUT'])
def edit_song_api(song_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    doc = firestore.client().collection("songs").document(song_id).get()
    if not doc.exists:
        return jsonify({"error": "Song not found"}), 404

    song = doc.to_dict()
    user_roles = session.get("roles", [])
    if song.get("created_by") != session["user_id"] and "admin" not in user_roles:
        return jsonify({"error": "Unauthorized - you can only edit your own songs"}), 403

    data = request.get_json()
    required_fields = ["title", "artist", "key", "key_type", "time_signature", "bpm", "video_url", "chords"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing or empty field: {field}"}), 400

    # Handle loops data if provided
    loops_data = data.get("loops", [])

    updated_fields = {
        "title": data["title"],
        "artist": data["artist"],
        "genre": data["genre"],
        "key": data["key"],
        "key_type": data["key_type"],
        "difficulty": data["difficulty"],
        "time_signature": data["time_signature"],
        "bpm": int(data["bpm"]),
        "video_url": data["video_url"],
        "chords": json.dumps(data["chords"]),
        "loops": json.dumps(loops_data),
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
    user_roles = session.get("roles", [])
    if song.get("created_by") != session.get("user_id") and "admin" not in user_roles:
        return jsonify({"error": "Unauthorized"}), 403

    doc_ref.delete()
    return jsonify({"message": "Song deleted successfully!"}), 200

@songs_bp.route('/add-chords')
def add_chords_page():
    return render_template('add_chords_base.html')

@songs_bp.route('/play/<string:song_id>')
def play_song(song_id):
    doc = firestore.client().collection("songs").document(song_id).get()
    if not doc.exists:
        return "שיר לא נמצא", 404
    song = doc.to_dict()
    song["id"] = doc.id

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

    try:
        beats_per_measure = int(song["time_signature"].split("/")[0])
    except:
        beats_per_measure = 4

    # העברת כל הנתונים הנדרשים לטמפלייט המעודכן
    return render_template("play_song.html", song={
        "id": song_id,
        "title": song["title"],
        "artist": song["artist"],
        "genre": song.get("genre", "לא צוין"),
        "key": song["key"],
        "key_type": song["key_type"],
        "difficulty": song.get("difficulty", ""),
        "difficulty_approved": song.get("difficulty_approved", False),
        "time_signature": song["time_signature"],
        "bpm": song["bpm"],
        "video_url": song["video_url"],
        "chords": chords_list,
        "loops": loops_data,
        "beats": beats_per_measure,
        "created_by": song.get("created_by", None)
    })

# הוסף את הפונקציה הזו ל- routes/songs.py

@songs_bp.route('/api/get_song/<string:song_id>', methods=['GET'])
def get_song_data(song_id):
    """API endpoint לטעינת נתוני שיר עבור עריכת אקורדים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    doc = firestore.client().collection("songs").document(song_id).get()
    if not doc.exists:
        return jsonify({"error": "Song not found"}), 404

    song = doc.to_dict()
    user_roles = session.get("roles", [])

    # בדוק הרשאות עריכה
    if song.get("created_by") != session["user_id"] and "admin" not in user_roles:
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



# הוסף את הנתיב הזה ל- routes/songs.py

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
    user_roles = session.get("roles", [])
    if song.get("created_by") != session["user_id"] and "admin" not in user_roles:
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

@songs_bp.route('/api/recent_songs')
def get_recent_songs():
    """API להחזרת שירים שנוספו בשבוע האחרון"""
    from datetime import datetime, timedelta

    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_songs_query = firestore.client().collection("songs").where("created_at", ">=", week_ago).order_by("created_at", direction=firestore.Query.DESCENDING).limit(6)

        recent_songs_docs = recent_songs_query.stream()
        recent_songs = []
        for doc in recent_songs_docs:
            song = doc.to_dict()
            song["id"] = doc.id
            recent_songs.append(song)

        return jsonify({"songs": recent_songs, "success": True})
    except Exception as e:
        print(f"Error fetching recent songs: {e}")
        return jsonify({"songs": [], "success": False, "error": str(e)})
