from flask import Flask
from routes import routes

app = Flask(__name__, static_folder='static')
app.secret_key = 'your_secret_key'  # Required for flash messages

# Register routes
app.register_blueprint(routes, url_prefix="/")

if __name__ == '__main__':
    app.run(debug=True)
