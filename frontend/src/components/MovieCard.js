import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';

export default function MovieCard({ movie, onAddToWatchlist, onRemoveFromWatchlist, watchlist = [] }) {
  if (!movie?.id) return null;

  const isInWatchlist = watchlist.includes(movie.id);

  const handleWatchlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isInWatchlist ? onRemoveFromWatchlist?.(movie.id) : onAddToWatchlist?.(movie.id);
  };

  return (
    <Link to={`/movie/${movie.id}`}>
      <motion.div
        className="relative rounded-lg overflow-hidden shadow-lg cursor-pointer group"
        whileHover={{ scale: 1.05, boxShadow: "0 0 18px 2px #a855f7, 0 0 32px 6px #ec4899" }}
        transition={{ duration: 0.25 }}
      >
        {/* Poster */}
        <div className="aspect-[2/3] w-full bg-gray-800">
          <img
            src={movie.poster_path || "https://via.placeholder.com/300x450"}
            alt={movie.title || "Movie"}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = "https://via.placeholder.com/300x450"; }}
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {(onAddToWatchlist || onRemoveFromWatchlist) && (
            <button
              onClick={handleWatchlist}
              className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
              title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              {isInWatchlist
                ? <FaBookmark className="text-yellow-400" />
                : <FaRegBookmark />}
            </button>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
          <h3 className="text-white font-medium text-xs text-center line-clamp-2">
            {movie.title || "Untitled"}
          </h3>
          <div className="flex justify-center mt-1 space-x-1">
            <span className="text-yellow-400 text-[10px]">
              ★ {movie.vote_average?.toFixed(1) || 'N/A'}
            </span>
            <span className="text-gray-300 text-[10px]">{movie.release_year || ''}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
