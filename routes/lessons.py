from flask import Blueprint, render_template, request, jsonify, session
from firebase_admin import firestore
from datetime import datetime

from utils.permissions import get_roles, can_manage_courses


lessons_bp = Blueprint("lessons", __name__)


@lessons_bp.route("/lessons")
def lessons_list():
    roles = get_roles(session)
    return render_template(
        "lessons.html",
        can_manage_lessons=bool(can_manage_courses(roles)),
    )


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


@lessons_bp.route("/api/lessons")
def api_lessons():
    """
    Single-lesson listing (not "tutorials"/guides).
    Firestore collection: lessons

    Query params (best-effort):
      q: free text (title/description/subject/tags/teacher_name)
      teacher_id: exact match
      subject: contains match
      min_rating: float
      sort: rating|new|popular (default: new)
    """
    q = (request.args.get("q") or "").strip().lower()
    teacher_id = (request.args.get("teacher_id") or "").strip()
    subject = (request.args.get("subject") or "").strip().lower()
    min_rating = _safe_float(request.args.get("min_rating"), 0.0)
    sort = (request.args.get("sort") or "new").strip().lower()

    try:
        db = firestore.client()
        docs = list(db.collection("lessons").where("is_published", "==", True).stream())

        lessons = []
        teacher_ids: set[str] = set()
        for doc in docs:
            d = doc.to_dict() or {}
            d["id"] = doc.id
            teacher_ids.add((d.get("teacher_id") or "").strip())
            lessons.append(d)

        teacher_cache = _get_teacher_cache(db, {tid for tid in teacher_ids if tid})

        results = []
        for l in lessons:
            tid = (l.get("teacher_id") or "").strip()
            lsubject = (l.get("subject") or "").strip().lower()
            ratings = l.get("ratings") or []
            avg_rating, reviews_count = _compute_rating_stats(ratings if isinstance(ratings, list) else [])

            teacher_meta = teacher_cache.get(tid) or {"teacher_name": "לא ידוע", "teacher_profile_image": ""}

            item = {
                "id": l.get("id"),
                "title": l.get("title") or "",
                "description": l.get("description") or "",
                "subject": l.get("subject") or "",
                "tags": l.get("tags") or [],
                "teacher_id": tid,
                **teacher_meta,
                "avg_rating": avg_rating,
                "reviews_count": reviews_count,
                "views": int(l.get("views") or 0),
                "duration_minutes": int(l.get("duration_minutes") or 0),
                "cover_image": l.get("cover_image") or "",
                "price": float(l.get("price") or 0),
                "created_at": l.get("created_at") or "",
                "updated_at": l.get("updated_at") or "",
            }

            if teacher_id and item["teacher_id"] != teacher_id:
                continue
            if subject and (subject not in lsubject):
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

        return jsonify({"success": True, "lessons": results}), 200
    except Exception as e:
        print(f"Error getting lessons: {e}")
        return jsonify({"success": False, "error": "שגיאה בטעינת השיעורים"}), 500

