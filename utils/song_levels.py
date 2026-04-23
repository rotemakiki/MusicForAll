# רמות ליווי (גיטרת ליווי) 0–10 — כותרת ותיאור להצגה למורים ולתלמידים

ACCOMPANIMENT_LEVELS = [
    {
        "level": 0,
        "title": "ללא ליווי",
        "description": "שיר שבו יש רק מלודיה ומנגנת רק גיטרה מובילה (Lead) בלי ליווי גיטרה.",
    },
    {
        "level": 1,
        "title": "מתחילים",
        "description": "רק אקורדים פתוחים (CAGED) קלים, מקצב 4/4 בלבד ונגינה יחסית איטית. רוב התלמידים בשלב זה מתמקדים במעברי אקורדים, לרוב בלי פריטות מורכבות.",
    },
    {
        "level": 2,
        "title": "ליווי בסיסי",
        "description": "לפחות אקורד אחד עם ברה, מעברים יחסית איטיים, פריטות פשוטות — מתאים לנגנים בתחילת הדרך.",
    },
    {
        "level": 3,
        "title": "תופסים קצב",
        "description": "אקורדי ברה או פאוור קורדס, מעברים מהירים יותר ופריטות מגוונות ומעניינות יותר.",
    },
    {
        "level": 4,
        "title": "פירוקי אקורדים",
        "description": "ארפג'יו בליווי, לעיתים עם אלמנטים של Hammer-on ו-Pull-off.",
    },
    {
        "level": 5,
        "title": "משקלים פשוטים",
        "description": "מקצב שונה מ-4/4 (למשל 3/4 או 6/8) — עדיין עם אקורדים פתוחים וברה (משולשים).",
    },
    {
        "level": 6,
        "title": "מרובעים",
        "description": "אקורדים מרובעים כמו 7 או Maj7 — דורש היכרות תיאורטית ונגינה רציפה.",
    },
    {
        "level": 7,
        "title": "מחומשים",
        "description": "אקורדים מורכבים יותר (Add וכו') ופריטות שעשויות להיות מאתגרות.",
    },
    {
        "level": 8,
        "title": "משקלים מורכבים",
        "description": "מקצבים לא סטנדרטיים כמו 5/8, 7/8 וכו'.",
    },
    {
        "level": 9,
        "title": "משקלים מתחלפים",
        "description": "מספר משקלים שמתחלפים במהלך הנגינה.",
    },
    {
        "level": 10,
        "title": "קורדס מלודי (פינגרסטייל)",
        "description": "שילוב מתקדם של אקורדים ומלודיית הזמר — דורש שליטה תיאורטית וטכנית גבוהה.",
    },
]

SOLO_LEVELS = [
    {"level": 0, "title": "ללא סולו", "description": "אין חלק סולו/מלודיה מוביל מובהק בשיר."},
    {"level": 1, "title": "סולו קצר ופשוט", "description": "מלודיה קצרה, איטית יחסית, בעיקר תווים בודדים ומעברים קלים."},
    {"level": 2, "title": "סולו בסיסי", "description": "כולל קפיצות מיתרים קלות/סליידים בסיסיים ולעיתים בנדים קלים."},
    {"level": 3, "title": "סולו בקצב", "description": "משפטים מהירים יותר, שילוב טכניקות בסיסיות כמו Hammer-on/Pull-off."},
    {"level": 4, "title": "סולו מגוון", "description": "טכניקות מגוונות יותר (בנדים מדויקים, סליידים, ויברטו) לאורך זמן."},
    {"level": 5, "title": "סולו בינוני", "description": "רצפים מהירים יותר, נדרשת שליטה בקצב ובדיוק אצבעות."},
    {"level": 6, "title": "סולו מתקדם", "description": "כולל ליקים מהירים, מעבר בין פוזיציות, ולעיתים פרזינג מורכב."},
    {"level": 7, "title": "סולו מהיר ומורכב", "description": "שליטה גבוהה בטכניקה, תזמון, ודיוק לאורך סולו ארוך יותר."},
    {"level": 8, "title": "סולו וירטואוזי", "description": "קטעים מהירים מאוד/טכניקות מתקדמות (למשל טאפינג בסיסי) בהתאם לשיר."},
    {"level": 9, "title": "סולו קיצוני", "description": "טכניקות מתקדמות ותזמון מורכב לאורך זמן."},
    {"level": 10, "title": "מאסטר", "description": "רמת סולו גבוהה במיוחד: מהירות, דיוק, דינמיקה ושליטה מלאה."},
]


def _clamp_int_level(value, default):
    if value is None or value == "":
        return default
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(0, min(10, n))


def normalize_accompaniment_level(song: dict) -> int:
    raw = song.get("accompaniment_level")
    if raw is not None and raw != "":
        try:
            return max(0, min(10, int(raw)))
        except (TypeError, ValueError):
            pass
    legacy = song.get("difficulty")
    if legacy == "beginner":
        return 2
    if legacy == "intermediate":
        return 5
    if legacy == "advanced":
        return 8
    return 1


def normalize_lead_level(song: dict) -> int:
    raw = song.get("lead_level")
    if raw is None or raw == "":
        return 0
    return _clamp_int_level(raw, 0)


def attach_song_level_fields(song: dict) -> None:
    """מוסיף ל-dict של השיר שדות מנורמלים ותוויות לתצוגה."""
    acc = normalize_accompaniment_level(song)
    lead = normalize_lead_level(song)
    song["accompaniment_level"] = acc
    song["lead_level"] = lead
    meta = ACCOMPANIMENT_LEVELS[acc]
    song["accompaniment_level_title"] = meta["title"]
    song["accompaniment_level_description"] = meta["description"]


def attach_song_level_fields_with_tables(song: dict, accompaniment_levels=None) -> None:
    """
    כמו attach_song_level_fields, אבל מאפשר להעביר טבלת רמות דינמית (למשל מתוך Firestore).
    מונע גישה קבועה ל-ACCOMPANIMENT_LEVELS במקרה שיש override.
    """
    acc = normalize_accompaniment_level(song)
    lead = normalize_lead_level(song)
    song["accompaniment_level"] = acc
    song["lead_level"] = lead
    levels = accompaniment_levels or ACCOMPANIMENT_LEVELS
    try:
        meta = levels[acc]
    except Exception:
        meta = ACCOMPANIMENT_LEVELS[acc]
    song["accompaniment_level_title"] = meta.get("title", "")
    song["accompaniment_level_description"] = meta.get("description", "")


def parse_level_payload(value):
    """מקבל ערך מ-JSON (מספר או מחרוזת) ומחזיר 0–10 או None אם לא תקין."""
    if value is None:
        return None
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None
    if n < 0 or n > 10:
        return None
    return n
