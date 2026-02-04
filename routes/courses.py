from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, flash
from firebase_admin import firestore
from datetime import datetime
import json
from utils.permissions import get_roles, can_manage_courses, is_admin

courses_bp = Blueprint('courses', __name__)

# =============================================================================
# רשימת קורסים
# =============================================================================

@courses_bp.route('/courses')
def courses_list():
    """עמוד רשימת הקורסים"""
    return render_template('courses.html')

@courses_bp.route('/api/courses')
def api_courses():
    """API לקבלת כל הקורסים"""
    try:
        db = firestore.client()
        courses_ref = db.collection("courses").where("is_published", "==", True).stream()
        
        courses = []
        for doc in courses_ref:
            course_data = doc.to_dict()
            course_data['id'] = doc.id
            
            # חישוב דירוג ממוצע
            ratings = course_data.get('ratings', [])
            if ratings:
                avg_rating = sum(r.get('rating', 0) for r in ratings) / len(ratings)
                course_data['avg_rating'] = round(avg_rating, 1)
            else:
                course_data['avg_rating'] = 0
            
            # מספר ביקורות
            course_data['reviews_count'] = len(ratings)
            
            # מספר שיעורים
            lessons_count = len(course_data.get('lessons', []))
            course_data['lessons_count'] = lessons_count
            
            courses.append(course_data)
        
        return jsonify({"courses": courses, "success": True}), 200
    except Exception as e:
        print(f"Error getting courses: {e}")
        return jsonify({"error": "שגיאה בטעינת הקורסים", "success": False}), 500

# =============================================================================
# דף פרטי קורס
# =============================================================================

@courses_bp.route('/course/<string:course_id>')
def course_detail(course_id):
    """עמוד פרטי קורס"""
    try:
        db = firestore.client()
        course_doc = db.collection("courses").document(course_id).get()
        
        if not course_doc.exists:
            flash("קורס לא נמצא", "error")
            return redirect(url_for('courses.courses_list'))
        
        course = course_doc.to_dict()
        course['id'] = course_id
        
        # בדיקת גישה למשתמש
        user_id = session.get('user_id')
        has_access = False
        is_premium = False
        
        if user_id:
            user_doc = db.collection("users").document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                is_premium = user_data.get('is_premium', False)
                
                # בדיקה אם יש גישה לקורס
                if is_premium:
                    has_access = True
                else:
                    # בדיקה אם רכש את הקורס
                    purchased_courses = user_data.get('purchased_courses', [])
                    if course_id in purchased_courses:
                        has_access = True
        
        # חישוב דירוג ממוצע
        ratings = course.get('ratings', [])
        if ratings:
            avg_rating = sum(r.get('rating', 0) for r in ratings) / len(ratings)
            course['avg_rating'] = round(avg_rating, 1)
        else:
            course['avg_rating'] = 0
        
        course['reviews_count'] = len(ratings)
        
        # מידע על המורה
        teacher_id = course.get('teacher_id')
        teacher_name = "לא ידוע"
        if teacher_id:
            teacher_doc = db.collection("users").document(teacher_id).get()
            if teacher_doc.exists:
                teacher_data = teacher_doc.to_dict()
                teacher_name = teacher_data.get('username', 'לא ידוע')
        
        course['teacher_name'] = teacher_name
        
        # מספר שיעורים וזמן כולל
        lessons = course.get('lessons', [])
        course['lessons_count'] = len(lessons)
        total_duration = sum(lesson.get('duration_minutes', 0) for lesson in lessons)
        course['total_duration'] = total_duration
        
        return render_template('course_detail.html', 
                             course=course, 
                             has_access=has_access,
                             is_premium=is_premium,
                             user_id=user_id)
    except Exception as e:
        print(f"Error getting course: {e}")
        flash("שגיאה בטעינת הקורס", "error")
        return redirect(url_for('courses.courses_list'))

