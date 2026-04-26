import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import MovieGrid from "../Homecomponents/MovieGrid";

const genres = [
  "Action","Adventure","Animation","Comedy","Crime","Documentary",
  "Drama","Family","Fantasy","History","Horror","Music","Mystery",
  "Romance","Science Fiction","Thriller","War","Western"
];

const GENRE_COLORS = [
  "from-red-500 to-orange-500","from-orange-500 to-yellow-500",
  "from-yellow-400 to-green-400","from-green-500 to-teal-500",
  "from-teal-500 to-cyan-500","from-cyan-500 to-blue-500",
  "from-blue-500 to-indigo-500","from-indigo-500 to-purple-500",
  "from-purple-500 to-pink-500","from-pink-500 to-rose-500",
  "from-rose-500 to-red-500","from-lime-500 to-green-500",
  "from-emerald-500 to-cyan-500","from-sky-500 to-blue-500",
  "from-violet-500 to-purple-500","from-fuchsia-500 to-pink-500",
  "from-amber-500 to-orange-500","from-red-400 to-pink-400"
];

export default function Genres() {
  const [selected, setSelected] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`http://localhost:5000/movies/by-genre/${selected.toLowerCase().replace(/ /g, '')}`)
      .then(r => r.json())
      .then(data => setMovies(data))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 p-6">
      {!selected ? (
        <>
          <h2 className="text-3xl font-bold text-white mb-2">Genres</h2>
          <p className="text-gray-400 mb-8">Browse movies by genre</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 max-w-6xl w-full">
            {genres.map((genre, i) => (
              <motion.div
                key={genre}
                className={`h-20 flex items-center justify-center rounded-xl text-white
                           font-bold shadow-lg bg-gradient-to-r ${GENRE_COLORS[i % GENRE_COLORS.length]}
                           cursor-pointer`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(genre)}
              >
                {genre}
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <div className="w-full max-w-7xl">
          <button onClick={() => setSelected(null)}
            className="mb-6 text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
            ← Back to Genres
          </button>
          <h3 className="text-2xl font-bold text-white mb-4">{selected} Movies</h3>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
            </div>
          ) : (
            <MovieGrid movies={movies} title={`Top ${selected} Movies`} forceGrid className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" />
          )}
        </div>
      )}
    </div>
  );
}
