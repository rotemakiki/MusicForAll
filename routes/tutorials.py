from flask import Blueprint, render_template

tutorials_bp = Blueprint('tutorials', __name__)

@tutorials_bp.route('/tutorials')
def tutorials():
    return render_template('tutorials.html')