# =============================================================================
# דף שיעור
# =============================================================================

@courses_bp.route('/course/<string:course_id>/lesson/<int:lesson_number>')
def lesson_page(course_id, lesson_number):
    """עמוד שיעור"""
    try:
        db = firestore.client()
        course_doc = db.collection("courses").document(course_id).get()
        
        if not course_doc.exists:
            flash("קורס לא נמצא", "error")
            return redirect(url_for('courses.courses_list'))
        
        course = course_doc.to_dict()
        course['id'] = course_id
        
        # בדיקת גישה
        user_id = session.get('user_id')
        has_access = False
        is_premium = False
        
        if user_id:
            user_doc = db.collection("users").document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                is_premium = user_data.get('is_premium', False)
                
                if is_premium:
                    has_access = True
                else:
                    purchased_courses = user_data.get('purchased_courses', [])
                    if course_id in purchased_courses:
                        has_access = True
                    
                    # שיעור ראשון זמין לכולם
                    if lesson_number == 1:
                        has_access = True
        
        if not has_access:
            flash("אין לך גישה לשיעור זה. אנא רכש את הקורס או הירשם למנוי פרימיום", "error")
            return redirect(url_for('courses.course_detail', course_id=course_id))
        
        # מציאת השיעור
        lessons = course.get('lessons', [])
        lesson = None
        for l in lessons:
            if l.get('lesson_number') == lesson_number:
                lesson = l
                break
        
        if not lesson:
            flash("שיעור לא נמצא", "error")
            return redirect(url_for('courses.course_detail', course_id=course_id))
        
        # בדיקה אם השיעור נצפה
        watched_lessons = []
        if user_id:
            user_doc = db.collection("users").document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                watched_lessons = user_data.get('watched_lessons', {}).get(course_id, [])
        
        lesson['is_watched'] = lesson_number in watched_lessons
        
        # שיעורים נוספים בקורס
        all_lessons = sorted(lessons, key=lambda x: x.get('lesson_number', 0))
        
        return render_template('lesson.html',
                             course=course,
                             lesson=lesson,
                             all_lessons=all_lessons,
                             watched_lessons=watched_lessons,
                             user_id=user_id)
    except Exception as e:
        print(f"Error getting lesson: {e}")
        flash("שגיאה בטעינת השיעור", "error")
        return redirect(url_for('courses.courses_list'))

# =============================================================================
# API לסימון שיעור כנצפה
# =============================================================================

