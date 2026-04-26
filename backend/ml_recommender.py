"""
ML Recommender - loads pre-trained models and serves recommendations.
Models are trained in Google Colab (train_model.py) and saved to ./ml_models/
"""

import os
import pickle
import numpy as np
from config import Config
import logging

logger = logging.getLogger(__name__)

MOOD_GENRE_MAP = {
    "happy":        ["Comedy", "Family", "Animation", "Adventure", "Music"],
    "sad":          ["Drama", "Romance", "Music", "History"],
    "excited":      ["Action", "Adventure", "Thriller", "Science Fiction"],
    "scary":        ["Horror", "Thriller", "Mystery"],
    "romantic":     ["Romance", "Drama", "Comedy"],
    "inspiring":    ["Documentary", "Drama", "History"],
    "mystery":      ["Mystery", "Crime", "Thriller", "Science Fiction"],
    "chill":        ["Animation", "Family", "Comedy"],
    "dark":         ["Crime", "Thriller", "Horror", "Mystery"],
    "epic":         ["Adventure", "Action", "Fantasy", "War"],
    "funny":        ["Comedy", "Family", "Animation"],
    "uplifting":    ["Comedy", "Family", "Animation", "Music"],
    "tragic":       ["Drama", "History", "War"],
    "adventurous":  ["Adventure", "Action", "Fantasy"],
    "suspenseful":  ["Thriller", "Mystery", "Crime"],
    "fantastical":  ["Fantasy", "Science Fiction", "Adventure"],
    "biographical": ["Documentary", "Drama", "History"],
    "historical":   ["History", "War", "Drama"],
}

MOOD_EMOJIS = {
    "happy": "😊", "sad": "😢", "excited": "🤩", "scary": "😱",
    "romantic": "💕", "inspiring": "💪", "mystery": "🔍", "chill": "😌",
    "dark": "🌑", "epic": "⚔️", "funny": "😂", "uplifting": "🌟",
    "tragic": "💔", "adventurous": "🗺️", "suspenseful": "😰",
    "fantastical": "🧙", "biographical": "📖", "historical": "🏛️",
}

LANGUAGE_MAP = {
    "english": "en", "hollywood": "en",
    "hindi": "hi", "bollywood": "hi",
    "telugu": "te", "tollywood": "te",
    "tamil": "ta", "kollywood": "ta",
    "malayalam": "ml", "mollywood": "ml",
    "kannada": "kn", "sandalwood": "kn",
}

GENRE_KEYWORDS = {
    "action", "adventure", "animation", "comedy", "crime", "documentary",
    "drama", "family", "fantasy", "history", "horror", "music", "mystery",
    "romance", "science fiction", "scifi", "sci-fi", "thriller", "war", "western"
}

GENRE_NORMALIZE = {
    "scifi": "Science Fiction", "sci-fi": "Science Fiction",
    "science fiction": "Science Fiction",
}


