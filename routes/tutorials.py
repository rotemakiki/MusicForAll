from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, flash
from firebase_admin import firestore
from datetime import datetime

from utils.permissions import (
    get_roles,
    can_manage_courses,
    can_watch_videos,
    is_admin,
)

tutorials_bp = Blueprint('tutorials', __name__)

@tutorials_bp.route('/tutorials')
def tutorials():
    roles = get_roles(session)
    return render_template(
        'tutorials.html',
        can_manage_tutorials=bool(can_manage_courses(roles)),
        can_watch_videos=bool(can_watch_videos(session)),
    )


# =============================================================================
# Public pages
# =============================================================================


@tutorials_bp.route('/tutorial/<string:tutorial_id>')
def tutorial_detail(tutorial_id: str):
    roles = get_roles(session)
    return render_template(
        'tutorial_detail.html',
        tutorial_id=tutorial_id,
        can_manage_tutorials=bool(can_manage_courses(roles)),
        can_watch_videos=bool(can_watch_videos(session)),
    )


# =============================================================================
# Public API
# =============================================================================


def _safe_float(v, default: float = 0.0) -> float:
    try:
        return float(v)
    except Exception:
        return default


def _compute_rating_stats(ratings: list) -> tuple[float, int]:
    if not ratings:
        return 0.0, 0
    vals = []
    for r in ratings:
        try:
            vals.append(float((r or {}).get("rating", 0)))
        except Exception:
            continue
    if not vals:
        return 0.0, 0
    return round(sum(vals) / len(vals), 1), len(vals)


def _get_teacher_cache(db, teacher_ids: set[str]) -> dict:
    cache: dict[str, dict] = {}
    for tid in teacher_ids:
        try:
            snap = db.collection("users").document(tid).get()
            if snap.exists:
                u = snap.to_dict() or {}
                cache[tid] = {
                    "teacher_name": u.get("username") or "לא ידוע",
                    "teacher_profile_image": u.get("profile_image") or "",
                }
            else:
                cache[tid] = {"teacher_name": "לא ידוע", "teacher_profile_image": ""}
        except Exception:
            cache[tid] = {"teacher_name": "לא ידוע", "teacher_profile_image": ""}
    return cache


@tutorials_bp.route('/api/tutorials')
def api_tutorials():
    """
    Query params:
      q: free text (title/description/subject/tags/teacher_name)
      type: video|written|all
      teacher_id: exact match
      subject: exact match (best-effort; server-side filter)
      min_rating: float (best-effort; server-side filter)
      sort: rating|new|popular (default: new)
    """
    q = (request.args.get("q") or "").strip().lower()
    content_type = (request.args.get("type") or "all").strip().lower()
    teacher_id = (request.args.get("teacher_id") or "").strip()
    subject = (request.args.get("subject") or "").strip().lower()
    min_rating = _safe_float(request.args.get("min_rating"), 0.0)
    sort = (request.args.get("sort") or "new").strip().lower()

    try:
        db = firestore.client()
        # Keep queries index-free: get published tutorials and filter in memory.
        docs = list(db.collection("tutorials").where("is_published", "==", True).stream())
        tutorials = []

        teacher_ids: set[str] = set()
        for doc in docs:
            t = doc.to_dict() or {}
            t["id"] = doc.id
            teacher_ids.add((t.get("teacher_id") or "").strip())
            tutorials.append(t)

        teacher_cache = _get_teacher_cache(db, {tid for tid in teacher_ids if tid})

        results = []
        for t in tutorials:
            ttype = (t.get("content_type") or "").strip().lower()
            tid = (t.get("teacher_id") or "").strip()
            tsubject = (t.get("subject") or "").strip().lower()
            ratings = t.get("ratings") or []
            avg_rating, reviews_count = _compute_rating_stats(ratings if isinstance(ratings, list) else [])

            teacher_meta = teacher_cache.get(tid) or {"teacher_name": "לא ידוע", "teacher_profile_image": ""}

            item = {
                "id": t.get("id"),
                "title": t.get("title") or "",
                "description": t.get("description") or "",
                "content_type": ttype or "video",
                "subject": t.get("subject") or "",
                "tags": t.get("tags") or [],
                "teacher_id": tid,
                **teacher_meta,
                "avg_rating": avg_rating,
                "reviews_count": reviews_count,
                "views": int(t.get("views") or 0),
                "duration_minutes": int(t.get("duration_minutes") or 0),
                "cover_image": t.get("cover_image") or "",
                "created_at": t.get("created_at") or "",
                "updated_at": t.get("updated_at") or "",
            }

            if content_type in ("video", "written") and item["content_type"] != content_type:
                continue
            if teacher_id and item["teacher_id"] != teacher_id:
                continue
            if subject and (subject not in tsubject):
                continue
            if min_rating and item["avg_rating"] < min_rating:
                continue

            if q:
                hay = " ".join(
                    [
                        item["title"],
                        item["description"],
                        item.get("subject") or "",
                        teacher_meta.get("teacher_name") or "",
                        " ".join([str(x) for x in (item.get("tags") or [])]),
                    ]
                ).lower()
                if q not in hay:
                    continue

            results.append(item)

        def _sort_key_new(x):
            return x.get("updated_at") or x.get("created_at") or ""

        if sort == "rating":
            results.sort(key=lambda x: (x.get("avg_rating", 0), x.get("reviews_count", 0), _sort_key_new(x)), reverse=True)
        elif sort == "popular":
            results.sort(key=lambda x: (x.get("views", 0), _sort_key_new(x)), reverse=True)
        else:
            results.sort(key=_sort_key_new, reverse=True)

        return jsonify({"success": True, "tutorials": results}), 200
    except Exception as e:
        print(f"Error getting tutorials: {e}")
        return jsonify({"success": False, "error": "שגיאה בטעינת ההדרכות"}), 500


