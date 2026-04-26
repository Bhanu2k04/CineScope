from pymongo import MongoClient
from config import Config
import sys

class Database:
    def __init__(self):
        self.client = None
        self.db = None
        self.connect()

    def connect(self):
        try:
            self.client = MongoClient(Config.MONGO_URI)
            self.db = self.client[Config.DB_NAME]
            self.client.server_info()
            print("✅ Successfully connected to MongoDB")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            sys.exit(1)

    def get_movies_collection(self):
        return self.db.movies

    def get_people_collection(self):
        return self.db.people

    def get_users_collection(self):
        if 'users' not in self.db.list_collection_names():
            self.db.create_collection('users')
        return self.db.users

    def get_feedback_collection(self):
        if 'feedback' not in self.db.list_collection_names():
            self.db.create_collection('feedback')
        return self.db.feedback

# Global instance
db = Database()
