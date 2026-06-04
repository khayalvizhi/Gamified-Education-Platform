import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Swords, Flame, Trophy, Coins, Bot, Shield, Loader2, Award, Zap, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUGGESTED_TOPICS = ['Artificial Intelligence', 'Ancient Mythology', 'Astronomy & Space', 'Cybersecurity', 'Fantasy Literature'];

export default function BattleArena() {
  const { user, profile, token, API_URL, refreshMe } = useAuth();
  
  // Setup State
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [creating, setCreating] = useState(false);
  const [battleId, setBattleId] = useState(null);
  
  // Gameplay State
  const [questions, setQuestions] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [userScore, setUserScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  
  // Final Results
  const [isFinished, setIsFinished] = useState(false);
  const [finalData, setFinalData] = useState(null);
  const [finalizing, setFinalizing] = useState(false);

  const startBattle = async (selectedTopic = topic) => {
    if (!selectedTopic.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/battle/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic: selectedTopic, difficulty })
      });
      if (res.ok) {
        const data = await res.json();
        setBattleId(data.id);
        setQuestions(data.questions);
        setCurrentRound(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setRoundResult(null);
        setUserScore(0);
        setAiScore(0);
        setIsFinished(false);
        setFinalData(null);
      }
    } catch (err) {
      console.error('Failed to start battle:', err);
    } finally {
      setCreating(false);
    }
  };

  const submitAnswer = async () => {
    if (selectedOption === null || isAnswered) return;
    try {
      const res = await fetch(`${API_URL}/battle/${battleId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roundIndex: currentRound,
          answerIndex: selectedOption
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRoundResult(data);
        setIsAnswered(true);
        setUserScore(data.scores.user);
        setAiScore(data.scores.ai);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  const handleNextRound = async () => {
    if (currentRound < questions.length - 1) {
      setCurrentRound(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setRoundResult(null);
    } else {
      // Finalize Battle
      setFinalizing(true);
      try {
        const res = await fetch(`${API_URL}/battle/${battleId}/finish`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setFinalData(data);
          setIsFinished(true);
          refreshMe();
        }
      } catch (err) {
        console.error('Failed to finalize battle:', err);
      } finally {
        setFinalizing(false);
      }
    }
  };

  // 1. Initial Configuration View
  if (!battleId) {
    return (
      <div className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full flex flex-col justify-center relative">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="bg-navy-light border border-slate-800 p-8 rounded-lg shadow-purple-glow text-center space-y-8 relative z-10">
          
          <div>
            <div className="inline-flex items-center justify-center p-3 bg-purple-950/40 border border-purple/35 rounded-full shadow-purple-glow mb-4 animate-float">
              <Swords className="w-8 h-8 text-purple-light" />
            </div>
            <h1 className="font-cinzel text-3xl sm:text-4xl font-extrabold text-white tracking-widest text-glow-purple">
              AI BATTLE ARENA
            </h1>
            <p className="text-gray-400 text-sm max-w-lg mx-auto leading-relaxed mt-2">
              Summon an AI Sorcerer opponent. Pick any custom topic or standard scroll. Groq Llama will generate 5 unique multiple choice questions. Duel live!
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-6 text-left">
            
            {/* Topic input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                REALM TOPIC (CUSTOM)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="block w-full px-4 py-2 border border-slate-850 rounded bg-navy text-white focus:outline-none focus:border-purple/50 text-sm"
                placeholder="e.g. Roman Empire, Organic Chemistry, Harry Potter..."
              />
            </div>

            {/* Suggested topics */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                SUGGESTED SCROLLS
              </label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TOPICS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTopic(t); }}
                    className="bg-navy-dark hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-gray-400 hover:text-white px-2.5 py-1 rounded text-xs transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty select */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                AI DIFFICULTY RANK
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['easy', 'medium', 'hard'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 text-xs font-bold capitalize rounded border transition-all ${
                      difficulty === d 
                        ? 'border-purple bg-purple/10 text-purple-light font-black shadow-purple-glow' 
                        : 'border-slate-850 bg-navy text-gray-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-gray-500 block text-center">
                {difficulty === 'easy' && 'AI Opponent Accuracy: 70%'}
                {difficulty === 'medium' && 'AI Opponent Accuracy: 80%'}
                {difficulty === 'hard' && 'AI Opponent Accuracy: 90% (Elite Wizard)'}
              </span>
            </div>

            {/* Start Button */}
            <button
              onClick={() => startBattle()}
              disabled={creating || !topic.trim()}
              className="w-full bg-purple hover:bg-purple-light text-white font-cinzel tracking-wider font-extrabold py-3 rounded border border-purple-light/25 hover:shadow-purple-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5 text-white" />
                  SUMMONING PORTAL QUESTIONS...
                </>
              ) : (
                <>
                  <Swords className="w-5 h-5 animate-pulse" />
                  INITIATE DUEL
                </>
              )}
            </button>

          </div>

        </div>
      </div>
    );
  }

  // 2. Final Duel Results Screen
  if (isFinished && finalData) {
    const isUserWinner = finalData.winner === 'user';
    const isDraw = finalData.winner === 'draw';
    
    return (
      <div className="flex-1 max-w-2xl mx-auto px-4 py-12 flex flex-col items-center justify-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple/15 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="bg-navy-light/95 border-2 border-gold/40 p-8 rounded-lg shadow-gold-glow text-center space-y-6 w-full relative">
          
          <div className="mx-auto w-24 h-24 bg-navy-dark border-4 border-gold rounded-full flex items-center justify-center text-5xl shadow-gold-glow animate-float">
            {isUserWinner ? '👑' : (isDraw ? '🤝' : '💀')}
          </div>

          <div>
            <h2 className="font-cinzel text-3xl font-black text-white tracking-widest">
              {isUserWinner && 'VICTORY SECURED'}
              {isDraw && 'DUEL WAS A DRAW'}
              {finalData.winner === 'ai' && 'DEFEATED BY AI'}
            </h2>
            <p className="text-gray-400 text-xs mt-1">Topic: {topic} ({difficulty})</p>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <div className="bg-navy p-3 rounded border border-slate-800">
              <span className="text-[10px] font-bold text-gray-500 block">YOUR SCORE</span>
              <span className="font-cinzel text-2xl font-bold text-white">{finalData.userScore}</span>
            </div>
            <div className="bg-navy p-3 rounded border border-slate-800">
              <span className="text-[10px] font-bold text-gray-500 block">AI SCORE</span>
              <span className="font-cinzel text-2xl font-bold text-purple-light">{finalData.aiScore}</span>
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="bg-green-950/20 border border-green-500/20 p-3.5 rounded text-center">
              <span className="text-[10px] font-bold text-gray-500 block">XP RECEIVED</span>
              <span className="font-cinzel text-xl font-bold text-green-400">+{finalData.xpEarned} XP</span>
            </div>
            <div className="bg-yellow-950/20 border border-gold/20 p-3.5 rounded text-center">
              <span className="text-[10px] font-bold text-gray-500 block">GOLD RECEIVED</span>
              <span className="font-cinzel text-xl font-bold text-gold">+{finalData.coinsEarned}💰</span>
            </div>
          </div>

          {/* Action button */}
          <div className="flex gap-4 pt-4 border-t border-slate-800/60 max-w-sm mx-auto">
            <Link
              to="/dashboard"
              className="flex-1 bg-navy-dark border border-slate-800 hover:border-slate-700 text-gray-400 font-cinzel text-xs font-bold py-2.5 rounded transition-all"
            >
              RETURN TO TAVERN
            </Link>
            <button
              onClick={() => { setBattleId(null); }}
              className="flex-1 bg-purple hover:bg-purple-light text-white font-cinzel text-xs font-bold py-2.5 rounded transition-all hover:shadow-purple-glow"
            >
              DUEL AGAIN
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 3. Active Battle Gameplay Arena
  const currentQuestion = questions[currentRound];

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full flex flex-col justify-center gap-6">
      
      {/* Competitors Deck */}
      <div className="grid grid-cols-3 items-center bg-navy-light/75 border border-slate-850 rounded-lg p-5">
        
        {/* User profile card */}
        <div className="flex flex-col items-center text-center space-y-1">
          <div className="w-14 h-14 rounded-full border-2 border-gold p-0.5 bg-navy overflow-hidden">
            <img 
              src={user.avatar_url} 
              alt="avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xs font-bold text-white max-w-[80px] truncate">{user.username}</span>
          <span className="font-cinzel text-lg font-black text-white">{userScore}</span>
        </div>

        {/* VS Banner */}
        <div className="flex flex-col items-center justify-center text-center space-y-1">
          <span className="font-cinzel text-xs font-black tracking-widest text-gold text-glow-gold animate-pulse">
            ROUND {currentRound + 1}
          </span>
          <div className="w-10 h-10 bg-purple-950/20 border border-purple/30 rounded-full flex items-center justify-center text-lg animate-pulse-purple">
            ⚡
          </div>
          <span className="text-[10px] text-gray-500 font-bold uppercase">{difficulty} difficulty</span>
        </div>

        {/* AI profile card */}
        <div className="flex flex-col items-center text-center space-y-1">
          <div className="w-14 h-14 rounded-full border-2 border-purple p-2 bg-navy flex items-center justify-center">
            <Bot className="w-8 h-8 text-purple-light" />
          </div>
          <span className="text-xs font-bold text-purple-light">Llama AI</span>
          <span className="font-cinzel text-lg font-black text-purple-light">{aiScore}</span>
        </div>

      </div>

      {/* Question panel */}
      {currentQuestion && (
        <div className="bg-navy-light border border-slate-800 rounded-lg p-6 sm:p-8 space-y-6 shadow-purple-glow">
          
          <h2 className="text-white text-lg sm:text-xl font-medium leading-relaxed">
            {currentQuestion.question_text}
          </h2>

          <div className="grid grid-cols-1 gap-3.5">
            {currentQuestion.options.map((option, idx) => {
              let btnClass = "bg-navy-dark border-slate-805 hover:border-slate-700 text-gray-300";
              
              if (selectedOption === idx && !isAnswered) {
                btnClass = "bg-purple-950/30 border-purple text-purple-light shadow-purple-glow";
              }

              if (isAnswered) {
                const isCorrect = idx === roundResult?.correctAnswer;
                const isUserChoice = idx === roundResult?.userAnswer;
                const isAiChoice = idx === roundResult?.aiAnswer;

                if (isCorrect) {
                  btnClass = "bg-green-950/40 border-green-500 text-green-400 font-bold shadow-xp-glow";
                } else if (isUserChoice) {
                  btnClass = "bg-red-950/40 border-red-500 text-red-400 font-bold";
                } else {
                  btnClass = "bg-navy-dark/40 border-slate-900 text-gray-600 cursor-not-allowed";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedOption(idx)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-lg border text-sm transition-all flex items-center justify-between ${btnClass}`}
                >
                  <span>{option}</span>
                  
                  {isAnswered && (
                    <div className="flex items-center gap-2">
                      {idx === roundResult?.userAnswer && (
                        <span className="text-[10px] bg-gold text-navy-dark px-1.5 py-0.5 rounded font-black">YOU</span>
                      )}
                      {idx === roundResult?.aiAnswer && (
                        <span className="text-[10px] bg-purple text-white px-1.5 py-0.5 rounded font-bold">AI</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Trigger */}
          <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center">
            
            {/* Mini status indicator */}
            {isAnswered && (
              <div className="flex items-center gap-3">
                <div className="text-xs">
                  User: {roundResult?.userCorrect ? '✅ Correct' : '❌ Wrong'}
                </div>
                <div className="text-xs">
                  AI: {roundResult?.aiCorrect ? '✅ Correct' : '❌ Wrong'}
                </div>
              </div>
            )}
            
            {!isAnswered ? (
              <button
                onClick={submitAnswer}
                disabled={selectedOption === null}
                className="ml-auto bg-gold hover:bg-gold-light text-navy-dark font-cinzel text-xs font-black tracking-wider px-5 py-2.5 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                FIRE SPELL (SUBMIT)
              </button>
            ) : (
              <button
                onClick={handleNextRound}
                disabled={finalizing}
                className="ml-auto bg-purple hover:bg-purple-light text-white font-cinzel text-xs font-black tracking-wider px-5 py-2.5 rounded transition-all hover:shadow-purple-glow flex items-center gap-1.5"
              >
                {finalizing ? 'CALCULATING DEEDS...' : (currentRound < questions.length - 1 ? 'NEXT ROUND' : 'CLAIM DUEL DEEDS')}
              </button>
            )}
          </div>

          {/* Explanation panel */}
          {isAnswered && roundResult?.explanation && (
            <div className="bg-navy bg-opacity-60 border border-slate-800 p-4 rounded-lg">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                AI WIZARD'S EXPLANATION
              </span>
              <p className="text-gray-400 text-xs leading-relaxed">
                {roundResult.explanation}
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
