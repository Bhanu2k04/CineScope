import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import CsLogo from "../Homecomponents/cslogo";

const emojiOptions = [
  '😀','😎','🤩','🧐','👩','👨','👧','👦','👩‍🎤','👨‍🎤',
  '🦸‍♀️','🦸‍♂️','🧙‍♀️','🧙‍♂️','👽','🤖','🐶','🐱','🦊','🐼'
];
const genreOptions = [
  'Action','Adventure','Animation','Comedy','Crime','Documentary',
  'Drama','Family','Fantasy','History','Horror','Music','Mystery',
  'Romance','Science Fiction','Thriller','War','Western'
];
const languageOptions = ['English','Hindi','Telugu','Tamil','Malayalam','Kannada'];

const MOOD_EMOJIS = {
  happy:"😊", sad:"😢", excited:"🤩", scary:"😱", romantic:"💕",
  inspiring:"💪", mystery:"🔍", chill:"😌", dark:"🌑", epic:"⚔️",
  funny:"😂", uplifting:"🌟", tragic:"💔", adventurous:"🗺️",
  suspenseful:"😰", fantastical:"🧙", biographical:"📖", historical:"🏛️",
};

export default function Settings({ profile, profiles, onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState('');
  const [profileEmoji, setProfileEmoji] = useState('👤');
  const [preferredGenres, setPreferredGenres] = useState([]);
  const [preferredLanguages, setPreferredLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [moodHistory, setMoodHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const navigate = useNavigate();

  const profileIdx = profiles?.findIndex(
    p => p.name === profile?.name && p.profile_emoji === profile?.profile_emoji
  );

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setProfileEmoji(profile.profile_emoji || '👤');
      setPreferredGenres(profile.preferred_genres || []);
      setPreferredLanguages(profile.preferred_languages || []);
    }
  }, [profile]);

  // Fetch mood history when on mood tab
  useEffect(() => {
    if (activeTab !== 'mood') return;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/user/mood-history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setMoodHistory(await res.json());
      } catch { /* silent */ }
      finally { setLoadingHistory(false); }
    };
    fetchHistory();
  }, [activeTab]);

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = (profileIdx !== undefined && profileIdx !== -1)
        ? `http://localhost:5000/user/profile/${profileIdx}`
        : 'http://localhost:5000/user/profile';
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, profile_emoji: profileEmoji }),
      });
      if (res.ok) {
        toast.success('Profile updated!');
        onProfileUpdate?.({ name, profile_emoji: profileEmoji });
        navigate('/');
      } else {
        toast.error('Failed to update profile');
      }
    } catch { toast.error('Network error.'); }
    finally { setIsLoading(false); }
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = (profileIdx !== undefined && profileIdx !== -1)
        ? `http://localhost:5000/user/preferences/${profileIdx}`
        : 'http://localhost:5000/user/preferences/0';
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferred_genres: preferredGenres, preferred_languages: preferredLanguages }),
      });
      if (res.ok) {
        toast.success('Preferences saved!');
        localStorage.setItem('preferences_updated', Date.now().toString());
      } else {
        toast.error('Failed to save preferences');
      }
    } catch { toast.error('Network error.'); }
    finally { setIsLoading(false); }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { toast.error('Fill all fields'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/user/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPassword }),
      });
      if (res.ok) {
        toast.success('Password reset successfully!');
        setResetOpen(false); setNewPassword(''); setConfirmPassword('');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reset password');
      }
    } catch { toast.error('Network error.'); }
    finally { setIsLoading(false); }
  };

  const toggle = (list, setList, item) =>
    setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);

  const tabs = ['profile', 'preferences', 'mood', 'account'];

  const inputClass = "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <CsLogo />
          <h2 className="text-3xl font-bold text-white mt-2">Settings</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6 overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 font-medium capitalize whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}>
              {tab === 'mood' ? '🎭 Mood History' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Edit Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profile Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setProfileEmoji(emoji)}
                      className={`text-2xl p-2 rounded-full transition-colors ${
                        profileEmoji === emoji ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}>{emoji}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleSaveProfile} disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-1">Genre Preferences</h3>
            <p className="text-gray-400 text-sm mb-4">Select genres for better recommendations on Home</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-8">
              {genreOptions.map(genre => (
                <button key={genre} type="button" onClick={() => toggle(preferredGenres, setPreferredGenres, genre)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    preferredGenres.includes(genre)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}>{genre}</button>
              ))}
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Language Preferences</h3>
            <p className="text-gray-400 text-sm mb-4">Select your preferred languages</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {languageOptions.map(lang => (
                <button key={lang} type="button" onClick={() => toggle(preferredLanguages, setPreferredLanguages, lang)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    preferredLanguages.includes(lang)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}>{lang}</button>
              ))}
            </div>

            <button onClick={handleSavePreferences} disabled={isLoading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Save Preferences'}
            </button>
          </motion.div>
        )}

        {/* Mood History Tab */}
        {activeTab === 'mood' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-1">Your Mood History</h3>
            <p className="text-gray-400 text-sm mb-6">Moods detected from your chatbot conversations</p>

            {loadingHistory ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500" />
              </div>
            ) : moodHistory.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-4xl mb-3">🎭</p>
                <p className="text-gray-400">No mood history yet.</p>
                <p className="text-gray-500 text-sm mt-1">Chat with CineBot to get movie recommendations!</p>
              </div>
            ) : (
              <>
                {/* Mood summary */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Your Top Moods</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      moodHistory.reduce((acc, item) => {
                        acc[item.mood] = (acc[item.mood] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([mood, count]) => (
                        <div key={mood}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-700 rounded-full text-sm">
                          <span>{MOOD_EMOJIS[mood] || '🎬'}</span>
                          <span className="text-white capitalize">{mood}</span>
                          <span className="text-gray-400 text-xs">×{count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Recent history */}
                <h4 className="text-sm font-medium text-gray-400 mb-3">Recent Sessions</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {[...moodHistory].reverse().map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-2xl">{MOOD_EMOJIS[item.mood] || '🎬'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm capitalize font-medium">{item.mood}</p>
                        <p className="text-gray-400 text-xs truncate">"{item.query}"</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-purple-400 text-xs">
                          {Math.round((item.confidence || 0) * 100)}% confidence
                        </p>
                        <p className="text-gray-500 text-xs">
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleDateString()
                            : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Account Settings</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-white mb-2">Change Password</h4>
                <button onClick={() => setResetOpen(v => !v)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                  {resetOpen ? 'Cancel' : 'Reset Password'}
                </button>
                {resetOpen && (
                  <form onSubmit={handlePasswordReset} className="mt-4 space-y-3">
                    <input type="password" placeholder="New Password" value={newPassword}
                      onChange={e => setNewPassword(e.target.value)} className={inputClass} required />
                    <input type="password" placeholder="Confirm New Password" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required />
                    <button type="submit" disabled={isLoading}
                      className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                      {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </form>
                )}
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h4 className="text-lg font-medium text-white mb-2">Danger Zone</h4>
                <button
                  onClick={() => toast.error('Account deletion is not yet available.')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Delete Account
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Warning: This action cannot be undone.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
