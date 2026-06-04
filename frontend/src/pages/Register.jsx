import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User, Loader2 } from 'lucide-react';

const AVATAR_SEEDS = [
  'Loki', 'Freya', 'Odin', 'Thor', 'Valkyrie', 'Gimli', 'Aragorn', 'Gandalf', 'Legolas'
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSeed, setSelectedSeed] = useState('Loki');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getAvatarUrl = (seed) => {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const avatarUrl = getAvatarUrl(selectedSeed);
      await register(username, email, password, avatarUrl);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
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
            <ShieldCheck className="h-6 w-6 text-purple-light" />
          </div>
          <h2 className="mt-6 text-center font-cinzel text-3xl font-extrabold text-white tracking-widest">
            CREATE CHARACTER
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Or{' '}
            <Link to="/login" className="font-medium text-gold hover:text-gold-light transition-colors">
              resume existing quest
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
            
            {/* Avatar Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
                Select Your Avatar Portrait
              </label>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full border-2 border-gold p-1 bg-navy overflow-hidden">
                  <img 
                    src={getAvatarUrl(selectedSeed)} 
                    alt="avatar preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 max-h-24 overflow-y-auto p-1 bg-navy/50 rounded border border-slate-800">
                {AVATAR_SEEDS.map(seed => (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setSelectedSeed(seed)}
                    className={`w-full py-1 text-xs font-bold rounded border ${
                      selectedSeed === seed 
                        ? 'border-gold bg-gold/10 text-gold' 
                        : 'border-slate-800 hover:border-slate-700 text-gray-400'
                    }`}
                  >
                    {seed}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Hero Name (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded bg-navy bg-opacity-70 placeholder-gray-500 text-white focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/50 text-sm"
                  placeholder="Arthur_Pendragon"
                />
              </div>
            </div>

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
                  placeholder="hero@kingdom.com"
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
              FORGE HERO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
