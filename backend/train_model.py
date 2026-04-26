# ============================================================
#  CineScope ML Training Script
#  Run this in Google Colab (GPU recommended)
#
#  Steps:
#  1. Upload your movies.json and people.json to Colab
#  2. Run all cells
#  3. Download the ml_models/ folder
#  4. Place ml_models/ inside your backend/ folder
# ============================================================

# ── Cell 1: Install dependencies ────────────────────────────
# !pip install sentence-transformers scikit-learn numpy pandas matplotlib seaborn

# ── Cell 2: Imports ─────────────────────────────────────────
import json
import pickle
import numpy as np
import pandas as pd
import os
import random
import re
from datetime import datetime

from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.multioutput import MultiOutputClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, accuracy_score,
    f1_score, confusion_matrix
)
import matplotlib.pyplot as plt
import seaborn as sns

os.makedirs("ml_models", exist_ok=True)
print("✅ Dependencies loaded")

# ── Cell 3: Mood-Genre mapping ───────────────────────────────
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
ALL_MOODS = list(MOOD_GENRE_MAP.keys())

# ── Cell 4: Generate synthetic training data ─────────────────
TEMPLATES = {
    "happy": [
        "i want something happy", "show me feel good movies",
        "something cheerful and fun", "i'm in a happy mood",
        "lighthearted movies please", "something that makes me smile",
        "upbeat and joyful films", "funny and happy movie",
        "i feel great today what should i watch",
        "something bright and positive", "cheerful family film",
        "wholesome and fun movies", "i want to laugh and be happy",
        "give me a happy comedy", "something uplifting today",
    ],
    "sad": [
        "i feel sad", "something emotional", "i want to cry",
        "melancholic movie", "i'm feeling blue", "a tearjerker please",
        "emotional drama", "something that touches the heart",
        "i want to feel something deeply", "bittersweet movie",
        "a film about loss", "sad romantic movie",
        "i'm heartbroken recommend something",
        "something that makes me cry", "deeply moving film",
    ],
    "excited": [
        "something thrilling and exciting", "high energy action",
        "i want adrenaline", "fast paced exciting movie",
        "pumped up movie", "i feel excited what should i watch",
        "action packed adventure", "blockbuster action film",
        "something with explosions and action",
        "i want an edge of seat experience", "intense action movie",
        "exciting sci-fi adventure", "i'm hyped give me something great",
        "high octane movie", "something thrilling tonight",
    ],
    "scary": [
        "i want to be scared", "horror movie recommendation",
        "something terrifying", "scary movie tonight",
        "give me nightmares", "creepy and unsettling film",
        "psychological horror", "jump scares please",
        "something that will haunt me", "terrifying horror film",
        "i love horror recommend something", "scary and dark movie",
        "supernatural horror", "i want something horrifying",
        "spooky movie for tonight",
    ],
    "romantic": [
        "romantic movie please", "something sweet and romantic",
        "love story recommendation", "date night movie",
        "i'm in the mood for romance", "a beautiful love story",
        "romantic comedy suggestion", "something heartwarming and romantic",
        "movies about love", "i want to feel romantic",
        "sweet love story", "romantic drama", "i need a good love movie",
        "something passionate and romantic",
        "fall in love type of movie",
    ],
    "inspiring": [
        "something inspiring", "motivational movie",
        "i need inspiration", "uplifting and powerful film",
        "movies that make you want to change the world",
        "something that gives hope", "inspiring true story",
        "motivating film", "powerful and moving story",
        "something that will inspire me", "feel good and inspiring",
        "i want to feel motivated", "life changing movie",
        "empowering film", "something deeply inspiring",
    ],
    "mystery": [
        "mystery movie recommendation", "something mysterious",
        "detective story please", "whodunit film",
        "i love mysteries suggest something", "suspense and mystery",
        "intriguing mystery film", "puzzling and mysterious",
        "a good detective movie", "mystery thriller recommendation",
        "something with twists and turns", "i like solving mysteries",
        "crime mystery film", "mysterious and intriguing",
        "plot twist mystery movie",
    ],
    "chill": [
        "something relaxing", "chill movie for tonight",
        "i want to unwind", "easy going movie",
        "nothing too intense", "light and relaxing film",
        "cozy movie recommendation", "i want to just relax",
        "something low key", "gentle and calming movie",
        "nothing stressful just chill", "peaceful film to watch",
        "laid back movie", "i want to just vibe",
        "comfortable easy watch",
    ],
    "dark": [
        "dark and gritty movie", "something with dark themes",
        "dark crime thriller", "morally complex film",
        "something disturbing but good", "dark psychological movie",
        "gritty and realistic dark film", "i like dark movies",
        "something deeply dark", "dark drama recommendation",
        "film noir style movie", "dark and atmospheric",
        "bleak but brilliant film", "something with edge and darkness",
        "dark psychological thriller",
    ],
    "epic": [
        "epic movie please", "something grand and epic",
        "massive scale film", "i want an epic adventure",
        "legendary film recommendation", "huge blockbuster epic",
        "something with big battles and epic moments",
        "sweeping epic story", "i want to feel the epicness",
        "grand fantasy epic", "war epic recommendation",
        "massive and spectacular film", "legendary epic movie",
        "something on an enormous scale", "big and bold epic",
    ],
    "funny": [
        "make me laugh", "something hilarious", "comedy recommendation",
        "funniest movies", "i want to laugh", "slapstick comedy",
        "hilarious film please", "something really funny",
        "laugh out loud comedy", "i need a good laugh",
        "best comedy movies", "funny movie for tonight",
        "something that will crack me up", "witty and funny film",
        "a really great comedy",
    ],
    "uplifting": [
        "something uplifting", "feel good movie recommendation",
        "movie that lifts my spirits", "positive and feel good",
        "i need something uplifting", "something that makes me feel good",
        "cheerful uplifting film", "positive vibes movie",
        "something warming and uplifting", "feel good family film",
        "i want to feel uplifted after watching",
        "optimistic and hopeful movie", "something to lift my mood",
        "joyful and uplifting", "warm and feel good",
    ],
    "tragic": [
        "tragic story", "something heartbreaking", "sad tragedy film",
        "i want a tragic story", "beautiful but sad movie",
        "tragic romance", "heartbreaking drama", "tear jerking tragedy",
        "something with a sad ending", "devastating and emotional film",
        "tragic war movie", "beautiful sad story",
        "deeply tragic film", "something profoundly sad",
        "moving tragedy recommendation",
    ],
    "adventurous": [
        "adventure movie please", "something adventurous",
        "i feel adventurous", "explore and adventure film",
        "journey and quest movie", "adventure and discovery",
        "i want to go on an adventure", "epic journey film",
        "exploration adventure movie", "something with a big adventure",
        "action adventure recommendation", "bold and daring adventure",
        "thrilling adventure story", "i love adventure movies",
        "something that feels like an adventure",
    ],
    "suspenseful": [
        "keep me on edge", "something suspenseful",
        "nail biting tension", "suspense thriller recommendation",
        "something with great suspense", "i love suspense",
        "edge of seat thriller", "highly suspenseful movie",
        "tense and gripping film", "something that keeps you guessing",
        "psychological suspense", "gripping suspense thriller",
        "white knuckle suspense", "i want tension and suspense",
        "suspenseful crime movie",
    ],
    "fantastical": [
        "fantasy movie recommendation", "something magical",
        "i want magic and fantasy", "fantastical world film",
        "fairy tale like movie", "magical fantasy adventure",
        "something out of this world", "epic fantasy film",
        "i love fantasy movies", "science fiction and fantasy",
        "other world fantasy film", "imaginative fantasy movie",
        "something with incredible world building",
        "magical and fantastical", "fantasy sci-fi recommendation",
    ],
    "biographical": [
        "biographical movie", "based on true story",
        "biopic recommendation", "real life story film",
        "i want a biopic", "movie about a real person",
        "historical biography film", "true story movie",
        "documentary style biopic", "life story recommendation",
        "inspiring true story biopic", "real events movie",
        "factual and biographical film", "biopic about famous person",
        "movie inspired by real life",
    ],
    "historical": [
        "historical movie", "set in ancient times",
        "period drama recommendation", "history based film",
        "i love historical movies", "movie set in the past",
        "historical epic", "period piece recommendation",
        "ancient civilization movie", "historical war film",
        "movie set in history", "great historical drama",
        "factual historical film", "era piece movie",
        "history and period drama",
    ],
}

