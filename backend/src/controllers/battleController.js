import { db } from '../config/db.js';
import { aiService } from '../services/aiService.js';
import { gamificationService } from '../services/gamificationService.js';

export const battleController = {
  // Start AI Battle
  async startBattle(req, res) {
    const { topic, difficulty } = req.body;

    if (!topic || !difficulty) {
      return res.status(400).json({ error: 'Topic and difficulty are required.' });
    }

    try {
      console.log(`Starting battle on topic: ${topic}, difficulty: ${difficulty}`);
      // Generate 5 questions via Groq (or fallback)
      const questions = await aiService.generateQuestions(topic, difficulty);

      // Map questions into rounds structure
      const rounds = questions.map(q => ({
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        explanation: q.explanation,
        user_answer: null,
        ai_answer: null,
        user_correct: null,
        ai_correct: null
      }));

      const battle = await db.aiBattles.create({
        user_id: req.user.id,
        topic,
        difficulty,
        user_score: 0,
        ai_score: 0,
        rounds
      });

      // Strip correct answers before sending questions to frontend to prevent cheating
      const cleanQuestions = questions.map(q => ({
        question_text: q.question_text,
        options: q.options
      }));

      res.status(201).json({
        id: battle.id,
        topic: battle.topic,
        difficulty: battle.difficulty,
        questions: cleanQuestions,
        rounds_count: 5
      });
    } catch (err) {
      console.error('Start battle error:', err);
      res.status(500).json({ error: 'Failed to start AI battle.' });
    }
  },

  // Submit Answer for a Round
  async submitRoundAnswer(req, res) {
    const { id } = req.params;
    const { roundIndex, answerIndex } = req.body; // roundIndex: 0-4, answerIndex: 0-3

    if (typeof roundIndex !== 'number' || typeof answerIndex !== 'number') {
      return res.status(400).json({ error: 'roundIndex and answerIndex are required.' });
    }

    try {
      const battle = await db.aiBattles.findById(id);
      if (!battle) {
        return res.status(404).json({ error: 'Battle not found.' });
      }

      if (battle.winner) {
        return res.status(400).json({ error: 'This battle has already finished.' });
      }

      const rounds = [...battle.rounds];
      if (roundIndex < 0 || roundIndex >= rounds.length) {
        return res.status(400).json({ error: 'Invalid round index.' });
      }

      const round = rounds[roundIndex];
      if (round.user_answer !== null) {
        return res.status(400).json({ error: 'This round has already been answered.' });
      }

      const correctIndex = round.correct_option_index;

      // Simulate AI Answer
      const aiAnswerIndex = aiService.simulateAiAnswer(correctIndex, battle.difficulty);

      // Record answers
      round.user_answer = answerIndex;
      round.ai_answer = aiAnswerIndex;
      round.user_correct = (answerIndex === correctIndex);
      round.ai_correct = (aiAnswerIndex === correctIndex);

      // Calculate scores
      let newUserScore = battle.user_score;
      let newAiScore = battle.ai_score;

      if (round.user_correct) newUserScore += 1;
      if (round.ai_correct) newAiScore += 1;

      // Update in DB
      await db.aiBattles.update(id, {
        rounds,
        user_score: newUserScore,
        ai_score: newAiScore
      });

      res.json({
        roundIndex,
        userAnswer: answerIndex,
        aiAnswer: aiAnswerIndex,
        correctAnswer: correctIndex,
        explanation: round.explanation,
        userCorrect: round.user_correct,
        aiCorrect: round.ai_correct,
        scores: {
          user: newUserScore,
          ai: newAiScore
        }
      });
    } catch (err) {
      console.error('Submit round answer error:', err);
      res.status(500).json({ error: 'Failed to submit answer.' });
    }
  },

  // Finalize Battle
  async finalizeBattle(req, res) {
    const { id } = req.params;

    try {
      const battle = await db.aiBattles.findById(id);
      if (!battle) {
        return res.status(404).json({ error: 'Battle not found.' });
      }

      if (battle.winner) {
        return res.json({
          message: 'Battle is already completed.',
          battle
        });
      }

      // Check if all rounds are answered
      const unanswered = battle.rounds.some(r => r.user_answer === null);
      if (unanswered) {
        return res.status(400).json({ error: 'Cannot finalize. Not all rounds have been played.' });
      }

      // Determine Winner
      let winner = 'draw';
      if (battle.user_score > battle.ai_score) {
        winner = 'user';
      } else if (battle.ai_score > battle.user_score) {
        winner = 'ai';
      }

      // Award rewards
      const rewards = await gamificationService.awardBattleRewards(req.user.id, winner);

      // Save finalized status
      const updatedBattle = await db.aiBattles.update(id, {
        winner,
        xp_earned: rewards.xp_earned,
        coins_earned: rewards.coins_earned,
        completed_at: new Date().toISOString()
      });

      res.json({
        winner,
        userScore: battle.user_score,
        aiScore: battle.ai_score,
        xpEarned: rewards.xp_earned,
        coinsEarned: rewards.coins_earned,
        streak_applied: rewards.streak_applied,
        current_streak: rewards.current_streak,
        profile: rewards.profile,
        battle: updatedBattle
      });
    } catch (err) {
      console.error('Finalize battle error:', err);
      res.status(500).json({ error: 'Failed to finalize battle.' });
    }
  }
};
