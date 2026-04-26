import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMicrophone, FaPaperPlane, FaFilm, FaThumbsUp,
  FaThumbsDown, FaExpand, FaCompress, FaRobot, FaRegCommentDots, FaTimes
} from 'react-icons/fa';
import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const CHATBOT_NAME = "CineBot";
const API = 'http://localhost:5000';

const MOOD_EMOJIS = {
  happy:"😊", sad:"😢", excited:"🤩", scary:"😱", romantic:"💕",
  inspiring:"💪", mystery:"🔍", chill:"😌", dark:"🌑", epic:"⚔️",
  funny:"😂", uplifting:"🌟", tragic:"💔", adventurous:"🗺️",
  suspenseful:"😰", fantastical:"🧙", biographical:"📖", historical:"🏛️",
};

const QUICK_PROMPTS = [
  { label: "😊 Happy", query: "I want something happy and fun" },
  { label: "🎬 Action", query: "Show me thrilling action movies" },
  { label: "💕 Romance", query: "Recommend a romantic movie" },
  { label: "😱 Horror", query: "I want something scary tonight" },
  { label: "🌟 Inspiring", query: "Something uplifting and inspiring" },
  { label: "🔍 Mystery", query: "A good mystery or thriller" },
  { label: "😂 Comedy", query: "Make me laugh, funny movie" },
  { label: "🗺️ Adventure", query: "I feel adventurous today" },
];

const LANG_DISPLAY = { en:"English", hi:"Hindi", te:"Telugu", ta:"Tamil", ml:"Malayalam", kn:"Kannada" };

// ── Message bubble ────────────────────────────────────────────────────────────
function MoodBadge({ moodResult }) {
  if (!moodResult?.primary_mood) return null;
  const { primary_mood, primary_confidence, all_moods, method } = moodResult;
  const emoji = MOOD_EMOJIS[primary_mood] || '🎬';
  const pct = Math.round((primary_confidence || 0) * 100);

  return (
    <div className="flex flex-wrap gap-1 mt-2 mb-1">
      <span className="flex items-center gap-1 bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs px-2 py-1 rounded-full">
        {emoji} <span className="capitalize">{primary_mood}</span>
        <span className="text-purple-400 ml-1">{pct}%</span>
        {method === 'ml' && <span className="text-green-400 ml-1 text-[10px]">ML</span>}
      </span>
      {all_moods?.slice(1, 3).map(([mood, score]) => (
        <span key={mood} className="flex items-center gap-1 bg-gray-700/60 text-gray-400 text-xs px-2 py-1 rounded-full">
          {MOOD_EMOJIS[mood] || '🎬'} <span className="capitalize">{mood}</span>
          <span className="text-gray-500 ml-1">{Math.round(score * 100)}%</span>
        </span>
      ))}
    </div>
  );
}

