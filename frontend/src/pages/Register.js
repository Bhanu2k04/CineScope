import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import styled from 'styled-components';

const BgContainer = styled.div`
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 100vh; padding: 2rem;
  position: relative; color: white; isolation: isolate; z-index: 1;
  background-image: url('/horizontal_combined_movie_poster.png');
  background-size: 90%; background-position: center; background-repeat: no-repeat;
  &::before {
    content: ''; position: absolute; inset: 0;
    background: rgba(8,8,8,0.6); z-index: -1;
  }
`;

const emojiOptions = [
  '😀','😎','🤩','🧐','👩','👨','👧','👦','👩‍🎤','👨‍🎤',
  '🦸‍♀️','🦸‍♂️','🧙‍♀️','🧙‍♂️','👽','🤖','🐶','🐱','🦊','🐼'
];

export default function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    profileEmoji: '👤', acceptedTerms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (!formData.acceptedTerms) {
      toast.error('You must accept the terms and conditions'); return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email, password: formData.password,
          name: formData.name, profile_emoji: formData.profileEmoji,
          accepted_terms: formData.acceptedTerms
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Registration successful! Please sign in.');
        navigate('/login');
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <BgContainer>
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-gray-400">Join CineScope today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { id: 'name', label: 'Name', type: 'text' },
              { id: 'email', label: 'Email', type: 'email' },
              { id: 'password', label: 'Password', type: 'password' },
              { id: 'confirmPassword', label: 'Confirm Password', type: 'password' },
            ].map(({ id, label, type }) => (
              <div key={id}>
                <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
                <input id={id} name={id} type={type}
                  value={formData[id]} onChange={handleChange}
                  className={inputClass} required />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Choose Profile Emoji</label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map(emoji => (
                  <button key={emoji} type="button"
                    onClick={() => setFormData(prev => ({ ...prev, profileEmoji: emoji }))}
                    className={`text-2xl p-2 rounded-full transition-colors ${
                      formData.profileEmoji === emoji ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >{emoji}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input id="terms" name="acceptedTerms" type="checkbox"
                checked={formData.acceptedTerms} onChange={handleChange}
                className="h-4 w-4 text-purple-600 border-gray-600 rounded bg-gray-700" required />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-300">
                I agree to the{' '}
                <button type="button" className="text-purple-400 hover:underline"
                  onClick={() => toast('By using CineScope you agree to our terms. Movie data is from TMDb.', { duration: 5000 })}>
                  Terms and Conditions
                </button>
              </label>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </BgContainer>
  );
}
