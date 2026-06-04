import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Trophy, ShieldAlert, Sparkles, Filter } from 'lucide-react';

const TOPICS = ['All', 'Math', 'Science', 'History', 'Geography', 'General Knowledge'];
const DIFFICULTIES = ['All', 'easy', 'medium', 'hard'];

export default function QuizList() {
  const { API_URL } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        let url = `${API_URL}/quizzes`;
        const params = [];
        if (selectedTopic !== 'All') params.push(`topic=${encodeURIComponent(selectedTopic)}`);
        if (selectedDifficulty !== 'All') params.push(`difficulty=${selectedDifficulty}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setQuizzes(data);
        }
      } catch (err) {
        console.error('Failed to load quizzes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [selectedTopic, selectedDifficulty]);

  const getDifficultyColor = (diff) => {
    if (diff === 'easy') return 'bg-green-950/50 border border-green-500/30 text-green-400';
    if (diff === 'medium') return 'bg-yellow-950/50 border border-yellow-500/30 text-gold-light';
    return 'bg-red-950/50 border border-red-500/30 text-red-400';
  };

  const getTopicIcon = (topic) => {
    if (topic === 'Math') return '📐';
    if (topic === 'Science') return '🧪';
    if (topic === 'History') return '📜';
    if (topic === 'Geography') return '🗺️';
    return '🧠';
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="font-cinzel text-3xl sm:text-4xl font-extrabold text-white tracking-widest text-glow-gold">
          QUEST PORTALS (QUIZZES)
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Select a subject realm to test your wisdom and earn experience points.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-navy-light border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Topic filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Topic:
          </span>
          {TOPICS.map(topic => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${
                selectedTopic === topic 
                  ? 'bg-gold border-gold text-navy-dark shadow-gold-glow' 
                  : 'bg-navy border-slate-850 text-gray-400 hover:text-white'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
            Difficulty:
          </span>
          {DIFFICULTIES.map(diff => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 py-1 text-xs font-bold rounded capitalize border ${
                selectedDifficulty === diff 
                  ? 'bg-purple border-purple-light text-white shadow-purple-glow' 
                  : 'bg-navy border-slate-850 text-gray-400 hover:text-white'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>

      </div>

      {/* Quizzes Grid */}
      {loading ? (
        <div className="text-center py-24 text-gray-500 font-cinzel tracking-widest">
          SUMMONING REALM PORTALS...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 bg-navy bg-opacity-35 border border-slate-800 rounded-lg text-gray-500">
          No portals have been discovered matching these criteria in this chapter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div 
              key={quiz.id} 
              className="rpg-card group flex flex-col justify-between hover:-translate-y-1 hover:shadow-purple-glow duration-300"
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <span className="text-3xl">{getTopicIcon(quiz.topic)}</span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${getDifficultyColor(quiz.difficulty)}`}>
                    {quiz.difficulty}
                  </span>
                </div>

                <h3 className="font-cinzel text-lg font-bold text-white mb-2 group-hover:text-gold-light transition-colors">
                  {quiz.title}
                </h3>
                
                <div className="inline-flex items-center gap-1 bg-slate-800/40 text-gray-400 text-xs px-2 py-0.5 rounded uppercase font-bold">
                  {quiz.topic}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-800/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase">
                  5 Questions • ~5 Mins
                </span>
                
                <Link
                  to={`/quiz/${quiz.id}`}
                  className="bg-navy border border-purple hover:bg-purple text-white hover:text-white font-cinzel text-xs font-bold tracking-wider px-3.5 py-1.5 rounded transition-all group-hover:shadow-purple-glow"
                >
                  ENTER PORTAL
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