function MovieResultGrid({ movies }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {movies.map(movie => (
        <Link key={movie.id} to={`/movie/${movie.id}`}
          className="bg-gray-900 rounded-lg overflow-hidden block hover:ring-1 hover:ring-purple-500 transition-all">
          <img
            src={movie.poster_path || 'https://via.placeholder.com/150x225'}
            alt={movie.title}
            className="w-full h-28 object-cover"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/150x225'; }}
          />
          <div className="p-1.5">
            <p className="text-xs text-white truncate font-medium">{movie.title}</p>
            <div className="flex items-center justify-between mt-0.5">
              {movie.vote_average && (
                <p className="text-xs text-yellow-400">⭐ {movie.vote_average.toFixed(1)}</p>
              )}
              {movie.release_year && (
                <p className="text-xs text-gray-500">{movie.release_year}</p>
              )}
            </div>
            {movie.genres?.length > 0 && (
              <p className="text-[10px] text-purple-400 truncate mt-0.5">{movie.genres.slice(0, 2).join(' · ')}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Message({ msg, index, onFeedback, feedback }) {
  return (
    <div className={`mb-4 ${msg.isBot ? 'text-left' : 'text-right'}`}>
      {msg.isBot && (
        <div className="flex items-center gap-1 mb-1">
          <FaRobot className="text-purple-400 text-xs" />
          <span className="text-xs text-purple-400 font-medium">{CHATBOT_NAME}</span>
        </div>
      )}

      <div className={`inline-block max-w-xs p-3 rounded-xl text-sm ${
        msg.isBot
          ? msg.isError
            ? 'bg-red-900/60 text-red-200 border border-red-700'
            : msg.isTyping
              ? 'bg-gray-700 text-gray-400 italic'
              : 'bg-gray-700 text-white'
          : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
      }`}>
        {msg.text}
        {msg.examples && (
          <div className="mt-2 space-y-1">
            {msg.examples.map((ex, i) => (
              <div key={i} className="text-xs text-gray-300">• {ex}</div>
            ))}
          </div>
        )}
      </div>

      {/* Mood badge */}
      {msg.isBot && !msg.isTyping && msg.moodResult && (
        <MoodBadge moodResult={msg.moodResult} />
      )}

      {/* Genre / language chips */}
      {msg.isBot && !msg.isTyping && (msg.found_genres?.length > 0 || msg.found_languages?.length > 0 || msg.found_people?.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-1">
          {msg.found_genres?.slice(0, 3).map(g => (
            <span key={g} className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">{g}</span>
          ))}
          {msg.found_languages?.map(l => (
            <span key={l} className="text-[10px] bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">
              {LANG_DISPLAY[l] || l}
            </span>
          ))}
          {msg.found_people?.map(p => (
            <span key={p} className="text-[10px] bg-pink-900/50 text-pink-300 px-2 py-0.5 rounded-full">👤 {p}</span>
          ))}
        </div>
      )}

      {/* Movie grid */}
      {msg.movies?.length > 0 && <MovieResultGrid movies={msg.movies} />}

      {/* Feedback buttons */}
      {msg.isBot && !msg.isTyping && (
        <div className="flex gap-1 mt-1.5">
          <button
            onClick={() => onFeedback(index, 'like')}
            className={`p-1 rounded transition-colors ${feedback === 'like' ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`}
            title="Helpful"
          ><FaThumbsUp className="text-xs" /></button>
          <button
            onClick={() => onFeedback(index, 'dislike')}
            className={`p-1 rounded transition-colors ${feedback === 'dislike' ? 'text-red-400' : 'text-gray-600 hover:text-gray-400'}`}
            title="Not helpful"
          ><FaThumbsDown className="text-xs" /></button>
        </div>
      )}
    </div>
  );
}

// ── Main Chatbot ──────────────────────────────────────────────────────────────
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(360);
  const [height, setHeight] = useState(520);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, width: 360, height: 520 });

  const [messages, setMessages] = useState([{
    text: `Hi! I'm ${CHATBOT_NAME} 🎬 Ask me anything like:`,
    isBot: true,
    examples: [
      "I feel happy, suggest something fun",
      "Dark thriller in Hindi",
      "Movies like Interstellar but sadder",
      "Best comedy with Tom Hanks",
      "Something adventurous for tonight",
    ]
  }]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  const { user } = useUser();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFeedback = useCallback(async (msgIdx, value) => {
    setFeedback(prev => ({ ...prev, [msgIdx]: value }));
    const msg = messages[msgIdx];
    if (msg?.movies?.length > 0) {
      try {
        await fetch(`${API}/recommend/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: messages[msgIdx - 1]?.text || '',
            mood: msg.moodResult?.primary_mood,
            movie_ids: msg.movies.map(m => m.id),
            feedback: value
          })
        });
      } catch { /* silent */ }
    }
  }, [messages]);

  const handleSend = useCallback(async (text = inputText) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages(prev => [...prev, { text: trimmed, isBot: false }]);
    setInputText('');
    setShowQuickPrompts(false);
    setIsTyping(true);
    setMessages(prev => [...prev, { text: "Thinking...", isBot: true, isTyping: true }]);

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/recommend/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: trimmed, user_id: user?._id })
      });
      const data = await res.json();

      setMessages(prev => prev.filter(m => !m.isTyping));
      setIsTyping(false);

      if (data.message && data.results?.length === 0) {
        // General Q&A response
        setMessages(prev => [...prev, { text: data.message, isBot: true }]);
        return;
      }

      if (data.results?.length > 0) {
        setMessages(prev => [...prev, {
          text: data.message || "Here are some recommendations:",
          isBot: true,
          movies: data.results,
          moodResult: data.mood_result,
          found_genres: data.found_genres,
          found_languages: data.found_languages,
          found_people: data.found_people,
        }]);
      } else {
        setMessages(prev => [...prev, {
          text: "I couldn't find matching movies. Try describing a mood or genre differently!",
          isBot: true
        }]);
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => !m.isTyping));
      setMessages(prev => [...prev, {
        text: "Sorry, something went wrong. Please try again!",
        isBot: true, isError: true
      }]);
      setIsTyping(false);
    }
  }, [inputText, isTyping, user]);

  // Voice
  const startListening = useCallback(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) { toast.error('Voice not supported in this browser'); return; }
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInputText(t);
      handleSend(t);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  }, [handleSend]);

  // Resize
  const handleResizeStart = (e, dir) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(true); setResizeDir(dir);
    setDragStart({ x: e.clientX, y: e.clientY, width, height });
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging || !resizeDir || isMaximized) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      if (resizeDir === 'right') setWidth(clamp(dragStart.width + dx, 300, 650));
      if (resizeDir === 'left')  setWidth(clamp(dragStart.width - dx, 300, 650));
      if (resizeDir === 'bottom') setHeight(clamp(dragStart.height + dy, 320, 750));
      if (resizeDir === 'top')    setHeight(clamp(dragStart.height - dy, 320, 750));
    };
    const onUp = () => { setDragging(false); setResizeDir(null); document.body.style.userSelect = ''; };
    if (dragging) { window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, resizeDir, dragStart, isMaximized]);

  const handleMaximize = () => {
    if (!isMaximized) { setWidth(620); setHeight(740); setIsMaximized(true); }
    else { setWidth(360); setHeight(520); setIsMaximized(false); }
  };

  const clearChat = () => {
    setMessages([{
      text: `Hi! I'm ${CHATBOT_NAME} 🎬 Ask me anything like:`,
      isBot: true,
      examples: ["I feel happy, suggest something fun", "Dark thriller in Hindi"]
    }]);
    setFeedback({});
    setShowQuickPrompts(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{ width: `${width}px`, height: `${height}px`, minWidth: 300, minHeight: 320, maxWidth: '92vw', maxHeight: '90vh', position: 'relative' }}
            className="bg-gray-800 rounded-2xl shadow-2xl flex flex-col border border-gray-700 overflow-hidden select-none"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-blue-700 px-4 py-3 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-white rounded-full p-1 shadow-md">
                  <FaRobot className="text-purple-600 text-lg" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm leading-tight">{CHATBOT_NAME}</h3>
                  <p className="text-purple-200 text-xs">AI Movie Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearChat} className="text-purple-200 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors" title="Clear chat">
                  Clear
                </button>
                <button onClick={handleMaximize} className="text-white hover:text-gray-200 transition-colors" title={isMaximized ? "Restore" : "Maximize"}>
                  {isMaximized ? <FaCompress size={14} /> : <FaExpand size={14} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 transition-colors">
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {/* Resize handles */}
            {['top','bottom','left','right'].map(dir => (
              <div key={dir} onMouseDown={e => handleResizeStart(e, dir)}
                style={{
                  position:'absolute', zIndex:50,
                  ...(dir==='top' ? {top:-5,left:0,right:0,height:10,cursor:'ns-resize'} :
                      dir==='bottom' ? {bottom:-5,left:0,right:0,height:10,cursor:'ns-resize'} :
                      dir==='left' ? {left:-5,top:0,bottom:0,width:10,cursor:'ew-resize'} :
                      {right:-5,top:0,bottom:0,width:10,cursor:'ew-resize'})
                }}
              />
            ))}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.map((msg, i) => (
                <Message key={i} msg={msg} index={i} onFeedback={handleFeedback} feedback={feedback[i]} />
              ))}

              {/* Quick prompts */}
              {showQuickPrompts && messages.length === 1 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Quick picks:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map(({ label, query }) => (
                      <button key={label} onClick={() => handleSend(query)}
                        className="text-xs bg-gray-700 hover:bg-purple-700 text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition-colors">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-700 bg-gray-900 flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isTyping && handleSend()}
                  placeholder="Describe a mood or ask anything..."
                  className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-500"
                  disabled={isTyping}
                />
                <button onClick={startListening} disabled={isListening || isTyping}
                  className={`p-2 rounded-xl transition-colors ${isListening ? 'text-red-400 animate-pulse bg-gray-800' : 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700'}`}
                  title="Voice input">
                  <FaMicrophone className="text-sm" />
                </button>
                <button onClick={() => handleSend()}
                  disabled={!inputText.trim() || isTyping}
                  className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity">
                  <FaPaperPlane className="text-sm" />
                </button>
              </div>
              {isTyping && (
                <p className="text-xs text-gray-500 mt-1.5 text-center animate-pulse">
                  {CHATBOT_NAME} is thinking...
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="chat-button" className="flex flex-col items-center gap-1">
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs font-bold uppercase tracking-widest"
              style={{
                background: 'linear-gradient(90deg, #a78bfa, #f472b6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}
            >
              {CHATBOT_NAME}
            </motion.span>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-2xl border-4 border-white/20 relative"
              style={{ boxShadow: '0 4px 30px rgba(139,92,246,0.4)' }}
              title="Open CineBot"
            >
              <span className="relative flex items-center justify-center w-full h-full">
                <span className="absolute left-2 top-2 animate-ping">
                  <div className="w-3 h-3 rounded-full bg-pink-400 opacity-60" />
                </span>
                <FaRobot className="text-4xl text-white z-10" />
                <FaFilm className="absolute text-purple-300 text-2xl left-1 top-1 z-20 opacity-70" />
                <FaRegCommentDots className="absolute text-blue-200 text-xl right-1 bottom-1 z-20 animate-bounce" />
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
