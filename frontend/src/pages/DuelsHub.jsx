import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Shield, Swords, Plus, Calendar, Check, X, Clock, HelpCircle, Trophy, User } from 'lucide-react';

export default function DuelsHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState([]);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Challenge Modal State
  const [showModal, setShowModal] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState('');
  const [topic, setTopic] = useState('Math');
  const [difficulty, setDifficulty] = useState('medium');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('lq_token');
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [resIncoming, resPending, resHistory] = await Promise.all([
        api.get('/duels/incoming'),
        api.get('/duels/pending'),
        api.get('/duels/history')
      ]);
      setIncoming(resIncoming.data.duels || []);
      setPending(resPending.data.duels || []);
      setHistory(resHistory.data.duels || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load duels data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChallenge = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const res = await api.post('/duels/challenge', {
        opponent_username: opponentUsername,
        topic,
        difficulty
      });
      setSuccess(res.data.message);
      setOpponentUsername('');
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        loadData();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send challenge.');
    }
  };

  const handleAccept = async (id) => {
    try {
      await api.post(`/duels/${id}/accept`);
      loadData();
      navigate(`/duels/${id}/play`);
    } catch (err) {
      setError('Failed to accept challenge.');
    }
  };

  const handleDecline = async (id) => {
    try {
      await api.post(`/duels/${id}/decline`);
      loadData();
    } catch (err) {
      setError('Failed to decline challenge.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-navy">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-navy py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-black text-gold-light text-glow-gold flex items-center gap-3">
            <Swords className="w-8 h-8 text-gold animate-float" /> PEER DUELS
          </h1>
          <p className="text-gray-400 mt-1">Challenge your peers, wager your XP & Gold, and prove your academic supremacy.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gold hover:bg-gold-light text-navy-dark px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all hover:shadow-gold-glow uppercase tracking-wider font-cinzel"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Issue Challenge
        </button>
      </div>

      {error && <div className="bg-red-950/50 border border-red-500/30 text-red-300 p-4 rounded-lg mb-6">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Incoming Challenges */}
        <div className="space-y-6">
          <div className="border border-slate-800 rounded-xl bg-navy-dark/30 p-5">
            <h2 className="font-cinzel text-lg font-bold text-gray-200 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-light" /> Incoming Challenges
            </h2>
            {incoming.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No pending challenges awaiting your response.</p>
            ) : (
              <div className="space-y-4">
                {incoming.map(duel => (
                  <div key={duel.id} className="border border-purple/30 bg-purple-950/5 p-4 rounded-lg flex flex-col justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-200 text-sm">Challenger: @{duel.challenger_username}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Topic: <span className="text-gold-light">{duel.topic}</span> • Difficulty: <span className="text-purple-light capitalize">{duel.difficulty}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Expires: {new Date(duel.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(duel.id)}
                        className="flex-1 py-1.5 bg-gold hover:bg-gold-light text-navy-dark text-xs font-bold rounded flex items-center justify-center gap-1 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleDecline(duel.id)}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all border border-slate-700"
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Active & Outgoing Challenges */}
        <div className="space-y-6">
          <div className="border border-slate-800 rounded-xl bg-navy-dark/30 p-5">
            <h2 className="font-cinzel text-lg font-bold text-gray-200 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold" /> Active / Sent
            </h2>
            {pending.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No active or outgoing challenges.</p>
            ) : (
              <div className="space-y-4">
                {pending.map(duel => {
                  const isOpponent = duel.opponent_id === user.id;
                  const displayUser = isOpponent ? `@${duel.challenger_username}` : `@${duel.opponent_username}`;
                  const relation = isOpponent ? 'Incoming Active' : 'Sent Pending';
                  
                  return (
                    <div key={duel.id} className="border border-slate-800 bg-navy-dark/50 p-4 rounded-lg flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-gray-200 text-sm">{displayUser}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            duel.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          }`}>
                            {duel.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1.5">
                          Topic: <span className="text-gold-light">{duel.topic}</span> • Difficulty: <span className="text-purple-light capitalize">{duel.difficulty}</span>
                        </div>
                      </div>
                      
                      {duel.status === 'active' ? (
                        <Link
                          to={`/duels/${duel.id}/play`}
                          className="w-full py-1.5 bg-purple hover:bg-purple-light text-white text-center text-xs font-bold rounded block transition-all uppercase tracking-wider"
                        >
                          Enter Battle
                        </Link>
                      ) : (
                        <div className="text-center py-1 bg-slate-800/40 rounded text-slate-500 text-xs font-semibold">
                          Awaiting Opponent Accept
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Battle History */}
        <div className="space-y-6">
          <div className="border border-slate-800 rounded-xl bg-navy-dark/30 p-5">
            <h2 className="font-cinzel text-lg font-bold text-gray-200 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" /> Battle History
            </h2>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No duels completed yet.</p>
            ) : (
              <div className="space-y-4">
                {history.map(duel => {
                  const isChallenger = duel.challenger_id === user.id;
                  const opponentName = isChallenger ? duel.opponent_username : duel.challenger_username;
                  const myScore = isChallenger ? duel.challenger_score : duel.opponent_score;
                  const oppScore = isChallenger ? duel.opponent_score : duel.challenger_score;

                  let outcomeLabel = 'Draw';
                  let outcomeClass = 'text-gray-400 bg-gray-500/10 border-gray-500/20';
                  
                  if (duel.status === 'completed') {
                    if (duel.winner_id === user.id) {
                      outcomeLabel = 'Victory';
                      outcomeClass = 'text-green-400 bg-green-500/10 border-green-500/20';
                    } else if (duel.winner_id) {
                      outcomeLabel = 'Defeat';
                      outcomeClass = 'text-red-400 bg-red-500/10 border-red-500/20';
                    }
                  } else {
                    outcomeLabel = duel.status; // Declined/Expired
                    outcomeClass = 'text-slate-500 bg-slate-800/30 border-slate-700/30';
                  }

                  return (
                    <div key={duel.id} className="border border-slate-850 bg-navy-dark/20 p-4 rounded-lg flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-300 text-sm">vs @{opponentName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${outcomeClass}`}>
                            {outcomeLabel}
                          </span>
                        </div>
                        {duel.status === 'completed' && (
                          <div className="text-xs font-semibold text-gray-400 mt-2">
                            Score: <span className="text-gold-light">{myScore} - {oppScore}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-gray-500 mt-1">
                          {duel.topic} • {duel.difficulty}
                        </div>
                      </div>
                      
                      {duel.status === 'completed' && (
                        <Link
                          to={`/duels/${duel.id}/result`}
                          className="w-full py-1.5 border border-purple/30 hover:border-purple text-purple-light text-center text-xs font-bold rounded block transition-all"
                        >
                          View Results
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Challenge Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-navy border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="border-b border-slate-800 px-6 py-4 flex justify-between items-center bg-navy-dark/50">
              <h3 className="font-cinzel text-lg font-bold text-gold-light">Issue a Challenge</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleChallenge} className="p-6 space-y-4">
              {error && <div className="bg-red-950/50 border border-red-500/30 text-red-400 p-2.5 rounded text-xs">{error}</div>}
              {success && <div className="bg-green-950/50 border border-green-500/30 text-green-400 p-2.5 rounded text-xs">{success}</div>}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Opponent Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter username (e.g. challenger_jane)"
                  value={opponentUsername}
                  onChange={(e) => setOpponentUsername(e.target.value)}
                  className="w-full bg-navy-light border border-slate-700 px-3.5 py-2 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-navy-light border border-slate-700 px-3.5 py-2 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
                >
                  <option value="Math">Math</option>
                  <option value="Science">Science</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Literature">Literature</option>
                  <option value="Coding">Coding</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-navy-light border border-slate-700 px-3.5 py-2 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="bg-purple-950/20 border border-purple/20 p-3.5 rounded-lg flex items-start gap-2.5 text-xs text-purple-light">
                <Shield className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold uppercase tracking-wider">Stake / Wager Details</p>
                  <p className="mt-0.5 text-gray-400">Winning awards you 100 XP & 40 Coins. Losing costs you 50 XP & 20 Coins.</p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gold hover:bg-gold-light text-navy-dark py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:shadow-gold-glow font-cinzel"
              >
                Send Challenge
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
