import { db } from '../config/db.js';
import { aiService } from '../services/aiService.js';

export const duelsController = {
  // POST /api/duels/challenge
  async challenge(req, res) {
    try {
      const challengerId = req.user.id;
      const { opponent_username, topic, difficulty } = req.body;

      if (!opponent_username || !topic || !difficulty) {
        return res.status(400).json({ error: 'opponent_username, topic, and difficulty are required.' });
      }

      const opponent = await db.users.findByUsername(opponent_username);
      if (!opponent) return res.status(404).json({ error: `User "${opponent_username}" not found.` });
      if (opponent.id === challengerId) return res.status(400).json({ error: 'You cannot challenge yourself.' });

      // Generate 5 questions via Groq or fallback
      const questions = await aiService.generateQuestions(topic, difficulty);

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const duel = await db.duels.create({
        challenger_id: challengerId,
        opponent_id: opponent.id,
        topic,
        difficulty,
        xp_stake: 50,
        coin_stake: 20,
        expires_at: expiresAt
      });

      // Save questions
      for (let i = 0; i < questions.length; i++) {
        await db.duelQuestions.create({
          duel_id: duel.id,
          question_text: questions[i].question_text,
          options: questions[i].options,
          correct_option_index: questions[i].correct_option_index,
          question_order: i + 1
        });
      }

      const challenger = await db.users.findById(challengerId);
      res.status(201).json({
        message: `Challenge sent to ${opponent.username}!`,
        duel,
        challenger_username: challenger.username,
        opponent_username: opponent.username
      });
    } catch (err) {
      console.error('challenge error:', err);
      res.status(500).json({ error: 'Failed to send challenge.' });
    }
  },

  // GET /api/duels/incoming
  async incoming(req, res) {
    try {
      const userId = req.user.id;
      const duels = await db.duels.findPendingIncoming(userId);
      res.json({ duels });
    } catch (err) {
      console.error('incoming error:', err);
      res.status(500).json({ error: 'Failed to fetch incoming challenges.' });
    }
  },

  // POST /api/duels/:id/accept
  async accept(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const duel = await db.duels.findById(id);
      if (!duel) return res.status(404).json({ error: 'Duel not found.' });
      if (duel.opponent_id !== userId) return res.status(403).json({ error: 'Not your challenge to accept.' });
      if (duel.status !== 'pending') return res.status(400).json({ error: `Duel is already ${duel.status}.` });
      if (new Date(duel.expires_at) < new Date()) return res.status(400).json({ error: 'Challenge has expired.' });

      const updated = await db.duels.update(id, { status: 'active' });
      res.json({ message: 'Challenge accepted! Time to duel.', duel: updated });
    } catch (err) {
      console.error('accept error:', err);
      res.status(500).json({ error: 'Failed to accept duel.' });
    }
  },

  // POST /api/duels/:id/decline
  async decline(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const duel = await db.duels.findById(id);
      if (!duel) return res.status(404).json({ error: 'Duel not found.' });
      if (duel.opponent_id !== userId) return res.status(403).json({ error: 'Not your challenge to decline.' });
      if (duel.status !== 'pending') return res.status(400).json({ error: `Duel is already ${duel.status}.` });

      const updated = await db.duels.update(id, { status: 'declined' });
      res.json({ message: 'Challenge declined.', duel: updated });
    } catch (err) {
      console.error('decline error:', err);
      res.status(500).json({ error: 'Failed to decline duel.' });
    }
  },

  // POST /api/duels/:id/answer
  async submitAnswers(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { answers } = req.body; // [{ question_id, selected_option }]

      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'answers array is required.' });
      }

      const duel = await db.duels.findById(id);
      if (!duel) return res.status(404).json({ error: 'Duel not found.' });

      const isChallenger = duel.challenger_id === userId;
      const isOpponent = duel.opponent_id === userId;
      if (!isChallenger && !isOpponent) return res.status(403).json({ error: 'You are not part of this duel.' });
      if (duel.status !== 'active') return res.status(400).json({ error: 'Duel is not active. It must be accepted first.' });

      // Check if user already answered
      const existingAnswers = await db.duelAnswers.findByDuelAndUser(id, userId);
      if (existingAnswers.length > 0) return res.status(400).json({ error: 'You have already submitted your answers.' });

      const questions = await db.duelQuestions.findByDuelId(id);
      if (questions.length === 0) return res.status(500).json({ error: 'No questions found for this duel.' });

      // Save answers
      let score = 0;
      for (const ans of answers) {
        const question = questions.find(q => q.id === ans.question_id);
        if (!question) continue;
        const isCorrect = ans.selected_option === question.correct_option_index;
        if (isCorrect) score++;
        await db.duelAnswers.create({
          duel_id: id,
          user_id: userId,
          question_id: ans.question_id,
          selected_option: ans.selected_option,
          is_correct: isCorrect
        });
      }

      // Update score on duel
      const scoreField = isChallenger ? 'challenger_score' : 'opponent_score';
      await db.duels.update(id, { [scoreField]: score });

      // Check if both players have answered now
      const allAnswers = await db.duelAnswers.findByDuelId(id);
      const challengerAnswers = allAnswers.filter(a => a.user_id === duel.challenger_id);
      const opponentAnswers = allAnswers.filter(a => a.user_id === duel.opponent_id);

      let completionData = null;
      if (challengerAnswers.length >= 5 && opponentAnswers.length >= 5) {
        // Both done — calculate winner
        const freshDuel = await db.duels.findById(id);
        const cScore = isChallenger ? score : freshDuel.challenger_score;
        const oScore = isOpponent ? score : freshDuel.opponent_score;

        let winnerId = null;
        let winnerOutcome = 'draw';
        if (cScore > oScore) { winnerId = duel.challenger_id; winnerOutcome = 'challenger'; }
        else if (oScore > cScore) { winnerId = duel.opponent_id; winnerOutcome = 'opponent'; }

        await db.duels.update(id, {
          status: 'completed',
          winner_id: winnerId,
          challenger_score: cScore,
          opponent_score: oScore
        });

        // Award / deduct XP and coins
        const xpStake = duel.xp_stake || 50;
        const coinStake = duel.coin_stake || 20;

        const challengerProfile = await db.profiles.findByUserId(duel.challenger_id);
        const opponentProfile = await db.profiles.findByUserId(duel.opponent_id);

        if (winnerOutcome === 'challenger') {
          await db.profiles.update(duel.challenger_id, {
            xp: (challengerProfile.xp || 0) + xpStake * 2,
            coins: (challengerProfile.coins || 0) + coinStake * 2
          });
          await db.profiles.update(duel.opponent_id, {
            xp: Math.max(0, (opponentProfile.xp || 0) - xpStake),
            coins: Math.max(0, (opponentProfile.coins || 0) - coinStake)
          });
        } else if (winnerOutcome === 'opponent') {
          await db.profiles.update(duel.opponent_id, {
            xp: (opponentProfile.xp || 0) + xpStake * 2,
            coins: (opponentProfile.coins || 0) + coinStake * 2
          });
          await db.profiles.update(duel.challenger_id, {
            xp: Math.max(0, (challengerProfile.xp || 0) - xpStake),
            coins: Math.max(0, (challengerProfile.coins || 0) - coinStake)
          });
        }
        // Draw: no transfer

        completionData = { winner_id: winnerId, challenger_score: cScore, opponent_score: oScore };
      }

      res.json({
        message: completionData ? 'Duel complete!' : 'Answers submitted! Waiting for opponent...',
        score,
        total: questions.length,
        completed: !!completionData,
        ...completionData
      });
    } catch (err) {
      console.error('submitAnswers error:', err);
      res.status(500).json({ error: 'Failed to submit answers.' });
    }
  },

  // GET /api/duels/:id/result
  async result(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const duel = await db.duels.findById(id);
      if (!duel) return res.status(404).json({ error: 'Duel not found.' });
      if (duel.challenger_id !== userId && duel.opponent_id !== userId) {
        return res.status(403).json({ error: 'Not your duel.' });
      }

      const questions = await db.duelQuestions.findByDuelId(id);
      const allAnswers = await db.duelAnswers.findByDuelId(id);

      const challenger = await db.users.findById(duel.challenger_id);
      const opponent = await db.users.findById(duel.opponent_id);
      const challengerProfile = await db.profiles.findByUserId(duel.challenger_id);
      const opponentProfile = await db.profiles.findByUserId(duel.opponent_id);

      res.json({
        duel,
        questions,
        answers: allAnswers,
        challenger: { ...challenger, profile: challengerProfile },
        opponent: { ...opponent, profile: opponentProfile }
      });
    } catch (err) {
      console.error('result error:', err);
      res.status(500).json({ error: 'Failed to fetch duel result.' });
    }
  },

  // GET /api/duels/history
  async history(req, res) {
    try {
      const userId = req.user.id;
      const duels = await db.duels.findHistory(userId);
      // Filter to completed/declined only
      const completed = duels.filter(d => d.status === 'completed' || d.status === 'declined' || d.status === 'expired');
      res.json({ duels: completed });
    } catch (err) {
      console.error('history error:', err);
      res.status(500).json({ error: 'Failed to fetch duel history.' });
    }
  },

  // GET /api/duels/pending
  async pending(req, res) {
    try {
      const userId = req.user.id;
      const duels = await db.duels.findPendingOrActive(userId);
      res.json({ duels });
    } catch (err) {
      console.error('pending error:', err);
      res.status(500).json({ error: 'Failed to fetch pending duels.' });
    }
  },

  // GET /api/duels/:id/questions
  async getQuestions(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const duel = await db.duels.findById(id);
      if (!duel) return res.status(404).json({ error: 'Duel not found.' });
      if (duel.challenger_id !== userId && duel.opponent_id !== userId) {
        return res.status(403).json({ error: 'Not your duel.' });
      }
      if (duel.status !== 'active') return res.status(400).json({ error: 'Duel is not active yet.' });

      // Check if user already answered
      const existingAnswers = await db.duelAnswers.findByDuelAndUser(id, userId);
      const alreadyAnswered = existingAnswers.length >= 5;

      const questions = await db.duelQuestions.findByDuelId(id);
      // Strip correct answers from questions
      const sanitized = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        question_order: q.question_order
      }));

      const challenger = await db.users.findById(duel.challenger_id);
      const opponent = await db.users.findById(duel.opponent_id);

      res.json({ duel, questions: sanitized, already_answered: alreadyAnswered, challenger, opponent });
    } catch (err) {
      console.error('getQuestions error:', err);
      res.status(500).json({ error: 'Failed to fetch duel questions.' });
    }
  }
};
