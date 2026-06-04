import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, Trophy, Coins, Flame, ArrowLeft, CheckCircle, XCircle, Sparkles, Timer } from 'lucide-react';

export default function QuizPlay() {
  const { id } = useParams();
  const { token, API_URL, refreshMe } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gameplay State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]); // indices user selected
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds timer per question
  
  // Results State
  const [isCompleted, setIsCompleted] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [savingAttempt, setSavingAttempt] = useState(false);

  // Fetch quiz details
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`${API_URL}/quizzes/${id}`);
        if (res.ok) {
          const data = await res.json();
          setQuiz(data);
          setQuestions(data.questions || []);
        } else {
          navigate('/quizzes');
        }
      } catch (err) {
        console.error('Error fetching quiz details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  // Question Timer
  useEffect(() => {
    if (loading || isCompleted || isAnswerRevealed) return;
    if (timeLeft === 0) {
      handleReveal(null); // Time out!
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isAnswerRevealed, isCompleted, loading]);

  const handleOptionSelect = (optionIdx) => {
    if (isAnswerRevealed) return;
    setSelectedOption(optionIdx);
  };

  const handleReveal = (optIdx = selectedOption) => {
    setIsAnswerRevealed(true);
    setUserAnswers(prev => [...prev, optIdx]);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setTimeLeft(30);
    } else {
      // Finalize attempt
      await submitQuizResults();
    }
  };

  const submitQuizResults = async () => {
    setSavingAttempt(true);
    try {
      const res = await fetch(`${API_URL}/quizzes/${id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: userAnswers })
      });

      if (res.ok) {
        const data = await res.json();
        setResultsData(data);
        setIsCompleted(true);
        refreshMe();
      }
    } catch (err) {
      console.error('Failed to submit attempt:', err);
    } finally {
      setSavingAttempt(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 font-cinzel tracking-widest text-lg">OPENING subject PORTAL...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h2 className="text-red-400 font-cinzel text-xl mb-4">No questions exist inside this portal.</h2>
        <Link to="/quizzes" className="bg-slate-800 text-white px-4 py-2 rounded">
          Return to Quest List
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  // End Screen Summary
  if (isCompleted && resultsData) {
    return (
      <div className="flex-1 max-w-2xl mx-auto px-4 py-12 flex flex-col items-center justify-center z-10 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="bg-navy-light/95 border-2 border-gold/40 p-8 rounded-lg shadow-gold-glow text-center space-y-6 w-full relative">
          <div className="mx-auto w-20 h-20 bg-gold/10 border border-gold/40 rounded-full flex items-center justify-center text-4xl animate-float">
            🏆
          </div>

          <div>
            <h2 className="font-cinzel text-3xl font-black text-white tracking-widest">PORTAL COMPLETED</h2>
            <p className="text-gray-400 text-sm mt-1">{quiz.title}</p>
          </div>

          {/* Score Counter */}
          <div className="bg-navy p-4 rounded border border-slate-800/80">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">FINAL SCORE</span>
            <span className="font-cinzel text-4xl font-extrabold text-white">
              {resultsData.score} <span className="text-lg text-gray-500">/ {resultsData.total_questions}</span>
            </span>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-950/20 border border-green-500/20 p-3 rounded">
              <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">XP Earned</span>
              <span className="font-cinzel text-xl font-bold text-green-400 flex items-center justify-center gap-1">
                +{resultsData.xp_earned} XP
              </span>
            </div>

            <div className="bg-yellow-950/20 border border-gold/20 p-3 rounded">
              <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Coins Earned</span>
              <span className="font-cinzel text-xl font-bold text-gold flex items-center justify-center gap-1">
                +{resultsData.coins_earned}💰
              </span>
            </div>
          </div>

          {/* Streak Status */}
          {resultsData.current_streak > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-orange-400 font-bold bg-orange-950/20 border border-orange-500/20 py-2 rounded">
              <Flame className="w-4 h-4 fill-orange-400/20" />
              <span>Current Daily Login Streak: {resultsData.current_streak} Days!</span>
              {resultsData.streak_applied && <span className="text-[10px] bg-orange-500 text-navy-dark px-1.5 rounded ml-1">1.5X MULTIPLIER APPLIED</span>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-800/60">
            <Link
              to="/dashboard"
              className="flex-1 bg-navy-dark border border-slate-800 hover:border-slate-700 text-gray-300 font-cinzel text-sm font-bold tracking-wider py-2.5 rounded transition-all"
            >
              TAVERN DASHBOARD
            </Link>
            <Link
              to="/quizzes"
              className="flex-1 bg-gold hover:bg-gold-light text-navy-dark font-cinzel text-sm font-bold tracking-wider py-2.5 rounded transition-all hover:shadow-gold-glow"
            >
              NEXT PORTAL
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // Active Gameplay Screen
  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full flex flex-col justify-center">
      
      {/* Quiz Progress header */}
      <div className="flex justify-between items-center mb-6">
        <Link to="/quizzes" className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Quests
        </Link>
        <span className="font-cinzel text-xs font-bold text-gray-400">
          QUESTION {currentIndex + 1} OF {questions.length}
        </span>
      </div>

      {/* Main card */}
      <div className="bg-navy-light border border-slate-800 rounded-lg p-6 sm:p-8 space-y-6 shadow-purple-glow">
        
        {/* Progress bar */}
        <div className="w-full bg-navy-dark h-1.5 rounded-full overflow-hidden border border-slate-800">
          <div 
            className="bg-purple-light h-full shadow-purple-glow transition-all duration-350"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question + Timer */}
        <div className="flex justify-between items-start gap-4">
          <h2 className="text-white text-lg sm:text-xl font-medium leading-relaxed">
            {currentQuestion.question_text}
          </h2>

          {/* Circular/pill timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded border font-mono text-sm font-bold ${
            timeLeft <= 5 
              ? 'bg-red-950/40 border-red-500/30 text-red-400 animate-pulse' 
              : 'bg-navy-dark border-slate-800 text-gray-400'
          }`}>
            <Timer className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Options list */}
        <div className="grid grid-cols-1 gap-3.5">
          {currentQuestion.options.map((option, idx) => {
            let btnClass = "bg-navy-dark border-slate-800 hover:border-slate-700 text-gray-300";
            
            // Selected but not revealed
            if (selectedOption === idx && !isAnswerRevealed) {
              btnClass = "bg-purple-950/30 border-purple text-purple-light shadow-purple-glow";
            }
            
            // Revealed
            if (isAnswerRevealed) {
              const isCorrectOpt = idx === currentQuestion.correct_option_index;
              const isUserSelected = userAnswers[currentIndex] === idx;
              
              if (isCorrectOpt) {
                btnClass = "bg-green-950/40 border-green-500 text-green-400 shadow-xp-glow font-bold";
              } else if (isUserSelected) {
                btnClass = "bg-red-950/40 border-red-500 text-red-400 font-bold";
              } else {
                btnClass = "bg-navy-dark/40 border-slate-900 text-gray-600 cursor-not-allowed";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={isAnswerRevealed}
                className={`w-full text-left p-4 rounded-lg border text-sm transition-all duration-200 flex items-center justify-between ${btnClass}`}
              >
                <span>{option}</span>
                
                {isAnswerRevealed && idx === currentQuestion.correct_option_index && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {isAnswerRevealed && userAnswers[currentIndex] === idx && idx !== currentQuestion.correct_option_index && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Reveal answer trigger / Next */}
        <div className="pt-4 border-t border-slate-800/50 flex justify-end">
          {!isAnswerRevealed ? (
            <button
              onClick={() => handleReveal()}
              disabled={selectedOption === null}
              className="bg-gold hover:bg-gold-light text-navy-dark font-cinzel text-xs font-black tracking-wider px-5 py-2.5 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-gold-glow"
            >
              REVEAL ANSWER
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={savingAttempt}
              className="bg-purple hover:bg-purple-light text-white font-cinzel text-xs font-black tracking-wider px-5 py-2.5 rounded transition-all flex items-center gap-1 hover:shadow-purple-glow"
            >
              {savingAttempt ? 'SAVING...' : (currentIndex < questions.length - 1 ? 'NEXT QUESTION' : 'CLAIM REWARDS')}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Explanation display */}
        {isAnswerRevealed && currentQuestion.explanation && (
          <div className="bg-navy bg-opacity-60 border border-slate-800 p-4 rounded-lg animate-float">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
              SCROLL OF WISDOM (EXPLANATION)
            </span>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              {currentQuestion.explanation}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
