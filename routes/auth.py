# routes/auth.py - החלף את הקובץ הקיים במלואו
from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from firebase_config import db
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

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
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        force_login = request.form.get('force_login') == 'true'

        user_query = db.collection("users").where("email", "==", email).get()
        if not user_query:
            flash("Invalid email or password!", "error")
            return redirect(url_for('auth.login'))

        user_doc = user_query[0]
        user = user_doc.to_dict()

        if not check_password_hash(user['password'], password):
            flash("Invalid email or password!", "error")
            return redirect(url_for('auth.login'))

        # 🆕 בדיקה אם המשתמש כבר מחובר
        if user.get('is_logged_in') and not force_login:
            # הצג אפשרות כפוי התחברות עם שמירת האימייל
            flash("המשתמש כבר מחובר ממכשיר אחר. הכנס את הסיסמה שוב לכפוי התחברות.", "warning")
            return render_template('login.html',
                show_force_login=True,
                email=email,
                user_already_logged_in=True)

        # התחברות (רגילה או כפויה)
        session['user_id'] = user_doc.id
        session['username'] = user['username']
        session['roles'] = user['roles']
        session['profile_image'] = user.get('profile_image', '')

        # עדכן שהמשתמש מחובר
        db.collection("users").document(user_doc.id).update({
            "is_logged_in": True,
            "last_login": datetime.utcnow()
        })

        if force_login:
            flash("התחברת בהצלחה! (נותקת ממכשירים אחרים)", "success")
        else:
            flash("Login successful!", "success")

        return redirect(url_for('home'))

    return render_template('login.html')

# 🆕 API להתנתקות אוטומטית
@auth_bp.route('/api/auto_logout', methods=['POST'])
def auto_logout():
    user_id = session.get('user_id')
    if user_id:
        db.collection("users").document(user_id).update({"is_logged_in": False})
        flash("התנתקת אוטומטית בגלל חוסר פעילות", "info")
    session.clear()
    return jsonify({"success": True})

# 🆕 API לבדיקת סשן
@auth_bp.route('/api/check_session', methods=['GET'])
def check_session():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"valid": False})

    # בדוק אם המשתמש עדיין מחובר ב-DB
    try:
        user_doc = db.collection("users").document(user_id).get()
        if user_doc.exists and user_doc.to_dict().get('is_logged_in'):
            return jsonify({"valid": True})
        else:
            session.clear()
            return jsonify({"valid": False})
    except:
        return jsonify({"valid": False})

@auth_bp.route('/logout')
def logout():
    user_id = session.get('user_id')
    if user_id:
        db.collection("users").document(user_id).update({"is_logged_in": False})
    session.clear()
    flash("התנתקת מהמערכת", "success")
    return redirect(url_for('home'))
