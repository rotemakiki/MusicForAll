from __future__ import annotations

from flask import Blueprint, render_template, request
from firebase_admin import firestore

from utils.professional_catalog import (
    LANGUAGE_OPTIONS,
    PROFESSIONAL_TYPES,
    TYPE_LABELS,
    canonicalize_type,
    infer_professional_types,
    norm_list,
    normalize_languages,
)

professionals_bp = Blueprint("professionals", __name__)

try:
    from routes.songs import _get_genres_config  # type: ignore
except Exception:  # pragma: no cover
    _get_genres_config = None


def _genre_aliases(genres_catalog: list[dict]) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for genre in genres_catalog or []:
        value = (genre.get("value") or "").strip()
        label = (genre.get("label") or "").strip()
        if not value:
            continue

        candidates = {value, value.replace("_", " "), label}
        if " - " in label:
            candidates.update(part.strip() for part in label.split(" - "))
        if " - " not in label and " - " not in value:
            candidates.add(label)

        for candidate in candidates:
            key = candidate.strip().lower().replace("_", " ").replace("-", " ")
            if key:
                aliases[key] = value
    return aliases


def _normalize_teacher_genres(user: dict, genres_catalog: list[dict]) -> list[str]:
    aliases = _genre_aliases(genres_catalog)
    valid_values = {
        (genre.get("value") or "").strip()
        for genre in genres_catalog or []
        if (genre.get("value") or "").strip()
    }
    selected: set[str] = set()

    # teacher_genres is the canonical field. styles is kept as a legacy fallback
    # so existing profiles that wrote "רוק" / "Rock" still appear in filtering.
    for raw in norm_list(user.get("teacher_genres")) + norm_list(user.get("styles")):
        key = raw.strip().lower().replace("_", " ").replace("-", " ")
        value = aliases.get(key)
        if value:
            selected.add(value)
        elif raw in valid_values:
            selected.add(raw)

    return [
        genre.get("value")
        for genre in genres_catalog or []
        if genre.get("value") in selected
    ]


@professionals_bp.route("/professionals")
def list_professionals():
    """
    Unified directory: teachers + other professionals.

    MVP: Load from `users` and filter in UI (client-side).
    Future: move to dedicated collection + indexed queries without changing UI.
    """
    db = firestore.client()
    docs = db.collection("users").stream()
    genres_catalog = _get_genres_config() if _get_genres_config else []

    professionals: list[dict] = []
    for doc in docs:
        u = doc.to_dict() or {}
        u["id"] = doc.id

        ptypes = infer_professional_types(u)
        if not ptypes:
            continue

        languages = normalize_languages(u.get("languages") or u.get("language"))
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
                "teacher_genres": _normalize_teacher_genres(u, genres_catalog) if "teacher" in ptypes else [],
                "teacher_lesson_type": (u.get("teacher_lesson_type") or "").strip() if "teacher" in ptypes else "",
            }
        )

    professionals.sort(key=lambda x: ((x["rating_avg"] or 0), x["username"]), reverse=True)

    initial_type = canonicalize_type(request.args.get("type") or "") or ""

    known_language_labels = [lang["label"] for lang in LANGUAGE_OPTIONS]
    custom_language_labels = sorted({
        lang
        for p in professionals
        for lang in (p.get("languages") or [])
        if lang and lang not in known_language_labels
    })
    language_options = known_language_labels + custom_language_labels
    area_options = sorted({a for p in professionals for a in (p.get("areas") or []) if a})
    type_options = PROFESSIONAL_TYPES
    type_labels = TYPE_LABELS

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
