# routes/auth.py
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
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

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for('auth.login'))

    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        user_query = db.collection("users").where("email", "==", email).get()
        if not user_query:
            flash("Invalid email or password!", "error")
            return redirect(url_for('auth.login'))

        user_doc = user_query[0]
        user = user_doc.to_dict()

        if user.get('is_logged_in'):
            flash("המשתמש כבר מחובר ממכשיר אחר!", "error")
            return redirect(url_for('auth.login'))

        if not check_password_hash(user['password'], password):
            flash("Invalid email or password!", "error")
            return redirect(url_for('auth.login'))

        session['user_id'] = user_doc.id
        session['username'] = user['username']
        session['roles'] = user['roles']
        session['profile_image'] = user.get('profile_image', '')

        db.collection("users").document(user_doc.id).update({"is_logged_in": True})

        flash("Login successful!", "success")
        return redirect(url_for('home'))

    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    user_id = session.get('user_id')
    if user_id:
        db.collection("users").document(user_id).update({"is_logged_in": False})
    session.clear()
    flash("התנתקת מהמערכת", "success")
    return redirect(url_for('home'))
