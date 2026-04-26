from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from routes.movies import movie_routes
from routes.people import people_routes
from routes.auth import auth_routes
from routes.users import user_routes
from routes.recommendations import rec_routes
from database import db
from config import Config
from datetime import timedelta
import os
import logging

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY') or Config.JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

jwt = JWTManager(app)

app.register_blueprint(movie_routes, url_prefix='/movies')
app.register_blueprint(people_routes, url_prefix='/people')
app.register_blueprint(auth_routes, url_prefix='/auth')
app.register_blueprint(user_routes, url_prefix='/user')
app.register_blueprint(rec_routes, url_prefix='/recommend')


@app.route('/')
def home():
    return {"message": "CineScope API", "status": "running"}, 200


@app.route('/health')
def health():
    from ml_recommender import recommender
    return {
        "status": "ok",
        "ml_status": recommender.status
    }, 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)
