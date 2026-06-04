import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './config/db.js';

// Load routes
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import quizRouter from './routes/quiz.js';
import battleRouter from './routes/battle.js';
import leaderboardRouter from './routes/leaderboard.js';
import shopRouter from './routes/shop.js';
import duelsRouter from './routes/duels.js';
import studyPlanRouter from './routes/studyPlan.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*', // For development, allow any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/battle', battleRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/shop', shopRouter);
app.use('/api/duels', duelsRouter);
app.use('/api/study-plan', studyPlanRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'active', timestamp: new Date().toISOString() });
});

// Root check
app.get('/', (req, res) => {
  res.send('LearnQuest RPG API is running! Start your quest.');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong inside the server taverns!' });
});

// Initialize database then start server
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`   LEARNQUEST BACKEND ACTIVE ON PORT ${PORT}      `);
      console.log(`   TAKERN AND QUESTOR SERVICES ENGAGED         `);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