@courses_bp.route('/api/courses/<string:course_id>/lesson/<int:lesson_number>/watch', methods=['POST'])
def mark_lesson_watched(course_id, lesson_number):
    """סימון שיעור כנצפה"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    try:
        user_id = session['user_id']
        db = firestore.client()
        
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "משתמש לא נמצא", "success": False}), 404
        
        user_data = user_doc.to_dict()
        watched_lessons = user_data.get('watched_lessons', {})
        
        if course_id not in watched_lessons:
            watched_lessons[course_id] = []
        
        if lesson_number not in watched_lessons[course_id]:
            watched_lessons[course_id].append(lesson_number)
            user_ref.update({'watched_lessons': watched_lessons})
        
        return jsonify({"success": True, "message": "שיעור סומן כנצפה"}), 200
    except Exception as e:
        print(f"Error marking lesson as watched: {e}")
        return jsonify({"error": "שגיאה בסימון השיעור", "success": False}), 500

# =============================================================================
# API לרכישת קורס
# =============================================================================

@courses_bp.route('/api/courses/<string:course_id>/purchase', methods=['POST'])
def purchase_course(course_id):
    """רכישת קורס"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    try:
        user_id = session['user_id']
        db = firestore.client()
        
        # בדיקת קורס
        course_doc = db.collection("courses").document(course_id).get()
        if not course_doc.exists:
            return jsonify({"error": "קורס לא נמצא", "success": False}), 404
        
        course = course_doc.to_dict()
        price = course.get('price', 0)
        
        if price == 0:
            return jsonify({"error": "קורס זה חינמי", "success": False}), 400
        
        # בדיקת משתמש
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "משתמש לא נמצא", "success": False}), 404
        
        user_data = user_doc.to_dict()
        
        # בדיקה אם כבר רכש
        purchased_courses = user_data.get('purchased_courses', [])
        if course_id in purchased_courses:
            return jsonify({"error": "הקורס כבר נרכש", "success": False}), 400
        
        # כאן צריך להוסיף לוגיקת תשלום אמיתית
        # כרגע רק נוסיף לקורסים שנרכשו
        purchased_courses.append(course_id)
        user_ref.update({'purchased_courses': purchased_courses})
        
        # עדכון רווח למורה (90% מהמחיר)
        teacher_id = course.get('teacher_id')
        if teacher_id:
            teacher_ref = db.collection("users").document(teacher_id)
            teacher_doc = teacher_ref.get()
            if teacher_doc.exists:
                teacher_data = teacher_doc.to_dict()
                earnings = teacher_data.get('earnings', 0)
                teacher_share = price * 0.9  # 90% למורה
                teacher_ref.update({'earnings': earnings + teacher_share})
        
        return jsonify({
            "success": True,
            "message": "הקורס נרכש בהצלחה!",
            "course_id": course_id
        }), 200
    except Exception as e:
        print(f"Error purchasing course: {e}")
        return jsonify({"error": "שגיאה ברכישת הקורס", "success": False}), 500

# =============================================================================
# API להוספת דירוג וביקורת
# =============================================================================

