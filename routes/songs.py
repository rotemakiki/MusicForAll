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

# =============================================================================
# API ENDPOINTS לחלק האקורדים המחודש - להוסיף בסוף הקובץ songs.py
# =============================================================================

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
        user_roles = session.get("roles", [])

        # בדוק הרשאות עריכה
        if song.get("created_by") != session["user_id"] and "admin" not in user_roles:
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
    """API endpoint ליצירת שיר חדש עם אקורדים ולופים (לשימוש עתידי)"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    user_roles = session.get("roles", [])
    if not ("teacher" in user_roles or "admin" in user_roles):
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
        new_song = {
            "title": data["title"],
            "artist": data["artist"],
            "genre": data.get("genre", ""),
            "key": data.get("key", "C"),
            "key_type": data.get("key_type", "major"),
            "difficulty": data.get("difficulty", ""),
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
        user_roles = session.get("roles", [])

        # בדוק הרשאות קריאה
        if song.get("created_by") != session["user_id"] and "admin" not in user_roles:
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
        user_roles = session.get("roles", [])

        # בדוק הרשאות קריאה
        if song.get("created_by") != session["user_id"] and "admin" not in user_roles:
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
        user_roles = session.get("roles", [])

        # בדוק הרשאות עריכה
        if song.get("created_by") != session["user_id"] and "admin" not in user_roles:
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
    """API endpoint לטעינת אקורדים שנוספו לאחרונה (לשימוש עתידי)"""
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
    """API endpoint לשמירת אקורדים שנוספו לאחרונה (לשימוש עתידי)"""
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