def augment_text(text):
    """Simple augmentation: random word dropout and case variation"""
    words = text.split()
    if len(words) > 3 and random.random() > 0.5:
        drop_idx = random.randint(0, len(words)-1)
        words = [w for i, w in enumerate(words) if i != drop_idx]
    return ' '.join(words)

def generate_training_data():
    texts, labels = [], []
    for mood, templates in TEMPLATES.items():
        for text in templates:
            # Original
            texts.append(text)
            labels.append([mood])
            # Augmented x3
            for _ in range(3):
                texts.append(augment_text(text))
                labels.append([mood])

    # Multi-mood examples
    multi_mood_examples = [
        ("dark romantic thriller", ["dark", "romantic", "suspenseful"]),
        ("happy and exciting adventure", ["happy", "excited", "adventurous"]),
        ("funny and uplifting comedy", ["funny", "uplifting", "happy"]),
        ("epic and inspiring historical", ["epic", "inspiring", "historical"]),
        ("scary and suspenseful horror", ["scary", "suspenseful", "dark"]),
        ("sad and romantic love story", ["sad", "romantic", "tragic"]),
        ("chill and funny movie", ["chill", "funny", "happy"]),
        ("dark mysterious thriller", ["dark", "mystery", "suspenseful"]),
        ("epic fantasy adventure", ["epic", "adventurous", "fantastical"]),
        ("biographical inspiring story", ["biographical", "inspiring", "uplifting"]),
        ("funny romantic comedy", ["funny", "romantic", "happy"]),
        ("dark and tragic drama", ["dark", "tragic", "sad"]),
        ("exciting and adventurous action", ["excited", "adventurous", "epic"]),
        ("chill and romantic evening movie", ["chill", "romantic", "happy"]),
        ("mysterious and suspenseful crime", ["mystery", "suspenseful", "dark"]),
    ]
    for text, mood_list in multi_mood_examples:
        texts.append(text)
        labels.append(mood_list)
        for _ in range(5):
            texts.append(augment_text(text))
            labels.append(mood_list)

    return texts, labels

