from flask import Blueprint, request, redirect, url_for, flash, session, render_template
from firebase_admin import firestore
from datetime import datetime
import os
import uuid
from google.cloud import storage
from werkzeug.utils import secure_filename

general_bp = Blueprint('general', __name__)

@general_bp.route('/upload_profile_image', methods=['POST'])
def upload_profile_image():
    if 'user_id' not in session:
        flash("יש להתחבר כדי להעלות תמונה", "error")
        return redirect(url_for('auth.login'))

    file = request.files.get('profile_image')
    user_id = request.form.get('user_id')

    if not file or not user_id:
        flash("חסר קובץ או מזהה משתמש", "error")
        return redirect(request.referrer)

    # רק המשתמש עצמו (או בעתיד אדמין) יכול לעדכן
    if session['user_id'] != user_id:
        flash("אין לך הרשאה לשנות תמונה זו", "error")
        return redirect(url_for('home'))

    # שמירת הקובץ זמנית
    TEMP_UPLOAD_FOLDER = "temp_uploads"
    os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)
    filename = secure_filename(file.filename)
    temp_path = os.path.join(TEMP_UPLOAD_FOLDER, filename)
    file.save(temp_path)

    # העלאה ל־Firebase Storage
    storage_client = storage.Client.from_service_account_json("music-for-all-f5d9c-firebase-adminsdk-fbsvc-33869b4b24.json")
    bucket = storage_client.bucket("music-for-all-f5d9c.firebasestorage.app")
    blob_name = f"profile_images/{user_id}_{uuid.uuid4().hex}_{filename}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(temp_path)
    blob.make_public()

    # מחיקת הקובץ הזמני
    os.remove(temp_path)

    # עדכון URL במסד
    firestore.client().collection("users").document(user_id).update({
        "profile_image": blob.public_url
    })

    flash("📸 תמונת הפרופיל עודכנה בהצלחה!", "success")

    # הפניה אוטומטית לפרופיל הנכון
    # (מבוסס על session. אם צריך, אפשר למשוך roles מה־DB)
    roles = session.get("roles", [])
    if "teacher" in roles:
        return redirect(url_for('teachers.teacher_profile', teacher_id=user_id))
    elif "student" in roles:
        return redirect(url_for('students.user_profile'))
    else:
        return redirect(url_for('home'))


@general_bp.route('/contact', methods=['GET'])
def contact_page():
    """עמוד יצירת קשר"""
    return render_template('contact.html')


@general_bp.route('/contact', methods=['POST'])
def submit_contact():
    """טיפול בשליחת טופס יצירת קשר"""
    # קבלת הנתונים מהטופס
    submission_type = request.form.get('submission_type', 'bug')  # 'bug' או 'suggestion'
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    screenshot = request.files.get('screenshot')
    
    # בדיקות תקינות
    if not title or not description:
        flash("אנא מלא את כל השדות הנדרשים", "error")
        return redirect(url_for('general.contact_page'))
    
    if len(title) > 200:
        flash("כותרת ארוכה מדי (מקסימום 200 תווים)", "error")
        return redirect(url_for('general.contact_page'))
    
    if len(description) > 2000:
        flash("תיאור ארוך מדי (מקסימום 2000 תווים)", "error")
        return redirect(url_for('general.contact_page'))
    
    # קבלת פרטי המשתמש (אם מחובר)
    user_id = session.get('user_id')
    username = session.get('username', 'אורח')
    email = session.get('email', 'לא זמין')
    
    # טיפול בהעלאת צילום מסך
    screenshot_url = None
    if screenshot and screenshot.filename:
        # בדיקת סוג הקובץ
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        filename = secure_filename(screenshot.filename)
        file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        
        if file_ext not in allowed_extensions:
            flash("סוג קובץ לא נתמך. אנא העלה תמונה (PNG, JPG, JPEG, GIF, WEBP)", "error")
            return redirect(url_for('general.contact_page'))
        
        # בדיקת גודל הקובץ (מקסימום 5MB)
        screenshot.seek(0, os.SEEK_END)
        file_size = screenshot.tell()
        screenshot.seek(0)
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            flash("קובץ גדול מדי. מקסימום 5MB", "error")
            return redirect(url_for('general.contact_page'))
        
        try:
            # שמירת הקובץ זמנית
            TEMP_UPLOAD_FOLDER = "temp_uploads"
            os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            temp_path = os.path.join(TEMP_UPLOAD_FOLDER, unique_filename)
            screenshot.save(temp_path)
            
            # העלאה ל-Firebase Storage
            # נסה להשתמש באותו נתיב כמו בשאר הקוד
            firebase_key_path = "music-for-all-f5d9c-firebase-adminsdk-fbsvc-33869b4b24.json"
            if not os.path.exists(firebase_key_path):
                firebase_key_path = "secrets/firebase-key.json"
            storage_client = storage.Client.from_service_account_json(firebase_key_path)
            bucket = storage_client.bucket("music-for-all-f5d9c.firebasestorage.app")
            blob_name = f"contact_screenshots/{uuid.uuid4().hex}_{unique_filename}"
            blob = bucket.blob(blob_name)
            blob.upload_from_filename(temp_path)
            blob.make_public()
            screenshot_url = blob.public_url
            
            # מחיקת הקובץ הזמני
            os.remove(temp_path)
        except Exception as e:
            print(f"Error uploading screenshot: {str(e)}")
            flash("שגיאה בהעלאת צילום המסך. נסה שוב מאוחר יותר", "error")
            return redirect(url_for('general.contact_page'))
    
    # שמירה ב-Firestore
    try:
        db = firestore.client()
        submission_data = {
            'type': submission_type,  # 'bug' או 'suggestion'
            'title': title,
            'description': description,
            'screenshot_url': screenshot_url,
            'user_id': user_id,
            'username': username,
            'email': email,
            'status': 'new',  # 'new', 'in_progress', 'resolved', 'closed'
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        db.collection('contact_submissions').add(submission_data)
        
        # הודעת הצלחה
        type_hebrew = "דיווח על תקלה" if submission_type == 'bug' else "הצעה לשיפור"
        flash(f"✅ {type_hebrew} נשלח בהצלחה! תודה על המשוב שלך", "success")
        
    except Exception as e:
        print(f"Error saving contact submission: {str(e)}")
        flash("שגיאה בשמירת המידע. נסה שוב מאוחר יותר", "error")
        return redirect(url_for('general.contact_page'))
    
    return redirect(url_for('general.contact_page'))
