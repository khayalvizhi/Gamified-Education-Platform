import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Swords, HelpCircle, CheckCircle, ArrowRight, Shield } from 'lucide-react';

export default function DuelPlay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [duel, setDuel] = useState(null);
  const [challenger, setChallenger] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState([]); // [{ question_id, selected_option }]
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const token = localStorage.getItem('lq_token');
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/duels/${id}/questions`);
        setQuestions(res.data.questions || []);
        setDuel(res.data.duel);
        setChallenger(res.data.challenger);
        setOpponent(res.data.opponent);
        setAlreadyAnswered(res.data.already_answered);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to load duel questions.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [id]);

  const handleNext = () => {
    if (selectedOption === null) return;
    
    const newAnswers = [...answers, {
      question_id: questions[currentIndex].id,
      selected_option: selectedOption
    }];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitAllAnswers(newAnswers);
    }
  };

  const submitAllAnswers = async (finalAnswers) => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post(`/duels/${id}/answer`, { answers: finalAnswers });
      setSuccessMsg(res.data.message);
      
      // Navigate after 3 seconds
      setTimeout(() => {
        if (res.data.completed) {
          navigate(`/duels/${id}/result`);
        } else {
          navigate('/duels');
        }
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit answers.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-navy">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-navy py-12 px-4 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full border border-slate-800 bg-navy-dark/40 rounded-xl p-6">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="font-cinzel text-xl font-bold text-gray-200 mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/duels')} className="w-full bg-gold hover:bg-gold-light text-navy-dark py-2 rounded text-sm font-bold uppercase">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  if (alreadyAnswered) {
    return (
      <div className="flex-1 bg-navy py-12 px-4 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full border border-slate-800 bg-navy-dark/40 rounded-xl p-6">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4 animate-bounce" />
          <h2 className="font-cinzel text-xl font-bold text-gray-200 mb-2">Answers Already Submitted</h2>
          <p className="text-gray-400 text-sm mb-6">You have completed your trial! Waiting for the opponent to submit their answers.</p>
          <button onClick={() => navigate('/duels')} className="w-full bg-gold hover:bg-gold-light text-navy-dark py-2 rounded text-sm font-bold uppercase">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  if (successMsg) {
    return (
      <div className="flex-1 bg-navy py-12 px-4 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full border border-slate-800 bg-navy-dark/40 rounded-xl p-6">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="font-cinzel text-xl font-bold text-gray-200 mb-2">Battle Complete</h2>
          <p className="text-gray-400 text-sm mb-6">{successMsg}</p>
          <p className="text-xs text-gray-500">Redirecting to next screen...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="flex-1 bg-navy py-8 px-4 sm:px-8 max-w-3xl mx-auto w-full flex flex-col justify-center">
      {/* Header Matchup */}
      <div className="border border-slate-800 bg-navy-dark/30 rounded-xl p-4 mb-6 flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gold-light">@{challenger?.username}</span>
        </div>
        <span className="font-cinzel text-gold font-bold">VS</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-purple-light">@{opponent?.username}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className="uppercase font-semibold text-purple-light tracking-wider">{duel?.topic} • {duel?.difficulty}</span>
        </div>
        <div className="w-full bg-navy-light rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gold h-full shadow-gold-glow transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="border border-slate-800 bg-navy-dark/40 rounded-xl p-6 sm:p-8 flex-1 flex flex-col justify-between min-h-[400px]">
        <div>
          <div className="flex items-start gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-gold shrink-0 mt-0.5" />
            <h2 className="text-lg sm:text-xl font-medium text-gray-200 leading-relaxed">{currentQuestion?.question_text}</h2>
          </div>

          <div className="space-y-3">
            {currentQuestion?.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedOption(idx)}
                className={`w-full text-left p-4 rounded-lg border text-sm transition-all flex items-center justify-between ${
                  selectedOption === idx
                    ? 'border-gold bg-yellow-950/20 text-gold-light shadow-gold-glow'
                    : 'border-slate-800 hover:border-slate-700 bg-navy-light/40 text-gray-300'
                }`}
              >
                <span>{option}</span>
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                  selectedOption === idx ? 'border-gold text-gold font-bold' : 'border-slate-700 text-slate-500'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={selectedOption === null || submitting}
          className={`w-full mt-8 py-3 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            selectedOption !== null && !submitting
              ? 'bg-gold hover:bg-gold-light text-navy-dark hover:shadow-gold-glow'
              : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {currentIndex < questions.length - 1 ? (
            <>Next Question <ArrowRight className="w-4 h-4" /></>
          ) : (
            <>Submit Answers <Swords className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
