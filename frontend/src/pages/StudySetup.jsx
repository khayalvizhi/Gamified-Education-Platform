import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Star, Sparkles, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function StudySetup() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [subjects, setSubjects] = useState('');
  const [dailyHours, setDailyHours] = useState('2');
  const [daysUntilExam, setDaysUntilExam] = useState('30');
  const [weakTopics, setWeakTopics] = useState('');
  const [strongTopics, setStrongTopics] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning');
  const [studyStyle, setStudyStyle] = useState('Gamified');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('lq_token');
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    // Check if preferences already exist, if so fill them
    const loadExisting = async () => {
      try {
        const res = await api.get('/study-plan/preferences');
        if (res.data.preferences) {
          const p = res.data.preferences;
          setGoal(p.goal || '');
          setSubjects(p.subjects?.join(', ') || '');
          setDailyHours(String(p.daily_hours || 2));
          setDaysUntilExam(String(p.days_until_exam || 30));
          setWeakTopics(p.weak_topics?.join(', ') || '');
          setStrongTopics(p.strong_topics?.join(', ') || '');
          setPreferredTime(p.preferred_time || 'Morning');
          setStudyStyle(p.study_style || 'Gamified');
        }
      } catch (err) {
        // Safe to ignore: means they haven't set preferences yet
      }
    };
    loadExisting();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      
      const payload = {
        goal,
        subjects: subjects.split(',').map(s => s.trim()).filter(Boolean),
        daily_hours: parseInt(dailyHours),
        days_until_exam: parseInt(daysUntilExam),
        weak_topics: weakTopics.split(',').map(s => s.trim()).filter(Boolean),
        strong_topics: strongTopics.split(',').map(s => s.trim()).filter(Boolean),
        preferred_time: preferredTime,
        study_style: studyStyle
      };

      await api.post('/study-plan/preferences', payload);
      await api.post('/study-plan/generate');
      
      navigate('/study-plan');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to generate study plan.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-navy py-8 px-4 sm:px-8 max-w-2xl mx-auto w-full flex flex-col justify-center">
      <div className="text-center mb-8">
        <h1 className="font-cinzel text-3xl sm:text-4xl font-black text-gold-light text-glow-gold flex items-center justify-center gap-3">
          <BookOpen className="w-8 h-8 text-gold" /> STUDY ARCHITECT
        </h1>
        <p className="text-gray-400 mt-2">Construct your AI-powered weekly study path with specialized guild trials.</p>
      </div>

      <div className="border border-slate-800 bg-navy-dark/40 rounded-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-950/50 border border-red-500/30 text-red-300 p-4 rounded-lg">{error}</div>}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Ultimate Quest Goal</label>
            <input
              type="text"
              required
              placeholder="e.g. Pass AP Calculus with 5 / Master Full Stack Web Dev"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-navy-light border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Subjects of Trial (comma-separated)</label>
            <input
              type="text"
              required
              placeholder="e.g. Calculus, Physics, Chemistry"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              className="w-full bg-navy-light border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Daily Available Hours</label>
              <input
                type="number"
                required
                min={1}
                max={24}
                value={dailyHours}
                onChange={(e) => setDailyHours(e.target.value)}
                className="w-full bg-navy-light border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Days Until Target / Exam</label>
              <input
                type="number"
                required
                min={1}
                value={daysUntilExam}
                onChange={(e) => setDaysUntilExam(e.target.value)}
                className="w-full bg-navy-light border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Weak Topics (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Integration, Magnetism"
                value={weakTopics}
                onChange={(e) => setWeakTopics(e.target.value)}
                className="w-full bg-navy-light border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Strong Topics (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Limits, Kinematics"
                value={strongTopics}
                onChange={(e) => setStrongTopics(e.target.value)}
                className="w-full bg-navy-light border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Preferred Study Time</label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full bg-navy-light border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
                <option value="Late Night">Late Night</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Study Focus Style</label>
              <select
                value={studyStyle}
                onChange={(e) => setStudyStyle(e.target.value)}
                className="w-full bg-navy-light border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold"
              >
                <option value="Gamified">Gamified (High XP Wagers)</option>
                <option value="Deep Focus">Deep Focus (Longer Sessions)</option>
                <option value="Sprint Revision">Sprint Revision (Flash Cards)</option>
                <option value="Collaborative">Collaborative (Peer challenges)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full mt-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all font-cinzel ${
              !submitting
                ? 'bg-gold hover:bg-gold-light text-navy-dark hover:shadow-gold-glow'
                : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              'Consulting AI Arcanum...'
            ) : (
              <>Construct Path & Start <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
