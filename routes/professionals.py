from __future__ import annotations

from flask import Blueprint, render_template, request
from firebase_admin import firestore

from utils.professional_catalog import (
    PROFESSIONAL_TYPES,
    TYPE_LABELS,
    infer_professional_types,
    norm_list,
)

professionals_bp = Blueprint("professionals", __name__)

try:
    from routes.songs import _get_genres_config  # type: ignore
except Exception:  # pragma: no cover
    _get_genres_config = None


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

        ptypes = infer_professional_types(u)
        if not ptypes:
            continue

        languages = norm_list(u.get("languages") or u.get("language"))
        areas = norm_list(u.get("areas") or u.get("area") or u.get("location"))
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
                "teacher_is_available": bool(u.get("is_available")) if "teacher" in ptypes else None,
                "teacher_teaches_online": bool(u.get("teaches_online")) if "teacher" in ptypes else None,
                "teacher_genres": norm_list(u.get("teacher_genres") or u.get("styles")) if "teacher" in ptypes else [],
                "teacher_lesson_type": (u.get("teacher_lesson_type") or "").strip() if "teacher" in ptypes else "",
            }
        )

    professionals.sort(key=lambda x: ((x["rating_avg"] or 0), x["username"]), reverse=True)

    initial_type = (request.args.get("type") or "").strip()

    language_options = sorted({lang for p in professionals for lang in (p.get("languages") or []) if lang})
    area_options = sorted({a for p in professionals for a in (p.get("areas") or []) if a})
    type_options = PROFESSIONAL_TYPES
    type_labels = TYPE_LABELS
    genres_catalog = _get_genres_config() if _get_genres_config else []

    return render_template(
        "professionals.html",
        professionals=professionals,
        type_options=type_options,
        type_labels=type_labels,
        language_options=language_options,
        area_options=area_options,
        genres_catalog=genres_catalog,
        initial_type=initial_type,
    )
