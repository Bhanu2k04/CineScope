import { useState } from "react";
import { motion } from "framer-motion";
import MovieGrid from "../Homecomponents/MovieGrid";

const languages = [
  { name: "Telugu", flag: "🎬", color: "from-yellow-500 to-orange-500" },
  { name: "Hindi", flag: "🎭", color: "from-orange-500 to-red-500" },
  { name: "English", flag: "🎥", color: "from-blue-500 to-indigo-500" },
  { name: "Tamil", flag: "🌟", color: "from-green-500 to-teal-500" },
  { name: "Malayalam", flag: "🎞️", color: "from-purple-500 to-pink-500" },
  { name: "Kannada", flag: "🏆", color: "from-teal-500 to-cyan-500" },
];

export default function Languages() {
  const [selected, setSelected] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleClick = async (lang) => {
    setSelected(lang);
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/movies/by-language/${lang}`);
      setMovies(await res.json());
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 p-6">
      {!selected ? (
        <>
          <h2 className="text-3xl font-bold text-white mb-2">Languages</h2>
          <p className="text-gray-400 mb-8">Explore movies in different languages</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-2xl w-full">
            {languages.map(({ name, flag, color }, i) => (
              <motion.button
                key={name}
                className={`h-28 flex flex-col items-center justify-center rounded-xl text-white
                           font-bold shadow-lg bg-gradient-to-br ${color} cursor-pointer gap-2`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.07, boxShadow: "0 0 25px rgba(255,255,255,0.15)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleClick(name)}
              >
                <span className="text-3xl">{flag}</span>
                <span className="text-lg">{name}</span>
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <div className="w-full max-w-7xl">
          <button onClick={() => { setSelected(null); setMovies([]); }}
            className="mb-6 text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
            ← Back to Languages
          </button>
          <h3 className="text-2xl font-bold text-white mb-4">{selected} Movies</h3>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
            </div>
          ) : (
            <MovieGrid movies={movies} title={`Top ${selected} Movies`} forceGrid
              className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" />
          )}
        </div>
      )}
    </div>
  );
}
