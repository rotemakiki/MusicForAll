from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for, flash
from firebase_admin import firestore
from datetime import datetime
import secrets
from utils.song_levels import attach_song_level_fields

my_songs_bp = Blueprint('my_songs', __name__)

def _get_user_is_premium(user_id: str) -> bool:
    try:
        doc = firestore.client().collection("users").document(user_id).get()
        if not doc.exists:
            return False
        return bool((doc.to_dict() or {}).get("is_premium", False))
    except Exception:
        return False


def _can_create_shared_lists() -> bool:
    """מורה פרימיום או אדמין."""
    roles = session.get("roles") or []
    if "admin" in roles:
        return True
    if "teacher" not in roles:
        return False
    uid = session.get("user_id")
    return bool(uid) and _get_user_is_premium(uid)


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
                attach_song_level_fields(song)
                songs_with_dates.append(song)

        # מיון בצד הלקוח לפי תאריך הוספה (החדשים ראשונים)
        songs_with_dates.sort(key=lambda x: x['added_at'], reverse=True)

        return render_template('my_songs.html', songs=songs_with_dates)

    except Exception as e:
        return f"שגיאה בטעינת השירים: {str(e)}", 500


# =============================================================================
# Shared song lists (premium teachers) + collaboration
# =============================================================================

@my_songs_bp.route('/song-lists')
def song_lists_page():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    user_id = session['user_id']
    db = firestore.client()

    owned = []
    shared = []
    try:
        for doc in db.collection("song_lists").where("owner_id", "==", user_id).stream():
            d = doc.to_dict() or {}
            owned.append({**d, "id": doc.id})
    except Exception:
        pass

    try:
        for doc in db.collection("song_lists").where("collaborator_ids", "array_contains", user_id).stream():
            d = doc.to_dict() or {}
            if d.get("owner_id") == user_id:
                continue
            shared.append({**d, "id": doc.id})
    except Exception:
        pass

    owned.sort(key=lambda x: (x.get("created_at") or ""), reverse=True)
    shared.sort(key=lambda x: (x.get("created_at") or ""), reverse=True)

    return render_template("song_lists.html", owned_lists=owned, shared_lists=shared, can_create=_can_create_shared_lists())


@my_songs_bp.route('/song-lists/<string:list_id>')
def song_list_detail_page(list_id):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    user_id = session["user_id"]
    token = (request.args.get("token") or "").strip()
    db = firestore.client()
    ldoc = db.collection("song_lists").document(list_id).get()
    if not ldoc.exists:
        flash("רשימה לא נמצאה", "error")
        return redirect(url_for('my_songs.song_lists_page'))

    lst = ldoc.to_dict() or {}
    owner_id = lst.get("owner_id")
    collaborators = lst.get("collaborator_ids") or []
    share_token = lst.get("share_token") or ""

    has_access = (user_id == owner_id) or (user_id in collaborators) or (token and share_token and token == share_token)
    if not has_access:
        flash("אין לך הרשאה לגשת לרשימה זו", "error")
        return redirect(url_for('my_songs.song_lists_page'))

    # If token-based access, optionally add user as collaborator for future access
    if token and share_token and token == share_token and user_id != owner_id and user_id not in collaborators:
        try:
            db.collection("song_lists").document(list_id).update({
                "collaborator_ids": firestore.ArrayUnion([user_id])
            })
            collaborators.append(user_id)
        except Exception:
            pass

    # Load list items
    items = []
    try:
        item_docs = db.collection("song_list_items").where("list_id", "==", list_id).stream()
        for idoc in item_docs:
            it = idoc.to_dict() or {}
            sid = it.get("song_id")
            if not sid:
                continue
            sdoc = db.collection("songs").document(sid).get()
            if not sdoc.exists:
                continue
            song = sdoc.to_dict() or {}
            song["id"] = sid
            song["added_at"] = it.get("added_at", datetime.utcnow())
            attach_song_level_fields(song)
            items.append(song)
    except Exception:
        items = []

    items.sort(key=lambda x: x.get("added_at") or "", reverse=True)
    can_edit = (user_id == owner_id) or (user_id in collaborators)

    return render_template(
        "song_list_detail.html",
        songs=items,
        list_id=list_id,
        list_name=lst.get("name") or "רשימה",
        can_edit=can_edit,
        share_token=share_token if user_id == owner_id else "",
    )


