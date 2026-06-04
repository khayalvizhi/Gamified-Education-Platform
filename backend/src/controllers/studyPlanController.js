import { db } from '../config/db.js';
import Groq from 'groq-sdk';

let groqClient = null;
function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

async function generateStudyPlanFromGroq(preferences) {
  const client = getGroqClient();
  if (!client) {
    return generateFallbackStudyPlan(preferences);
  }

  const prompt = `You are an expert academic study planner. Create a detailed weekly study plan for a student with these preferences:
- Goal: ${preferences.goal}
- Subjects: ${preferences.subjects.join(', ')}
- Daily available hours: ${preferences.daily_hours}
- Days until exam: ${preferences.days_until_exam}
- Weak topics: ${preferences.weak_topics.join(', ') || 'None specified'}
- Strong topics: ${preferences.strong_topics.join(', ') || 'None specified'}
- Preferred study time: ${preferences.preferred_time}
- Study style: ${preferences.study_style}

Return ONLY a raw JSON object, no markdown, no backticks:
{"weeks":[{"week_number":1,"theme":"Foundation Building","days":[{"day":1,"day_name":"Monday","sessions":[{"subject":"","topic":"","duration_minutes":60,"activity":"Read + Notes","tips":""}],"total_hours":2}]}],"overview":"Brief summary","weekly_goals":["goal1"],"tips":["tip1"]}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 3000
    });

    let content = completion.choices[0]?.message?.content || '';
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const plan = JSON.parse(content);
    return plan;
  } catch (err) {
    console.error('Groq study plan generation failed:', err.message);
    return generateFallbackStudyPlan(preferences);
  }
}

function generateFallbackStudyPlan(preferences) {
  const subjects = preferences.subjects || ['General Studies'];
  const dailyHours = preferences.daily_hours || 2;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Build a progression of activities per day
  const dayActivities = [
    'Read + Notes',
    'Practice Problems',
    'Concept Deep Dive',
    'Worked Examples',
    'Self Quiz',
    'Revision',
    'Mock Test'
  ];

  // Build unique topic progressions per subject
  const topicProgressions = {
    'default': ['Fundamentals', 'Core Concepts', 'Problem Solving', 'Advanced Techniques', 'Practice Drills', 'Review & Reflect', 'Mock Assessment']
  };

  const weakTopics = preferences.weak_topics || [];
  const sessionDuration = Math.floor((dailyHours * 60) / Math.max(subjects.length, 1));

  return {
    weeks: [
      {
        week_number: 1,
        theme: 'Foundation Building',
        days: days.map((dayName, dayIdx) => ({
          day: dayIdx + 1,
          day_name: dayName,
          sessions: subjects.map((subject, sIdx) => {
            // Each day × subject gets a unique combination
            const progression = topicProgressions['default'];
            const progressionTopic = progression[dayIdx % progression.length];
            // Prefer weak_topics for Monday & Tuesday; use progression otherwise
            const weakTopic = weakTopics[sIdx];
            const topic = dayIdx < 2 && weakTopic
              ? `${weakTopic} — ${progressionTopic}`
              : `${subject}: ${progressionTopic}`;

            return {
              subject,
              topic,
              duration_minutes: sessionDuration,
              activity: dayActivities[dayIdx % dayActivities.length],
              tips: dayIdx < 2
                ? `Concentrate on your weak area: "${weakTopic || subject}". Build understanding before speed.`
                : `Day ${dayIdx + 1} progression: ${progressionTopic}. Challenge yourself to go beyond basics.`
            };
          }),
          total_hours: dailyHours
        }))
      }
    ],
    overview: `A ${preferences.study_style} 7-day study plan for: ${preferences.goal}. Subjects covered: ${subjects.join(', ')}.`,
    weekly_goals: [
      `Complete foundation review of all ${subjects.length} subject(s)`,
      'Identify and reduce knowledge gaps in weak topics',
      'Build a consistent daily study habit across all 7 days'
    ],
    tips: [
      `Study during ${preferences.preferred_time} when you are most alert.`,
      'Take a 10-minute break every 50 minutes (Pomodoro technique).',
      'Review your notes before sleeping to improve long-term retention.',
      `Spend extra time on: ${weakTopics.join(', ') || 'topics you find difficult'}.`
    ]
  };
}

export const studyPlanController = {
  // POST /api/study-plan/preferences
  async savePreferences(req, res) {
    try {
      const userId = req.user.id;
      const { goal, subjects, daily_hours, days_until_exam, weak_topics, strong_topics, preferred_time, study_style } = req.body;

      if (!goal || !subjects || !daily_hours || !days_until_exam || !preferred_time || !study_style) {
        return res.status(400).json({ error: 'All preference fields are required.' });
      }

      const prefs = await db.studyPlanPreferences.upsert(userId, {
        goal,
        subjects: Array.isArray(subjects) ? subjects : [subjects],
        daily_hours: parseInt(daily_hours),
        days_until_exam: parseInt(days_until_exam),
        weak_topics: Array.isArray(weak_topics) ? weak_topics : (weak_topics ? [weak_topics] : []),
        strong_topics: Array.isArray(strong_topics) ? strong_topics : (strong_topics ? [strong_topics] : []),
        preferred_time,
        study_style
      });

      res.json({ message: 'Preferences saved!', preferences: prefs });
    } catch (err) {
      console.error('savePreferences error:', err);
      res.status(500).json({ error: 'Failed to save preferences.' });
    }
  },

  // GET /api/study-plan/preferences
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      const prefs = await db.studyPlanPreferences.findByUserId(userId);
      if (!prefs) return res.status(404).json({ error: 'No preferences found. Please complete the setup wizard.' });
      res.json({ preferences: prefs });
    } catch (err) {
      console.error('getPreferences error:', err);
      res.status(500).json({ error: 'Failed to fetch preferences.' });
    }
  },

  // POST /api/study-plan/generate
  async generatePlan(req, res) {
    try {
      const userId = req.user.id;
      const prefs = await db.studyPlanPreferences.findByUserId(userId);
      if (!prefs) return res.status(400).json({ error: 'Please save your preferences first.' });

      const planContent = await generateStudyPlanFromGroq(prefs);
      const plan = await db.studyPlans.create(userId, prefs.id, planContent, 1);

      // Create progress entries for each session
      let sessionIdx = 0;
      if (planContent.weeks && planContent.weeks.length > 0) {
        const week = planContent.weeks[0];
        for (const day of week.days) {
          for (const session of day.sessions) {
            await db.studyPlanProgress.create({
              plan_id: plan.id,
              user_id: userId,
              day_number: day.day,
              session_index: sessionIdx++,
              subject: session.subject,
              topic: session.topic
            });
          }
        }
      }

      res.json({ message: 'Study plan generated!', plan });
    } catch (err) {
      console.error('generatePlan error:', err);
      res.status(500).json({ error: 'Failed to generate study plan.' });
    }
  },

  // GET /api/study-plan/active
  async getActivePlan(req, res) {
    try {
      const userId = req.user.id;
      const plan = await db.studyPlans.findActiveByUserId(userId);
      if (!plan) return res.status(404).json({ error: 'No active study plan. Please generate one.' });

      const progress = await db.studyPlanProgress.findByPlanId(plan.id);
      const totalSessions = progress.length;
      const completedSessions = progress.filter(p => p.is_completed).length;

      res.json({
        plan,
        progress,
        stats: {
          total: totalSessions,
          completed: completedSessions,
          percentage: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
        }
      });
    } catch (err) {
      console.error('getActivePlan error:', err);
      res.status(500).json({ error: 'Failed to fetch active study plan.' });
    }
  },

  // PATCH /api/study-plan/progress/:progressId
  async markProgress(req, res) {
    try {
      const userId = req.user.id;
      const { progressId } = req.params;

      const progressItem = await db.studyPlanProgress.findById(progressId);
      if (!progressItem) return res.status(404).json({ error: 'Progress item not found.' });
      if (String(progressItem.user_id) !== String(userId)) return res.status(403).json({ error: 'Not your progress item.' });
      if (progressItem.is_completed) return res.status(400).json({ error: 'Already completed.' });

      await db.studyPlanProgress.markComplete(progressId);

      // Award 15 XP + 5 coins
      const profile = await db.profiles.findByUserId(userId);
      if (profile) {
        const newXp = (profile.xp || 0) + 15;
        const newCoins = (profile.coins || 0) + 5;
        const newLevel = Math.floor(newXp / 500) + 1;
        await db.profiles.update(userId, { xp: newXp, coins: newCoins, level: newLevel });
      }

      res.json({ message: 'Session marked complete! +15 XP +5 Coins', xp_earned: 15, coins_earned: 5 });
    } catch (err) {
      console.error('markProgress error:', err);
      res.status(500).json({ error: 'Failed to mark progress.' });
    }
  },

  // POST /api/study-plan/regenerate
  async regeneratePlan(req, res) {
    try {
      const userId = req.user.id;
      const prefs = await db.studyPlanPreferences.findByUserId(userId);
      if (!prefs) return res.status(400).json({ error: 'Please save your preferences first.' });

      const planContent = await generateStudyPlanFromGroq(prefs);
      const plan = await db.studyPlans.create(userId, prefs.id, planContent, 1);

      // Create progress entries
      let sessionIdx = 0;
      if (planContent.weeks && planContent.weeks.length > 0) {
        const week = planContent.weeks[0];
        for (const day of week.days) {
          for (const session of day.sessions) {
            await db.studyPlanProgress.create({
              plan_id: plan.id,
              user_id: userId,
              day_number: day.day,
              session_index: sessionIdx++,
              subject: session.subject,
              topic: session.topic
            });
          }
        }
      }

      res.json({ message: 'Study plan regenerated!', plan });
    } catch (err) {
      console.error('regeneratePlan error:', err);
      res.status(500).json({ error: 'Failed to regenerate study plan.' });
    }
  }
};
