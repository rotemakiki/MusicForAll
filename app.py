import mimetypes

from flask import Flask, session, render_template, request, jsonify
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
from datetime import datetime
import os

app = Flask(__name__, static_folder='static')
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')  # חשוב להודעת flash ול-session

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
    # הוספת timestamp לבקשה
    request.start_time = datetime.utcnow()

    # לוגים לבקשות API (רק בדיבוג)
    if request.path.startswith('/api/') and app.debug:
        print(f"API Request: {request.method} {request.path} from {request.remote_addr}")


@app.after_request
def after_request(response):
    """הרצה אחרי כל בקשה"""
    # הוספת headers לביטחון
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'

    # CORS headers לAPI
    if request.path.startswith('/api/'):
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'

    # מדידת זמן תגובה (רק בדיבוג)
    if hasattr(request, 'start_time') and app.debug:
        duration = (datetime.utcnow() - request.start_time).total_seconds()
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
        "timestamp": datetime.utcnow().isoformat(),
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
        test_doc.set({"timestamp": datetime.utcnow(), "status": "ok"})
        database_status = "connected"
    except Exception as e:
        database_status = f"error: {str(e)}"

    status_info = {
        "system_status": "operational",
        "database_status": database_status,
        "timestamp": datetime.utcnow().isoformat(),
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

@app.route('/')
def home():
    """דף הבית"""
    if 'user_id' in session:
        return render_template('home_user.html')
    else:
        return render_template('home_guest.html')


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
            "timestamp": datetime.utcnow().isoformat(),
            "user_authenticated": 'user_id' in session
        }), 200


# =============================================================================
# הרצת האפליקציה
# =============================================================================

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("DEBUG", "True").lower() == "true"

    print(f"[*] Music App starting on port {port}")
    print(f"[*] Debug mode: {debug_mode}")
    print(f"[*] Chord System v2.0 enabled")

    app.run(debug=debug_mode, host='0.0.0.0', port=port)
