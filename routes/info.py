from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from firebase_admin import firestore
from datetime import datetime

info_bp = Blueprint('info', __name__)

@info_bp.route('/info', methods=['GET', 'POST'])
def info_page():
    # שליפת כל הפוסטים מהחדש לישן
    posts_ref = firestore.client().collection("info_posts").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    posts = []
    for doc in posts_ref:
        post = doc.to_dict()
        author_id = post.get("created_by")
        author_name = "מנהל"
        if author_id:
            user_doc = firestore.client().collection("users").document(author_id).get()
            if user_doc.exists:
                user = user_doc.to_dict()
                author_name = user.get("username", "מנהל")
        created_at = post.get("created_at")
        if isinstance(created_at, str):
            from dateutil.parser import parse
            created_at = parse(created_at)
        post["author_name"] = author_name
        post["created_at"] = created_at
        posts.append(post)

    # טיפול בפרסום פוסט חדש (רק למנהל)
    roles = session.get("roles", [])
    if request.method == 'POST' and "admin" in roles:
        content = request.form.get("content", "").strip()
        if content:
            firestore.client().collection("info_posts").add({
                "content": content,
                "created_at": datetime.utcnow(),
                "created_by": session.get("user_id")
            })
            flash("הפוסט פורסם בהצלחה!", "success")
            return redirect(url_for('info.info_page'))

    return render_template("info.html", posts=posts)
