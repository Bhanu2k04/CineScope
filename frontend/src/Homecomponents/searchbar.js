import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaTimes, FaMicrophone } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Voice setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      toast.loading('🎤 Listening...', { id: 'voice-toast' });
    };
    recognition.onresult = (event) => {
      let final = '', interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        event.results[i].isFinal ? (final += t) : (interim += t);
      }
      setQuery(final || interim);
    };
    recognition.onerror = (e) => {
      toast.error(`Voice error: ${e.error}`, { id: 'voice-toast' });
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      toast.dismiss('voice-toast');
    };
    recognitionRef.current = recognition;
  }, []);

  // Search debounce
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      setIsSearching(true);
      try {
        const res = await fetch(`http://localhost:5000/movies/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch {
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleMic = () => {
    if (!recognitionRef.current) { toast.error('Voice not supported'); return; }
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const clearSearch = () => { setQuery(''); setResults([]); inputRef.current?.focus(); };

  return (
    <div className="w-full max-w-2xl mx-auto mt-4 mb-8">
      <div className="relative">
        <div className="flex items-center bg-gray-800 rounded-full px-4 py-3 shadow-lg border border-gray-700 focus-within:border-purple-500 transition-colors">
          <FaSearch className="text-gray-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies (type or speak)..."
            className="bg-transparent text-white placeholder-gray-400 focus:outline-none w-full text-sm"
          />
          {isSearching && (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-purple-500 mr-2 flex-shrink-0" />
          )}
          {query && !isSearching && (
            <button onClick={clearSearch} className="text-gray-400 hover:text-white ml-1 flex-shrink-0" title="Clear">
              <FaTimes />
            </button>
          )}
          <button
            onClick={handleMic}
            className={`ml-3 flex-shrink-0 transition-colors ${
              isListening ? 'text-red-400 animate-pulse' : 'text-gray-400 hover:text-white'
            }`}
            title="Voice Search"
          >
            <FaMicrophone />
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-4 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
          <div className="p-3 border-b border-gray-700">
            <span className="text-sm text-gray-400">{results.length} results for "{query}"</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3 max-h-96 overflow-y-auto">
            {results.map(movie => (
              <Link
                key={movie.id}
                to={`/movie/${movie.id}`}
                className="group"
                onClick={() => { setQuery(''); setResults([]); }}
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-700">
                  <img
                    src={movie.poster_path || 'https://via.placeholder.com/150x225'}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150x225'; }}
                  />
                </div>
                <p className="text-xs text-white mt-1 line-clamp-2 group-hover:text-purple-400 transition-colors">
                  {movie.title}
                </p>
                <p className="text-xs text-yellow-400">★ {movie.vote_average?.toFixed(1) || 'N/A'}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {query && !isSearching && results.length === 0 && (
        <div className="mt-4 text-center text-gray-400 text-sm py-4">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
