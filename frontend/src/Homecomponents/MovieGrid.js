import MovieCard from '../components/MovieCard';

export default function MovieGrid({
  movies,
  title = '',
  className = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  onAddToWatchlist,
  onRemoveFromWatchlist,
  watchlist = [],
  forceGrid = false
}) {
  if (!movies || movies.length === 0) {
    return title ? (
      <div className="w-full px-4 md:px-8 mt-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{title}</h2>
        <p className="text-gray-400">No movies available</p>
      </div>
    ) : null;
  }

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 mt-8">
      {title && (
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">{title}</h2>
      )}
      {forceGrid ? (
        <div className={`grid gap-4 md:gap-6 ${className}`}>
          {movies.map(movie =>
            movie?.id ? (
              <div key={movie.id} className="transition-all duration-300 hover:z-10">
                <MovieCard
                  movie={movie}
                  onAddToWatchlist={onAddToWatchlist}
                  onRemoveFromWatchlist={onRemoveFromWatchlist}
                  watchlist={watchlist}
                />
              </div>
            ) : null
          )}
        </div>
      ) : (
        <div className="flex overflow-x-auto space-x-4 pb-4 hide-scrollbar">
          {movies.map(movie =>
            movie?.id ? (
              <div key={movie.id} className="flex-shrink-0 w-36 md:w-40">
                <MovieCard
                  movie={movie}
                  onAddToWatchlist={onAddToWatchlist}
                  onRemoveFromWatchlist={onRemoveFromWatchlist}
                  watchlist={watchlist}
                />
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
