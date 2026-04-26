from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from database import db
from models.user import User
from bson import ObjectId
from datetime import datetime
from fuzzywuzzy import fuzz
import random

from ml_recommender import recommender
from config import Config

rec_routes = Blueprint('recommendations', __name__)

GENERAL_QA = [
    {
        "patterns": ["who are you", "what are you", "your name", "who made you", "what is cinescope"],
        "response": "I'm CineBot, CineScope's AI-powered movie assistant! Ask me for recommendations by mood, genre, language, or actor."
    },
    {
        "patterns": ["how does this work", "how do i use", "how to use", "help", "what can you do"],
        "response": "Try asking: 'Show me happy Hindi comedies', 'Dark thriller with Tom Hanks', 'I feel adventurous', or 'Best sci-fi from the 80s'!"
    },
    {
        "patterns": ["thank you", "thanks", "thx", "thank u"],
        "response": "You're welcome! Let me know if you need more recommendations 🎬"
    },
    {
        "patterns": ["hello", "hi", "hey", "namaste", "hola"],
        "response": "Hello! 👋 What kind of movies are you in the mood for today?"
    },
]

def check_general_qa(query):
    for qa in GENERAL_QA:
        for pattern in qa["patterns"]:
            if pattern in query:
                return qa["response"]
    return None


def build_mongo_filter(found_genres, found_languages, found_people_ids, disliked_ids):
    filters = [{"vote_count": {"$gt": 5}, "poster_path": {"$exists": True}}]

    if found_genres:
        filters.append({"genres": {"$in": found_genres}})
    if found_languages:
        filters.append({"original_language": {"$in": found_languages}})
    if found_people_ids:
        filters.append({"$or": [
            {"cast_ids": {"$in": found_people_ids}},
            {"director_id": {"$in": found_people_ids}}
        ]})
    if disliked_ids:
        filters.append({"id": {"$nin": list(disliked_ids)}})

    return {"$and": filters} if len(filters) > 1 else filters[0]


PROJECTION = {
    "_id": 0, "id": 1, "title": 1, "poster_path": 1, "backdrop_path": 1,
    "release_year": 1, "vote_average": 1, "vote_count": 1, "genres": 1,
    "overview": 1, "trailer_url": 1, "original_language": 1, "language": 1
}


