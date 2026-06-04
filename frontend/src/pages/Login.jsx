import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-md w-full space-y-8 bg-navy-light/90 border border-slate-800 p-8 rounded-lg shadow-purple-glow relative z-10">
        <div>
          <div className="mx-auto h-12 w-12 rounded-full bg-purple/10 border border-purple/35 flex items-center justify-center animate-pulse">
            <Shield className="h-6 w-6 text-purple-light" />
          </div>
          <h2 className="mt-6 text-center font-cinzel text-3xl font-extrabold text-white tracking-widest">
            LOG IN TO QUEST
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Or{' '}
            <Link to="/register" className="font-medium text-gold hover:text-gold-light transition-colors">
              create a new character
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-200 text-sm p-3 rounded text-center">
            ⚠️ {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded bg-navy bg-opacity-70 placeholder-gray-500 text-white focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/50 text-sm"
                  placeholder="name@realm.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded bg-navy bg-opacity-70 placeholder-gray-500 text-white focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/50 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-gold/30 rounded text-sm font-bold font-cinzel tracking-wider text-navy-dark bg-gold hover:bg-gold-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-gold-glow"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
              ) : null}
              ENTER GATEWAY
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
