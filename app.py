import mimetypes

from flask import Flask, session, render_template, request, jsonify, redirect, url_for
from routes.auth import auth_bp
from routes.products import products_bp
from routes.songs import songs_bp
from routes.teachers import teachers_bp
from routes.students import students_bp
from routes.info import info_bp
from routes.videos import videos_bp
from routes.courses import courses_bp
from routes.my_songs import my_songs_bp
from routes.tutorials import tutorials_bp
from routes.general import general_bp
from routes.chords_system import chords_system_bp  # קובץ חדש
from datetime import datetime, timezone
import os

app = Flask(__name__, static_folder='static')

# הגדרת SECRET_KEY - חובה בפרודקשן!
secret_key = os.environ.get('SECRET_KEY')
if not secret_key:
    # בודק אם זה Render (Render מגדיר PORT אוטומטית)
    is_render = os.environ.get('RENDER') or (os.environ.get('PORT') and not os.environ.get('VIRTUAL_ENV'))
    
    if is_render:
        # ב-Render חייב להיות SECRET_KEY!
        error_msg = """
╔═══════════════════════════════════════════════════════════╗
║  שגיאה: SECRET_KEY חסר!                                    ║
╠═══════════════════════════════════════════════════════════╣
║  אתה צריך להגדיר SECRET_KEY ב-Render Dashboard:          ║
║                                                           ║
║  1. לך ל-Render Dashboard                                ║
║  2. בחר את ה-Service שלך (music-for-all)                 ║
║  3. לך ל-Settings > Environment                          ║
║  4. לחץ "Add Environment Variable"                        ║
║  5. שם: SECRET_KEY                                        ║
║  6. ערך: [ראה הוראות למטה]                               ║
║                                                           ║
║  יצירת SECRET_KEY:                                        ║
║  python -c "import secrets; print(secrets.token_hex(32))"║
║                                                           ║
║  אחרי שתגדיר, לחץ "Save Changes" והשירות יתעדכן         ║
╚═══════════════════════════════════════════════════════════╝
        """
        raise ValueError(error_msg)
    
    # רק לפיתוח מקומי - לא בפרודקשן!
    print("⚠️  WARNING: Using default SECRET_KEY (NOT SECURE FOR PRODUCTION!)")
    secret_key = 'dev-secret-key-change-in-production'

app.secret_key = secret_key

mimetypes.add_type('application/javascript', '.js')

# רישום כל ה-blueprints:
app.register_blueprint(auth_bp)
app.register_blueprint(songs_bp)
app.register_blueprint(teachers_bp)
app.register_blueprint(students_bp)
app.register_blueprint(info_bp)
app.register_blueprint(videos_bp)
app.register_blueprint(courses_bp)
app.register_blueprint(tutorials_bp)
app.register_blueprint(general_bp)
app.register_blueprint(my_songs_bp)
app.register_blueprint(products_bp)
app.register_blueprint(chords_system_bp)  # הוספת המערכת החדשה

# =============================================================================
# MIDDLEWARE לשיפור ביצועים ומעקב
# =============================================================================

@app.before_request
def before_request():
    """הרצה לפני כל בקשה"""
    # בדיקה אם זה localhost - לא לעשות redirect ב-localhost
    is_localhost = (
        request.host.startswith('127.0.0.1') or 
        request.host.startswith('localhost') or 
        '127.0.0.1' in request.host or
        request.host.startswith('10.') or  # גם כתובות IP פנימיות
        request.remote_addr in ['127.0.0.1', '::1'] or
        'localhost' in request.host.lower()
    )
    
    # Redirect מ-www.musicaforall.com ל-musicaforall.com (לא ב-localhost)
    # צריך לעשות את זה לפני ה-redirect ל-HTTPS כדי למנוע redirect כפול
    if request.host.startswith('www.') and not is_localhost:
        # החלף את ה-URL כדי להסיר www, ושמור על הפרוטוקול
        url = request.url.replace('www.', '', 1)
        # אם זה HTTP, שנה ל-HTTPS
        if url.startswith('http://'):
            url = url.replace('http://', 'https://', 1)
        return redirect(url, code=301)
    
    # Redirect מ-HTTP ל-HTTPS (בפרודקשן בלבד, לא ב-localhost)
    # Render שולח header X-Forwarded-Proto שמציין את הפרוטוקול המקורי
    # חשוב: לעולם לא לעשות redirect ב-localhost!
    if not is_localhost and not app.debug:
        # בדיקה משופרת לזיהוי HTTP - בודקים מספר מקורות
        forwarded_proto = request.headers.get('X-Forwarded-Proto', '').lower()
        forwarded_ssl = request.headers.get('X-Forwarded-Ssl', '').lower()
        url_is_http = request.url.startswith('http://')
        
        # ב-Render, X-Forwarded-Proto הוא הדרך האמינה ביותר
        # אם הוא 'http' או חסר והבקשה היא HTTP, צריך redirect
        needs_https_redirect = False
        
        if forwarded_proto == 'http':
            needs_https_redirect = True
        elif forwarded_proto == 'https':
            needs_https_redirect = False
        elif forwarded_ssl == 'on':
            needs_https_redirect = False
        elif url_is_http:
            # אם אין X-Forwarded-Proto אבל ה-URL הוא HTTP, נניח שצריך redirect
            # זה יכול לקרות אם ה-DNS לא מוגדר נכון אבל הבקשה מגיעה בכל זאת
            needs_https_redirect = True
        
        if needs_https_redirect:
            # ב-Render, צריך לבנות את ה-URL עם הדומיין הנכון
            url = request.url.replace('http://', 'https://', 1)
            return redirect(url, code=301)
    
    # הוספת timestamp לבקשה
    request.start_time = datetime.now(timezone.utc)

    # לוגים לבקשות API (רק בדיבוג)
    if request.path.startswith('/api/') and app.debug:
        print(f"API Request: {request.method} {request.path} from {request.remote_addr}")


