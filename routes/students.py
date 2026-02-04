from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from firebase_admin import firestore

students_bp = Blueprint('students', __name__)

@students_bp.route('/profile')
def user_profile():
    if 'user_id' not in session:
        flash("יש להתחבר כדי לגשת לפרופיל", "error")
        return redirect(url_for('auth.login'))

    user_id = session['user_id']
    user_doc = firestore.client().collection("users").document(user_id).get()

    if not user_doc.exists:
        return "המשתמש לא נמצא", 404

    user = user_doc.to_dict()
    user["id"] = user_id

    roles = user.get("roles", [])
    if "teacher" in roles:
        return redirect(url_for('teachers.teacher_profile', teacher_id=user_id))
    elif "musician" in roles:
        return redirect(url_for('teachers.musician_profile', musician_id=user_id))
    elif "student" in roles:
        return render_template("student_profile.html", student=user)
    elif "admin" in roles:
        return "Admin profile (להרחיב בהמשך)"
    else:
        return "תפקיד לא מוכר", 400

@students_bp.route('/api/students/<string:student_id>', methods=['GET'])
def get_student_profile(student_id):
    doc = firestore.client().collection("users").document(student_id).get()
    if not doc.exists:
        return jsonify({"error": "Student not found"}), 404

    user = doc.to_dict()
    roles = user.get("roles", [])
    if "student" not in roles:
        return jsonify({"error": "User is not a student"}), 400

    result = {
        "id": student_id,
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "interests": user.get("interests", ""),
        "style": user.get("style", ""),
        "future_learning": user.get("future_learning", "")
    }
    return jsonify(result), 200

@students_bp.route('/api/students/<string:student_id>', methods=['PATCH'])
def update_student_profile(student_id):
    if 'user_id' not in session or session['user_id'] != student_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()

    updated_fields = {
        "username": data.get("username", ""),
        "interests": data.get("interests", ""),
        "style": data.get("style", ""),
        "future_learning": data.get("future_learning", "")
    }

    firestore.client().collection("users").document(student_id).update(updated_fields)
    return jsonify({"message": "Profile updated successfully"}), 200
