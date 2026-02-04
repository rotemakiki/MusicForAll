# utils/permissions.py - הרשאות ותפקידים באתר
# תפקידים: admin, teacher, musician, student
# אורח = אין session (לא רשום)

ROLE_ADMIN = "admin"
ROLE_TEACHER = "teacher"
ROLE_MUSICIAN = "musician"
ROLE_STUDENT = "student"

ALL_ROLES = (ROLE_ADMIN, ROLE_TEACHER, ROLE_MUSICIAN, ROLE_STUDENT)


def get_roles(session):
    """מחזיר רשימת תפקידים מה-session."""
    return session.get("roles") or []


def is_guest(session):
    """האם המשתמש אורח (לא מחובר)."""
    return "user_id" not in session or not session.get("user_id")


def is_admin(roles):
    """האם אדמין - גישה מלאה."""
    return ROLE_ADMIN in (roles or [])


def is_teacher(roles):
    """האם מורה."""
    return ROLE_TEACHER in (roles or [])


def is_musician(roles):
    """האם מוסיקאי (פעיל)."""
    return ROLE_MUSICIAN in (roles or [])


def is_student(roles):
    """האם תלמיד."""
    return ROLE_STUDENT in (roles or [])


def can_upload_songs(roles):
    """הרשאה להעלאת שירים: אדמין, מורה, מוסיקאי."""
    r = roles or []
    return ROLE_ADMIN in r or ROLE_TEACHER in r or ROLE_MUSICIAN in r


def can_manage_courses(roles):
    """הרשאה ליצירה/עריכה/ניהול קורסים: אדמין, מורה, מוסיקאי."""
    r = roles or []
    return ROLE_ADMIN in r or ROLE_TEACHER in r or ROLE_MUSICIAN in r


def can_edit_any_content(roles):
    """הרשאה לעריכת תוכן של אחרים (למשל מחיקת שירים): רק אדמין."""
    return is_admin(roles or [])


def can_view_student_lists(roles):
    """הרשאה לצפות ברשימות תלמידים: מורה (ואדמין)."""
    r = roles or []
    return ROLE_ADMIN in r or ROLE_TEACHER in r


def can_have_teacher_profile(roles):
    """האם יש פרופיל מורה (כולל רשימת תלמידים, יצירת קשר): מורה."""
    return is_teacher(roles)


def can_have_musician_profile(roles):
    """האם יש פרופיל אמן (שירים, הופעות, תגובות): מוסיקאי או מורה (למורה יש גם פרופיל מורה)."""
    r = roles or []
    return ROLE_MUSICIAN in r or ROLE_TEACHER in r


def can_add_to_my_songs(roles):
    """הרשאה להוסיף שירים ל'השירים שלי': תלמיד, מורה, מוסיקאי, אדמין - כל משתמש מחובר מלבד אורח."""
    return bool(roles)


def can_purchase_courses(roles):
    """הרשאה לרכישת קורסים: משתמש מחובר (תלמיד וכו')."""
    return bool(roles)


def can_watch_videos(session):
    """הרשאה לצפות בסרטונים (שירים, הדרכות): רק משתמש מחובר, לא אורח."""
    return not is_guest(session)


def can_contact_teacher(session):
    """הרשאה ליצירת קשר עם מורה: משתמש מחובר."""
    return not is_guest(session)
