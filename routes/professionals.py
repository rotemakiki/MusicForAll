from __future__ import annotations

from flask import Blueprint, render_template, request
from firebase_admin import firestore

professionals_bp = Blueprint("professionals", __name__)


# Canonical set (can expand anytime; UI derives from this).
PROFESSIONAL_TYPES: list[dict[str, str]] = [
    {"id": "teacher", "label": "מורה"},
    {"id": "producer", "label": "מפיק מוסיקלי"},
    {"id": "session_musician", "label": "נגן (סשניסט)"},
    {"id": "studio", "label": "אולפן הקלטות"},
    {"id": "rehearsal_room", "label": "חדר חזרות"},
    {"id": "setup", "label": "סטאפיסט"},
    {"id": "mix_engineer", "label": "טכנאי מיקס"},
    {"id": "mastering_engineer", "label": "טכנאי מאסטר"},
    {"id": "soundman", "label": "טכנאי סאונד (סאונדמן)"},
]


def _norm_list(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        # Allow "a, b, c" in legacy fields.
        parts = [p.strip() for p in value.split(",")]
        return [p for p in parts if p]
    return [str(value).strip()] if str(value).strip() else []


def _infer_professional_types(user: dict) -> list[str]:
    roles = user.get("roles") or []
    types = set(_norm_list(user.get("professional_types")))
    # Backward compatibility: teachers already exist as a role.
    if "teacher" in roles:
        types.add("teacher")
    return sorted(types)


@professionals_bp.route("/professionals")
def list_professionals():
    """
    Unified directory: teachers + other professionals.

    MVP: Load from `users` and filter in UI (client-side).
    Future: move to dedicated collection + indexed queries without changing UI.
    """
    db = firestore.client()
    docs = db.collection("users").stream()

    professionals: list[dict] = []
    for doc in docs:
        u = doc.to_dict() or {}
        u["id"] = doc.id

        ptypes = _infer_professional_types(u)
        if not ptypes:
            continue

        # Normalize fields used for filtering.
        languages = _norm_list(u.get("languages") or u.get("language"))
        areas = _norm_list(u.get("areas") or u.get("area"))
        location = (u.get("location") or "").strip()
        rating_avg = u.get("rating_avg")
        try:
            rating_avg = float(rating_avg) if rating_avg is not None and rating_avg != "" else None
        except Exception:
            rating_avg = None

        professionals.append(
            {
                "id": u["id"],
                "username": u.get("username") or "ללא שם",
                "profile_image": u.get("profile_image") or "",
                "professional_types": ptypes,
                "languages": languages,
                "areas": areas,
                "location": location,
                "rating_avg": rating_avg,
                # Teacher-only fields (kept optional):
                "teacher_is_available": bool(u.get("is_available")) if "teacher" in ptypes else None,
                "teacher_teaches_online": bool(u.get("teaches_online")) if "teacher" in ptypes else None,
                "teacher_genres": _norm_list(u.get("teacher_genres") or u.get("styles")) if "teacher" in ptypes else [],
                "teacher_lesson_type": (u.get("teacher_lesson_type") or "").strip() if "teacher" in ptypes else "",
            }
        )

    # Sort stable: rating desc then name
    professionals.sort(key=lambda x: ((x["rating_avg"] or 0), x["username"]), reverse=True)

    # Initial filter from querystring (e.g. /teachers redirect)
    initial_type = (request.args.get("type") or "").strip()

    # Build filter options from data (avoid empty dropdowns)
    language_options = sorted({lang for p in professionals for lang in (p.get("languages") or []) if lang})
    area_options = sorted({a for p in professionals for a in (p.get("areas") or []) if a})
    type_options = PROFESSIONAL_TYPES
    type_labels = {t["id"]: t["label"] for t in PROFESSIONAL_TYPES}

    return render_template(
        "professionals.html",
        professionals=professionals,
        type_options=type_options,
        type_labels=type_labels,
        language_options=language_options,
        area_options=area_options,
        initial_type=initial_type,
    )