@tutorials_bp.route('/api/tutorials/<string:tutorial_id>')
def api_tutorial_detail(tutorial_id: str):
    try:
        db = firestore.client()
        snap = db.collection("tutorials").document(tutorial_id).get()
        if not snap.exists:
            return jsonify({"success": False, "error": "הדרכה לא נמצאה"}), 404

        t = snap.to_dict() or {}
        if not t.get("is_published") and not can_manage_courses(get_roles(session)):
            return jsonify({"success": False, "error": "אין הרשאה לצפות בהדרכה"}), 403

        ratings = t.get("ratings") or []
        avg_rating, reviews_count = _compute_rating_stats(ratings if isinstance(ratings, list) else [])

        teacher_id = (t.get("teacher_id") or "").strip()
        teacher_meta = _get_teacher_cache(db, {teacher_id}).get(teacher_id, {"teacher_name": "לא ידוע", "teacher_profile_image": ""})

        detail = {
            "id": snap.id,
            "title": t.get("title") or "",
            "description": t.get("description") or "",
            "content_type": (t.get("content_type") or "video").strip().lower(),
            "subject": t.get("subject") or "",
            "tags": t.get("tags") or [],
            "teacher_id": teacher_id,
            **teacher_meta,
            "avg_rating": avg_rating,
            "reviews_count": reviews_count,
            "views": int(t.get("views") or 0),
            "duration_minutes": int(t.get("duration_minutes") or 0),
            "cover_image": t.get("cover_image") or "",
            "video_url": t.get("video_url") or "",
            "written_content": t.get("written_content") or "",
            "attachments": t.get("attachments") or [],
            "quiz": t.get("quiz") or [],
            "blocks": t.get("blocks") or [],
            "created_at": t.get("created_at") or "",
            "updated_at": t.get("updated_at") or "",
        }

        return jsonify({"success": True, "tutorial": detail}), 200
    except Exception as e:
        print(f"Error getting tutorial detail: {e}")
        return jsonify({"success": False, "error": "שגיאה בטעינת ההדרכה"}), 500


# =============================================================================
# Teacher/admin management pages + API
# =============================================================================


