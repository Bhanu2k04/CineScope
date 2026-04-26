import { useState, useEffect } from "react";
import { FaSearch, FaTimes, FaMicrophone } from "react-icons/fa";
import PersonCard from "../components/PersonCard";
import { toast } from "react-hot-toast";

export default function People() {
  const [people, setPeople] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const endpoint = searchQuery.trim()
        ? `http://localhost:5000/people/search?q=${encodeURIComponent(searchQuery)}`
        : "http://localhost:5000/people/popular";
      fetch(endpoint)
        .then(r => r.json())
        .then(data => setPeople(data))
        .catch(() => setPeople([]))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Speech Recognition not supported'); return; }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.start();
    setListening(true);
    toast.success('🎤 Listening...', { duration: 2000 });
    recognition.onresult = (e) => setSearchQuery(e.results[0][0].transcript);
    recognition.onerror = () => { toast.error('Voice error'); setListening(false); };
    recognition.onend = () => setListening(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">People of Cinema</h1>
          <div className="relative w-full max-w-md">
            <div className="flex items-center bg-gray-800 rounded-full px-4 py-3 border border-gray-700 focus-within:border-purple-500 transition-colors">
              <FaSearch className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search actors, directors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-white placeholder-gray-400 focus:outline-none w-full text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white ml-1">
                  <FaTimes />
                </button>
              )}
              <button onClick={handleVoice}
                className={`text-gray-400 hover:text-white ml-2 transition-colors ${listening ? 'text-red-400 animate-pulse' : ''}`}>
                <FaMicrophone />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
          </div>
        ) : people.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {people.map(person => (
              <div key={person.id} className="flex flex-col items-center">
                <PersonCard person={person} />
                {person.movie_count > 0 && (
                  <p className="text-gray-400 text-xs mt-1">{person.movie_count} movies</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-10">
            {searchQuery ? "No results found." : "No people found."}
          </p>
        )}
      </div>
    </div>
  );
}
