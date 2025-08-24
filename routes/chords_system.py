# Chord System API Routes - Full Backend Support for Advanced Chord System
# This file handles all API endpoints for the chord system including validation,
# loop management, templates, and user preferences

from flask import Blueprint, request, jsonify, session
from firebase_admin import firestore
from datetime import datetime
import json

# Create blueprint for chord system routes
chords_system_bp = Blueprint('chords_system', __name__)

# =============================================================================
# LOOP MANAGEMENT API - Core functionality for chord loops
# =============================================================================

@chords_system_bp.route('/api/loops', methods=['GET'])
def get_loops():
    """קבלת כל הלופים של המשתמש"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        user_id = session['user_id']
        loops_ref = firestore.client().collection("loops")
        
        # חיפוש לופים של המשתמש הנוכחי
        query = loops_ref.where("created_by", "==", user_id).order_by("updated_at", direction=firestore.Query.DESCENDING)
        loops_docs = query.stream()

        loops = []
        for doc in loops_docs:
            loop_data = doc.to_dict()
            loop_data['id'] = doc.id
            
            # פרסור נתוני JSON אם נדרש
            if isinstance(loop_data.get('chords'), str):
                try:
                    loop_data['chords'] = json.loads(loop_data['chords'])
                except json.JSONDecodeError:
                    loop_data['chords'] = []
            
            loops.append(loop_data)

        return jsonify({
            "loops": loops,
            "count": len(loops),
            "success": True
        }), 200

    except Exception as e:
        print(f"Error getting loops: {e}")
        return jsonify({"error": "Internal server error"}), 500


@chords_system_bp.route('/api/loops', methods=['POST'])
def save_loop():
    """שמירת לופ חדש או עדכון קיים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        data = request.get_json()
        if not data or "chords" not in data:
            return jsonify({"error": "Missing chord data"}), 400

        user_id = session['user_id']
        loop_name = data.get("name", f"Loop {datetime.now().strftime('%d/%m %H:%M')}")
        
        # נתוני הלופ
        loop_data = {
            "name": loop_name,
            "chords": json.dumps(data["chords"]) if isinstance(data["chords"], list) else data["chords"],
            "key": data.get("key", "C"),
            "time_signature": data.get("time_signature", "4/4"),
            "tempo": data.get("tempo", 120),
            "created_by": user_id,
            "updated_at": datetime.utcnow(),
            "description": data.get("description", ""),
            "tags": data.get("tags", [])
        }

        # בדיקה אם זה עדכון לופ קיים
        loop_id = data.get("id")
        if loop_id:
            # עדכון לופ קיים
            firestore.client().collection("loops").document(loop_id).update(loop_data)
            message = "Loop updated successfully!"
        else:
            # לופ חדש
            loop_data["created_at"] = datetime.utcnow()
            doc_ref = firestore.client().collection("loops").add(loop_data)
            loop_id = doc_ref[1].id
            message = "Loop saved successfully!"

        return jsonify({
            "message": message,
            "loop_id": loop_id,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error saving loop: {e}")
        return jsonify({"error": "Internal server error"}), 500


@chords_system_bp.route('/api/loops/<string:loop_id>', methods=['DELETE'])
def delete_loop(loop_id):
    """מחיקת לופ"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        user_id = session['user_id']
        
        # בדיקה שהלופ שייך למשתמש
        loop_doc = firestore.client().collection("loops").document(loop_id).get()
        if not loop_doc.exists:
            return jsonify({"error": "Loop not found"}), 404

        loop_data = loop_doc.to_dict()
        if loop_data.get("created_by") != user_id:
            return jsonify({"error": "Unauthorized - you can only delete your own loops"}), 403

        # מחיקת הלופ
        firestore.client().collection("loops").document(loop_id).delete()

        return jsonify({
            "message": "Loop deleted successfully!",
            "loop_id": loop_id,
            "success": True
        }), 200

    except Exception as e:
        print(f"Error deleting loop {loop_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500


# =============================================================================
# CHORD TEMPLATES AND PROGRESSIONS API
# =============================================================================

@chords_system_bp.route('/api/chord-templates', methods=['GET'])
def get_chord_templates():
    """קבלת תבניות אקורדים מוכנות"""
    try:
        # תבניות אקורדים פופולריות לפי סגנונות מוזיקליים
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
# CHORD VALIDATION AND HELPERS - UPDATED WITH NEW CHORDS
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
    """פונקציה עזר לולידציה מתקדמת של אקורדים - UPDATED WITH NEW CHORDS"""
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

    # סוגי אקורדים תקפים - UPDATED WITH NEW CHORD TYPES
    valid_types = ["", "m", "7", "maj7", "m7", "dim", "aug", "sus4", "sus2", "add9", "6", "m6", "7b5", "add11", "add13"]

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
    """תיאור של סוג האקורד - UPDATED WITH NEW CHORD DESCRIPTIONS"""
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
        "m6": "מינור סקסט",
        "7b5": "דומיננט 7 קווינטה מוקטנת",  # חדש
        "add11": "הוספת 11",  # חדש
        "add13": "הוספת 13"   # חדש
    }

    return descriptions.get(chord_type, "לא מוכר")
