import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Swords, Flame, Coins, ShieldAlert, BookOpen, UserCheck2, Trophy } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex flex-col justify-center relative overflow-hidden py-12 px-4 sm:px-6">
      
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center z-10">
        <div className="inline-flex items-center justify-center p-3 bg-navy-light/80 border border-slate-800 rounded-full shadow-gold-glow mb-6 animate-pulse-gold">
          <span className="text-4xl">⚔️</span>
        </div>
        
        <h1 className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
          <span className="text-white">ENTER THE </span>
          <span className="bg-gradient-to-r from-gold via-gold-light to-yellow-400 bg-clip-text text-transparent text-glow-gold">LEARNQUEST</span>
        </h1>

        <p className="text-gray-400 text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto font-sans leading-relaxed mb-8">
          Where study meets epic adventure. Complete quests, forge your path across historical kingdoms, solve cosmic mathematics, and duel the AI Sorcerer in live battles.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={user ? "/dashboard" : "/register"}
            className="w-full sm:w-auto font-cinzel text-lg tracking-wider bg-gold hover:bg-gold-light text-navy-dark px-8 py-3.5 rounded font-black transition-all hover:shadow-gold-glow hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <Swords className="w-5 h-5" />
            START YOUR QUEST
          </Link>
          <Link
            to="/leaderboard"
            className="w-full sm:w-auto font-cinzel text-lg tracking-wider bg-navy-light hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-gray-300 px-8 py-3.5 rounded font-black transition-all flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5 text-purple-light" />
            HALL OF HEROES
          </Link>
        </div>
      </div>

      {/* Features Showcase */}
      <div className="max-w-6xl mx-auto mt-24 z-10 w-full">
        <h2 className="font-cinzel text-2xl sm:text-3xl text-center font-bold tracking-widest text-gray-300 mb-12">
          CHOOSE YOUR CHALLENGE
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="rpg-card group hover:-translate-y-2 duration-300">
            <div className="w-12 h-12 bg-purple/10 border border-purple/30 rounded flex items-center justify-center mb-6 group-hover:bg-purple/20 transition-all">
              <Flame className="w-6 h-6 text-orange-400 fill-orange-400/20" />
            </div>
            <h3 className="font-cinzel text-xl font-bold text-white mb-2 group-hover:text-gold transition-colors">
              Streak Flame
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Login daily and play quizzes to maintain your streak. Reaching a 7-day streak activates the 1.5x XP multiplier bonus on all accomplishments!
            </p>
          </div>

          {/* Card 2 */}
          <div className="rpg-card group hover:-translate-y-2 duration-300">
            <div className="w-12 h-12 bg-purple/10 border border-purple/30 rounded flex items-center justify-center mb-6 group-hover:bg-purple/20 transition-all">
              <Swords className="w-6 h-6 text-purple-light" />
            </div>
            <h3 className="font-cinzel text-xl font-bold text-white mb-2 group-hover:text-gold transition-colors">
              AI Battle Arena
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Challenge Llama 3.3 AI. Enter a topic and difficulty, and answer rounds of dynamic questions generated instantly. Defeat the AI for a massive +100 XP and +25 Gold!
            </p>
          </div>

          {/* Card 3 */}
          <div className="rpg-card group hover:-translate-y-2 duration-300">
            <div className="w-12 h-12 bg-purple/10 border border-purple/30 rounded flex items-center justify-center mb-6 group-hover:bg-purple/20 transition-all">
              <Coins className="w-6 h-6 text-gold fill-gold/10" />
            </div>
            <h3 className="font-cinzel text-xl font-bold text-white mb-2 group-hover:text-gold transition-colors">
              RPG Store & Level Ups
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Unlock prestigious avatar frames, custom badges, and prestige level stars. Every 500 XP raises your Rank level. Track your position on the server leaderboard.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