texts, labels = generate_training_data()
print(f"✅ Generated {len(texts)} training samples")
print(f"   Label distribution:")
from collections import Counter
all_labels_flat = [l for label_list in labels for l in label_list]
for mood, count in Counter(all_labels_flat).most_common():
    print(f"   {mood}: {count}")

# ── Cell 5: Prepare multi-label data ────────────────────────
mlb = MultiLabelBinarizer(classes=ALL_MOODS)
Y = mlb.fit_transform(labels)

# TF-IDF vectorization
vectorizer = TfidfVectorizer(ngram_range=(1, 3), max_features=5000, sublinear_tf=True)
X = vectorizer.fit_transform(texts)

# Train/test split
X_train, X_test, Y_train, Y_test = train_test_split(
    X, Y, test_size=0.2, random_state=42
)
print(f"✅ Train size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")

# ── Cell 6: Train mood classifier ───────────────────────────
base_clf = LogisticRegression(
    C=5.0, max_iter=1000, solver='lbfgs',
    class_weight='balanced', random_state=42
)
multi_clf = MultiOutputClassifier(base_clf, n_jobs=-1)
multi_clf.fit(X_train, Y_train)
print("✅ Mood classifier trained")

# ── Cell 7: Evaluate ─────────────────────────────────────────
Y_pred = multi_clf.predict(X_test)

print("\n" + "="*60)
print("MOOD CLASSIFIER METRICS")
print("="*60)

# Per-mood metrics
for i, mood in enumerate(ALL_MOODS):
    y_true_mood = Y_test[:, i]
    y_pred_mood = Y_pred[:, i]
    acc = accuracy_score(y_true_mood, y_pred_mood)
    f1 = f1_score(y_true_mood, y_pred_mood, zero_division=0)
    print(f"  {mood:15s} | Accuracy: {acc:.3f} | F1: {f1:.3f}")

# Overall
overall_acc = accuracy_score(Y_test, Y_pred)
overall_f1 = f1_score(Y_test, Y_pred, average='macro', zero_division=0)
overall_f1_micro = f1_score(Y_test, Y_pred, average='micro', zero_division=0)

print(f"\n  Overall Accuracy (exact match): {overall_acc:.3f}")
print(f"  Macro F1:                       {overall_f1:.3f}")
print(f"  Micro F1:                       {overall_f1_micro:.3f}")
print("="*60)

# ── Cell 8: Confusion matrix heatmap ────────────────────────
fig, axes = plt.subplots(3, 6, figsize=(24, 12))
axes = axes.flatten()