@rec_routes.route('/chat', methods=['POST'])
@jwt_required(optional=True)
def chat_recommendations():
    try:
        data = request.get_json()
        query = (data.get('query') or '').strip()
        query_lower = query.lower()
        user_id = get_jwt_identity()

        movies_collection = db.get_movies_collection()
        users_collection = db.get_users_collection()
        people_collection = db.get_people_collection()

        # ── General Q&A ────────────────────────────────────────────────────
        general_response = check_general_qa(query_lower)
        if general_response:
            return jsonify({
                "results": [], "message": general_response,
                "mood_result": {}, "found_genres": [],
                "found_people": [], "found_languages": [],
                "liked_movies": [], "disliked_movies": []
            })

        # ── ML Mood Detection ───────────────────────────────────────────────
        mood_result = recommender.detect_moods(query_lower)
        found_languages = recommender.extract_languages(query_lower)
        found_genres = recommender.extract_genres(query_lower, mood_result)

        # ── Person extraction (fuzzy) ───────────────────────────────────────
        all_people = list(people_collection.find({}, {"name": 1, "id": 1}))
        found_people_names = []
        found_people_ids = []
        for person in all_people:
            pname = person['name'].lower()
            if fuzz.partial_ratio(pname, query_lower) > 85:
                found_people_names.append(person['name'])
                found_people_ids.append(person['id'])

        # ── User data ───────────────────────────────────────────────────────
        user_liked_ids = set()
        user_disliked_ids = set()
        liked_movies = []
        disliked_movies = []

        if user_id:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                user_liked_ids = set(user.get("liked_movies", []))
                user_disliked_ids = set(user.get("disliked_movies", []))
                liked_movies = list(user_liked_ids)
                disliked_movies = list(user_disliked_ids)

        # ── Sort criteria ───────────────────────────────────────────────────
        sort_criteria = [("vote_average", -1), ("vote_count", -1)]
        if any(w in query_lower for w in ["new", "latest", "recent"]):
            sort_criteria = [("release_year", -1), ("vote_count", -1)]
        elif any(w in query_lower for w in ["top", "best", "greatest"]):
            sort_criteria = [("vote_average", -1), ("vote_count", -1)]

        # ── Try semantic search first ───────────────────────────────────────
        semantic_results = []
        if query and len(query) > 5:
            semantic_ids = recommender.semantic_search(query, top_k=30)
            if not semantic_ids:
                semantic_ids = recommender.tfidf_search(query, top_k=30)

            if semantic_ids:
                id_list = [r["movie_id"] for r in semantic_ids]
                score_map = {r["movie_id"]: r["score"] for r in semantic_ids}

                sem_filter = {"id": {"$in": id_list}, "poster_path": {"$exists": True}}
                if user_disliked_ids:
                    sem_filter["id"]["$nin"] = list(user_disliked_ids)

                sem_movies = list(movies_collection.find(sem_filter, PROJECTION))

                # Apply language/genre filter on top
                if found_languages:
                    sem_movies = [m for m in sem_movies if m.get("original_language") in found_languages]
                if found_genres and not found_languages:
                    sem_movies = [m for m in sem_movies
                                  if any(g in m.get("genres", []) for g in found_genres)]

                sem_movies.sort(key=lambda m: score_map.get(m["id"], 0), reverse=True)
                semantic_results = sem_movies[:12]

        # ── Keyword/genre filter fallback ───────────────────────────────────
        keyword_results = []
        if found_genres or found_languages or found_people_ids:
            mongo_filter = build_mongo_filter(
                found_genres, found_languages, found_people_ids, user_disliked_ids
            )
            keyword_results = list(movies_collection.find(mongo_filter, PROJECTION)
                                   .sort(sort_criteria).limit(24))

            # Relax: if nothing found with genre+language, try language only
            if not keyword_results and found_languages:
                relaxed = {"original_language": {"$in": found_languages}, "poster_path": {"$exists": True}}
                if user_disliked_ids:
                    relaxed["id"] = {"$nin": list(user_disliked_ids)}
                keyword_results = list(movies_collection.find(relaxed, PROJECTION)
                                       .sort(sort_criteria).limit(24))

        # ── Collaborative filtering ─────────────────────────────────────────
        collab_results = []
        if user_id and user_liked_ids:
            similar_users = users_collection.find({
                "liked_movies": {"$in": list(user_liked_ids)},
                "_id": {"$ne": ObjectId(user_id)}
            })
            collab_ids = set()
            for su in similar_users:
                for mid in su.get("liked_movies", []):
                    if mid not in user_liked_ids and mid not in user_disliked_ids:
                        collab_ids.add(mid)
            if collab_ids:
                collab_results = list(movies_collection.find(
                    {"id": {"$in": list(collab_ids)}, "poster_path": {"$exists": True}},
                    PROJECTION
                ).sort(sort_criteria).limit(12))

        # ── Merge & deduplicate ─────────────────────────────────────────────
        merged = {}
        # Priority: semantic > keyword > collab
        for m in collab_results:
            merged[m['id']] = {**m, '_score': 10}
        for m in keyword_results:
            if m['id'] not in merged:
                merged[m['id']] = {**m, '_score': 20}
            else:
                merged[m['id']]['_score'] += 20
        for m in semantic_results:
            if m['id'] not in merged:
                merged[m['id']] = {**m, '_score': 30}
            else:
                merged[m['id']]['_score'] += 30

        results = sorted(merged.values(), key=lambda x: x.get('_score', 0), reverse=True)[:12]
        for m in results:
            m.pop('_score', None)
            m['liked'] = m['id'] in user_liked_ids
            m['disliked'] = m['id'] in user_disliked_ids

        # ── Fallback to popular ─────────────────────────────────────────────
        if not results:
            fallback_filter = {"vote_count": {"$gt": 50}, "poster_path": {"$exists": True}}
            if user_disliked_ids:
                fallback_filter["id"] = {"$nin": list(user_disliked_ids)}
            results = list(movies_collection.find(fallback_filter, PROJECTION)
                           .sort(sort_criteria).limit(12))
            for m in results:
                m['liked'] = m['id'] in user_liked_ids
                m['disliked'] = m['id'] in user_disliked_ids

        # ── Build response message ──────────────────────────────────────────
        primary_mood = mood_result.get("primary_mood")
        mood_emoji = recommender.get_mood_emoji(primary_mood) if primary_mood else "🎬"
        confidence = mood_result.get("primary_confidence", 0)

        parts = []
        if primary_mood and confidence > 0.3:
            parts.append(f"{mood_emoji} {primary_mood.capitalize()} mood")
        if found_people_names:
            parts.append(f"with {', '.join(found_people_names)}")
        if found_genres:
            parts.append(f"{', '.join(found_genres[:2])} movies")
        if found_languages:
            lang_display = {"en": "English", "hi": "Hindi", "te": "Telugu",
                            "ta": "Tamil", "ml": "Malayalam", "kn": "Kannada"}
            parts.append(f"in {', '.join(lang_display.get(l, l) for l in found_languages)}")

        greetings = ["Here you go!", "Check these out!", "Found some great picks for you!",
                     "Hope you enjoy these!", "These should hit the spot!"]
        if parts:
            message = f"{random.choice(greetings)} {' · '.join(parts)}"
        elif user_id and collab_results:
            message = "Based on your taste and similar users, you'll probably enjoy these!"
        else:
            message = f"{random.choice(greetings)} Here are some popular picks!"

        # ── Save mood to history ────────────────────────────────────────────
        if user_id and primary_mood:
            try:
                User.save_mood_history(user_id, {
                    "query": query,
                    "mood": primary_mood,
                    "confidence": confidence,
                    "method": mood_result.get("method", "keyword"),
                    "timestamp": datetime.utcnow()
                })
            except Exception:
                pass

        return jsonify({
            "results": results,
            "message": message,
            "mood_result": {
                "primary_mood": primary_mood,
                "primary_confidence": round(confidence, 3),
                "all_moods": mood_result.get("all_moods", []),
                "method": mood_result.get("method", "keyword"),
                "emoji": mood_emoji
            },
            "found_genres": found_genres,
            "found_people": found_people_names,
            "found_languages": found_languages,
            "liked_movies": liked_movies,
            "disliked_movies": disliked_movies
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@rec_routes.route('/more-like-this/<int:movie_id>', methods=['GET'])
@jwt_required(optional=True)
def get_similar_movies(movie_id):
    try:
        movies_collection = db.get_movies_collection()
        users_collection = db.get_users_collection()
        user_id = get_jwt_identity()

        current_movie = movies_collection.find_one({"id": movie_id})
        if not current_movie:
            return jsonify(list(movies_collection.find(
                {"poster_path": {"$exists": True}}, PROJECTION
            ).sort("vote_count", -1).limit(12)))

        # ── Semantic similarity ─────────────────────────────────────────────
        query_text = f"{current_movie.get('title', '')} {current_movie.get('overview', '')} {' '.join(current_movie.get('genres', []))}"
        semantic_ids = recommender.semantic_search(query_text, top_k=50)

        semantic_movie_ids = [r["movie_id"] for r in semantic_ids if r["movie_id"] != movie_id]
        score_map = {r["movie_id"]: r["score"] for r in semantic_ids}

        # ── Content-based scoring ───────────────────────────────────────────
        candidates = list(movies_collection.find(
            {"id": {"$ne": movie_id}, "poster_path": {"$exists": True}},
            {**PROJECTION, "cast_ids": 1, "director_id": 1}
        ).limit(3000))

        scored = []
        for movie in candidates:
            score = score_map.get(movie['id'], 0) * 40  # Semantic score

            # Genre Jaccard
            set1 = set(current_movie.get('genres', []))
            set2 = set(movie.get('genres', []))
            if set1 | set2:
                score += (len(set1 & set2) / len(set1 | set2)) * 30

            # Director match
            if (current_movie.get('director_id') and
                    current_movie['director_id'] == movie.get('director_id')):
                score += 15

            # Cast overlap
            common_cast = set(current_movie.get('cast_ids', [])) & set(movie.get('cast_ids', []))
            score += min(len(common_cast), 5) * 3

            # Rating similarity
            if current_movie.get('vote_average') and movie.get('vote_average'):
                score += max(0, 10 - abs(current_movie['vote_average'] - movie['vote_average']))

            # Recency
            try:
                if abs(int(movie.get('release_year', 0)) - int(current_movie.get('release_year', 0))) <= 3:
                    score += 3
            except Exception:
                pass

            if score > 0:
                movie['_score'] = score
                movie['common_genres'] = list(set1 & set2)
                scored.append(movie)

        scored.sort(key=lambda x: x['_score'], reverse=True)

        # ── Collaborative boost ─────────────────────────────────────────────
        collab_ids = set()
        if user_id:
            for su in users_collection.find({"liked_movies": movie_id}):
                for mid in su.get("liked_movies", []):
                    if mid != movie_id:
                        collab_ids.add(mid)

        results = {}
        for m in scored[:20]:
            mid = m['id']
            m.pop('_score', None)
            results[mid] = m
            if mid in collab_ids:
                results[mid]['_boost'] = True

        final = list(results.values())[:12]
        for m in final:
            m.pop('_boost', None)

        return jsonify(final if final else list(
            movies_collection.find({"id": {"$ne": movie_id}, "poster_path": {"$exists": True}},
                                   PROJECTION).sort("vote_count", -1).limit(12)
        ))

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@rec_routes.route('/feedback', methods=['POST'])
@jwt_required(optional=True)
def save_feedback():
    """Save chatbot recommendation feedback"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        feedback_doc = {
            "user_id": user_id,
            "query": data.get("query"),
            "mood": data.get("mood"),
            "movie_ids": data.get("movie_ids", []),
            "feedback": data.get("feedback"),  # 'like' or 'dislike'
            "timestamp": datetime.utcnow()
        }
        db.get_feedback_collection().insert_one(feedback_doc)
        return jsonify({"message": "Feedback saved"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@rec_routes.route('/ml-status', methods=['GET'])
def ml_status():
    """Check which ML components are loaded"""
    return jsonify(recommender.status), 200
