import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Medal, Edit2, Check, Flame, Trophy, Coins, Calendar } from 'lucide-react';

const AVATARS = [
  'Loki', 'Freya', 'Odin', 'Thor', 'Valkyrie', 'Gimli', 'Aragorn', 'Gandalf', 'Legolas'
];

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser, updateProfile, API_URL } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isOwnProfile = currentUser && currentUser.id === userId;

  useEffect(() => {
    const fetchProfileAndHistory = async () => {
      setLoading(true);
      try {
        // Fetch Profile
        const profileRes = await fetch(`${API_URL}/profile/${userId}`);
        if (!profileRes.ok) throw new Error('Profile not found');
        const profData = await profileRes.json();
        setProfileUser(profData.user);
        setProfileData(profData.profile);
        setNewUsername(profData.user.username);
        
        // Extract avatar seed if possible
        const urlParams = new URLSearchParams(profData.user.avatar_url?.split('?')[1]);
        setSelectedAvatarSeed(urlParams.get('seed') || 'Loki');

        // Fetch History
        const historyRes = await fetch(`${API_URL}/profile/${userId}/history`);
        if (historyRes.ok) {
          const histData = await historyRes.json();
          setHistory(histData);
        }
      } catch (err) {
        console.error(err);
        setError('Character details not found in this realm.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndHistory();
  }, [userId, currentUser]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(selectedAvatarSeed)}`;
      await updateProfile(newUsername, avatarUrl);
      
      // Update local state
      setProfileUser(prev => ({ ...prev, username: newUsername, avatar_url: avatarUrl }));
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 font-cinzel tracking-widest text-lg">CONSULTING MEMORY SPELLS...</div>
      </div>
    );
  }

  if (error || !profileUser || !profileData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-red-400 font-cinzel text-xl mb-4">⚠️ {error || 'Realm Error'}</div>
        <button onClick={() => navigate('/dashboard')} className="bg-slate-800 text-white px-4 py-2 rounded">
          Return to Tavern
        </button>
      </div>
    );
  }

  // RPG Badge criteria based on stats
  const achievements = [
    { title: "Novice Questor", desc: "Complete 1 Quiz", unlocked: profileData.total_quizzes_completed >= 1, icon: "⚔️" },
    { title: "Elite Champion", desc: "Complete 5 Quizzes", unlocked: profileData.total_quizzes_completed >= 5, icon: "🛡️" },
    { title: "Grand Sage", desc: "Level 5 reached", unlocked: profileData.level >= 5, icon: "🧙‍♂️" },
    { title: "Gold Dragon", desc: "Accumulate 100 Gold Coins", unlocked: profileData.coins >= 100, icon: "🪙" },
    { title: "Immortal Streak", desc: "Streak of 7 or more days", unlocked: profileData.streak_count >= 7, icon: "🔥" }
  ];

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-8 py-8 w-full space-y-8">
      
      {/* Profile Info Header */}
      <div className="rpg-card flex flex-col md:flex-row items-center md:items-start gap-6 relative">
        <div className="w-24 h-24 rounded-full border-4 border-gold p-1 bg-navy overflow-hidden relative shadow-gold-glow">
          <img 
            src={profileUser.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profileUser.username}`} 
            alt="avatar" 
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          {editing ? (
            <div className="space-y-4 max-w-sm mx-auto md:mx-0">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">HERO NAME</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-navy border border-slate-700 px-3 py-1.5 rounded text-white text-sm w-full focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">SELECT PORTRAIT</label>
                <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-navy rounded border border-slate-800">
                  {AVATARS.map(seed => (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setSelectedAvatarSeed(seed)}
                      className={`text-[10px] py-1 rounded font-bold border ${
                        selectedAvatarSeed === seed ? 'border-gold bg-gold/10 text-gold' : 'border-slate-800 text-gray-500'
                      }`}
                    >
                      {seed}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="text-red-400 text-xs">{error}</div>}

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gold text-navy-dark px-3 py-1 text-xs font-bold rounded flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'SAVE'}
                </button>
                <button
                  onClick={() => { setEditing(false); setError(''); }}
                  className="bg-slate-800 text-gray-400 px-3 py-1 text-xs font-bold rounded"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <h2 className="font-cinzel text-3xl font-black text-white tracking-wide">{profileUser.username}</h2>
                {isOwnProfile && (
                  <button 
                    onClick={() => setEditing(true)} 
                    className="p-1 text-gray-500 hover:text-gold transition-colors"
                    title="Edit Portrait/Name"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-gray-400 text-sm flex items-center justify-center md:justify-start gap-1.5">
                <Calendar className="w-4 h-4 text-purple-light" />
                Joined the guild on {new Date(profileUser.created_at).toLocaleDateString()}
              </p>
            </>
          )}

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 pt-4 border-t border-slate-800/50">
            <div className="flex items-center gap-1.5 text-orange-400 text-sm font-semibold">
              <Flame className="w-4 h-4 fill-orange-400/10" />
              <span>{profileData.streak_count} Day Streak</span>
            </div>
            <div className="flex items-center gap-1.5 text-gold text-sm font-semibold">
              <Coins className="w-4 h-4 fill-gold/10" />
              <span>{profileData.coins} Coins</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-light text-sm font-semibold">
              <Shield className="w-4 h-4" />
              <span>Level {profileData.level} (Total {profileData.xp} XP)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Achievements & History */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Achievements Section */}
        <div className="md:col-span-1 rpg-card h-fit">
          <h3 className="font-cinzel text-lg font-bold text-white mb-4 tracking-wider border-b border-slate-800 pb-2">
            HERO BADGES
          </h3>
          <div className="space-y-4">
            {achievements.map((ach, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-3 p-2.5 rounded border transition-all duration-300 ${
                  ach.unlocked 
                    ? 'bg-purple-950/20 border-purple/30 text-white' 
                    : 'bg-navy-dark/45 border-slate-800/80 text-gray-600 opacity-60'
                }`}
              >
                <span className="text-2xl">{ach.icon}</span>
                <div>
                  <h4 className="font-cinzel font-bold text-sm tracking-wide">{ach.title}</h4>
                  <p className="text-[10px] text-gray-500 font-semibold">{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* History Logs */}
        <div className="md:col-span-2 rpg-card">
          <h3 className="font-cinzel text-lg font-bold text-white mb-4 tracking-wider border-b border-slate-800 pb-2">
            CHRONICLES OF QUESTS
          </h3>
          
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No quests completed. The logs are empty.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((attempt) => (
                <div key={attempt.id} className="bg-navy bg-opacity-40 border border-slate-800/60 rounded-lg p-4 flex justify-between items-center hover:border-slate-700 transition-colors">
                  <div>
                    <h4 className="font-cinzel text-sm font-bold text-white">{attempt.quiz_title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-slate-800 text-gray-400 font-bold px-1.5 py-0.5 rounded uppercase">
                        {attempt.quiz_topic}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-black text-white">
                      Score: {attempt.score}/{attempt.total_questions}
                    </div>
                    <div className="text-[10px] text-xp font-bold mt-0.5">
                      +{attempt.xp_earned} XP | +{attempt.coins_earned}💰
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