@tutorials_bp.route('/manage/tutorials')
def manage_tutorials():
    if 'user_id' not in session:
        flash("נדרש התחברות", "error")
        return redirect(url_for('auth.login'))

    roles = get_roles(session)
    if not can_manage_courses(roles):
        flash("אין לך הרשאה לגשת לעמוד זה", "error")
        return redirect(url_for('tutorials.tutorials'))

    return render_template('manage_tutorials.html')


@tutorials_bp.route('/manage/tutorials/create')
@tutorials_bp.route('/manage/tutorials/edit/<string:tutorial_id>')
def create_edit_tutorial(tutorial_id: str | None = None):
    if 'user_id' not in session:
        flash("נדרש התחברות", "error")
        return redirect(url_for('auth.login'))

    roles = get_roles(session)
    if not can_manage_courses(roles):
        flash("אין לך הרשאה לגשת לעמוד זה", "error")
        return redirect(url_for('tutorials.tutorials'))

    tutorial = None
    if tutorial_id:
        try:
            db = firestore.client()
            snap = db.collection("tutorials").document(tutorial_id).get()
            if snap.exists:
                tutorial = snap.to_dict() or {}
                tutorial["id"] = tutorial_id
                if tutorial.get("teacher_id") != session.get("user_id") and not is_admin(roles):
                    flash("אין לך הרשאה לערוך הדרכה זו", "error")
                    return redirect(url_for('tutorials.manage_tutorials'))
        except Exception as e:
            print(f"Error loading tutorial for edit: {e}")
            flash("שגיאה בטעינת ההדרכה", "error")
            return redirect(url_for('tutorials.manage_tutorials'))

    return render_template('create_edit_tutorial.html', tutorial=tutorial)


@tutorials_bp.route('/api/manage/tutorials')
def api_manage_tutorials():
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "נדרש התחברות"}), 401

    user_id = session['user_id']
    roles = get_roles(session)
    if not can_manage_courses(roles):
        return jsonify({"success": False, "error": "אין הרשאה"}), 403

    try:
        db = firestore.client()
        if is_admin(roles):
            docs = list(db.collection("tutorials").stream())
        else:
            docs = list(db.collection("tutorials").where("teacher_id", "==", user_id).stream())

        tutorials = []
        for doc in docs:
            t = doc.to_dict() or {}
            ratings = t.get("ratings") or []
            avg_rating, reviews_count = _compute_rating_stats(ratings if isinstance(ratings, list) else [])
            tutorials.append(
                {
                    "id": doc.id,
                    "title": t.get("title") or "",
                    "description": t.get("description") or "",
                    "content_type": (t.get("content_type") or "video").strip().lower(),
                    "subject": t.get("subject") or "",
                    "is_published": bool(t.get("is_published")),
                    "avg_rating": avg_rating,
                    "reviews_count": reviews_count,
                    "views": int(t.get("views") or 0),
                    "updated_at": t.get("updated_at") or "",
                }
            )

        tutorials.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
        return jsonify({"success": True, "tutorials": tutorials}), 200
    except Exception as e:
        print(f"Error getting manage tutorials: {e}")
        return jsonify({"success": False, "error": "שגיאה בטעינת ההדרכות"}), 500


