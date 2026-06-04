import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Coins, Trophy, Swords, BookOpen, Clock, BarChart2 } from 'lucide-react';

export default function Dashboard() {
  const { user, profile, token, API_URL, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    refreshMe();

    // Fetch quiz attempt history
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/profile/${user.id}/history`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [user]);

  if (!user || !profile) return null;

  // Calculate percentage of level XP
  const lvlProgress = (profile.xp % 500) / 5; // e.g. 250 xp % 500 = 250 / 5 = 50%
  const xpNeeded = 500 - (profile.xp % 500);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card */}
        <div className="lg:col-span-1 rpg-card relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple/10 rounded-full blur-[40px] pointer-events-none" />
          
          {/* Avatar frame */}
          <div className="relative mb-4 w-24 h-24 rounded-full border-4 border-gold p-1 bg-navy overflow-hidden shadow-gold-glow animate-float">
            <img 
              src={user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`} 
              alt="avatar" 
              className="w-full h-full object-cover"
            />
          </div>

          <h2 className="font-cinzel text-2xl font-black text-white mb-1 tracking-wide">{user.username}</h2>
          <span className="inline-block bg-purple-950/60 border border-purple/35 text-purple-light text-xs font-black tracking-widest px-3 py-1 rounded-full mb-6">
            RANK: LEVEL {profile.level}
          </span>

          {/* XP Bar */}
          <div className="w-full text-left space-y-1 mb-6">
            <div className="flex justify-between text-xs font-bold text-gray-400">
              <span>EXPERIENCE (XP)</span>
              <span className="text-gold-light">{profile.xp} / {(Math.floor(profile.xp / 500) + 1) * 500}</span>
            </div>
            <div className="w-full bg-navy-dark border border-slate-800 rounded-full h-3 overflow-hidden p-0.5">
              <div 
                className="bg-xp h-full rounded-full shadow-xp-glow transition-all duration-1000 ease-out" 
                style={{ width: `${lvlProgress}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-500 font-semibold text-right">
              {xpNeeded} XP until next rank
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-slate-800">
            <div className="bg-navy bg-opacity-40 border border-slate-800/80 rounded p-3">
              <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Correct Ans</span>
              <span className="font-cinzel text-lg font-bold text-white">{profile.correct_answers || 0}</span>
            </div>
            <div className="bg-navy bg-opacity-40 border border-slate-800/80 rounded p-3">
              <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Total Quizzes</span>
              <span className="font-cinzel text-lg font-bold text-white">{profile.total_quizzes_completed || 0}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Center (Actions & Activity) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-navy-light border border-slate-800 rounded-lg p-4 flex items-center gap-3">
              <div className="p-2.5 bg-purple-950/40 border border-purple/35 rounded text-purple-light">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Total XP</span>
                <span className="font-cinzel text-lg font-bold text-white">{profile.xp}</span>
              </div>
            </div>

            <div className="bg-navy-light border border-slate-800 rounded-lg p-4 flex items-center gap-3">
              <div className="p-2.5 bg-yellow-950/40 border border-gold/30 rounded text-gold">
                <Coins className="w-5 h-5 fill-gold/10" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Coins</span>
                <span className="font-cinzel text-lg font-bold text-white">{profile.coins}</span>
              </div>
            </div>

            <div className="bg-navy-light border border-slate-800 rounded-lg p-4 flex items-center gap-3">
              <div className="p-2.5 bg-orange-950/40 border border-orange-500/20 rounded text-orange-400">
                <Flame className="w-5 h-5 fill-orange-400/10" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Streak</span>
                <span className="font-cinzel text-lg font-bold text-white">{profile.streak_count} Days</span>
              </div>
            </div>

            <div className="bg-navy-light border border-slate-800 rounded-lg p-4 flex items-center gap-3">
              <div className="p-2.5 bg-green-950/40 border border-green-500/20 rounded text-green-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Completed</span>
                <span className="font-cinzel text-lg font-bold text-white">{profile.total_quizzes_completed}</span>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div className="bg-navy-light border border-slate-800 rounded-lg p-6">
            <h3 className="font-cinzel text-lg font-bold text-white mb-4 tracking-wider">CHOOSE QUEST PATH</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <Link 
                to="/quizzes" 
                className="flex flex-col items-center justify-center p-6 bg-navy border border-slate-800 hover:border-gold/40 hover:-translate-y-1 transition-all rounded-lg text-center group"
              >
                <BookOpen className="w-8 h-8 text-gold group-hover:scale-110 transition-transform mb-3" />
                <span className="font-cinzel text-sm font-bold text-white group-hover:text-gold-light transition-colors">TAKE QUIZ</span>
                <span className="text-[10px] text-gray-500 mt-1">Study subject portals</span>
              </Link>

              <Link 
                to="/battle" 
                className="flex flex-col items-center justify-center p-6 bg-navy border border-slate-800 hover:border-purple/40 hover:-translate-y-1 transition-all rounded-lg text-center group"
              >
                <Swords className="w-8 h-8 text-purple-light group-hover:scale-110 transition-transform mb-3 animate-pulse" />
                <span className="font-cinzel text-sm font-bold text-white group-hover:text-purple-light transition-colors">AI BATTLE</span>
                <span className="text-[10px] text-gray-500 mt-1">Duel Llama AI wizard</span>
              </Link>

              <Link 
                to="/leaderboard" 
                className="flex flex-col items-center justify-center p-6 bg-navy border border-slate-800 hover:border-blue-500/40 hover:-translate-y-1 transition-all rounded-lg text-center group"
              >
                <Trophy className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform mb-3" />
                <span className="font-cinzel text-sm font-bold text-white group-hover:text-blue-400 transition-colors">LEADERBOARD</span>
                <span className="text-[10px] text-gray-500 mt-1">View Hall of Heroes</span>
              </Link>

            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-navy-light border border-slate-800 rounded-lg p-6">
            <h3 className="font-cinzel text-lg font-bold text-white mb-4 tracking-wider">QUEST LOG (ACTIVITY)</h3>
            
            {loadingHistory ? (
              <div className="text-center py-6 text-gray-500 text-sm">Gathering history scrolls...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed border-slate-800 rounded">
                No scrolls written in the log yet. Go complete a quiz!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-gray-500 font-bold">
                      <th className="py-2.5">Realm (Quiz)</th>
                      <th className="py-2.5">Topic</th>
                      <th className="py-2.5">Score</th>
                      <th className="py-2.5">Rewards</th>
                      <th className="py-2.5 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {history.map((attempt) => (
                      <tr key={attempt.id} className="text-gray-300 hover:bg-navy/30 transition-colors">
                        <td className="py-3 font-semibold">{attempt.quiz_title}</td>
                        <td className="py-3">
                          <span className="bg-slate-800 text-gray-400 text-xs px-2 py-0.5 rounded uppercase font-bold">
                            {attempt.quiz_topic}
                          </span>
                        </td>
                        <td className="py-3 font-mono font-bold text-white">
                          {attempt.score}/{attempt.total_questions}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xp font-bold text-xs">+{attempt.xp_earned} XP</span>
                            <span className="text-gold font-bold text-xs">+{attempt.coins_earned}💰</span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-xs text-gray-500">
                          {new Date(attempt.completed_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
