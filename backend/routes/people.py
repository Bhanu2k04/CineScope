from flask import Blueprint, jsonify, request
from database import db

people_routes = Blueprint('people', __name__)


@people_routes.route('/popular', methods=['GET'])
def get_popular_people():
    people_collection = db.get_people_collection()
    movies_collection = db.get_movies_collection()
    try:
        pipeline = [
            {"$match": {"characters.4": {"$exists": True}}},
            {"$addFields": {"movie_count": {"$size": "$characters"}}},
            {"$sort": {"movie_count": -1}},
            {"$limit": 102},
            {
                "$project": {
                    "_id": 0, "id": 1, "name": 1, "profile_path": 1,
                    "known_for": 1, "biography": 1, "birthday": 1,
                    "place_of_birth": 1, "popularity": 1, "movie_count": 1
                }
            }
        ]
        people = list(people_collection.aggregate(pipeline))

        for person in people:
            movies = []
            if person.get('known_for') in ('acting', None):
                movie_titles = [c['movie'] for c in person.get('characters', [])]
                actor_movies = list(movies_collection.find(
                    {"title": {"$in": movie_titles}},
                    {"_id": 0, "id": 1, "title": 1, "poster_path": 1, "release_year": 1}
                ))
                for m in actor_movies:
                    m['job'] = 'Actor'
                movies.extend(actor_movies)

            if person.get('known_for') == 'directing':
                dir_movies = list(movies_collection.find(
                    {"director_id": person['id']},
                    {"_id": 0, "id": 1, "title": 1, "poster_path": 1, "release_year": 1}
                ))
                for m in dir_movies:
                    m['job'] = 'Director'
                movies.extend(dir_movies)

            if person.get('known_for') == 'production':
                prod_movies = list(movies_collection.find(
                    {"producer_ids": person['id']},
                    {"_id": 0, "id": 1, "title": 1, "poster_path": 1, "release_year": 1}
                ))
                for m in prod_movies:
                    m['job'] = 'Producer'
                movies.extend(prod_movies)

            person['movies'] = movies

        return jsonify(people)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@people_routes.route('/search', methods=['GET'])
def search_people():
    people_collection = db.get_people_collection()
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify([])

        people = list(people_collection.find(
            {"name": {"$regex": query, "$options": "i"}},
            {
                "_id": 0, "id": 1, "name": 1, "profile_path": 1,
                "known_for": 1, "biography": 1, "birthday": 1,
                "place_of_birth": 1, "popularity": 1, "characters": 1
            }
        ).limit(100))

        for person in people:
            person['movie_count'] = len(person.get('characters', []))
            person.pop('characters', None)

        return jsonify(people)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@people_routes.route('/<int:person_id>', methods=['GET'])
def get_person_details(person_id):
    people_collection = db.get_people_collection()
    movies_collection = db.get_movies_collection()
    try:
        person = people_collection.find_one({"id": person_id}, {"_id": 0})
        if not person:
            return jsonify({"error": "Person not found"}), 404

        actor_movies = []
        if person.get('characters'):
            movie_filters = [
                {"title": c["movie"], "language": c.get("language", "")}
                for c in person.get("characters", [])
            ]
            actor_movies = list(movies_collection.find(
                {"$or": movie_filters},
                {"_id": 0, "id": 1, "title": 1, "poster_path": 1,
                 "release_year": 1, "language": 1}
            ))
            for movie in actor_movies:
                character = next(
                    (c['name'] for c in person.get('characters', [])
                     if c['movie'] == movie['title']
                     and c.get('language', '') == movie.get('language', '')),
                    'Unknown'
                )
                movie['role'] = character
                movie['job'] = 'Actor'

        director_movies = []
        if person.get('known_for') == 'directing':
            director_movies = list(movies_collection.find(
                {"director_id": person_id},
                {"_id": 0, "id": 1, "title": 1, "poster_path": 1, "release_year": 1}
            ))
            for m in director_movies:
                m['job'] = 'Director'

        producer_movies = []
        if person.get('known_for') == 'production':
            producer_movies = list(movies_collection.find(
                {"producer_ids": person_id},
                {"_id": 0, "id": 1, "title": 1, "poster_path": 1, "release_year": 1}
            ))
            for m in producer_movies:
                m['job'] = 'Producer'

        all_movies = actor_movies + director_movies + producer_movies

        return jsonify({
            "id": person['id'],
            "name": person['name'],
            "profile_path": person.get('profile_path'),
            "known_for": person.get('known_for'),
            "biography": person.get('biography'),
            "birthday": person.get('birthday'),
            "place_of_birth": person.get('place_of_birth'),
            "popularity": person.get('popularity'),
            "movies": all_movies
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
