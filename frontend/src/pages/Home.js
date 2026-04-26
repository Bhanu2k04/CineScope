import { useState, useEffect } from "react";
import CsLogo from "../Homecomponents/cslogo";
import SearchBar from "../Homecomponents/searchbar";
import MovieGrid from "../Homecomponents/MovieGrid";
import { toast } from 'react-hot-toast';

const PROFILE_IDX = 0;

export default function Home({ profile }) {
  const [popularMovies, setPopularMovies] = useState([]);
  const [watchlistMovies, setWatchlistMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [preferredMovies, setPreferredMovies] = useState([]);
  const [freeMovies, setFreeMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [movies80s, setMovies80s] = useState([]);
  const [movies90s, setMovies90s] = useState([]);
  const [movies2000s, setMovies2000s] = useState([]);
  const [movies80sHindi, setMovies80sHindi] = useState([]);
  const [movies90sHindi, setMovies90sHindi] = useState([]);
  const [movies2000sHindi, setMovies2000sHindi] = useState([]);
  const [movies80sTelugu, setMovies80sTelugu] = useState([]);
  const [movies90sTelugu, setMovies90sTelugu] = useState([]);
  const [movies2000sTelugu, setMovies2000sTelugu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preferences, setPreferences] = useState({ preferred_genres: [], preferred_languages: [] });
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load preferences from profile or backend
  useEffect(() => {
    const loadPrefs = async () => {
      if (profile?.preferred_genres || profile?.preferred_languages) {
        setPreferences({
          preferred_genres: profile.preferred_genres || [],
          preferred_languages: profile.preferred_languages || []
        });
        setProfileLoaded(true);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        if (!token) { setProfileLoaded(true); return; }
        const res = await fetch('http://localhost:5000/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPreferences({
            preferred_genres: data.preferred_genres || [],
            preferred_languages: data.preferred_languages || []
          });
        }
      } catch { /* silent */ }
      finally { setProfileLoaded(true); }
    };
    loadPrefs();
  }, [profile]);

  // Fetch all movie data
  useEffect(() => {
    if (!profileLoaded) return;

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const get = (url, setter, fallback = []) =>
      fetch(url, { headers })
        .then(r => r.json())
        .then(data => setter(Array.isArray(data) ? data : fallback))
        .catch(() => setter(fallback));

    const getDecade = (decade, setter) =>
      get(`http://localhost:5000/movies/by-decade/${decade}`, setter);

    const getDecadeLang = (decade, lang, setter) =>
      get(`http://localhost:5000/movies/by-decade-language/${decade}/${lang}`, setter);

    const fetchWatchlist = async () => {
      if (!token) return;
      try {
        const res = await fetch(`http://localhost:5000/user/watchlist/${PROFILE_IDX}`, { headers });
        if (res.ok) setWatchlistMovies(await res.json());
      } catch { /* silent */ }
    };

    const fetchRecommendations = async () => {
      if (!token) return;
      try {
        const res = await fetch('http://localhost:5000/user/likes', { headers });
        const liked = await res.json();
        if (liked.length > 0) {
          const recRes = await fetch(
            `http://localhost:5000/recommend/more-like-this/${liked[0].id}`,
            { headers }
          );
          const recData = await recRes.json();
          const likedIds = liked.map(m => m.id);
          setRecommendations(recData.filter(m => !likedIds.includes(m.id)));
        }
      } catch { /* silent */ }
    };

    const fetchPreferred = async () => {
      const moviesSet = new Map();
      const { preferred_genres: genres, preferred_languages: langs } = preferences;
      try {
        if (genres.length > 0 && langs.length > 0) {
          for (const genre of genres) {
            for (const lang of langs) {
              const res = await fetch(
                `http://localhost:5000/movies/by-genre-language?genre=${encodeURIComponent(genre)}&language=${encodeURIComponent(lang)}`
              );
              if (res.ok) (await res.json()).forEach(m => moviesSet.set(m.id, m));
            }
          }
        } else if (genres.length > 0) {
          for (const genre of genres) {
            const res = await fetch(`http://localhost:5000/movies/by-genre/${encodeURIComponent(genre)}`);
            if (res.ok) (await res.json()).forEach(m => moviesSet.set(m.id, m));
          }
        } else if (langs.length > 0) {
          for (const lang of langs) {
            const res = await fetch(`http://localhost:5000/movies/by-language/${encodeURIComponent(lang)}`);
            if (res.ok) (await res.json()).forEach(m => moviesSet.set(m.id, m));
          }
        }
      } catch { /* silent */ }
      setPreferredMovies(Array.from(moviesSet.values()).slice(0, 30));
    };

    setLoading(true);
    Promise.all([
      get('http://localhost:5000/movies/popular', setPopularMovies)
        .catch(e => setError(e.message)),
      get('http://localhost:5000/movies/new-releases', setNewReleases),
      get('http://localhost:5000/movies/free', setFreeMovies),
      get('http://localhost:5000/movies/trending', setTrendingMovies),
      fetchWatchlist(),
      fetchRecommendations(),
      fetchPreferred(),
      getDecade(2000, setMovies2000s),
      getDecade(1990, setMovies90s),
      getDecade(1980, setMovies80s),
      getDecadeLang(2000, 'Hindi', setMovies2000sHindi),
      getDecadeLang(1990, 'Hindi', setMovies90sHindi),
      getDecadeLang(1980, 'Hindi', setMovies80sHindi),
      getDecadeLang(2000, 'Telugu', setMovies2000sTelugu),
      getDecadeLang(1990, 'Telugu', setMovies90sTelugu),
      getDecadeLang(1980, 'Telugu', setMovies80sTelugu),
    ]).finally(() => setLoading(false));

  }, [profileLoaded, preferences]);

  // Watchlist actions
  const handleAddToWatchlist = async (movieId) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('Please login to add to watchlist'); return; }
    try {
      const res = await fetch(`http://localhost:5000/user/watchlist/${PROFILE_IDX}/${movieId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const wlRes = await fetch(`http://localhost:5000/user/watchlist/${PROFILE_IDX}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (wlRes.ok) setWatchlistMovies(await wlRes.json());
        toast.success('Added to watchlist!');
      } else {
        toast.error('Failed to add to watchlist');
      }
    } catch { toast.error('Network error'); }
  };

  const handleRemoveFromWatchlist = async (movieId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/user/watchlist/${PROFILE_IDX}/${movieId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const wlRes = await fetch(`http://localhost:5000/user/watchlist/${PROFILE_IDX}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (wlRes.ok) setWatchlistMovies(await wlRes.json());
        toast.success('Removed from watchlist');
      }
    } catch { toast.error('Network error'); }
  };

  const watchlistIds = watchlistMovies.map(m => m.id);
  const currentYear = new Date().getFullYear();

  const Section = ({ title, movies, className = "" }) => {
    if (!movies || movies.length === 0) return null;
    return (
      <div className="mt-10">
        <h2 className={`text-2xl md:text-3xl font-extrabold mb-4 text-center tracking-wide drop-shadow-lg ${className}`}>
          {title}
        </h2>
        <MovieGrid
          movies={movies}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          watchlist={watchlistIds}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center">
          <CsLogo />
          <SearchBar />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 text-xl mb-2">⚠️ Failed to load movies</p>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        ) : (
          <>
            {profile?.is_child ? (
              <Section
                title="🧸 Kids Friendly Movies"
                movies={popularMovies.filter(m =>
                  m.genres?.includes('Animation') || m.genres?.includes('Family')
                )}
                className="text-yellow-300"
              />
            ) : (
              <>
                {preferredMovies.length > 0 && (
                  <Section title="💡 You Might Prefer This" movies={preferredMovies} className="text-purple-400" />
                )}
                {recommendations.length > 0 && (
                  <Section title="⭐ You Might Like This" movies={recommendations} className="text-pink-400" />
                )}
                {watchlistMovies.length > 0 && (
                  <Section title="📺 Your Watchlist" movies={watchlistMovies} className="text-blue-300" />
                )}
                {trendingMovies.length > 0 && (
                  <Section title="🔥 Trending Now" movies={trendingMovies} className="text-orange-400" />
                )}
                {freeMovies.length > 0 && (
                  <Section title="✨ Free Movies" movies={freeMovies} className="text-green-400" />
                )}
                <Section title="🏆 Most Voted" movies={popularMovies} className="text-purple-300" />
                <Section title={`🌟 New Releases (${currentYear})`} movies={newReleases} className="text-white" />
                <Section title="🚀 Blockbusters of the 2000s" movies={movies2000s} className="text-blue-400" />
                <Section title="🎬 2000s Bollywood Hits" movies={movies2000sHindi} className="text-red-400" />
                <Section title="🎥 2000s Telugu Hits" movies={movies2000sTelugu} className="text-green-400" />
                <Section title="🌟 Iconic 90s Hits" movies={movies90s} className="text-yellow-300" />
                <Section title="🎬 90s Bollywood Classics" movies={movies90sHindi} className="text-red-400" />
                <Section title="🎥 90s Tollywood Hits" movies={movies90sTelugu} className="text-green-400" />
                <Section title="✨ Timeless 80s Classics" movies={movies80s} className="text-pink-400" />
                <Section title="🎬 80s Bollywood Classics" movies={movies80sHindi} className="text-red-400" />
                <Section title="🎥 80s Tollywood Classics" movies={movies80sTelugu} className="text-green-400" />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
