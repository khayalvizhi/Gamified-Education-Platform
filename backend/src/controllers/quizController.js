import { db } from '../config/db.js';
import { gamificationService } from '../services/gamificationService.js';

export const quizController = {
  // List all quizzes
  async getAllQuizzes(req, res) {
    const { topic, difficulty } = req.query;
    try {
      const quizzes = await db.quizzes.findAll({ topic, difficulty });
      res.json(quizzes);
    } catch (err) {
      console.error('Get quizzes error:', err);
      res.status(500).json({ error: 'Failed to retrieve quizzes.' });
    }
  },

  // Get quiz with questions
  async getQuizById(req, res) {
    const { id } = req.params;
    try {
      const quiz = await db.quizzes.findById(id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found.' });
      }

      const questions = await db.questions.findByQuizId(id);
      
      // Clean up sensitive fields if any (e.g. correct_option_index might be needed by client to check correctness, but let's send it. Typically for security you verify on server, which we do in /attempt endpoint!)
      res.json({
        ...quiz,
        questions
      });
    } catch (err) {
      console.error('Get quiz details error:', err);
      res.status(500).json({ error: 'Failed to retrieve quiz details.' });
    }
  },

  // Create quiz (user or system)
  async createQuiz(req, res) {
    const { title, topic, difficulty, questions } = req.body;

    if (!title || !topic || !difficulty || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title, topic, difficulty, and questions are required.' });
    }

    try {
      const quiz = await db.quizzes.create({
        title,
        topic,
        difficulty,
        created_by: req.user.id,
        is_ai_battle: false
      });

      const createdQuestions = [];
      for (const q of questions) {
        const newQ = await db.questions.create({
          quiz_id: quiz.id,
          question_text: q.question_text,
          options: q.options,
          correct_option_index: q.correct_option_index,
          explanation: q.explanation || ''
        });
        createdQuestions.push(newQ);
      }

      res.status(201).json({
        message: 'Quiz created successfully!',
        quiz: {
          ...quiz,
          questions: createdQuestions
        }
      });
    } catch (err) {
      console.error('Create quiz error:', err);
      res.status(500).json({ error: 'Failed to create quiz.' });
    }
  },

  // Submit attempt
  async submitAttempt(req, res) {
    const { id } = req.params;
    const { answers } = req.body; // array of indexes user picked [1, 0, 3, 2, ...]

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array of selected option indexes.' });
    }

    try {
      const quiz = await db.quizzes.findById(id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found.' });
      }

      const questions = await db.questions.findByQuizId(id);
      if (questions.length === 0) {
        return res.status(400).json({ error: 'This quiz has no questions.' });
      }

      // Calculate score
      let score = 0;
      const questionResults = questions.map((q, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === q.correct_option_index;
        if (isCorrect) score += 1;
        
        return {
          question_id: q.id,
          question_text: q.question_text,
          options: q.options,
          user_answer: userAnswer,
          correct_answer: q.correct_option_index,
          is_correct: isCorrect,
          explanation: q.explanation
        };
      });

      // Award XP and coins
      const rewards = await gamificationService.awardQuizRewards(req.user.id, quiz, score, questions.length);

      // Create attempt record
      await db.quizAttempts.create({
        user_id: req.user.id,
        quiz_id: quiz.id,
        score,
        total_questions: questions.length,
        xp_earned: rewards.xp_earned,
        coins_earned: rewards.coins_earned
      });

      res.json({
        score,
        total_questions: questions.length,
        xp_earned: rewards.xp_earned,
        coins_earned: rewards.coins_earned,
        streak_applied: rewards.streak_applied,
        current_streak: rewards.current_streak,
        results: questionResults
      });
    } catch (err) {
      console.error('Submit attempt error:', err);
      res.status(500).json({ error: 'Failed to submit quiz attempt.' });
    }
  }
};
