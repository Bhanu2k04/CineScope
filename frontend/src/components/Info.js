import { useEffect } from "react";

export default function InfoModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (isOpen && e.target.id === "info-overlay") onClose();
    };
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  }, [isOpen, onClose]);

  return (
    <div
      id="info-overlay"
      className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 ${
        isOpen ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
    >
      <div className={`fixed top-0 right-0 h-full w-80 bg-gray-800 p-6 shadow-2xl
        transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
        >✕</button>

        <h2 className="text-2xl font-bold text-purple-400 mb-3">Welcome to CineScope!</h2>
        <p className="text-base text-white mb-4">
          <span className="font-semibold text-pink-400">CineScope</span> helps you discover
          movies by genre, mood, person, and language. Explore top films in 6 languages —
          English, Hindi, Telugu, Tamil, Malayalam, and Kannada.
        </p>

        <ul className="list-disc list-inside text-white mb-4 text-sm space-y-2">
          <li><span className="text-purple-300 font-semibold">Smart Search</span> — movies, genres, people, languages</li>
          <li><span className="text-purple-300 font-semibold">AI Chatbot</span> — mood-based ML recommendations</li>
          <li><span className="text-purple-300 font-semibold">Personalized</span> — profiles, watchlists & likes</li>
          <li><span className="text-purple-300 font-semibold">Semantic Search</span> — describe a vibe, get results</li>
        </ul>

        <div className="bg-gray-700 rounded-lg p-3 mb-4 text-sm text-gray-300">
          <p className="font-semibold text-purple-300 mb-1">💬 Try asking CineBot:</p>
          <ul className="space-y-1 text-gray-400 text-xs">
            <li>"I feel adventurous tonight"</li>
            <li>"Dark romantic thriller in Hindi"</li>
            <li>"Something cozy and funny"</li>
            <li>"Movies like Interstellar but sadder"</li>
          </ul>
        </div>

        <p className="text-xs text-gray-400 mt-4 border-t border-gray-700 pt-3">
          <span className="font-semibold">Data:</span> Movie data from{" "}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer"
            className="text-blue-400 underline">TMDb</a>.
        </p>
      </div>
    </div>
  );
}
