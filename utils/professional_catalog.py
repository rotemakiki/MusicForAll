"""Shared professional-service categories for directory + profile editing."""

from __future__ import annotations

# Single source of truth — used by /professionals filters and profile edit UI.
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

VALID_TYPE_IDS = {t["id"] for t in PROFESSIONAL_TYPES}
TYPE_LABELS = {t["id"]: t["label"] for t in PROFESSIONAL_TYPES}
LABEL_TO_ID = {t["label"]: t["id"] for t in PROFESSIONAL_TYPES}

# Legacy / free-text values that may exist in Firestore.
_TYPE_ALIASES: dict[str, str] = {
    "מפיק": "producer",
    "מפיק מוסיקלי": "producer",
    "music producer": "producer",
    "producer": "producer",
    "סשניסט": "session_musician",
    "נגן": "session_musician",
    "session musician": "session_musician",
    "session_musician": "session_musician",
    "מורה": "teacher",
    "teacher": "teacher",
    "אולפן": "studio",
    "אולפן הקלטות": "studio",
    "חדר חזרות": "rehearsal_room",
    "סטאפיסט": "setup",
    "טכנאי מיקס": "mix_engineer",
    "טכנאי מאסטר": "mastering_engineer",
    "טכנאי סאונד": "soundman",
    "סאונדמן": "soundman",
}

# Fields that may hold service selections (old or alternate names).
_SERVICE_FIELDS = (
    "professional_types",
    "additional_services",
    "additional_professional_types",
    "offered_services",
    "services",
    "שירותים_נוספים",
)


def norm_list(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        parts = [p.strip() for p in value.split(",")]
        return [p for p in parts if p]
    s = str(value).strip()
    return [s] if s else []


def canonicalize_type(raw: str) -> str | None:
    s = (raw or "").strip()
    if not s:
        return None
    if s in VALID_TYPE_IDS:
        return s
    if s in LABEL_TO_ID:
        return LABEL_TO_ID[s]
    key = s.lower().replace(" ", "_").replace("-", "_")
    if key in VALID_TYPE_IDS:
        return key
    if s in _TYPE_ALIASES:
        return _TYPE_ALIASES[s]
    if key in _TYPE_ALIASES:
        return _TYPE_ALIASES[key]
    return None


def _types_from_service_fields(user: dict) -> set[str]:
    found: set[str] = set()
    for field in _SERVICE_FIELDS:
        for item in norm_list(user.get(field)):
            cid = canonicalize_type(item)
            if cid:
                found.add(cid)
    for tid in VALID_TYPE_IDS:
        if tid == "teacher":
            continue
        if user.get(tid) is True:
            found.add(tid)
    return found


def infer_professional_types(user: dict) -> list[str]:
    """Resolve all service tags for directory listing and profile display."""
    roles = user.get("roles") or []
    types = _types_from_service_fields(user)
    if "teacher" in roles:
        types.add("teacher")
    return sorted(types & VALID_TYPE_IDS)


def additional_type_options() -> list[dict[str, str]]:
    """Types a user can opt into beyond the automatic 'teacher' role."""
    return [t for t in PROFESSIONAL_TYPES if t["id"] != "teacher"]


def parse_additional_types_from_form(values: list[str]) -> list[str]:
    selected: list[str] = []
    for raw in values or []:
        cid = canonicalize_type(raw)
        if cid and cid != "teacher" and cid in VALID_TYPE_IDS:
            selected.append(cid)
    return sorted(set(selected))


def merge_professional_types_for_save(roles: list[str], additional: list[str]) -> list[str]:
    types = set(parse_additional_types_from_form(additional))
    if "teacher" in (roles or []):
        types.add("teacher")
    return sorted(types & VALID_TYPE_IDS)


def current_additional_types(user: dict) -> list[str]:
    return [t for t in infer_professional_types(user) if t != "teacher"]
