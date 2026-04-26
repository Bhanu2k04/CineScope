import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PersonCard from "../components/PersonCard";
import MovieGrid from "../Homecomponents/MovieGrid";
import { FaThumbsUp, FaThumbsDown, FaBookmark, FaRegBookmark, FaPlay } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function MovieDetails() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [liked, setLiked] = useState(null); // null=neutral, true=liked, false=disliked
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showWatchMovie, setShowWatchMovie] = useState(false);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await fetch(`http://localhost:5000/movies/${id}`);
        const data = await res.json();
        setMovie(data);
        // Fetch similar movies
        setLoadingSimilar(true);
        const simRes = await fetch(`http://localhost:5000/recommend/more-like-this/${id}`);
        const simData = await simRes.json();
        setSimilarMovies(simData);
      } catch {
        // silent
      } finally {
        setLoading(false);
        setLoadingSimilar(false);
      }
    };
    fetchMovie();
  }, [id]);

  useEffect(() => {
    const fetchLikes = async () => {
      const token = localStorage.getItem('token');
      if (!token || !movie) return;
      try {
        const res = await fetch('http://localhost:5000/user/likes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const likedMovies = await res.json();
        setLiked(likedMovies.some(m => m.id === movie.id) ? true : null);
      } catch { /* silent */ }
    };
    fetchLikes();
  }, [movie]);

  useEffect(() => {
    const fetchWatchlist = async () => {
      const token = localStorage.getItem('token');
      if (!token || !movie) return;
      try {
        const res = await fetch('http://localhost:5000/user/watchlist', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const watchlist = await res.json();
        setIsInWatchlist(Array.isArray(watchlist)
          ? watchlist.some(m => m.id === movie.id)
          : false);
      } catch { /* silent */ }
    };
    fetchWatchlist();
  }, [movie]);

  const handleLike = async () => {
    const token = localStorage.getItem('token');
    if (!token) return toast.error("Login to like movies!");
    await fetch(`http://localhost:5000/user/like/${movie.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    setLiked(true);
    toast.success("Added to your likes!");
  };

  const handleDislike = async () => {
    const token = localStorage.getItem('token');
    if (!token) return toast.error("Login to dislike movies!");
    await fetch(`http://localhost:5000/user/dislike/${movie.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    setLiked(false);
    toast.success("Marked as not liked.");
  };

  const handleWatchlist = async () => {
    const token = localStorage.getItem('token');
    if (!token) return toast.error("Login to use watchlist!");
    const profileIdx = 0;
    if (isInWatchlist) {
      await fetch(`http://localhost:5000/user/watchlist/${profileIdx}/${movie.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsInWatchlist(false);
      toast.success("Removed from watchlist");
    } else {
      await fetch(`http://localhost:5000/user/watchlist/${profileIdx}/${movie.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsInWatchlist(true);
      toast.success("Added to watchlist!");
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
    </div>
  );
  if (!movie) return (
    <div className="text-white text-center py-20 bg-gray-900 min-h-screen">Movie not found</div>
  );

  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return match?.[2]?.length === 11 ? match[2] : null;
  };

  const trailerId = getYouTubeId(movie.trailer_url);
  const movieUrlId = getYouTubeId(movie.movie_url);
  const isFreeMovie = movie.movie_url && movie.movie_url.length > 0;

  if (showWatchMovie && isFreeMovie) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full mx-auto">
          <button onClick={() => setShowWatchMovie(false)}
            className="mb-4 px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition">
            ← Back to Details
          </button>
          <h2 className="text-2xl font-bold mb-4 text-center">{movie.title}</h2>
          {movieUrlId ? (
            <iframe
              src={`https://www.youtube.com/embed/${movieUrlId}`}
              title={`${movie.title} Full Movie`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen className="w-full h-96 rounded-xl" />
          ) : (
            <a href={movie.movie_url} target="_blank" rel="noopener noreferrer"
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700">
              Watch Now
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-6 text-purple-400 hover:text-purple-300 transition-colors">
          ← Back to Home
        </Link>

        <div className="flex flex-col md:flex-row gap-8 mb-10">
          {/* Poster */}
          <div className="w-full md:w-1/3 lg:w-1/4 relative flex-shrink-0">
            <img
              src={movie.poster_path || "https://via.placeholder.com/300x450"}
              alt={movie.title}
              className="w-full rounded-xl shadow-2xl"
              onError={(e) => { e.target.src = "https://via.placeholder.com/300x450"; }}
            />
            <button onClick={handleWatchlist}
              className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
              title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}>
              {isInWatchlist
                ? <FaBookmark className="text-yellow-400 text-xl" />
                : <FaRegBookmark className="text-xl" />}
            </button>
          </div>

          {/* Details */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2 break-words">
              {movie.title} {movie.release_year && <span className="text-gray-400">({movie.release_year})</span>}
            </h1>

            {/* Like / Dislike */}
            <div className="flex gap-3 my-3">
              <button onClick={handleLike}
                className={`p-2 rounded-full border-2 transition-colors ${
                  liked === true ? "bg-green-600 border-green-600" : "bg-gray-800 border-gray-600 hover:border-green-500"
                }`} title="Like">
                <FaThumbsUp className={liked === true ? "text-white" : "text-gray-400"} />
              </button>
              <button onClick={handleDislike}
                className={`p-2 rounded-full border-2 transition-colors ${
                  liked === false ? "bg-red-600 border-red-600" : "bg-gray-800 border-gray-600 hover:border-red-500"
                }`} title="Not for me">
                <FaThumbsDown className={liked === false ? "text-white" : "text-gray-400"} />
              </button>
            </div>

            {movie.tagline && (
              <p className="text-gray-400 italic mb-4">"{movie.tagline}"</p>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.genres?.map((genre, i) => (
                <span key={i} className="px-3 py-1 bg-purple-600 rounded-full text-sm font-medium">
                  {genre}
                </span>
              ))}
            </div>

            {/* Overview */}
            <p className="text-gray-300 leading-relaxed mb-6 break-words">{movie.overview}</p>

            {/* Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 text-purple-400">Details</h3>
                {movie.runtime && <p className="text-sm mb-1"><span className="text-gray-400">Runtime:</span> {movie.runtime} mins</p>}
                {movie.vote_average && <p className="text-sm mb-1"><span className="text-gray-400">Rating:</span> ⭐ {movie.vote_average.toFixed(1)}/10</p>}
                {movie.vote_count && <p className="text-sm mb-1"><span className="text-gray-400">Votes:</span> {movie.vote_count.toLocaleString()}</p>}
                {movie.release_year && <p className="text-sm"><span className="text-gray-400">Year:</span> {movie.release_year}</p>}
              </div>
              {movie.director && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-purple-400">Director</h3>
                  <PersonCard person={movie.director} />
                </div>
              )}
            </div>

            {/* Trailer */}
            {trailerId && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3 text-purple-400">Trailer</h3>
                <iframe
                  src={`https://www.youtube.com/embed/${trailerId}`}
                  title={`${movie.title} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-64 md:h-80 rounded-xl" />
              </div>
            )}

            {/* Watch Movie */}
            {isFreeMovie && (
              <button onClick={() => setShowWatchMovie(true)}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition">
                <FaPlay /> Watch Movie Free
              </button>
            )}
          </div>
        </div>

        {/* Cast */}
        {movie.cast?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {movie.cast.map(person => (
                <div key={person.id} className="text-center">
                  <PersonCard person={person} />
                  {person.character && (
                    <p className="text-gray-400 text-xs mt-1">as {person.character}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* More Like This */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">More Like This</h2>
          {loadingSimilar ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
            </div>
          ) : (
            <MovieGrid
              movies={similarMovies}
              className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            />
          )}
        </div>
      </div>
    </div>
  );
}
