import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Coins, Trophy, LogOut, Swords, User, ShoppingBag, Shield, BookOpen } from 'lucide-react';

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navLink = (to, icon, label) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${active ? 'text-gold' : 'text-gray-300 hover:text-gold'}`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="border-b border-slate-800 bg-navy-dark/95 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-2xl animate-float">⚔️</span>
          <span className="font-cinzel text-xl sm:text-2xl font-black tracking-wider text-gold-light group-hover:text-gold transition-colors text-glow-gold">
            LEARN<span className="text-purple-light">QUEST</span>
          </span>
        </Link>

        {/* User Stats / Actions */}
        {user ? (
          <div className="flex items-center gap-3 sm:gap-5">

            {/* Streak */}
            <div className="flex items-center gap-1 bg-orange-950/40 border border-orange-500/20 px-2.5 py-1 rounded-full text-orange-400 text-sm font-semibold cursor-default hover:border-orange-500/50 transition-colors" title="Daily Login Streak">
              <Flame className="w-4 h-4 fill-orange-400 text-orange-400 animate-pulse" />
              <span>{profile?.streak_count || 0}</span>
            </div>

            {/* Coins — clickable to Shop */}
            <Link to="/shop" className="flex items-center gap-1.5 bg-yellow-950/40 border border-gold/20 px-2.5 py-1 rounded-full text-gold-light text-sm font-semibold hover:border-gold/60 hover:bg-yellow-950/60 transition-all" title="Gold Coins — Visit Shop">
              <Coins className="w-4 h-4 text-gold fill-gold/20" />
              <span>{profile?.coins || 0}</span>
            </Link>

            {/* Level Pill */}
            <div className="hidden md:flex items-center gap-2 bg-purple-950/40 border border-purple/30 px-3 py-1 rounded-full text-xs font-bold" title="XP Progress">
              <span className="text-purple-light">LVL {profile?.level || 1}</span>
              <div className="w-16 bg-navy-light rounded-full h-1.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-xp h-full shadow-xp-glow transition-all duration-500"
                  style={{ width: `${((profile?.xp || 0) % 500) / 5}%` }}
                />
              </div>
            </div>

            {/* Nav Links */}
            <div className="flex items-center gap-3 sm:gap-4 border-l border-slate-800 pl-3 sm:pl-5">
              {navLink('/dashboard', <Swords className="w-4 h-4" />, 'Quests')}
              {navLink('/leaderboard', <Trophy className="w-4 h-4" />, 'Board')}
              {navLink('/shop', <ShoppingBag className="w-4 h-4" />, 'Shop')}
              {navLink('/duels', <Shield className="w-4 h-4" />, 'Duels')}
              {navLink('/study-plan', <BookOpen className="w-4 h-4" />, 'Study')}

              {/* Profile Avatar */}
              <Link
                to={`/profile/${user.id}`}
                className="w-8 h-8 rounded-full border border-purple/50 hover:border-gold hover:scale-105 transition-all overflow-hidden flex items-center justify-center bg-navy-light"
                title="View Profile"
              >
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
                  alt="avatar"
                  className="w-7 h-7 object-cover"
                />
              </Link>

              {/* Logout */}
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-300 hover:text-gold transition-colors text-sm font-medium">
              Sign In
            </Link>
            <Link
              to="/register"
              className="bg-purple hover:bg-purple-light border border-purple-light/20 text-white font-cinzel tracking-wider px-4 py-1.5 rounded text-sm transition-all hover:shadow-purple-glow font-bold"
            >
              REGISTER
            </Link>
          </div>
        )}

      </div>
    </nav>
  );
}