for i, mood in enumerate(ALL_MOODS):
    cm = confusion_matrix(Y_test[:, i], Y_pred[:, i])
    sns.heatmap(cm, annot=True, fmt='d', ax=axes[i],
                cmap='Blues', cbar=False,
                xticklabels=['No', 'Yes'],
                yticklabels=['No', 'Yes'])
    axes[i].set_title(mood, fontsize=10, fontweight='bold')
    axes[i].set_xlabel('Predicted')
    axes[i].set_ylabel('Actual')

for j in range(len(ALL_MOODS), len(axes)):
    fig.delaxes(axes[j])

plt.suptitle('Confusion Matrices Per Mood', fontsize=16, fontweight='bold')
plt.tight_layout()
plt.savefig('ml_models/confusion_matrices.png', dpi=150, bbox_inches='tight')
plt.show()
print("✅ Confusion matrix saved")

# ── Cell 9: F1 bar chart ─────────────────────────────────────
f1_scores = []
for i, mood in enumerate(ALL_MOODS):
    f1 = f1_score(Y_test[:, i], Y_pred[:, i], zero_division=0)
    f1_scores.append(f1)

plt.figure(figsize=(14, 5))
colors = ['#a855f7' if f > 0.7 else '#3b82f6' if f > 0.5 else '#ef4444' for f in f1_scores]
bars = plt.bar(ALL_MOODS, f1_scores, color=colors, edgecolor='white', linewidth=0.5)
plt.axhline(y=0.7, color='green', linestyle='--', alpha=0.7, label='Good threshold (0.7)')
plt.axhline(y=0.5, color='orange', linestyle='--', alpha=0.7, label='Acceptable threshold (0.5)')
plt.xlabel('Mood', fontsize=12)
plt.ylabel('F1 Score', fontsize=12)
plt.title('Per-Mood F1 Scores', fontsize=14, fontweight='bold')
plt.xticks(rotation=45, ha='right')
plt.legend()
plt.ylim(0, 1.1)
for bar, score in zip(bars, f1_scores):
    plt.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.01,
             f'{score:.2f}', ha='center', va='bottom', fontsize=9)
plt.tight_layout()
plt.savefig('ml_models/f1_scores.png', dpi=150, bbox_inches='tight')
plt.show()
print("✅ F1 chart saved")

# ── Cell 10: Save mood classifier ────────────────────────────
with open('ml_models/mood_classifier.pkl', 'wb') as f:
    pickle.dump(multi_clf, f)
with open('ml_models/mood_vectorizer.pkl', 'wb') as f:
    pickle.dump(vectorizer, f)
with open('ml_models/mood_label_encoder.pkl', 'wb') as f:
    pickle.dump(mlb, f)
print("✅ Mood classifier saved to ml_models/")

# ── Cell 11: Load movies data ────────────────────────────────
# Option A: Load from JSON file
# with open('movies.json', 'r', encoding='utf-8') as f:
#     movies_data = json.load(f)

# Option B: Load from MongoDB (if you have access)
# from pymongo import MongoClient
# client = MongoClient("your_mongo_uri")
# db = client["cinescopeDB"]
# movies_data = list(db.movies.find({}, {"_id": 0}))

# For Colab, use Option A - load your movies.json
print("📋 Loading movies data...")
print("   → Upload your movies.json when prompted or set the path below")

# ── CHANGE THIS PATH if needed ──────────────────────────────
MOVIES_JSON_PATH = 'movies.json'

try:
    with open(MOVIES_JSON_PATH, 'r', encoding='utf-8') as f:
        movies_data = json.load(f)
    if not isinstance(movies_data, list):
        movies_data = [movies_data]
    print(f"✅ Loaded {len(movies_data)} movies from JSON")
except FileNotFoundError:
    print("⚠️ movies.json not found. Creating sample data for demo...")
    movies_data = []

# ── Cell 12: Build movie text corpus ────────────────────────
def build_movie_text(movie):
    parts = []
    if movie.get('title'):
        parts.append(movie['title'])
    if movie.get('overview'):
        parts.append(movie['overview'])
    if movie.get('genres'):
        parts.extend(movie['genres'])
    if movie.get('release_year'):
        parts.append(str(movie['release_year']))
    return ' '.join(parts)

