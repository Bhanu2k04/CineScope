import os
from datetime import timedelta

class Config:
    # MongoDB
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')
    DB_NAME = os.environ.get('DB_NAME', 'cinescopeDB')

    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-very-secret-key-here')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # ML Model paths
    ML_MODELS_DIR = os.environ.get('ML_MODELS_DIR', 'ml_models')
    MOOD_MODEL_PATH = os.path.join(ML_MODELS_DIR, 'mood_classifier.pkl')
    VECTORIZER_PATH = os.path.join(ML_MODELS_DIR, 'tfidf_vectorizer.pkl')
    MOVIE_EMBEDDINGS_PATH = os.path.join(ML_MODELS_DIR, 'movie_embeddings.npy')
    MOVIE_IDS_PATH = os.path.join(ML_MODELS_DIR, 'movie_ids.npy')
    MULTILABEL_BINARIZER_PATH = os.path.join(ML_MODELS_DIR, 'mood_label_encoder.pkl')
    SENTENCE_MODEL_NAME = 'all-MiniLM-L6-v2'

    # All genres supported
    ALL_GENRES = [
        'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
        'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
        'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
        'Thriller', 'War', 'Western'
    ]

    # All moods supported
    ALL_MOODS = [
        'happy', 'sad', 'excited', 'scary', 'romantic', 'inspiring',
        'mystery', 'chill', 'dark', 'epic', 'funny', 'uplifting',
        'tragic', 'adventurous', 'biographical', 'historical',
        'suspenseful', 'fantastical'
    ]

    MOOD_GENRE_MAP = {
        "happy": ["Comedy", "Family", "Animation", "Adventure", "Music"],
        "sad": ["Drama", "Romance", "Music", "History"],
        "excited": ["Action", "Adventure", "Thriller", "Science Fiction"],
        "scary": ["Horror", "Thriller", "Mystery"],
        "romantic": ["Romance", "Drama", "Comedy"],
        "inspiring": ["Documentary", "Drama", "History"],
        "mystery": ["Mystery", "Crime", "Thriller", "Science Fiction"],
        "chill": ["Animation", "Family", "Comedy"],
        "dark": ["Crime", "Thriller", "Horror", "Mystery"],
        "epic": ["Adventure", "Action", "Fantasy", "War"],
        "funny": ["Comedy", "Family", "Animation"],
        "uplifting": ["Comedy", "Family", "Animation", "Music"],
        "tragic": ["Drama", "History", "War"],
        "adventurous": ["Adventure", "Action", "Fantasy"],
        "biographical": ["Documentary", "Drama"],
        "historical": ["History", "War", "Drama"],
        "suspenseful": ["Thriller", "Mystery", "Crime"],
        "fantastical": ["Fantasy", "Science Fiction", "Adventure"],
    }
