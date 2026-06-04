import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import QuizList from './pages/QuizList';
import QuizPlay from './pages/QuizPlay';
import BattleArena from './pages/BattleArena';
import Leaderboard from './pages/Leaderboard';
import Shop from './pages/Shop';
import DuelsHub from './pages/DuelsHub';
import DuelPlay from './pages/DuelPlay';
import DuelResult from './pages/DuelResult';
import StudySetup from './pages/StudySetup';
import StudyDashboard from './pages/StudyDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-navy text-gray-100 flex flex-col font-sans">
          
          {/* Global Navbar */}
          <Navbar />
          
          {/* Viewport content */}
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/quizzes" element={<QuizList />} />
              <Route path="/quiz/:id" element={<QuizPlay />} />
              <Route path="/battle" element={<BattleArena />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/duels" element={<DuelsHub />} />
              <Route path="/duels/:id/play" element={<DuelPlay />} />
              <Route path="/duels/:id/result" element={<DuelResult />} />
              <Route path="/study-plan/setup" element={<StudySetup />} />
              <Route path="/study-plan" element={<StudyDashboard />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-900 bg-navy-dark/40 py-6 text-center text-xs text-gray-600 font-semibold tracking-wider font-cinzel">
            © {new Date().getFullYear()} LEARNQUEST RPG. ALL RIGHTS AND SPELLS RESERVED.
          </footer>

        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