@courses_bp.route('/api/courses/<string:course_id>/rating', methods=['POST'])
def add_rating(course_id):
    """הוספת דירוג וביקורת לקורס"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    try:
        user_id = session['user_id']
        data = request.get_json()
        rating = data.get('rating')
        review = data.get('review', '')
        
        if not rating or rating < 1 or rating > 5:
            return jsonify({"error": "דירוג לא תקין", "success": False}), 400
        
        db = firestore.client()
        course_ref = db.collection("courses").document(course_id)
        course_doc = course_ref.get()
        
        if not course_doc.exists:
            return jsonify({"error": "קורס לא נמצא", "success": False}), 404
        
        course = course_doc.to_dict()
        ratings = course.get('ratings', [])
        
        # בדיקה אם המשתמש כבר דירג
        for r in ratings:
            if r.get('user_id') == user_id:
                return jsonify({"error": "כבר דירגת את הקורס", "success": False}), 400
        
        # הוספת דירוג חדש
        user_doc = db.collection("users").document(user_id).get()
        username = "משתמש אנונימי"
        if user_doc.exists:
            username = user_doc.to_dict().get('username', 'משתמש אנונימי')
        
        ratings.append({
            'user_id': user_id,
            'username': username,
            'rating': rating,
            'review': review,
            'created_at': datetime.utcnow()
        })
        
        course_ref.update({'ratings': ratings})
        
        return jsonify({"success": True, "message": "דירוג נוסף בהצלחה"}), 200
    except Exception as e:
        print(f"Error adding rating: {e}")
        return jsonify({"error": "שגיאה בהוספת דירוג", "success": False}), 500

# =============================================================================
# API לניהול קורסים (למורים ומנהלים)
# =============================================================================

@courses_bp.route('/api/courses/create', methods=['POST'])
def create_course():
    """יצירת קורס חדש (מורים ומנהלים)"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    if not can_manage_courses(roles):
        return jsonify({"error": "אין הרשאה ליצור קורס", "success": False}), 403
    
    try:
        data = request.get_json()
        db = firestore.client()
        
        course_data = {
            'title': data.get('title'),
            'musical_field': data.get('musical_field'),
            'requirements': data.get('requirements', ''),
            'prerequisites': data.get('prerequisites', []),
            'description': data.get('description', ''),
            'publication_date': data.get('publication_date', datetime.utcnow().isoformat()),
            'price': float(data.get('price', 0)),
            'teacher_id': user_id,
            'lessons': [],
            'ratings': [],
            'is_published': data.get('is_published', False),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        course_ref = db.collection("courses").add(course_data)
        course_id = course_ref[1].id
        
        return jsonify({
            "success": True,
            "message": "קורס נוצר בהצלחה",
            "course_id": course_id
        }), 201
    except Exception as e:
        print(f"Error creating course: {e}")
        return jsonify({"error": "שגיאה ביצירת קורס", "success": False}), 500

@courses_bp.route('/api/courses/<string:course_id>/lessons', methods=['POST'])
def add_lesson(course_id):
    """הוספת שיעור לקורס"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    try:
        db = firestore.client()
        course_ref = db.collection("courses").document(course_id)
        course_doc = course_ref.get()
        
        if not course_doc.exists:
            return jsonify({"error": "קורס לא נמצא", "success": False}), 404
        
        course = course_doc.to_dict()
        
        # בדיקת הרשאה
        if course.get('teacher_id') != user_id and not is_admin(roles):
            return jsonify({"error": "אין הרשאה להוסיף שיעור", "success": False}), 403
        
        data = request.get_json()
        lessons = course.get('lessons', [])
        
        lesson_data = {
            'lesson_number': data.get('lesson_number'),
            'title': data.get('title'),
            'video_url': data.get('video_url'),
            'notes': data.get('notes', ''),
            'attachments': data.get('attachments', []),
            'questions': data.get('questions', []),
            'duration_minutes': data.get('duration_minutes', 0),
            'created_at': datetime.utcnow()
        }
        
        lessons.append(lesson_data)
        lessons.sort(key=lambda x: x.get('lesson_number', 0))
        
        course_ref.update({
            'lessons': lessons,
            'updated_at': datetime.utcnow()
        })
        
        return jsonify({
            "success": True,
            "message": "שיעור נוסף בהצלחה"
        }), 200
    except Exception as e:
        print(f"Error adding lesson: {e}")
        return jsonify({"error": "שגיאה בהוספת שיעור", "success": False}), 500

# =============================================================================
# דפי ניהול קורסים (למורים ומנהלים)
# =============================================================================

@courses_bp.route('/manage/courses')
def manage_courses():
    """דף ניהול קורסים - רשימת הקורסים של המורה"""
    if 'user_id' not in session:
        flash("נדרש התחברות", "error")
        return redirect(url_for('auth.login'))
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    if not can_manage_courses(roles):
        flash("אין לך הרשאה לגשת לעמוד זה", "error")
        return redirect(url_for('home'))
    
    return render_template('manage_courses.html')

@courses_bp.route('/api/manage/courses')
def api_manage_courses():
    """API לקבלת קורסים של המורה/מנהל"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    try:
        db = firestore.client()
        
        if is_admin(roles):
            # מנהל רואה את כל הקורסים
            courses_ref = db.collection("courses").stream()
        else:
            # מורה/מוסיקאי רואה רק את הקורסים שלו
            courses_ref = db.collection("courses").where("teacher_id", "==", user_id).stream()
        
        courses = []
        for doc in courses_ref:
            course_data = doc.to_dict()
            course_data['id'] = doc.id
            courses.append(course_data)
        
        # מיון לפי תאריך עדכון
        courses.sort(key=lambda x: x.get('updated_at', datetime.utcnow()), reverse=True)
        
        return jsonify({"courses": courses, "success": True}), 200
    except Exception as e:
        print(f"Error getting courses: {e}")
        return jsonify({"error": "שגיאה בטעינת הקורסים", "success": False}), 500

@courses_bp.route('/manage/courses/create')
@courses_bp.route('/manage/courses/edit/<string:course_id>')
def create_edit_course(course_id=None):
    """דף יצירה/עריכה של קורס"""
    if 'user_id' not in session:
        flash("נדרש התחברות", "error")
        return redirect(url_for('auth.login'))
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    if not can_manage_courses(roles):
        flash("אין לך הרשאה לגשת לעמוד זה", "error")
        return redirect(url_for('home'))
    
    course = None
    if course_id:
        try:
            db = firestore.client()
            course_doc = db.collection("courses").document(course_id).get()
            if course_doc.exists:
                course = course_doc.to_dict()
                course['id'] = course_id
                
                # בדיקת הרשאה
                if course.get('teacher_id') != user_id and not is_admin(roles):
                    flash("אין לך הרשאה לערוך קורס זה", "error")
                    return redirect(url_for('courses.manage_courses'))
        except Exception as e:
            print(f"Error getting course: {e}")
            flash("שגיאה בטעינת הקורס", "error")
            return redirect(url_for('courses.manage_courses'))
    
    return render_template('create_edit_course.html', course=course)

@courses_bp.route('/api/courses/<string:course_id>', methods=['PUT'])
def update_course(course_id):
    """עדכון קורס"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    try:
        db = firestore.client()
        course_ref = db.collection("courses").document(course_id)
        course_doc = course_ref.get()
        
        if not course_doc.exists:
            return jsonify({"error": "קורס לא נמצא", "success": False}), 404
        
        course = course_doc.to_dict()
        
        # בדיקת הרשאה
        if course.get('teacher_id') != user_id and not is_admin(roles):
            return jsonify({"error": "אין הרשאה לערוך קורס", "success": False}), 403
        
        data = request.get_json()
        
        update_data = {
            'title': data.get('title'),
            'musical_field': data.get('musical_field'),
            'requirements': data.get('requirements', ''),
            'prerequisites': data.get('prerequisites', []),
            'description': data.get('description', ''),
            'publication_date': data.get('publication_date'),
            'price': float(data.get('price', 0)),
            'is_published': data.get('is_published', False),
            'updated_at': datetime.utcnow()
        }
        
        course_ref.update(update_data)
        
        return jsonify({
            "success": True,
            "message": "קורס עודכן בהצלחה"
        }), 200
    except Exception as e:
        print(f"Error updating course: {e}")
        return jsonify({"error": "שגיאה בעדכון קורס", "success": False}), 500

@courses_bp.route('/api/courses/<string:course_id>', methods=['DELETE'])
def delete_course(course_id):
    """מחיקת קורס"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    try:
        db = firestore.client()
        course_ref = db.collection("courses").document(course_id)
        course_doc = course_ref.get()
        
        if not course_doc.exists:
            return jsonify({"error": "קורס לא נמצא", "success": False}), 404
        
        course = course_doc.to_dict()
        
        # בדיקת הרשאה
        if course.get('teacher_id') != user_id and not is_admin(roles):
            return jsonify({"error": "אין הרשאה למחוק קורס", "success": False}), 403
        
        course_ref.delete()
        
        return jsonify({
            "success": True,
            "message": "קורס נמחק בהצלחה"
        }), 200
    except Exception as e:
        print(f"Error deleting course: {e}")
        return jsonify({"error": "שגיאה במחיקת קורס", "success": False}), 500

@courses_bp.route('/manage/courses/<string:course_id>/lessons')
def manage_lessons(course_id):
    """דף ניהול שיעורים של קורס"""
    if 'user_id' not in session:
        flash("נדרש התחברות", "error")
        return redirect(url_for('auth.login'))
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    try:
        db = firestore.client()
        course_doc = db.collection("courses").document(course_id).get()
        
        if not course_doc.exists:
            flash("קורס לא נמצא", "error")
            return redirect(url_for('courses.manage_courses'))
        
        course = course_doc.to_dict()
        course['id'] = course_id
        
        # בדיקת הרשאה
        if course.get('teacher_id') != user_id and not is_admin(roles):
            flash("אין לך הרשאה לנהל קורס זה", "error")
            return redirect(url_for('courses.manage_courses'))
        
        return render_template('manage_lessons.html', course=course)
    except Exception as e:
        print(f"Error getting course: {e}")
        flash("שגיאה בטעינת הקורס", "error")
        return redirect(url_for('courses.manage_courses'))

@courses_bp.route('/api/courses/<string:course_id>/lessons/<int:lesson_number>', methods=['PUT'])
def update_lesson(course_id, lesson_number):
    """עדכון שיעור"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    try:
        db = firestore.client()
        course_ref = db.collection("courses").document(course_id)
        course_doc = course_ref.get()
        
        if not course_doc.exists:
            return jsonify({"error": "קורס לא נמצא", "success": False}), 404
        
        course = course_doc.to_dict()
        
        # בדיקת הרשאה
        if course.get('teacher_id') != user_id and not is_admin(roles):
            return jsonify({"error": "אין הרשאה לערוך שיעור", "success": False}), 403
        
        data = request.get_json()
        lessons = course.get('lessons', [])
        
        # מציאת השיעור ועדכונו
        lesson_found = False
        for i, lesson in enumerate(lessons):
            if lesson.get('lesson_number') == lesson_number:
                lessons[i] = {
                    'lesson_number': lesson_number,
                    'title': data.get('title'),
                    'video_url': data.get('video_url'),
                    'notes': data.get('notes', ''),
                    'attachments': data.get('attachments', []),
                    'questions': data.get('questions', []),
                    'duration_minutes': data.get('duration_minutes', 0),
                    'created_at': lesson.get('created_at', datetime.utcnow()),
                    'updated_at': datetime.utcnow()
                }
                lesson_found = True
                break
        
        if not lesson_found:
            return jsonify({"error": "שיעור לא נמצא", "success": False}), 404
        
        lessons.sort(key=lambda x: x.get('lesson_number', 0))
        
        course_ref.update({
            'lessons': lessons,
            'updated_at': datetime.utcnow()
        })
        
        return jsonify({
            "success": True,
            "message": "שיעור עודכן בהצלחה"
        }), 200
    except Exception as e:
        print(f"Error updating lesson: {e}")
        return jsonify({"error": "שגיאה בעדכון שיעור", "success": False}), 500

@courses_bp.route('/api/courses/<string:course_id>/lessons/<int:lesson_number>', methods=['DELETE'])
def delete_lesson(course_id, lesson_number):
    """מחיקת שיעור"""
    if 'user_id' not in session:
        return jsonify({"error": "נדרש התחברות", "success": False}), 401
    
    user_id = session['user_id']
    roles = get_roles(session)
    
    try:
        db = firestore.client()
        course_ref = db.collection("courses").document(course_id)
        course_doc = course_ref.get()
        
        if not course_doc.exists:
            return jsonify({"error": "קורס לא נמצא", "success": False}), 404
        
        course = course_doc.to_dict()
        
        # בדיקת הרשאה
        if course.get('teacher_id') != user_id and not is_admin(roles):
            return jsonify({"error": "אין הרשאה למחוק שיעור", "success": False}), 403
        
        lessons = course.get('lessons', [])
        
        # הסרת השיעור
        lessons = [l for l in lessons if l.get('lesson_number') != lesson_number]
        
        # עדכון מספרי השיעורים
        for i, lesson in enumerate(lessons):
            lesson['lesson_number'] = i + 1
        
        course_ref.update({
            'lessons': lessons,
            'updated_at': datetime.utcnow()
        })
        
        return jsonify({
            "success": True,
            "message": "שיעור נמחק בהצלחה"
        }), 200
    except Exception as e:
        print(f"Error deleting lesson: {e}")
        return jsonify({"error": "שגיאה במחיקת שיעור", "success": False}), 500