valid_movies = [m for m in movies_data if m.get('id') and m.get('title')]
print(f"✅ {len(valid_movies)} valid movies for embedding")

movie_texts = [build_movie_text(m) for m in valid_movies]
movie_ids = np.array([m['id'] for m in valid_movies])

# ── Cell 13: Sentence Transformer embeddings (GPU!) ─────────
print("\n🚀 Building semantic embeddings with sentence-transformers...")
print("   This uses GPU in Colab - should take a few minutes")

model = SentenceTransformer('all-MiniLM-L6-v2')

# Encode in batches
BATCH_SIZE = 128
all_embeddings = []

for i in range(0, len(movie_texts), BATCH_SIZE):
    batch = movie_texts[i:i+BATCH_SIZE]
    embeddings = model.encode(batch, normalize_embeddings=True, show_progress_bar=False)
    all_embeddings.append(embeddings)
    if (i // BATCH_SIZE) % 10 == 0:
        print(f"   Progress: {min(i+BATCH_SIZE, len(movie_texts))}/{len(movie_texts)}")

movie_embeddings = np.vstack(all_embeddings)
print(f"✅ Embeddings shape: {movie_embeddings.shape}")

# Save embeddings
np.save('ml_models/movie_embeddings.npy', movie_embeddings)
np.save('ml_models/movie_ids.npy', movie_ids)
print("✅ Semantic embeddings saved")

# ── Cell 14: TF-IDF matrix (CPU fallback) ────────────────────
print("\n📊 Building TF-IDF matrix (CPU fallback)...")
tfidf_vec = TfidfVectorizer(ngram_range=(1, 2), max_features=10000, sublinear_tf=True)
tfidf_matrix = tfidf_vec.fit_transform(movie_texts).toarray()

np.save('ml_models/tfidf_matrix.npy', tfidf_matrix)
with open('ml_models/tfidf_vectorizer.pkl', 'wb') as f:
    pickle.dump(tfidf_vec, f)
print(f"✅ TF-IDF matrix saved: {tfidf_matrix.shape}")

# ── Cell 15: Test the full pipeline ─────────────────────────
print("\n" + "="*60)
print("TESTING THE FULL PIPELINE")
print("="*60)

test_queries = [
    "i want something happy and funny",
    "dark psychological thriller",
    "something romantic for tonight",
    "epic adventure in space",
    "i feel sad recommend something",
    "scary horror movie",
    "inspiring biographical story",
    "chill and relaxing movie",
]

for query in test_queries:
    vec = vectorizer.transform([query])
    probs = multi_clf.predict_proba(vec)
    mood_scores = {}
    for i, mood in enumerate(mlb.classes_):
        score = probs[i][0][1] if len(probs[i][0]) > 1 else probs[i][0][0]
        mood_scores[mood] = round(float(score), 3)
    top_moods = sorted(mood_scores.items(), key=lambda x: x[1], reverse=True)[:3]
    print(f"\n  Query: '{query}'")
    print(f"  Top moods: {[(m, f'{s:.2f}') for m, s in top_moods]}")

# ── Cell 16: Final summary ────────────────────────────────────
print("\n" + "="*60)
print("TRAINING COMPLETE - SUMMARY")
print("="*60)
print(f"  Overall Accuracy:  {overall_acc:.3f}")
print(f"  Macro F1 Score:    {overall_f1:.3f}")
print(f"  Micro F1 Score:    {overall_f1_micro:.3f}")
print(f"  Movies embedded:   {len(valid_movies)}")
print(f"  Embedding dim:     {movie_embeddings.shape[1]}")
print(f"\n  Files saved to ml_models/:")
print(f"    ✅ mood_classifier.pkl")
print(f"    ✅ mood_vectorizer.pkl")
print(f"    ✅ mood_label_encoder.pkl")
print(f"    ✅ movie_embeddings.npy")
print(f"    ✅ movie_ids.npy")
print(f"    ✅ tfidf_matrix.npy")
print(f"    ✅ tfidf_vectorizer.pkl")
print(f"    ✅ confusion_matrices.png")
print(f"    ✅ f1_scores.png")
print("\n📦 Download the entire ml_models/ folder")
print("   and place it inside your backend/ folder")
print("="*60)

# ── Cell 17: Download (Colab only) ───────────────────────────
# import shutil
# shutil.make_archive('ml_models', 'zip', 'ml_models')
# from google.colab import files
# files.download('ml_models.zip')
