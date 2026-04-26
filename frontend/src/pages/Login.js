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
    background: rgba(8,8,8,0.65); z-index: -1;
  }
`;

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        onLogin(data.access_token, data.user);
        toast.success('Login successful!');
        navigate('/');
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!newPass || !confirmPass) { toast.error('Please fill all fields'); return; }
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return; }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { toast.error('You must be logged in to reset password.'); return; }
      const res = await fetch('http://localhost:5000/user/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Password reset successfully!');
        setForgotOpen(false); setNewPass(''); setConfirmPass('');
      } else {
        toast.error(data.error || 'Reset failed');
      }
    } catch {
      toast.error('Network error.');
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
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400">Sign in to your CineScope account</p>
          </div>

          {!forgotOpen ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className={inputClass} required />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setForgotOpen(true)}
                  className="text-sm text-purple-400 hover:text-purple-300">
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                  className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  className={inputClass} required />
              </div>
              <div className="flex justify-between items-center">
                <button type="button" onClick={() => setForgotOpen(false)}
                  className="text-sm text-gray-400 hover:text-gray-200">← Back to Login</button>
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {!forgotOpen && (
            <div className="mt-6 text-center text-sm text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium">Sign up</Link>
            </div>
          )}
        </div>
      </motion.div>
    </BgContainer>
  );
}
