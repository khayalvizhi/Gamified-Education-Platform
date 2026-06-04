import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, Flame, Coins, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const { user: currentUser, API_URL } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_URL}/leaderboard`);
        if (res.ok) {
          const data = await res.json();
          setLeaders(data);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return `#${rank + 1}`;
  };

  const getRankBg = (rank) => {
    if (rank === 0) return 'bg-yellow-950/25 border-gold/30';
    if (rank === 1) return 'bg-slate-800/40 border-slate-700/50';
    if (rank === 2) return 'bg-amber-950/20 border-amber-800/30';
    return 'bg-navy-light/45 border-slate-850';
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-8 w-full space-y-8">
      
      {/* Title */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-950/40 border border-gold/30 rounded-full shadow-gold-glow mb-4 animate-float">
          <Trophy className="w-8 h-8 text-gold" />
        </div>
        <h1 className="font-cinzel text-3xl sm:text-4xl font-extrabold text-white tracking-widest text-glow-gold">
          HALL OF HEROES
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          The top 20 questors ranked by total experience points (XP) in the realm.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-24 text-gray-500 font-cinzel tracking-widest">
          CONSULTING GUILD REGISTRY...
        </div>
      ) : leaders.length === 0 ? (
        <div className="text-center py-20 bg-navy bg-opacity-35 border border-slate-800 rounded-lg text-gray-500">
          No hero has claimed their titles yet in this era.
        </div>
      ) : (
        <div className="space-y-3">
          {leaders.map((leader, index) => {
            const isSelf = currentUser && currentUser.id === leader.id;
            
            return (
              <div 
                key={leader.id} 
                className={`border rounded-lg p-4 flex items-center justify-between transition-all hover:scale-[1.01] ${getRankBg(index)} ${
                  isSelf ? 'border-purple shadow-purple-glow ring-1 ring-purple/35' : ''
                }`}
              >
                
                {/* Left Deck (Rank + Avatar + Username) */}
                <div className="flex items-center gap-4">
                  <div className="font-cinzel text-lg font-black text-center w-8 text-gray-400">
                    {getRankBadge(index)}
                  </div>
                  
                  <Link 
                    to={`/profile/${leader.id}`}
                    className="w-10 h-10 rounded-full border border-slate-800 p-0.5 bg-navy overflow-hidden flex-shrink-0"
                  >
                    <img 
                      src={leader.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${leader.username}`} 
                      alt="avatar" 
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div>
                    <Link 
                      to={`/profile/${leader.id}`}
                      className={`font-cinzel font-bold text-sm sm:text-base hover:text-gold transition-colors ${
                        isSelf ? 'text-gold-light text-glow-gold' : 'text-white'
                      }`}
                    >
                      {leader.username} {isSelf && <span className="text-[10px] bg-purple-950 text-purple-light px-1.5 py-0.5 rounded font-sans uppercase font-bold ml-1.5">YOU</span>}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">
                        LEVEL {leader.level || 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Deck (XP + Coins) */}
                <div className="flex items-center gap-6 text-right">
                  <div className="hidden sm:block">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">GOLD COINS</span>
                    <span className="text-gold font-bold text-xs flex items-center justify-end gap-1">
                      {leader.coins || 0}💰
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">XP TOTAL</span>
                    <span className="font-mono text-sm sm:text-base font-black text-xp text-glow-green">
                      {leader.xp} XP
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