@app.after_request
def after_request(response):
    """הרצה אחרי כל בקשה"""
    # הוספת headers לביטחון - חשוב מאוד!
    response.headers['X-Content-Type-Options'] = 'nosniff'
    # X-Frame-Options לא מוגדר – שליטה ב־iframe רק דרך CSP (frame-src). DENY חסם הטמעת יוטיוב באתר.
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Strict Transport Security (HSTS) - רק ב-HTTPS ולא ב-localhost
    is_localhost = request.host.startswith('127.0.0.1') or request.host.startswith('localhost') or '127.0.0.1' in request.host
    if (request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https') and not is_localhost:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    # Content Security Policy (CSP) - בסיסי
    # frame-src: חייב לאפשר יוטיוב (כולל תת-דומיינים) כדי שסרטונים ינוגנו באתר
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "img-src 'self' data: https: blob:; "
        "font-src 'self' https://cdnjs.cloudflare.com; "
        "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com https://*.youtube.com https://*.youtube-nocookie.com; "
        "connect-src 'self' https://*.googleapis.com; "
    )
    response.headers['Content-Security-Policy'] = csp

    # CORS headers לAPI
    if request.path.startswith('/api/'):
        origin = request.headers.get('Origin')
        # בפרודקשן, הגבל ל-domains מותרים
        allowed_origins = ['https://musicaforall.com', 'https://www.musicaforall.com']
        if app.debug or origin in allowed_origins or origin == 'http://localhost:5000':
            response.headers['Access-Control-Allow-Origin'] = origin or '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Allow-Credentials'] = 'true'

    # מדידת זמן תגובה (רק בדיבוג)
    if hasattr(request, 'start_time') and app.debug:
        duration = (datetime.now(timezone.utc) - request.start_time).total_seconds()
        if duration > 1.0:  # אזהרה על בקשות איטיות
            print(f"Slow request: {request.path} took {duration:.2f}s")

    return response


@app.errorhandler(404)
def not_found_error(error):
    """טיפול בשגיאות 404"""
    if request.path.startswith('/api/'):
        return jsonify({"error": "API endpoint not found", "path": request.path}), 404
    return render_template('errors/404.html'), 404


@app.errorhandler(500)
def internal_error(error):
    """טיפול בשגיאות 500"""
    if request.path.startswith('/api/'):
        return jsonify({"error": "Internal server error", "message": "Please try again later"}), 500
    return render_template('errors/500.html'), 500


@app.errorhandler(403)
def forbidden_error(error):
    """טיפול בשגיאות 403"""
    if request.path.startswith('/api/'):
        return jsonify({"error": "Forbidden", "message": "You don't have permission to access this resource"}), 403
    return render_template('errors/403.html'), 403


# =============================================================================
# API HEALTH CHECK ו-STATUS
# =============================================================================

