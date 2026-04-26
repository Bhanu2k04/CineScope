from flask import Blueprint, jsonify, request
from database import db
from fuzzywuzzy import fuzz
from datetime import datetime

movie_routes = Blueprint('movies', __name__)

GENRE_MAPPING = {
    'action': 'Action', 'adventure': 'Adventure', 'animation': 'Animation',
    'comedy': 'Comedy', 'crime': 'Crime', 'documentary': 'Documentary',
    'drama': 'Drama', 'family': 'Family', 'fantasy': 'Fantasy',
    'history': 'History', 'horror': 'Horror', 'music': 'Music',
    'mystery': 'Mystery', 'romance': 'Romance', 'scifi': 'Science Fiction',
    'sciencefiction': 'Science Fiction', 'thriller': 'Thriller',
    'war': 'War', 'western': 'Western'
}

PROJECTION = {
    "_id": 0, "id": 1, "title": 1, "poster_path": 1,
    "release_year": 1, "vote_average": 1, "vote_count": 1,
    "backdrop_path": 1, "genres": 1
}


def has_poster(movie):
    """Check if movie has a valid poster"""
    p = movie.get('poster_path')
    return p and isinstance(p, str) and len(p) > 5


@movie_routes.route('/popular', methods=['GET'])
def get_popular_movies():
    movies_collection = db.get_movies_collection()
    try:
        # Step 1: Try to get movies with vote_count > 75 — no year filter first
        movies = list(movies_collection.find(
            {
                "vote_count": {"$gt": 75},
                "poster_path": {"$exists": True, "$ne": None, "$ne": ""}
            },
            PROJECTION
        ).sort("vote_count", -1).limit(200))

        # Step 2: Filter in Python for year (handles both string and int formats)
        filtered = []
        for m in movies:
            year = m.get('release_year')
            if year is None:
                continue
            year_str = str(year).strip()
            # Accept 1980+ movies
            try:
                year_int = int(year_str[:4])
                if year_int >= 1980:
                    filtered.append(m)
            except (ValueError, TypeError):
                continue

        # Step 3: If still empty, relax constraints further
        if not filtered:
            movies = list(movies_collection.find(
                {"poster_path": {"$exists": True, "$ne": None}},
                PROJECTION
            ).sort("vote_count", -1).limit(150))
            filtered = [m for m in movies if m.get('id')]

        if not filtered:
            return jsonify({"error": "No popular movies found"}), 404

        return jsonify(filtered[:150])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/by-genre/<genre>', methods=['GET'])
def get_movies_by_genre(genre):
    movies_collection = db.get_movies_collection()
    try:
        normalized = GENRE_MAPPING.get(genre.lower().replace(' ', ''), genre)
        # Also try title case
        if normalized == genre:
            normalized = genre.title()

        pipeline = [
            {
                "$match": {
                    "genres": {"$in": [normalized, normalized.lower(), normalized.upper()]},
                    "poster_path": {"$exists": True, "$ne": None, "$ne": ""}
                }
            },
            {
                "$addFields": {
                    "genre_match_score": {
                        "$cond": [
                            {"$eq": [{"$arrayElemAt": ["$genres", 0]}, normalized]}, 3,
                            {"$cond": [
                                {"$eq": [{"$arrayElemAt": ["$genres", 1]}, normalized]}, 2, 1
                            ]}
                        ]
                    }
                }
            },
            {"$sort": {"genre_match_score": -1, "vote_average": -1, "vote_count": -1}},
            {"$limit": 7000},
            {"$project": PROJECTION}
        ]
        movies = list(movies_collection.aggregate(pipeline))

        # Fallback: case-insensitive regex search
        if not movies:
            movies = list(movies_collection.find(
                {
                    "genres": {"$regex": normalized, "$options": "i"},
                    "poster_path": {"$exists": True, "$ne": None}
                },
                PROJECTION
            ).sort([("vote_average", -1), ("vote_count", -1)]).limit(200))

        if not movies:
            return jsonify({"error": f"No {normalized} movies found"}), 404
        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/by-genre-language', methods=['GET'])
