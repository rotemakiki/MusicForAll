from flask import Blueprint, request, jsonify, session
from firebase_admin import firestore
from datetime import datetime
import json

chords_system_bp = Blueprint('chords_system', __name__, url_prefix='/api/chords-system')

# =============================================================================
# LOOPS MANAGEMENT API
# =============================================================================

@chords_system_bp.route('/loops', methods=['POST'])
def create_loop():
    """יצירת לופ חדש"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # ולידציה
        required_fields = ["name", "measures"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400

        loop_data = {
            "name": data["name"],
            "measures": data["measures"],
            "measure_count": len(data["measures"]),
            "repeat_count": data.get("repeat_count", 1),
            "created_by": session["user_id"],
            "created_at": datetime.utcnow(),
            "tags": data.get("tags", []),
            "tempo_hint": data.get("tempo_hint", ""),
            "description": data.get("description", "")
        }

        # שמירה במסד נתונים
        loop_ref = firestore.client().collection("loops").add(loop_data)
        loop_id = loop_ref[1].id

        return jsonify({
            "message": "Loop created successfully",
            "loop_id": loop_id,
            "loop_data": loop_data,
            "success": True
        }), 201

    except Exception as e:
        print(f"Error creating loop: {e}")
        return jsonify({"error": "Internal server error"}), 500


@chords_system_bp.route('/loops/<string:loop_id>', methods=['GET'])
def get_loop(loop_id):
    """קבלת לופ ספציפי"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        doc = firestore.client().collection("loops").document(loop_id).get()
        if not doc.exists:
            return jsonify({"error": "Loop not found"}), 404

        loop_data = doc.to_dict()

        # בדיקת הרשאות
        if loop_data.get("created_by") != session["user_id"]:
            return jsonify({"error": "Unauthorized - not your loop"}), 403

        loop_data["id"] = loop_id
        return jsonify({
            "loop": loop_data,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error getting loop {loop_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500


@chords_system_bp.route('/loops/<string:loop_id>', methods=['PUT'])
def update_loop(loop_id):
    """עדכון לופ קיים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        # בדיקה שהלופ קיים ושייך למשתמש
        doc = firestore.client().collection("loops").document(loop_id).get()
        if not doc.exists:
            return jsonify({"error": "Loop not found"}), 404

        loop_data = doc.to_dict()
        if loop_data.get("created_by") != session["user_id"]:
            return jsonify({"error": "Unauthorized - not your loop"}), 403

        # עדכון הנתונים
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        updated_fields = {
            "updated_at": datetime.utcnow()
        }

        # עדכון שדות מותרים
        allowed_fields = ["name", "measures", "repeat_count", "tags", "tempo_hint", "description"]
        for field in allowed_fields:
            if field in data:
                updated_fields[field] = data[field]

        # עדכון measure_count אם measures השתנו
        if "measures" in data:
            updated_fields["measure_count"] = len(data["measures"])

        firestore.client().collection("loops").document(loop_id).update(updated_fields)

        return jsonify({
            "message": "Loop updated successfully",
            "loop_id": loop_id,
            "updated_fields": list(updated_fields.keys()),
            "success": True
        }), 200

    except Exception as e:
        print(f"Error updating loop {loop_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500


@chords_system_bp.route('/loops/<string:loop_id>', methods=['DELETE'])
def delete_loop(loop_id):
    """מחיקת לופ"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        # בדיקה שהלופ קיים ושייך למשתמש
        doc = firestore.client().collection("loops").document(loop_id).get()
        if not doc.exists:
            return jsonify({"error": "Loop not found"}), 404

        loop_data = doc.to_dict()
        if loop_data.get("created_by") != session["user_id"]:
            return jsonify({"error": "Unauthorized - not your loop"}), 403

        # מחיקה
        firestore.client().collection("loops").document(loop_id).delete()

        return jsonify({
            "message": "Loop deleted successfully",
            "loop_id": loop_id,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error deleting loop {loop_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500


@chords_system_bp.route('/loops/user/<string:user_id>', methods=['GET'])
def get_user_loops(user_id):
    """קבלת כל הלופים של משתמש"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    # משתמש יכול לראות רק את הלופים שלו (או אדמין רואה הכל)
    user_roles = session.get("roles", [])
    if session["user_id"] != user_id and "admin" not in user_roles:
        return jsonify({"error": "Unauthorized - can only access your own loops"}), 403

    try:
        loops_query = firestore.client().collection("loops").where("created_by", "==", user_id).order_by("created_at", direction=firestore.Query.DESCENDING)

        loops = []
        for doc in loops_query.stream():
            loop_data = doc.to_dict()
            loop_data["id"] = doc.id
            loops.append(loop_data)

        return jsonify({
            "loops": loops,
            "count": len(loops),
            "user_id": user_id,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error getting loops for user {user_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500


# =============================================================================
# CHORD TEMPLATES AND SUGGESTIONS API
# =============================================================================

@chords_system_bp.route('/chord-templates', methods=['GET'])
def get_chord_templates():
    """קבלת תבניות אקורדים נפוצות"""
    try:
        # תבניות אקורדים בסיסיות לפי סגנון ומפתח
        templates = {
            "pop_major": {
                "name": "פופ - מג'ור",
                "key": "C",
                "progressions": [
                    {"name": "I-V-vi-IV", "chords": ["C", "G", "Am", "F"]},
                    {"name": "vi-IV-I-V", "chords": ["Am", "F", "C", "G"]},
                    {"name": "I-vi-IV-V", "chords": ["C", "Am", "F", "G"]}
                ]
            },
            "rock_major": {
                "name": "רוק - מג'ור",
                "key": "G",
                "progressions": [
                    {"name": "I-bVII-IV-I", "chords": ["G", "F", "C", "G"]},
                    {"name": "I-V-vi-IV", "chords": ["G", "D", "Em", "C"]},
                    {"name": "vi-IV-I-V", "chords": ["Em", "C", "G", "D"]}
                ]
            },
            "folk_major": {
                "name": "פולק - מג'ור",
                "key": "D",
                "progressions": [
                    {"name": "I-IV-V-I", "chords": ["D", "G", "A", "D"]},
                    {"name": "I-vi-ii-V", "chords": ["D", "Bm", "Em", "A"]},
                    {"name": "vi-V-I-IV", "chords": ["Bm", "A", "D", "G"]}
                ]
            },
            "jazz_major": {
                "name": "ג'אז - מג'ור",
                "key": "F",
                "progressions": [
                    {"name": "ii-V-I", "chords": ["Gm7", "C7", "Fmaj7"]},
                    {"name": "I-vi-ii-V", "chords": ["Fmaj7", "Dm7", "Gm7", "C7"]},
                    {"name": "iii-vi-ii-V", "chords": ["Am7", "Dm7", "Gm7", "C7"]}
                ]
            },
            "blues": {
                "name": "בלוז",
                "key": "E",
                "progressions": [
                    {"name": "12 Bar Blues", "chords": ["E7", "E7", "E7", "E7", "A7", "A7", "E7", "E7", "B7", "A7", "E7", "B7"]},
                    {"name": "Quick Change", "chords": ["E7", "A7", "E7", "E7", "A7", "A7", "E7", "E7", "B7", "A7", "E7", "B7"]}
                ]
            }
        }

        return jsonify({
            "templates": templates,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error getting chord templates: {e}")
        return jsonify({"error": "Internal server error"}), 500


@chords_system_bp.route('/chord-suggestions', methods=['POST'])
def get_chord_suggestions():
    """קבלת הצעות לאקורד הבא על פי הקשר"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        current_chords = data.get("current_chords", [])
        key = data.get("key", "C")
        style = data.get("style", "pop")

        # לוגיקה פשוטה להצעת אקורדים
        suggestions = generate_chord_suggestions(current_chords, key, style)

        return jsonify({
            "suggestions": suggestions,
            "context": {
                "current_chords": current_chords,
                "key": key,
                "style": style
            },
            "success": True
        }), 200

    except Exception as e:
        print(f"Error getting chord suggestions: {e}")
        return jsonify({"error": "Internal server error"}), 500


def generate_chord_suggestions(current_chords, key, style):
    """פונקציה עזר ליצירת הצעות אקורדים"""
    # מיפוי בסיסי של מפתחות לאקורדים נפוצים
    key_to_chords = {
        "C": ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
        "G": ["G", "Am", "Bm", "C", "D", "Em", "F#dim"],
        "D": ["D", "Em", "F#m", "G", "A", "Bm", "C#dim"],
        "A": ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"],
        "E": ["E", "F#m", "G#m", "A", "B", "C#m", "D#dim"],
        "F": ["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"]
    }

    base_chords = key_to_chords.get(key, key_to_chords["C"])

    # אם אין אקורדים קיימים, החזר אקורדים בסיסיים
    if not current_chords:
        return [
            {"chord": base_chords[0], "probability": 0.9, "reason": "Tonic - התחלה טובה"},
            {"chord": base_chords[4], "probability": 0.8, "reason": "Dominant - יוצר מתח"},
            {"chord": base_chords[5], "probability": 0.7, "reason": "Relative minor - מוסיף עומק"}
        ]

    # לוגיקה פשוטה על בסיס האקורד האחרון
    last_chord = current_chords[-1] if current_chords else None
    suggestions = []

    # הצעות על בסיס תחושה הרמונית
    if last_chord in base_chords:
        idx = base_chords.index(last_chord)

        # הצעות קלאסיות
        next_suggestions = [
            (base_chords[(idx + 3) % 7], 0.8, "Fourth up - התקדמות חזקה"),
            (base_chords[(idx + 4) % 7], 0.9, "Fifth up - התקדמות טבעית"),
            (base_chords[(idx - 2) % 7], 0.7, "Relative chord - וריאציה נעימה")
        ]

        suggestions = [{"chord": chord, "probability": prob, "reason": reason}
                      for chord, prob, reason in next_suggestions]

    # אם לא מצאנו הצעות, החזר ברירות מחדל
    if not suggestions:
        suggestions = [
            {"chord": base_chords[0], "probability": 0.6, "reason": "Return to tonic"},
            {"chord": base_chords[4], "probability": 0.7, "reason": "Dominant resolution"},
            {"chord": base_chords[5], "probability": 0.5, "reason": "Minor variation"}
        ]

    return suggestions[:3]  # החזר רק 3 הצעות


# =============================================================================
# USER PREFERENCES AND SETTINGS API
# =============================================================================

@chords_system_bp.route('/user-preferences', methods=['GET'])
def get_user_preferences():
    """קבלת העדפות משתמש למערכת האקורדים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        user_id = session['user_id']

        # חיפוש העדפות במסד נתונים
        prefs_doc = firestore.client().collection("user_chord_preferences").document(user_id).get()

        if prefs_doc.exists:
            preferences = prefs_doc.to_dict()
        else:
            # ברירות מחדל
            preferences = {
                "default_key": "C",
                "default_time_signature": "4/4",
                "default_tempo": 120,
                "preferred_chord_types": ["", "m", "7"],
                "auto_save_enabled": True,
                "show_chord_suggestions": True,
                "preferred_loop_length": 4,
                "theme": "default"
            }

        return jsonify({
            "preferences": preferences,
            "user_id": user_id,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error getting user preferences: {e}")
        return jsonify({"error": "Internal server error"}), 500


@chords_system_bp.route('/user-preferences', methods=['PUT'])
def update_user_preferences():
    """עדכון העדפות משתמש"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        user_id = session['user_id']

        # הוספת timestamp
        preferences = data.copy()
        preferences["updated_at"] = datetime.utcnow()
        preferences["user_id"] = user_id

        # שמירה במסד נתונים
        firestore.client().collection("user_chord_preferences").document(user_id).set(preferences, merge=True)

        return jsonify({
            "message": "User preferences updated successfully",
            "user_id": user_id,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error updating user preferences: {e}")
        return jsonify({"error": "Internal server error"}), 500


# =============================================================================
# STATISTICS AND ANALYTICS API
# =============================================================================

@chords_system_bp.route('/stats/user', methods=['GET'])
def get_user_stats():
    """סטטיסטיקות של המשתמש במערכת האקורדים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        user_id = session['user_id']

        # ספירת לופים
        loops_count = len(list(firestore.client().collection("loops").where("created_by", "==", user_id).stream()))

        # ספירת שירים
        songs_count = len(list(firestore.client().collection("songs").where("created_by", "==", user_id).stream()))

        # אקורדים נפוצים (מדומה - בעתיד ניתן לחשב מהנתונים האמיתיים)
        popular_chords = ["C", "G", "Am", "F", "Dm"]

        stats = {
            "total_loops": loops_count,
            "total_songs": songs_count,
            "popular_chords": popular_chords,
            "user_since": "2024-01-01",  # בעתיד מהפרופיל
            "last_activity": datetime.utcnow().isoformat()
        }

        return jsonify({
            "stats": stats,
            "user_id": user_id,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error getting user stats: {e}")
        return jsonify({"error": "Internal server error"}), 500


# =============================================================================
# CHORD VALIDATION AND HELPERS
# =============================================================================

@chords_system_bp.route('/validate-chord', methods=['POST'])
def validate_chord_extended():
    """ולידציה מתקדמת של אקורדים"""
    try:
        data = request.get_json()
        if not data or "chord" not in data:
            return jsonify({"error": "Missing chord data", "valid": False}), 400

        chord_name = data["chord"]
        key_context = data.get("key", "C")

        # ולידציה מתקדמת
        validation_result = validate_chord_advanced(chord_name, key_context)

        return jsonify(validation_result), 200

    except Exception as e:
        print(f"Error in extended chord validation: {e}")
        return jsonify({"error": "Internal server error", "valid": False}), 500


def validate_chord_advanced(chord_name, key_context="C"):
    """פונקציה עזר לולידציה מתקדמת של אקורדים"""
    if chord_name == "—":
        return {"valid": True, "type": "rest", "chord": chord_name}

    # בדיקות בסיסיות
    if not chord_name or len(chord_name) > 10:
        return {"valid": False, "error": "Invalid chord format"}

    root_letters = ["A", "B", "C", "D", "E", "F", "G"]
    if chord_name[0] not in root_letters:
        return {"valid": False, "error": "Invalid root note"}

    # ניתוח האקורד
    root = chord_name[0]
    remaining = chord_name[1:]

    accidental = ""
    if remaining and remaining[0] in ["#", "b"]:
        accidental = remaining[0]
        remaining = remaining[1:]

    chord_type = remaining

    # סוגי אקורדים תקפים
    valid_types = ["", "m", "7", "maj7", "m7", "dim", "aug", "sus4", "sus2", "add9", "6", "m6"]

    if chord_type not in valid_types:
        return {"valid": False, "error": f"Unknown chord type: {chord_type}"}

    # בדיקת התאמה למפתח (אזהרה בלבד)
    in_key = check_chord_in_key(root + accidental, key_context)

    return {
        "valid": True,
        "chord": chord_name,
        "root": root,
        "accidental": accidental,
        "type": chord_type,
        "in_key": in_key,
        "type_description": get_chord_type_description(chord_type)
    }


def check_chord_in_key(chord_root, key):
    """בדיקה אם אקורד שייך למפתח"""
    # מיפוי פשוט - בעתיד ניתן להרחיב
    key_chords = {
        "C": ["C", "D", "E", "F", "G", "A", "B"],
        "G": ["G", "A", "B", "C", "D", "E", "F#"],
        "D": ["D", "E", "F#", "G", "A", "B", "C#"],
        "F": ["F", "G", "A", "Bb", "C", "D", "E"]
    }

    return chord_root in key_chords.get(key, [])


def get_chord_type_description(chord_type):
    """תיאור של סוג האקורד"""
    descriptions = {
        "": "מג'ור",
        "m": "מינור",
        "7": "דומיננט 7",
        "maj7": "מג'ור 7",
        "m7": "מינור 7",
        "dim": "מוקטן",
        "aug": "מוגדל",
        "sus4": "מושעה 4",
        "sus2": "מושעה 2",
        "add9": "הוספת 9",
        "6": "סקסט",
        "m6": "מינור סקסט"
    }

    return descriptions.get(chord_type, "לא מוכר")
