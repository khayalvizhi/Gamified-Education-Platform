import { db } from '../config/db.js';

export const gamificationService = {
  // Level Calculation: Level = Math.floor(xp / 500) + 1
  calculateLevel(xp) {
    const level = Math.floor(xp / 500) + 1;
    const progress = (xp % 500) / 500;
    return { level, progress };
  },

  // Calculate streak changes on activity (like attempt or login)
  async updateStreak(userId) {
    const profile = await db.profiles.findByUserId(userId);
    if (!profile) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    
    if (!profile.last_active_date) {
      // First active ever
      const updated = await db.profiles.update(userId, {
        streak_count: 1,
        last_active_date: todayStr
      });
      return { streak: 1, updatedCoins: 0 };
    }

    const lastActive = new Date(profile.last_active_date);
    const today = new Date(todayStr);
    
    // Reset hours to midnight for accurate day comparison
    lastActive.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const diffTime = Math.abs(today - lastActive);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let newStreak = profile.streak_count;
    let coinBonus = 0;

    if (diffDays === 1) {
      // Yesterday! Increment streak
      newStreak += 1;
      // Award daily login streak bonus: +10 coins per day (limit/cap at reasonable value or just +10 * newStreak/cap)
      // "Daily login streak: +10 coins per day"
      coinBonus = 10;
      
      await db.profiles.update(userId, {
        streak_count: newStreak,
        last_active_date: todayStr,
        coins: profile.coins + coinBonus
      });
    } else if (diffDays > 1) {
      // Streak broken. Reset to 1
      newStreak = 1;
      await db.profiles.update(userId, {
        streak_count: newStreak,
        last_active_date: todayStr
      });
    } else {
      // Same day (diffDays === 0). Streak unchanged
      // Just make sure active date is today
      await db.profiles.update(userId, {
        last_active_date: todayStr
      });
    }

    return { streak: newStreak, coinBonus };
  },

  // Award XP and coins for quiz completion
  async awardQuizRewards(userId, quiz, score, totalQuestions) {
    const profile = await db.profiles.findByUserId(userId);
    if (!profile) return null;

    // First update the streak
    const streakResult = await this.updateStreak(userId);
    const currentStreak = streakResult ? streakResult.streak : profile.streak_count;

    // Calculate base XP based on difficulty
    // Easy: +10 XP per correct answer
    // Medium: +20 XP per correct answer
    // Hard: +30 XP per correct answer
    let xpPerCorrect = 10;
    if (quiz.difficulty === 'medium') xpPerCorrect = 20;
    else if (quiz.difficulty === 'hard') xpPerCorrect = 30;

    let xpEarned = score * xpPerCorrect;

    // Streak bonus: multiply XP earned * 1.5 if streak >= 7 days
    let isStreakApplied = false;
    if (currentStreak >= 7) {
      xpEarned = Math.floor(xpEarned * 1.5);
      isStreakApplied = true;
    }

    // Coins Rules
    // Complete any quiz: +5 coins base
    // Score 100%: +15 bonus coins
    let coinsEarned = 5;
    if (score === totalQuestions && totalQuestions > 0) {
      coinsEarned += 15;
    }

    const newXp = profile.xp + xpEarned;
    const newCoins = profile.coins + coinsEarned + (streakResult ? streakResult.coinBonus : 0);
    const levelInfo = this.calculateLevel(newXp);

    const updatedProfile = await db.profiles.update(userId, {
      xp: newXp,
      coins: newCoins,
      level: levelInfo.level,
      total_quizzes_completed: profile.total_quizzes_completed + 1,
      correct_answers: profile.correct_answers + score
    });

    return {
      xp_earned: xpEarned,
      coins_earned: coinsEarned,
      streak_applied: isStreakApplied,
      current_streak: currentStreak,
      profile: updatedProfile
    };
  },

  // Award XP and coins for AI Battle
  async awardBattleRewards(userId, outcome) {
    // outcome: 'user', 'ai', 'draw'
    const profile = await db.profiles.findByUserId(userId);
    if (!profile) return null;

    // First update the streak
    const streakResult = await this.updateStreak(userId);
    const currentStreak = streakResult ? streakResult.streak : profile.streak_count;

    // XP Rules:
    // Winning AI battle: +100 XP
    // Drawing AI battle: +50 XP
    // Losing: +10 XP (grace/consolation XP)
    let xpEarned = 0;
    if (outcome === 'user') xpEarned = 100;
    else if (outcome === 'draw') xpEarned = 50;
    else xpEarned = 10; // Consolation XP

    // Streak bonus: multiply XP earned * 1.5 if streak >= 7 days
    let isStreakApplied = false;
    if (currentStreak >= 7) {
      xpEarned = Math.floor(xpEarned * 1.5);
      isStreakApplied = true;
    }

    // Coins Rules:
    // Win AI battle: +25 coins
    // Draw: +10 coins
    // Lose: +5 coins
    let coinsEarned = 0;
    if (outcome === 'user') coinsEarned = 25;
    else if (outcome === 'draw') coinsEarned = 10;
    else coinsEarned = 5;

    const newXp = profile.xp + xpEarned;
    const newCoins = profile.coins + coinsEarned + (streakResult ? streakResult.coinBonus : 0);
    const levelInfo = this.calculateLevel(newXp);

    const updatedProfile = await db.profiles.update(userId, {
      xp: newXp,
      coins: newCoins,
      level: levelInfo.level
    });

    return {
      xp_earned: xpEarned,
      coins_earned: coinsEarned,
      streak_applied: isStreakApplied,
      current_streak: currentStreak,
      profile: updatedProfile
    };
  }
};