@app.route('/api/health')
def api_health():
    """בדיקת תקינות API"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0",
        "services": {
            "chords_system": "active",
            "songs": "active",
            "auth": "active"
        }
    }), 200


@app.route('/api/status')
def api_status():
    """מידע מפורט על מצב המערכת"""
    # בדיקת חיבור למסד נתונים (בסיסי)
    try:
        from firebase_admin import firestore
        db = firestore.client()
        # בדיקה פשוטה
        test_doc = db.collection("_health_check").document("test")
        test_doc.set({"timestamp": datetime.now(timezone.utc), "status": "ok"})
        database_status = "connected"
    except Exception as e:
        database_status = f"error: {str(e)}"

    status_info = {
        "system_status": "operational",
        "database_status": database_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0",
        "environment": "production" if not app.debug else "development",
        "features": {
            "chord_system_v2": True,
            "loops_management": True,
            "chord_suggestions": True,
            "user_preferences": True,
            "auto_save": True
        }
    }

    return jsonify(status_info), 200


# =============================================================================
# דף הבית ונתיבים בסיסיים
# =============================================================================

def get_home_stats():
    """מחזיר ספירות אמיתיות מ-Firestore לתצוגה בעמוד הבית."""
    try:
        from firebase_admin import firestore
        db = firestore.client()
        songs_count = len(list(db.collection("songs").stream()))
        users = list(db.collection("users").stream())
        teachers_count = sum(1 for d in users if "teacher" in (d.to_dict().get("roles") or []))
        students_count = sum(1 for d in users if "student" in (d.to_dict().get("roles") or []))
        courses_docs = list(db.collection("courses").where("is_published", "==", True).stream())
        courses_count = len(courses_docs)
        lessons_count = sum(len((d.to_dict() or {}).get("lessons") or []) for d in courses_docs)
        videos_count = len(list(db.collection("videos").stream()))
        return {
            "songs_count": songs_count,
            "teachers_count": teachers_count,
            "students_count": students_count,
            "courses_count": courses_count,
            "lessons_count": lessons_count,
            "videos_count": videos_count,
        }
    except Exception:
        return {
            "songs_count": 0,
            "teachers_count": 0,
            "students_count": 0,
            "courses_count": 0,
            "lessons_count": 0,
            "videos_count": 0,
        }


@app.route('/')
def home():
    """דף הבית"""
    stats = get_home_stats()
    if 'user_id' in session:
        user_stats = get_user_home_stats(session['user_id'])
        return render_template('home_user.html', stats=stats, user_stats=user_stats)
    else:
        return render_template('home_guest.html', stats=stats)


def get_user_home_stats(user_id):
    """ספירות אישיות למשתמש מחובר (רשימת שירים שלי וכו')."""
    try:
        from firebase_admin import firestore
        db = firestore.client()
        my_songs_count = len(list(db.collection("my_songs").where("user_id", "==", user_id).stream()))
        return {"my_songs_count": my_songs_count}
    except Exception:
        return {"my_songs_count": 0}


@app.route('/api/session-info')
def session_info():
    """מידע על ה-session הנוכחי (לדיבוג)"""
    if not app.debug:
        return jsonify({"error": "Not available in production"}), 403

    return jsonify({
        "user_id": session.get('user_id'),
        "roles": session.get('roles', []),
        "session_keys": list(session.keys()),
        "is_authenticated": 'user_id' in session
    }), 200


# =============================================================================
# נתיבים מיוחדים למערכת האקורדים החדשה
# =============================================================================

@app.route('/chords-system')
def chords_system_home():
    """דף הבית של מערכת האקורדים החדשה"""
    if 'user_id' not in session:
        return render_template('auth/login.html')

    return render_template('chords_system/home.html')


@app.route('/chords-builder')
def chords_builder():
    """בונה האקורדים החדש"""
    if 'user_id' not in session:
        return render_template('auth/login.html')

    return render_template('add_chords_base.html')


@app.route('/my-loops')
def my_loops():
    """עמוד הלופים שלי"""
    if 'user_id' not in session:
        return render_template('auth/login.html')

    return render_template('chords_system/my_loops.html')


# =============================================================================
# DEVELOPMENT HELPERS (רק בפיתוח)
# =============================================================================

if app.debug:
    @app.route('/dev/clear-session')
    def clear_session():
        """ניקוי session (לפיתוח בלבד)"""
        session.clear()
        return jsonify({"message": "Session cleared"}), 200

    @app.route('/dev/test-api')
    def test_api():
        """בדיקת API פשוטה (לפיתוח בלבד)"""
        return jsonify({
            "message": "API is working",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_authenticated": 'user_id' in session
        }), 200


# =============================================================================
# הרצת האפליקציה
# =============================================================================

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    
    # בדיקה אם זה Render (פרודקשן)
    is_render = os.environ.get('RENDER') is not None
    
    # ב-Render, DEBUG חייב להיות False בפרודקשן!
    # בפיתוח מקומי, ברירת מחדל היא True
    if is_render:
        debug_mode = False
    else:
        # בפיתוח מקומי - ברירת מחדל True, אלא אם כן הוגדר אחרת
        debug_mode = os.environ.get("DEBUG", "True").lower() == "true"
    
    # הגדרת debug mode באפליקציה
    app.debug = debug_mode

    print(f"[*] Music App starting on port {port}")
    print(f"[*] Debug mode: {debug_mode}")
    print(f"[*] Environment: {'Production' if not debug_mode else 'Development'}")
    print(f"[*] Chord System v2.0 enabled")
    
    # בפיתוח מקומי - HTTP בלבד (ללא HTTPS) כדי לטעון מיידית ללא אזהרות אבטחה
    # שרת מקומי עם תעודה self-signed גורם ל-Chrome להציג NET::ERR_CERT_AUTHORITY_INVALID
    ssl_context = None
    if debug_mode and not is_render:
        print(f"[*] Local development: Running on HTTP - open http://127.0.0.1:{port}")
        print(f"[*] No security warnings, page loads immediately")
    elif not debug_mode and not is_render:
        print(f"[*] Security: HTTPS redirects enabled")
        print(f"[*] Security: Security headers enabled")

    app.run(
        debug=debug_mode, 
        host='0.0.0.0', 
        port=port,
        ssl_context=ssl_context
    )
