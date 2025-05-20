from flask import Flask
from routes import routes
import os

app = Flask(__name__, static_folder='static')
app.secret_key = 'your_secret_key'  # Required for flash messages

# Register routes
app.register_blueprint(routes, url_prefix="/")


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
