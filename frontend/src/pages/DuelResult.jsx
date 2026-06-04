import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Trophy, HelpCircle, ShieldAlert, Award, XCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export default function DuelResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('lq_token');
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/duels/${id}/result`);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch duel result details.');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-navy">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 bg-navy py-12 px-4 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full border border-slate-800 bg-navy-dark/40 rounded-xl p-6">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="font-cinzel text-xl font-bold text-gray-200 mb-2">Error</h2>
          <p className="text-gray-400 text-sm mb-6">{error || 'Duel data not available.'}</p>
          <button onClick={() => navigate('/duels')} className="w-full bg-gold hover:bg-gold-light text-navy-dark py-2 rounded text-sm font-bold uppercase">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  const { duel, questions, answers, challenger, opponent } = data;

  const isChallenger = duel.challenger_id === user.id;
  const isWinner = duel.winner_id === user.id;
  const isDraw = duel.winner_id === null;

  const myScore = isChallenger ? duel.challenger_score : duel.opponent_score;
  const oppScore = isChallenger ? duel.opponent_score : duel.challenger_score;
  const opponentName = isChallenger ? opponent.username : challenger.username;

  // Filter user answers
  const myAnswers = answers.filter(a => a.user_id === user.id);
  const oppAnswers = answers.filter(a => a.user_id !== user.id);

  return (
    <div className="flex-1 bg-navy py-8 px-4 sm:px-8 max-w-4xl mx-auto w-full">
      {/* Outcome Banner */}
      <div className={`border rounded-2xl p-6 sm:p-8 text-center mb-8 flex flex-col items-center justify-center relative overflow-hidden ${
        isDraw
          ? 'border-slate-800 bg-slate-900/30'
          : isWinner
            ? 'border-gold bg-yellow-950/20 shadow-gold-glow'
            : 'border-red-950/50 bg-red-950/20'
      }`}>
        {isWinner ? (
          <>
            <Award className="w-16 h-16 text-gold animate-bounce mb-4" />
            <h1 className="font-cinzel text-3xl sm:text-4xl font-black tracking-wide text-gold-light text-glow-gold">VICTORY!</h1>
            <p className="text-gray-300 mt-2 text-sm max-w-md">You conquered the trial against @{opponentName}. Wager settled! +100 XP +40 Coins awarded.</p>
          </>
        ) : isDraw ? (
          <>
            <Trophy className="w-16 h-16 text-gray-400 mb-4" />
            <h1 className="font-cinzel text-3xl sm:text-4xl font-black tracking-wide text-gray-300">DRAW GAME</h1>
            <p className="text-gray-400 mt-2 text-sm max-w-md">Equal strength displayed! No coins or XP transferred. Duel ended in a stalemate.</p>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="font-cinzel text-3xl sm:text-4xl font-black tracking-wide text-red-400">DEFEAT</h1>
            <p className="text-gray-300 mt-2 text-sm max-w-md">You were defeated by @{opponentName}. Lost -50 XP & -20 Coins wagered.</p>
          </>
        )}

        <div className="flex gap-8 mt-6 border-t border-slate-800/60 pt-6 w-full max-w-xs justify-around text-center">
          <div>
            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Your Score</div>
            <div className="text-2xl font-black font-cinzel text-gold mt-1">{myScore}/5</div>
          </div>
          <div className="border-r border-slate-800" />
          <div>
            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Opponent</div>
            <div className="text-2xl font-black font-cinzel text-purple-light mt-1">{oppScore}/5</div>
          </div>
        </div>
      </div>

      {/* Questions & Detail Review */}
      <h2 className="font-cinzel text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-gold" /> Combat Trial Review
      </h2>

      <div className="space-y-4 mb-8">
        {questions.map((q, idx) => {
          const myAns = myAnswers.find(a => a.question_id === q.id);
          const oppAns = oppAnswers.find(a => a.question_id === q.id);

          return (
            <div key={q.id} className="border border-slate-800 bg-navy-dark/40 rounded-xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="font-medium text-gray-200 text-sm sm:text-base leading-relaxed">
                  <span className="text-gold font-bold mr-2">Q{idx + 1}.</span> {q.question_text}
                </h3>
              </div>

              {/* Option Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                {q.options.map((option, oIdx) => {
                  const isCorrect = oIdx === q.correct_option_index;
                  const selectedByMe = myAns?.selected_option === oIdx;
                  const selectedByOpp = oppAns?.selected_option === oIdx;

                  let borderClass = 'border-slate-800 bg-navy-light/10';
                  if (isCorrect) borderClass = 'border-green-500 bg-green-950/10 text-green-300';
                  else if (selectedByMe) borderClass = 'border-red-500 bg-red-950/10 text-red-300';

                  return (
                    <div key={oIdx} className={`p-3.5 rounded-lg border text-xs flex justify-between items-center ${borderClass}`}>
                      <span>{option}</span>
                      
                      <div className="flex gap-1.5 shrink-0">
                        {selectedByMe && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold uppercase text-blue-400">You</span>
                        )}
                        {selectedByOpp && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] font-bold uppercase text-purple-400">Opponent</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/duels')}
        className="w-full bg-gold hover:bg-gold-light text-navy-dark py-3 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all font-cinzel"
      >
        Return to Peer Duels Hub <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