@my_songs_bp.route('/api/song-lists', methods=['POST'])
def api_create_song_list():
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Not logged in"}), 401
    if not _can_create_shared_lists():
        return jsonify({"success": False, "error": "Premium teacher only"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if len(name) < 2:
        return jsonify({"success": False, "error": "שם קצר מדי"}), 400

    db = firestore.client()
    doc_ref = db.collection("song_lists").document()
    token = secrets.token_urlsafe(16)
    doc_ref.set({
        "name": name,
        "owner_id": session["user_id"],
        "collaborator_ids": [],
        "share_token": token,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return jsonify({"success": True, "list_id": doc_ref.id, "share_token": token})


@my_songs_bp.route('/api/song-lists/<string:list_id>/share-token', methods=['POST'])
def api_rotate_share_token(list_id):
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    db = firestore.client()
    ldoc = db.collection("song_lists").document(list_id).get()
    if not ldoc.exists:
        return jsonify({"success": False, "error": "List not found"}), 404
    lst = ldoc.to_dict() or {}
    if lst.get("owner_id") != session["user_id"] and "admin" not in (session.get("roles") or []):
        return jsonify({"success": False, "error": "Forbidden"}), 403

    token = secrets.token_urlsafe(16)
    db.collection("song_lists").document(list_id).update({"share_token": token, "updated_at": datetime.utcnow()})
    return jsonify({"success": True, "share_token": token})


@my_songs_bp.route('/api/song-lists/<string:list_id>/items/add/<string:song_id>', methods=['POST'])
def api_song_list_add_item(list_id, song_id):
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    user_id = session["user_id"]
    token = (request.args.get("token") or "").strip()
    db = firestore.client()
    ldoc = db.collection("song_lists").document(list_id).get()
    if not ldoc.exists:
        return jsonify({"success": False, "error": "List not found"}), 404
    lst = ldoc.to_dict() or {}
    owner_id = lst.get("owner_id")
    collaborators = lst.get("collaborator_ids") or []
    share_token = lst.get("share_token") or ""
    has_access = (user_id == owner_id) or (user_id in collaborators) or (token and share_token and token == share_token)
    if not has_access:
        return jsonify({"success": False, "error": "Forbidden"}), 403

    # Ensure song exists
    if not db.collection("songs").document(song_id).get().exists:
        return jsonify({"success": False, "error": "Song not found"}), 404

    # Prevent duplicates
    existing = db.collection("song_list_items").where("list_id", "==", list_id).where("song_id", "==", song_id).limit(1).get()
    if existing:
        return jsonify({"success": False, "error": "Song already in list"}), 400

    db.collection("song_list_items").add({
        "list_id": list_id,
        "song_id": song_id,
        "added_at": datetime.utcnow(),
        "added_by": user_id,
    })
    db.collection("song_lists").document(list_id).update({"updated_at": datetime.utcnow()})
    return jsonify({"success": True})


@my_songs_bp.route('/api/song-lists/<string:list_id>/items/remove/<string:song_id>', methods=['POST'])
def api_song_list_remove_item(list_id, song_id):
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    user_id = session["user_id"]
    token = (request.args.get("token") or "").strip()
    db = firestore.client()
    ldoc = db.collection("song_lists").document(list_id).get()
    if not ldoc.exists:
        return jsonify({"success": False, "error": "List not found"}), 404
    lst = ldoc.to_dict() or {}
    owner_id = lst.get("owner_id")
    collaborators = lst.get("collaborator_ids") or []
    share_token = lst.get("share_token") or ""
    has_access = (user_id == owner_id) or (user_id in collaborators) or (token and share_token and token == share_token)
    if not has_access:
        return jsonify({"success": False, "error": "Forbidden"}), 403

    docs = db.collection("song_list_items").where("list_id", "==", list_id).where("song_id", "==", song_id).get()
    if not docs:
        return jsonify({"success": False, "error": "Song not in list"}), 404
    for d in docs:
        d.reference.delete()
    db.collection("song_lists").document(list_id).update({"updated_at": datetime.utcnow()})
    return jsonify({"success": True})
