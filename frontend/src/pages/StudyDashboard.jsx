import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Calendar, CheckSquare, Square, Award, AlertCircle, RefreshCw, Sliders, ChevronRight } from 'lucide-react';

export default function StudyDashboard() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const token = localStorage.getItem('lq_token');
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/study-plan/active');
      setData(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        navigate('/study-plan/setup');
      } else {
        setError('Failed to load study plan.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkComplete = async (dayId) => {
    try {
      setError('');
      setSuccess('');
      const res = await api.patch(`/study-plan/progress/${dayId}`);
      setSuccess(res.data.message);
      
      // Update global context for XP & Coins display
      await refreshMe();
      
      // Reload all data from server to guarantee UI consistency
      await loadData();
    } catch (err) {
      console.error('markComplete error:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to mark session as complete.');
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      setError('');
      setSuccess('');
      const res = await api.post('/study-plan/regenerate');
      setSuccess(res.data.message);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to regenerate study plan.');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-navy">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!data) return null;

  const { plan, progress, stats } = data;
  const planContent = typeof plan.plan_content === 'string' ? JSON.parse(plan.plan_content) : plan.plan_content;

  // Build a flat sequential index map: progress items are created in plan order
  // (day1-session1, day1-session2, ..., day7-sessionN), so we track a counter.
  const progressById = {};
  progress.forEach(p => { progressById[p.id] = p; });

  const weeks = planContent?.weeks || [];
  const firstWeek = weeks[0] || {};
  const days = firstWeek.days || [];

  // Build a sequential mapping: for each day+session, assign the next progress item
  let progressCounter = 0;
  const sessionProgressMap = {}; // key: "dayIdx-sessionIdx" => progress item
  for (let dIdx = 0; dIdx < days.length; dIdx++) {
    const day = days[dIdx];
    const sessions = day.sessions || [];
    for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
      if (progressCounter < progress.length) {
        sessionProgressMap[`${dIdx}-${sIdx}`] = progress[progressCounter];
        progressCounter++;
      }
    }
  }

  return (
    <div className="flex-1 bg-navy py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-black text-gold-light text-glow-gold flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-gold" /> STUDY PLAN
          </h1>
          <p className="text-gray-400 mt-1">Your AI-guided progression path towards target milestones.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/study-plan/setup')}
            className="px-4 py-2 border border-slate-700 hover:border-slate-650 hover:bg-slate-800/40 rounded-lg text-sm text-gray-300 font-semibold flex items-center gap-2 transition-all"
          >
            <Sliders className="w-4 h-4" /> Edit Preferences
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-4 py-2 bg-purple hover:bg-purple-light text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:shadow-purple-glow"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} /> {regenerating ? 'Consulting AI...' : 'Regenerate Plan'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-950/50 border border-red-500/30 text-red-300 p-4 rounded-lg mb-6">{error}</div>}
      {success && <div className="bg-green-950/50 border border-green-500/30 text-green-300 p-4 rounded-lg mb-6 flex items-center gap-2">
        <Award className="w-5 h-5 text-green-400 shrink-0" />
        <span>{success}</span>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Progress Summary */}
        <div className="space-y-6 lg:col-span-1">
          <div className="border border-slate-800 rounded-xl bg-navy-dark/30 p-5">
            <h2 className="font-cinzel text-lg font-bold text-gray-200 border-b border-slate-800 pb-3 mb-4">
              Overview
            </h2>
            
            <div className="text-center py-6 border-b border-slate-800/60 mb-6">
              <div className="inline-flex items-center justify-center relative w-24 h-24 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" className="stroke-slate-800" strokeWidth="6" fill="transparent" />
                  <circle cx="48" cy="48" r="40" className="stroke-gold shadow-gold-glow transition-all duration-500" strokeWidth="6" fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * stats.percentage) / 100}
                  />
                </svg>
                <div className="absolute text-xl font-black text-gold-light">{stats.percentage}%</div>
              </div>
              <p className="text-xs text-gray-400">Completed {stats.completed} of {stats.total} total sessions</p>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Theme</span>
                <span className="text-sm font-semibold text-gray-300">{firstWeek.theme || 'Core Practice'}</span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Weekly Goals</span>
                <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-4">
                  {planContent.weekly_goals?.map((g, idx) => <li key={idx}>{g}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* AI Tips Panel */}
          <div className="border border-slate-800 rounded-xl bg-navy-dark/30 p-5">
            <h3 className="font-cinzel text-base font-bold text-gold-light mb-3">AI Archmage Advice</h3>
            <ul className="text-xs text-gray-400 space-y-3">
              {planContent.tips?.map((tip, idx) => (
                <li key={idx} className="flex gap-2 items-start">
                  <span className="text-gold mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Weekly Breakdown */}
        <div className="lg:col-span-3 space-y-6">
          <div className="border border-slate-800 rounded-xl bg-navy-dark/30 p-5 sm:p-6">
            <h2 className="font-cinzel text-xl font-bold text-gray-200 border-b border-slate-850 pb-4 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-light" /> Week 1 Progression Path
            </h2>

            <div className="space-y-6">
              {days.map((day, dIdx) => {
                return (
                  <div key={dIdx} className="border-b border-slate-850/60 last:border-0 pb-6 last:pb-0">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-cinzel text-sm font-black text-purple-light uppercase tracking-wider">
                        Day {day.day}: {day.day_name}
                      </h3>
                      <span className="text-[10px] text-gray-500 font-semibold">{day.total_hours} Hours Target</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(day.sessions || []).map((session, sIdx) => {
                        // Use sequential index matching instead of content-based matching
                        const progItem = sessionProgressMap[`${dIdx}-${sIdx}`];
                        const isCompleted = progItem?.is_completed;

                        return (
                          <div
                            key={sIdx}
                            className={`p-4 rounded-lg border transition-all flex items-start justify-between gap-4 ${
                              isCompleted
                                ? 'border-green-500/20 bg-green-950/5 text-green-300/80'
                                : 'border-slate-800 bg-navy-light/20 hover:border-slate-750'
                            }`}
                          >
                            <div className="flex-1">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-gray-400 mb-2">
                                {session.subject}
                              </span>
                              <h4 className={`text-sm font-bold tracking-wide ${isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                {session.topic}
                              </h4>
                              <p className="text-xs text-gray-400 mt-1">{session.activity} ({session.duration_minutes}m)</p>
                              {session.tips && <p className="text-[10px] text-gray-500 mt-2 italic">Tip: {session.tips}</p>}
                            </div>

                            {progItem && (
                              <button
                                onClick={() => !isCompleted && handleMarkComplete(progItem.id)}
                                disabled={isCompleted}
                                className={`p-1.5 rounded transition-all shrink-0 ${
                                  isCompleted
                                    ? 'text-green-400 bg-green-500/10 cursor-default'
                                    : 'text-gray-400 hover:text-gold hover:bg-slate-800'
                                }`}
                                title={isCompleted ? 'Session Complete' : 'Mark Session Complete'}
                              >
                                {isCompleted ? (
                                  <CheckSquare className="w-5.5 h-5.5" />
                                ) : (
                                  <Square className="w-5.5 h-5.5" />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
