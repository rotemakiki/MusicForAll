from flask import Blueprint, render_template, jsonify
from models.models import Video

videos_bp = Blueprint('videos', __name__)

@videos_bp.route('/videos')
def videos():
    return render_template('videos.html')

@videos_bp.route('/api/videos')
def api_videos():
    videos = Video.query.all()
    if not videos:
        return jsonify([])
    videos_list = [{"title": v.title, "description": v.description, "url": v.url} for v in videos]
    return jsonify(videos_list)
