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
    required_fields = ["title", "artist", "key", "key_type", "time_signature", "bpm", "video_url", "chords"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing or empty field: {field}"}), 400

    new_song = {
        "title": data["title"],
        "artist": data["artist"],
        "key": data["key"],
        "key_type": data["key_type"],
        "difficulty": data["difficulty"],
        "difficulty_approved": False,
        "time_signature": data["time_signature"],
        "bpm": int(data["bpm"]),
        "video_url": data["video_url"],
        "chords": json.dumps(data["chords"]),
        "created_at": datetime.utcnow(),
        "created_by": session.get("user_id"),
    }

    song_ref = firestore.client().collection("songs").add(new_song)
    song_id = song_ref[1].id

    return jsonify({"message": "Song added successfully!", "song_id": song_id}), 201

@songs_bp.route('/add_song')
def add_song_page():
    return render_template('add_song.html')

@songs_bp.route('/chords/<string:song_id>')
def chords(song_id):
    doc = firestore.client().collection("songs").document(song_id).get()
    if not doc.exists:
        return "שיר לא נמצא", 404
    song = doc.to_dict()
    song["id"] = doc.id
    return render_template('chords.html', song=song)

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
        return redirect(url_for('songs.chords', song_id=song_id))

    song["id"] = song_id
    try:
        song["chords"] = json.loads(song.get("chords", "[]"))
    except:
        song["chords"] = []

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

    updated_fields = {
        "title": data["title"],
        "artist": data["artist"],
        "key": data["key"],
        "key_type": data["key_type"],
        "difficulty": data["difficulty"],
        "time_signature": data["time_signature"],
        "bpm": int(data["bpm"]),
        "video_url": data["video_url"],
        "chords": json.dumps(data["chords"]),
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

    chords_list = json.loads(song["chords"])
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
