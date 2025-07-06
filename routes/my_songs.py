from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for
from firebase_admin import firestore
from datetime import datetime

my_songs_bp = Blueprint('my_songs', __name__)

@my_songs_bp.route('/api/my-songs/add/<string:song_id>', methods=['POST'])
def add_to_my_songs(song_id):
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    user_id = session['user_id']

    try:
        # Check if song exists
        song_doc = firestore.client().collection("songs").document(song_id).get()
        if not song_doc.exists:
            return jsonify({"success": False, "error": "Song not found"}), 404

        # Check if already in my songs
        my_songs_ref = firestore.client().collection("my_songs").where("user_id", "==", user_id).where("song_id", "==", song_id).get()

        if my_songs_ref:
            return jsonify({"success": False, "error": "Song already in your list"}), 400

        # Add to my songs
        firestore.client().collection("my_songs").add({
            "user_id": user_id,
            "song_id": song_id,
            "added_at": datetime.utcnow()
        })

        return jsonify({"success": True, "message": "Song added to your list"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@my_songs_bp.route('/api/my-songs/remove/<string:song_id>', methods=['POST'])
def remove_from_my_songs(song_id):
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    user_id = session['user_id']

    try:
        # Find and delete the my_songs entry
        my_songs_ref = firestore.client().collection("my_songs").where("user_id", "==", user_id).where("song_id", "==", song_id).get()

        if not my_songs_ref:
            return jsonify({"success": False, "error": "Song not in your list"}), 404

        for doc in my_songs_ref:
            doc.reference.delete()

        return jsonify({"success": True, "message": "Song removed from your list"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@my_songs_bp.route('/api/my-songs/check/<string:song_id>', methods=['GET'])
def check_my_song(song_id):
    if 'user_id' not in session:
        return jsonify({"inMyList": False})

    user_id = session['user_id']

    try:
        my_songs_ref = firestore.client().collection("my_songs").where("user_id", "==", user_id).where("song_id", "==", song_id).get()
        return jsonify({"inMyList": len(my_songs_ref) > 0})

    except Exception as e:
        return jsonify({"inMyList": False})

@my_songs_bp.route('/my-songs')
def my_songs_page():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    user_id = session['user_id']

    try:
        # Get user's saved songs - ללא מיון כדי לא לדרוש אינדקס
        my_songs_ref = firestore.client().collection("my_songs").where("user_id", "==", user_id).get()

        songs_with_dates = []

        for my_song_doc in my_songs_ref:
            my_song_data = my_song_doc.to_dict()
            song_id = my_song_data['song_id']

            # Get song details
            song_doc = firestore.client().collection("songs").document(song_id).get()
            if song_doc.exists:
                song = song_doc.to_dict()
                song['id'] = song_id
                song['added_at'] = my_song_data.get('added_at', datetime.utcnow())
                songs_with_dates.append(song)

        # מיון בצד הלקוח לפי תאריך הוספה (החדשים ראשונים)
        songs_with_dates.sort(key=lambda x: x['added_at'], reverse=True)

        return render_template('my_songs.html', songs=songs_with_dates)

    except Exception as e:
        return f"שגיאה בטעינת השירים: {str(e)}", 500
