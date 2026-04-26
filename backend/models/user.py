from datetime import datetime
from database import db
from bson import ObjectId
import re
from werkzeug.security import generate_password_hash, check_password_hash

class User:
    @staticmethod
    def create_user(email, password, name, profile_emoji=None, is_child=False):
        users = db.get_users_collection()
        if not all([email, password, name]):
            raise ValueError("Email, password, and name are required")
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            raise ValueError("Invalid email format")
        if users.find_one({"email": email}):
            raise ValueError("Email already exists")

        user_data = {
            "email": email,
            "password": generate_password_hash(password),
            "name": name,
            "profile_emoji": profile_emoji or "👤",
            "is_child": is_child,
            "is_admin": False,
            "created_at": datetime.utcnow(),
            "watchlist": [],
            "liked_movies": [],
            "disliked_movies": [],
            "mood_history": [],
            "profiles": [{
                "name": name,
                "profile_emoji": profile_emoji or "👤",
                "is_child": is_child,
                "is_default": True,
                "created_at": datetime.utcnow(),
                "preferred_genres": [],
                "preferred_languages": [],
                "watchlist": [],
                "mood_history": []
            }]
        }
        result = users.insert_one(user_data)
        return str(result.inserted_id)

    @staticmethod
    def find_by_email(email):
        return db.get_users_collection().find_one({"email": email})

    @staticmethod
    def find_by_id(user_id):
        try:
            return db.get_users_collection().find_one({"_id": ObjectId(user_id)})
        except Exception:
            return None

    @staticmethod
    def verify_password(user, password):
        return check_password_hash(user['password'], password)

    @staticmethod
    def update_profile(user_id, name, profile_emoji):
        db.get_users_collection().update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"name": name, "profile_emoji": profile_emoji}}
        )

    @staticmethod
    def update_password(user_id, new_password):
        hashed = generate_password_hash(new_password)
        db.get_users_collection().update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": hashed}}
        )

    @staticmethod
    def add_to_watchlist(user_id, movie_id):
        db.get_users_collection().update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"watchlist": movie_id}}
        )

    @staticmethod
    def remove_from_watchlist(user_id, movie_id):
        db.get_users_collection().update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"watchlist": movie_id}}
        )

    @staticmethod
    def like_movie(user_id, movie_id):
        db.get_users_collection().update_one(
            {"_id": ObjectId(user_id)},
            {
                "$addToSet": {"liked_movies": movie_id},
                "$pull": {"disliked_movies": movie_id}
            }
        )

    @staticmethod
    def dislike_movie(user_id, movie_id):
        db.get_users_collection().update_one(
            {"_id": ObjectId(user_id)},
            {
                "$addToSet": {"disliked_movies": movie_id},
                "$pull": {"liked_movies": movie_id}
            }
        )

    @staticmethod
    def save_mood(user_id, mood, genres):
        entry = {
            "mood": mood,
            "genres": genres,
            "timestamp": datetime.utcnow()
        }
        db.get_users_collection().update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"mood_history": {"$each": [entry], "$slice": -50}}}
        )

    @staticmethod
    def get_profiles(user_id):
        user = db.get_users_collection().find_one(
            {"_id": ObjectId(user_id)}, {"profiles": 1}
        )
        return user.get('profiles', []) if user else []

    @staticmethod
    def ensure_default_profile(user_id):
        users = db.get_users_collection()
        user = users.find_one({"_id": ObjectId(user_id)})
        if user and not user.get('profiles'):
            default_profile = {
                "name": user['name'],
                "profile_emoji": user.get('profile_emoji', '👤'),
                "is_child": user.get('is_child', False),
                "is_default": True,
                "created_at": datetime.utcnow(),
                "preferred_genres": [],
                "preferred_languages": [],
                "watchlist": [],
                "mood_history": []
            }
            users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"profiles": [default_profile]}}
            )
