import json
from database import db

# Load movies from JSON file
with open('movies.json', 'r', encoding='utf-8') as f:
    movies = json.load(f)

# Clean the data - remove _id field if it contains $oid
cleaned_movies = []
for movie in movies:
    if '_id' in movie:
        del movie['_id']
    cleaned_movies.append(movie)

# Clear existing and insert new
mc = db.get_movies_collection()
mc.delete_many({})
mc.insert_many(cleaned_movies)
print(f'✅ Loaded {len(cleaned_movies)} movies into MongoDB')