# routes/auth.py - החלף את הקובץ הקיים במלואו
import hashlib
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from firebase_config import db

auth_bp = Blueprint('auth', __name__)

REMEMBER_COOKIE_NAME = "music_for_all_remember"
REMEMBER_TOKEN_DAYS = 30


def _hash_remember_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _is_secure_request():
    return request.is_secure or request.headers.get("X-Forwarded-Proto", "").lower() == "https"


def _set_login_session(user_id, user, remember_me=False, token_hash=None):
    session.permanent = remember_me
    session['user_id'] = user_id
    session['username'] = user['username']
    session['roles'] = user['roles']
    session['profile_image'] = user.get('profile_image', '')
    session['remember_me'] = remember_me
    if token_hash:
        session['remember_token_hash'] = token_hash


def _create_remember_token(user_id):
    token = secrets.token_urlsafe(32)
    token_hash = _hash_remember_token(token)
    expires_at = datetime.utcnow() + timedelta(days=REMEMBER_TOKEN_DAYS)

    db.collection("remember_tokens").document(token_hash).set({
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "last_used_at": datetime.utcnow(),
        "expires_at": expires_at,
        "expires_at_ts": int(expires_at.timestamp()),
    })

    return token, token_hash


def _attach_remember_cookie(response, token):
    max_age = REMEMBER_TOKEN_DAYS * 24 * 60 * 60
    response.set_cookie(
        REMEMBER_COOKIE_NAME,
        token,
        max_age=max_age,
        httponly=True,
        secure=_is_secure_request(),
        samesite="Lax",
    )


def _delete_remember_token(token):
    if not token:
        return
    db.collection("remember_tokens").document(_hash_remember_token(token)).delete()


@auth_bp.before_app_request
def restore_remembered_session():
    if session.get('user_id'):
        return

    token = request.cookies.get(REMEMBER_COOKIE_NAME)
    if not token:
        return

    token_hash = _hash_remember_token(token)
    token_ref = db.collection("remember_tokens").document(token_hash)
    token_doc = token_ref.get()

    if not token_doc.exists:
        return

    token_data = token_doc.to_dict() or {}
    expires_at_ts = token_data.get("expires_at_ts", 0)
    if expires_at_ts < int(datetime.utcnow().timestamp()):
        token_ref.delete()
        return

    user_id = token_data.get("user_id")
    if not user_id:
        token_ref.delete()
        return

    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        token_ref.delete()
        return

    user = user_doc.to_dict() or {}
    _set_login_session(user_doc.id, user, remember_me=True, token_hash=token_hash)

    token_ref.update({"last_used_at": datetime.utcnow()})
    db.collection("users").document(user_doc.id).update({
        "is_logged_in": True,
        "last_login": datetime.utcnow(),
    })

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        role = request.form['role']
        if role not in ('student', 'teacher', 'musician'):
            flash("תפקיד לא תקין", "error")
            return redirect(url_for('auth.register'))

        # Check if email exists
        existing_users = db.collection("users").where("email", "==", email).get()
        if existing_users:
            flash("Email is already registered!", "error")
            return redirect(url_for('auth.register'))

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

        new_user = {
            "username": username,
            "email": email,
            "roles": [role],
            "password": hashed_password,
            "created_at": datetime.utcnow(),
            "is_logged_in": False,
            "profile_image": "",
        }

        if role == 'teacher':
            new_user["instruments"] = ""
            new_user["styles"] = ""
            new_user["is_available"] = False

        db.collection("users").add(new_user)

        if role == 'teacher':
            doc_ref = db.collection("users").where("email", "==", email).get()[0]
            return redirect(url_for('teachers.edit_teacher_profile', teacher_id=doc_ref.id))
        if role == 'musician':
            doc_ref = db.collection("users").where("email", "==", email).get()[0]
            flash("ההרשמה הושלמה! תוכל לערוך את פרופיל האמן מהפרופיל שלך.", "success")
            return redirect(url_for('teachers.musician_profile', musician_id=doc_ref.id))

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for('auth.login'))

    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('user_id'):
        return redirect(url_for('home'))

    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        force_login = request.form.get('force_login') == 'true'
        remember_me = request.form.get('remember_me') in ('on', 'true')

        user_query = db.collection("users").where("email", "==", email).get()
        if not user_query:
            flash("Invalid email or password!", "error")
            return redirect(url_for('auth.login'))

        user_doc = user_query[0]
        user = user_doc.to_dict()

        if not check_password_hash(user['password'], password):
            flash("Invalid email or password!", "error")
            return redirect(url_for('auth.login'))

        # אם הסיסמה כבר אומתה, אין צורך לבקש אותה שוב רק בגלל חיבור קודם.
        if user.get('is_logged_in') and not force_login:
            force_login = True

        # התחברות (רגילה או כפויה)
        _set_login_session(user_doc.id, user, remember_me=remember_me)

        # עדכן שהמשתמש מחובר
        db.collection("users").document(user_doc.id).update({
            "is_logged_in": True,
            "last_login": datetime.utcnow()
        })

        if force_login:
            flash("התחברת בהצלחה! (נותקת ממכשירים אחרים)", "success")
        else:
            flash("Login successful!", "success")

        response = redirect(url_for('home'))
        if remember_me:
            token, token_hash = _create_remember_token(user_doc.id)
            session['remember_token_hash'] = token_hash
            _attach_remember_cookie(response, token)
        else:
            response.delete_cookie(REMEMBER_COOKIE_NAME)

        return response

    return render_template('login.html')

# 🆕 API להתנתקות אוטומטית
@auth_bp.route('/api/auto_logout', methods=['POST'])
def auto_logout():
    user_id = session.get('user_id')
    if session.get('remember_me'):
        return jsonify({"success": True, "remembered": True})

    if user_id:
        db.collection("users").document(user_id).update({"is_logged_in": False})
        flash("התנתקת אוטומטית בגלל חוסר פעילות", "info")
    session.clear()
    response = jsonify({"success": True})
    response.delete_cookie(REMEMBER_COOKIE_NAME)
    return response

# 🆕 API לבדיקת סשן
@auth_bp.route('/api/check_session', methods=['GET'])
def check_session():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"valid": False})

    # בדוק אם המשתמש עדיין מחובר ב-DB
    try:
        user_doc = db.collection("users").document(user_id).get()
        if user_doc.exists and (user_doc.to_dict().get('is_logged_in') or session.get('remember_me')):
            return jsonify({"valid": True})
        else:
            session.clear()
            return jsonify({"valid": False})
    except:
        return jsonify({"valid": False})

@auth_bp.route('/logout')
def logout():
    user_id = session.get('user_id')
    remember_token = request.cookies.get(REMEMBER_COOKIE_NAME)
    if user_id:
        db.collection("users").document(user_id).update({"is_logged_in": False})
    _delete_remember_token(remember_token)
    session.clear()
    flash("התנתקת מהמערכת", "success")
    response = redirect(url_for('home'))
    response.delete_cookie(REMEMBER_COOKIE_NAME)
    return response
