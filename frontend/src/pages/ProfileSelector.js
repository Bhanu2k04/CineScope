import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const BgContainer = styled.div`
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 100vh; padding: 2rem;
  position: relative; color: white; isolation: isolate; z-index: 1;
  background-image: url('/horizontal_combined_movie_poster.png');
  background-size: 90%; background-position: center; background-repeat: no-repeat;
  &::before {
    content: ''; position: absolute; inset: 0;
    background: rgba(21,20,20,0.55); z-index: -1;
  }
`;

const PROFILE_EMOJI = '🎬';

export default function ProfileSelector({ onSelectProfile, onCreateProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [isChild, setIsChild] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        const res = await fetch('http://localhost:5000/user/profiles', {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          setProfiles(await res.json());
        } else {
          throw new Error('Failed to fetch profiles');
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfiles();
  }, [navigate]);

  const handleCreateProfile = async () => {
    if (!newName.trim()) { toast.error('Profile name is required'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/user/profiles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, profile_emoji: PROFILE_EMOJI, is_child: isChild })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create profile');
      }
      const created = await res.json();
      toast.success('Profile created!');
      setProfiles(prev => [...prev, created]);
      setNewName(''); setIsChild(false); setShowCreate(false);
      onSelectProfile(created);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <BgContainer>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </BgContainer>
    );
  }

  return (
    <BgContainer>
      <motion.h1
        initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-5xl font-extrabold mb-10 text-center"
        style={{
          background: 'linear-gradient(90deg, #a78bfa 0%, #38bdf8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}
      >
        Who's watching?
      </motion.h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-3xl w-full mb-8">
        {profiles.map(profile => (
          <motion.div
            key={profile._id || profile.name}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => onSelectProfile(profile)}
            className="flex flex-col items-center cursor-pointer"
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-4xl shadow-xl hover:ring-4 hover:ring-purple-400 transition-all">
              {PROFILE_EMOJI}
            </div>
            <span className="mt-3 text-white font-semibold text-center text-sm">{profile.name}</span>
            {profile.is_child && <span className="text-xs text-yellow-400 mt-1">Kids</span>}
          </motion.div>
        ))}

        {/* Add profile card */}
        <motion.div
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center cursor-pointer"
        >
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-purple-500 flex items-center justify-center text-4xl text-purple-400 hover:bg-purple-900/30 transition-all">
            +
          </div>
          <span className="mt-3 text-gray-400 text-sm">Add Profile</span>
        </motion.div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-gray-800 rounded-xl p-8 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white text-center mb-6">Create Profile</h2>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-4xl">
                {PROFILE_EMOJI}
              </div>
            </div>
            <input
              type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Enter profile name" autoFocus
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <label className="flex items-center gap-2 text-gray-300 text-sm mb-6 cursor-pointer">
              <input type="checkbox" checked={isChild} onChange={e => setIsChild(e.target.checked)}
                className="h-4 w-4 text-purple-600" />
              Kids Profile
            </label>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
              <button onClick={handleCreateProfile}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </BgContainer>
  );
}