def get_movies_by_genre_language():
    genre = request.args.get('genre')
    language = request.args.get('language')
    if not genre or not language:
        return jsonify({"error": "Genre and language required"}), 400
    movies_collection = db.get_movies_collection()
    try:
        # Try both 'language' field and 'original_language' field
        movies = list(movies_collection.find(
            {
                "$or": [
                    {"language": {"$regex": f"^{language}$", "$options": "i"}},
                    {"original_language": {"$regex": f"^{language[:2]}$", "$options": "i"}}
                ],
                "genres": {"$regex": genre, "$options": "i"},
                "poster_path": {"$exists": True, "$ne": None}
            },
            {**PROJECTION, "language": 1, "original_language": 1}
        ).sort("vote_count", -1).limit(100))
        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/by-decade/<decade>', methods=['GET'])
def get_movies_by_decade(decade):
    movies_collection = db.get_movies_collection()
    try:
        start_year = int(decade)
        end_year = start_year + 9

        # Try string comparison first
        movies = list(movies_collection.find(
            {
                "release_year": {
                    "$gte": str(start_year),
                    "$lte": str(end_year)
                },
                "poster_path": {"$exists": True, "$ne": None}
            },
            PROJECTION
        ).sort("vote_count", -1).limit(30))

        # If empty, try integer comparison
        if not movies:
            movies = list(movies_collection.find(
                {
                    "release_year": {
                        "$gte": start_year,
                        "$lte": end_year
                    },
                    "poster_path": {"$exists": True, "$ne": None}
                },
                PROJECTION
            ).sort("vote_count", -1).limit(30))

        # If still empty, try regex on release_date field
        if not movies:
            movies = list(movies_collection.find(
                {
                    "release_date": {
                        "$gte": str(start_year),
                        "$lte": str(end_year) + "z"
                    },
                    "poster_path": {"$exists": True, "$ne": None}
                },
                {**PROJECTION, "release_date": 1}
            ).sort("vote_count", -1).limit(30))

        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/by-decade-language/<decade>/<language>', methods=['GET'])
def get_movies_by_decade_language(decade, language):
    movies_collection = db.get_movies_collection()
    try:
        start_year = int(decade)
        end_year = start_year + 9

        movies = list(movies_collection.find(
            {
                "release_year": {"$gte": str(start_year), "$lte": str(end_year)},
                "$or": [
                    {"language": {"$regex": f"^{language}$", "$options": "i"}},
                    {"original_language": {"$regex": f"^{language[:2]}$", "$options": "i"}}
                ],
                "poster_path": {"$exists": True, "$ne": None}
            },
            {**PROJECTION, "language": 1}
        ).sort("vote_count", -1).limit(30))

        # Integer year fallback
        if not movies:
            movies = list(movies_collection.find(
                {
                    "release_year": {"$gte": start_year, "$lte": end_year},
                    "$or": [
                        {"language": {"$regex": f"^{language}$", "$options": "i"}},
                        {"original_language": {"$regex": f"^{language[:2]}$", "$options": "i"}}
                    ],
                    "poster_path": {"$exists": True, "$ne": None}
                },
                {**PROJECTION, "language": 1}
            ).sort("vote_count", -1).limit(30))

        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/search', methods=['GET'])
def search_movies():
    movies_collection = db.get_movies_collection()
    query = request.args.get('q', '').strip().lower()
    if not query:
        return jsonify([])
    try:
        all_movies = list(movies_collection.find({}, {
            "_id": 0, "id": 1, "title": 1, "original_title": 1,
            "poster_path": 1, "release_year": 1, "vote_average": 1
        }))
        matched = []
        for movie in all_movies:
            title_score = fuzz.token_set_ratio(query, movie.get('title', '').lower())
            orig_score = fuzz.token_set_ratio(query, movie.get('original_title', '').lower())
            best = max(title_score, orig_score)
            if best > 60:
                matched.append({**movie, 'match_score': best})
        matched.sort(key=lambda x: x['match_score'], reverse=True)
        for m in matched:
            m.pop('match_score', None)
        return jsonify(matched[:30])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/by-language/<language>', methods=['GET'])
