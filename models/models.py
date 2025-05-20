from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)  # hashed password
    role = db.Column(db.String(10), nullable=False)  # "teacher" or "student"
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    # שדות חדשים לפרופיל מורה
    instruments = db.Column(db.String(200))     # Instruments the teacher plays
    styles = db.Column(db.String(300))          # Teaching styles
    is_available = db.Column(db.Boolean)        # Whether the teacher is available for students

    # Relationship: A teacher can upload multiple videos
    videos = db.relationship('Video', backref='uploader', lazy=True)

    def __repr__(self):
        return f"User(id={self.id}, username={self.username}, email={self.email}, role={self.role})"


class Teacher(User):
    __tablename__ = 'teacher'
    id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)

    def __repr__(self):
        return f"Teacher(id={self.id}, username={self.username}, email={self.email}, videos={len(self.videos)})"


class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    url = db.Column(db.String(300), nullable=False)  # Video URL
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Foreign key to User
    uploaded_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f"Video(id={self.id}, title={self.title}, url={self.url}, uploaded_by={self.uploaded_by})"


class Song(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(100), nullable=False)
    key = db.Column(db.String(10), nullable=False)  # סולם (למשל: Am)
    key_type = db.Column(db.String(20), nullable=False)  # סוג סולם (מז'ור/מינור)
    time_signature = db.Column(db.String(10), nullable=False)  # מקצב (למשל: 4/4)
    bpm = db.Column(db.Integer, nullable=False)
    video_url = db.Column(db.String(300), nullable=True)  # קישור לסרטון
    chords = db.Column(db.Text, nullable=False)  # JSON string של רשימת האקורדים

    def __repr__(self):
        return f"Song(id={self.id}, title={self.title}, artist={self.artist})"
