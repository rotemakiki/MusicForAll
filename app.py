from flask import Flask
from routes.auth import auth_bp
from routes.songs import songs_bp
from routes.teachers import teachers_bp
from routes.students import students_bp
from routes.info import info_bp
from routes.videos import videos_bp


from routes.tutorials import tutorials_bp

from routes.general import general_bp




import os

app = Flask(__name__, static_folder='static')
app.secret_key = 'your_secret_key'  # חשוב להודעת flash ול-session

# רישום כל ה-blueprints:
app.register_blueprint(auth_bp)
app.register_blueprint(songs_bp)
app.register_blueprint(teachers_bp)
app.register_blueprint(students_bp)
app.register_blueprint(info_bp)
app.register_blueprint(videos_bp)
app.register_blueprint(tutorials_bp)
app.register_blueprint(general_bp)
# דף הבית (אפשר להגדיר כאן או ב-blueprint ייעודי קטן)
@app.route('/')
def home():
    from flask import session, render_template
    if 'user_id' in session:
        return render_template('home_user.html')
    else:
        return render_template('home_guest.html')

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)