def get_movies_by_language(language):
    movies_collection = db.get_movies_collection()
    try:
        # Map full language names to codes
        LANG_CODE_MAP = {
            "english": "en", "hindi": "hi", "telugu": "te",
            "tamil": "ta", "malayalam": "ml", "kannada": "kn"
        }
        lang_code = LANG_CODE_MAP.get(language.lower(), language[:2].lower())

        movies = list(movies_collection.find(
            {
                "$or": [
                    {"language": {"$regex": f"^{language}$", "$options": "i"}},
                    {"original_language": lang_code}
                ],
                "poster_path": {"$exists": True, "$ne": None}
            },
            PROJECTION
        ).sort("vote_count", -1).limit(100))

        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/<int:movie_id>', methods=['GET'])
def get_movie_details(movie_id):
    movies_collection = db.get_movies_collection()
    people_collection = db.get_people_collection()
    try:
        movie = movies_collection.find_one({"id": movie_id}, {"_id": 0})
        if not movie:
            return jsonify({"error": "Movie not found"}), 404

        cast = []
        for cast_id in movie.get('cast_ids', []):
            person = people_collection.find_one(
                {"id": cast_id},
                {"_id": 0, "id": 1, "name": 1, "profile_path": 1, "characters": 1}
            )
            if person:
                character = next(
                    (c['name'] for c in person.get('characters', [])
                     if c.get('movie') == movie.get('title')),
                    'Unknown'
                )
                cast.append({
                    "id": person['id'],
                    "name": person['name'],
                    "profile_path": person.get('profile_path'),
                    "character": character
                })
        movie['cast'] = cast

        if 'director_id' in movie:
            director = people_collection.find_one(
                {"id": movie['director_id']},
                {"_id": 0, "id": 1, "name": 1, "profile_path": 1}
            )
            if director:
                movie['director'] = director

        return jsonify(movie)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/free', methods=['GET'])
def get_free_movies():
    movies_collection = db.get_movies_collection()
    try:
        movies = list(movies_collection.find(
            {
                "movie_url": {"$exists": True, "$nin": [None, ""]},
                "poster_path": {"$exists": True, "$ne": None}
            },
            {**PROJECTION, "movie_url": 1}
        ).sort("vote_count", -1).limit(30))
        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/new-releases', methods=['GET'])
def get_new_releases():
    movies_collection = db.get_movies_collection()
    current_year = datetime.now().year
    try:
        # Try both string and int year
        movies = list(movies_collection.find(
            {
                "$or": [
                    {"release_year": str(current_year)},
                    {"release_year": current_year},
                    {"release_year": str(current_year - 1)},
                    {"release_year": current_year - 1},
                ],
                "poster_path": {"$exists": True, "$ne": None}
            },
            PROJECTION
        ).sort("vote_count", -1).limit(20))
        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@movie_routes.route('/trending', methods=['GET'])
def get_trending():
    movies_collection = db.get_movies_collection()
    try:
        movies = list(movies_collection.find(
            {
                "vote_average": {"$gte": 7.0},
                "vote_count": {"$gt": 100},
                "poster_path": {"$exists": True, "$ne": None}
            },
            PROJECTION
        ).sort([("vote_average", -1), ("vote_count", -1)]).limit(30))

        # Fallback if empty
        if not movies:
            movies = list(movies_collection.find(
                {"poster_path": {"$exists": True, "$ne": None}},
                PROJECTION
            ).sort([("vote_average", -1)]).limit(30))

        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