class MLRecommender:
    def __init__(self):
        self.mood_classifier = None
        self.mood_vectorizer = None    # Used ONLY for mood classification
        self.mood_encoder = None
        self.movie_embeddings = None
        self.movie_ids = None
        self.tfidf_matrix = None
        self.tfidf_vectorizer = None   # Used ONLY for movie search
        self.ml_available = False
        self.semantic_available = False
        self._st_model = None
        self._load_models()

    def _load_models(self):
        try:
            # ── Mood classifier (has its own vectorizer) ─────────────────────
            mood_clf_ok = all(os.path.exists(p) for p in [
                Config.MOOD_CLASSIFIER_PATH,
                Config.MOOD_VECTORIZER_PATH,
                Config.MOOD_ENCODER_PATH
            ])
            if mood_clf_ok:
                with open(Config.MOOD_CLASSIFIER_PATH, 'rb') as f:
                    self.mood_classifier = pickle.load(f)
                with open(Config.MOOD_VECTORIZER_PATH, 'rb') as f:
                    self.mood_vectorizer = pickle.load(f)
                with open(Config.MOOD_ENCODER_PATH, 'rb') as f:
                    self.mood_encoder = pickle.load(f)
                self.ml_available = True

                # Validate: quick smoke test
                test_vec = self.mood_vectorizer.transform(["test happy movie"])
                clf_features = self.mood_classifier.estimators_[0].n_features_in_
                vec_features = test_vec.shape[1]
                if clf_features != vec_features:
                    logger.warning(
                        f"⚠️ Mood classifier expects {clf_features} features "
                        f"but vectorizer produces {vec_features}. "
                        f"Disabling ML mood detection — please retrain."
                    )
                    self.ml_available = False
                    self.mood_classifier = None
                    self.mood_vectorizer = None
                    self.mood_encoder = None
                else:
                    logger.info("✅ Mood classifier loaded and validated")

            # ── Semantic embeddings ──────────────────────────────────────────
            sem_ok = all(os.path.exists(p) for p in [
                Config.MOVIE_EMBEDDINGS_PATH,
                Config.MOVIE_IDS_PATH
            ])
            if sem_ok:
                self.movie_embeddings = np.load(Config.MOVIE_EMBEDDINGS_PATH)
                self.movie_ids = np.load(Config.MOVIE_IDS_PATH, allow_pickle=True)
                self.semantic_available = True
                logger.info(f"✅ Semantic embeddings loaded: {self.movie_embeddings.shape}")

            # ── TF-IDF (separate from mood vectorizer) ───────────────────────
            tfidf_ok = all(os.path.exists(p) for p in [
                Config.TFIDF_MATRIX_PATH,
                Config.TFIDF_VECTORIZER_PATH
            ])
            if tfidf_ok:
                self.tfidf_matrix = np.load(Config.TFIDF_MATRIX_PATH, allow_pickle=True)
                with open(Config.TFIDF_VECTORIZER_PATH, 'rb') as f:
                    self.tfidf_vectorizer = pickle.load(f)
                logger.info(f"✅ TF-IDF loaded: {self.tfidf_matrix.shape}")

        except Exception as e:
            logger.warning(f"⚠️ ML model loading error: {e}. Using keyword fallback.")
            self.ml_available = False
            self.semantic_available = False

    # ── Mood detection ────────────────────────────────────────────────────────

    def detect_moods(self, text: str) -> dict:
        text_lower = text.lower()
        if self.ml_available:
            return self._ml_mood_detection(text_lower)
        return self._keyword_mood_detection(text_lower)

    def _ml_mood_detection(self, text: str) -> dict:
        try:
            # Use mood_vectorizer (NOT tfidf_vectorizer)
            vec = self.mood_vectorizer.transform([text])
            probs = self.mood_classifier.predict_proba(vec)

            mood_scores = {}
            for i, mood in enumerate(self.mood_encoder.classes_):
                score = probs[i][0][1] if len(probs[i][0]) > 1 else probs[i][0][0]
                mood_scores[mood] = round(float(score), 3)

            sorted_moods = sorted(mood_scores.items(), key=lambda x: x[1], reverse=True)
            detected = [(m, s) for m, s in sorted_moods if s > 0.25]
            primary = sorted_moods[0] if sorted_moods else ("happy", 0.5)

            return {
                "primary_mood": primary[0],
                "primary_confidence": primary[1],
                "all_moods": detected,
                "mood_scores": mood_scores,
                "method": "ml"
            }
        except Exception as e:
            logger.warning(f"ML mood detection failed: {e}, falling back to keywords")
            return self._keyword_mood_detection(text)

    def _keyword_mood_detection(self, text: str) -> dict:
        mood_scores = {}
        for mood, genres in MOOD_GENRE_MAP.items():
            score = 0.0
            if mood in text:
                score += 1.0
            for kw in genres:
                if kw.lower() in text:
                    score += 0.3
            if score > 0:
                mood_scores[mood] = min(round(score, 3), 1.0)

        # Extra keyword patterns
        keyword_mood_map = {
            "happy": ["fun", "cheerful", "laugh", "smile", "joyful", "light"],
            "sad": ["cry", "tears", "grief", "melancholy", "blue", "depress"],
            "excited": ["thrill", "adrenaline", "pump", "hype", "intense", "fast"],
            "scary": ["scare", "fear", "creep", "haunt", "terrif", "nightmare"],
            "romantic": ["love", "date", "sweet", "passion", "heart", "couple"],
            "chill": ["relax", "easy", "calm", "cozy", "lazy", "unwind", "vibe"],
            "dark": ["grit", "brutal", "raw", "bleak", "noir", "disturb"],
            "epic": ["grand", "massive", "legend", "scale", "huge", "spectacular"],
            "mystery": ["puzzle", "detective", "whodunit", "clue", "reveal", "twist"],
            "inspiring": ["motivat", "hope", "uplift", "triumph", "overcome"],
        }
        for mood, keywords in keyword_mood_map.items():
            for kw in keywords:
                if kw in text:
                    mood_scores[mood] = mood_scores.get(mood, 0) + 0.4

        if not mood_scores:
            return {
                "primary_mood": None, "primary_confidence": 0.0,
                "all_moods": [], "mood_scores": {}, "method": "keyword"
            }

        sorted_moods = sorted(mood_scores.items(), key=lambda x: x[1], reverse=True)
        return {
            "primary_mood": sorted_moods[0][0],
            "primary_confidence": min(sorted_moods[0][1], 1.0),
            "all_moods": sorted_moods,
            "mood_scores": mood_scores,
            "method": "keyword"
        }

    # ── Semantic search ───────────────────────────────────────────────────────

    def _get_st_model(self):
        """Lazy load sentence transformer"""
        if self._st_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._st_model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("✅ SentenceTransformer loaded")
            except Exception as e:
                logger.warning(f"Could not load SentenceTransformer: {e}")
        return self._st_model

    def semantic_search(self, query: str, top_k: int = 24) -> list:
        if not self.semantic_available:
            return []
        try:
            model = self._get_st_model()
            if model is None:
                return []
            query_vec = model.encode([query], normalize_embeddings=True)
            scores = np.dot(self.movie_embeddings, query_vec.T).flatten()
            top_indices = np.argsort(scores)[::-1][:top_k]
            return [
                {"movie_id": int(self.movie_ids[idx]), "score": float(scores[idx])}
                for idx in top_indices
            ]
        except Exception as e:
            logger.warning(f"Semantic search failed: {e}")
            return []

    def tfidf_search(self, query: str, top_k: int = 24) -> list:
        """Uses tfidf_vectorizer (movie search), NOT mood_vectorizer"""
        if self.tfidf_matrix is None or self.tfidf_vectorizer is None:
            return []
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            query_vec = self.tfidf_vectorizer.transform([query])
            scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
            top_indices = np.argsort(scores)[::-1][:top_k]
            return [
                {"movie_id": int(self.movie_ids[idx]), "score": float(scores[idx])}
                for idx in top_indices if scores[idx] > 0
            ]
        except Exception as e:
            logger.warning(f"TF-IDF search failed: {e}")
            return []

    # ── Helpers ───────────────────────────────────────────────────────────────

    def extract_languages(self, text: str) -> list:
        text_lower = text.lower()
        found = []
        for keyword, code in LANGUAGE_MAP.items():
            if keyword in text_lower and code not in found:
                found.append(code)
        return found

    def extract_genres(self, text: str, mood_result: dict) -> list:
        text_lower = text.lower()
        found = set()
        for kw in GENRE_KEYWORDS:
            if kw in text_lower:
                normalized = GENRE_NORMALIZE.get(kw, kw.title())
                found.add(normalized)
        for mood, _ in mood_result.get("all_moods", []):
            for genre in MOOD_GENRE_MAP.get(mood, []):
                found.add(genre)
        return list(found)

    def get_mood_emoji(self, mood: str) -> str:
        return MOOD_EMOJIS.get(mood, "🎬")

    def get_mood_genres(self, mood: str) -> list:
        return MOOD_GENRE_MAP.get(mood, [])

    @property
    def status(self):
        return {
            "ml_classifier": self.ml_available,
            "semantic_search": self.semantic_available,
            "tfidf_fallback": self.tfidf_matrix is not None,
            "mood_detection": "ml" if self.ml_available else "keyword"
        }


# Global singleton
recommender = MLRecommender()