@tutorials_bp.route('/api/tutorials/create', methods=['POST'])
def create_tutorial():
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "נדרש התחברות"}), 401

    user_id = session['user_id']
    roles = get_roles(session)
    if not can_manage_courses(roles):
        return jsonify({"success": False, "error": "אין הרשאה ליצור הדרכה"}), 403

    try:
        data = request.get_json() or {}
        content_type = (data.get("content_type") or "video").strip().lower()
        if content_type not in ("video", "written"):
            content_type = "video"

        tutorial_data = {
            "title": (data.get("title") or "").strip(),
            "description": (data.get("description") or "").strip(),
            "content_type": content_type,
            "subject": (data.get("subject") or "").strip(),
            "tags": data.get("tags") or [],
            "teacher_id": user_id,
            "cover_image": (data.get("cover_image") or "").strip(),
            "video_url": (data.get("video_url") or "").strip(),
            "written_content": (data.get("written_content") or "").strip(),
            "attachments": data.get("attachments") or [],
            "quiz": data.get("quiz") or [],
            "blocks": data.get("blocks") or [],
            "duration_minutes": int(data.get("duration_minutes") or 0),
            "ratings": [],
            "views": 0,
            "is_published": bool(data.get("is_published", False)),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        if not tutorial_data["title"]:
            return jsonify({"success": False, "error": "חסרה כותרת"}), 400

        db = firestore.client()
        ref = db.collection("tutorials").add(tutorial_data)
        tutorial_id = ref[1].id

        return jsonify({"success": True, "tutorial_id": tutorial_id, "message": "הדרכה נוצרה בהצלחה"}), 201
    except Exception as e:
        print(f"Error creating tutorial: {e}")
        return jsonify({"success": False, "error": "שגיאה ביצירת ההדרכה"}), 500


@tutorials_bp.route('/api/tutorials/<string:tutorial_id>', methods=['PUT'])
def update_tutorial(tutorial_id: str):
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "נדרש התחברות"}), 401

    user_id = session['user_id']
    roles = get_roles(session)
    if not can_manage_courses(roles):
        return jsonify({"success": False, "error": "אין הרשאה"}), 403

    try:
        db = firestore.client()
        ref = db.collection("tutorials").document(tutorial_id)
        snap = ref.get()
        if not snap.exists:
            return jsonify({"success": False, "error": "הדרכה לא נמצאה"}), 404

        existing = snap.to_dict() or {}
        if existing.get("teacher_id") != user_id and not is_admin(roles):
            return jsonify({"success": False, "error": "אין הרשאה לערוך הדרכה זו"}), 403

        data = request.get_json() or {}
        content_type = (data.get("content_type") or existing.get("content_type") or "video").strip().lower()
        if content_type not in ("video", "written"):
            content_type = "video"

        update_data = {
            "title": (data.get("title") or "").strip(),
            "description": (data.get("description") or "").strip(),
            "content_type": content_type,
            "subject": (data.get("subject") or "").strip(),
            "tags": data.get("tags") or [],
            "cover_image": (data.get("cover_image") or "").strip(),
            "video_url": (data.get("video_url") or "").strip(),
            "written_content": (data.get("written_content") or "").strip(),
            "attachments": data.get("attachments") or [],
            "quiz": data.get("quiz") or [],
            "blocks": data.get("blocks") or [],
            "duration_minutes": int(data.get("duration_minutes") or 0),
            "is_published": bool(data.get("is_published", False)),
            "updated_at": datetime.utcnow().isoformat(),
        }

        if not update_data["title"]:
            return jsonify({"success": False, "error": "חסרה כותרת"}), 400

        ref.update(update_data)
        return jsonify({"success": True, "message": "הדרכה עודכנה בהצלחה"}), 200
    except Exception as e:
        print(f"Error updating tutorial: {e}")
        return jsonify({"success": False, "error": "שגיאה בעדכון ההדרכה"}), 500


@tutorials_bp.route('/api/tutorials/<string:tutorial_id>', methods=['DELETE'])
def delete_tutorial(tutorial_id: str):
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "נדרש התחברות"}), 401

    user_id = session['user_id']
    roles = get_roles(session)
    if not can_manage_courses(roles):
        return jsonify({"success": False, "error": "אין הרשאה"}), 403

    try:
        db = firestore.client()
        ref = db.collection("tutorials").document(tutorial_id)
        snap = ref.get()
        if not snap.exists:
            return jsonify({"success": False, "error": "הדרכה לא נמצאה"}), 404

        existing = snap.to_dict() or {}
        if existing.get("teacher_id") != user_id and not is_admin(roles):
            return jsonify({"success": False, "error": "אין הרשאה למחוק הדרכה זו"}), 403

        ref.delete()
        return jsonify({"success": True, "message": "הדרכה נמחקה בהצלחה"}), 200
    except Exception as e:
        print(f"Error deleting tutorial: {e}")
        return jsonify({"success": False, "error": "שגיאה במחיקת ההדרכה"}), 500
