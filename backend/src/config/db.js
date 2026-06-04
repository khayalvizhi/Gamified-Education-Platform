import knex from 'knex';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_JSON_PATH = path.resolve('db.json');

// Memory state for fallback
let memoryDb = {
  users: [],
  profiles: [],
  quizzes: [],
  questions: [],
  quiz_attempts: [],
  ai_battles: [],
  avatars: [],
  user_avatars: [],
  duels: [],
  duel_questions: [],
  duel_answers: [],
  study_plan_preferences: [],
  study_plans: [],
  study_plan_progress: []
};

// Load persistent JSON DB if exists
const loadJsonDb = () => {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const data = fs.readFileSync(DB_JSON_PATH, 'utf8');
      const loaded = JSON.parse(data);
      // Ensure all arrays are initialized
      memoryDb = {
        users: loaded.users || [],
        profiles: loaded.profiles || [],
        quizzes: loaded.quizzes || [],
        questions: loaded.questions || [],
        quiz_attempts: loaded.quiz_attempts || [],
        ai_battles: loaded.ai_battles || [],
        avatars: loaded.avatars || [],
        user_avatars: loaded.user_avatars || [],
        duels: loaded.duels || [],
        duel_questions: loaded.duel_questions || [],
        duel_answers: loaded.duel_answers || [],
        study_plan_preferences: loaded.study_plan_preferences || [],
        study_plans: loaded.study_plans || [],
        study_plan_progress: loaded.study_plan_progress || []
      };
    } else {
      saveJsonDb();
    }
  } catch (err) {
    console.error('Failed to load JSON database:', err);
  }
};

const saveJsonDb = () => {
  try {
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(memoryDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save JSON database:', err);
  }
};

export let usePg = false;
export let pgClient = null;

// Initialize Database connection
export async function initDb() {
  if (process.env.DATABASE_URL) {
    try {
      console.log('Attempting to connect to PostgreSQL...');
      pgClient = knex({
        client: 'pg',
        connection: process.env.DATABASE_URL,
        pool: { min: 1, max: 10 }
      });
      // Test connection
      await pgClient.raw('SELECT 1');
      usePg = true;
      console.log('Successfully connected to PostgreSQL.');
      await createPgSchema();
      await seedDbIfEmpty();
      return;
    } catch (err) {
      console.warn('PostgreSQL connection failed. Warning:', err.message);
      console.warn('Switching to file-based JSON DB fallback.');
    }
  } else {
    console.warn('DATABASE_URL is missing. Switching to file-based JSON DB fallback.');
  }

  loadJsonDb();
  await seedDbIfEmpty();
}

async function createPgSchema() {
  // Create schemas if not exists
  const hasUsers = await pgClient.schema.hasTable('users');
  if (!hasUsers) {
    await pgClient.schema.createTable('users', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.string('username').unique().notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('avatar_url');
      table.timestamp('created_at').defaultTo(pgClient.fn.now());
    });
  }

  const hasProfiles = await pgClient.schema.hasTable('profiles');
  if (!hasProfiles) {
    await pgClient.schema.createTable('profiles', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
      table.integer('xp').defaultTo(0);
      table.integer('coins').defaultTo(0);
      table.integer('level').defaultTo(1);
      table.integer('streak_count').defaultTo(0);
      table.date('last_active_date');
      table.integer('total_quizzes_completed').defaultTo(0);
      table.integer('correct_answers').defaultTo(0);
    });
  }

  const hasQuizzes = await pgClient.schema.hasTable('quizzes');
  if (!hasQuizzes) {
    await pgClient.schema.createTable('quizzes', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.string('title').notNullable();
      table.string('topic').notNullable();
      table.string('difficulty').notNullable(); // easy, medium, hard
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.boolean('is_ai_battle').defaultTo(false);
      table.timestamp('created_at').defaultTo(pgClient.fn.now());
    });
  }

  const hasQuestions = await pgClient.schema.hasTable('questions');
  if (!hasQuestions) {
    await pgClient.schema.createTable('questions', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('quiz_id').references('id').inTable('quizzes').onDelete('CASCADE');
      table.text('question_text').notNullable();
      table.jsonb('options').notNullable();
      table.integer('correct_option_index').notNullable();
      table.text('explanation');
    });
  }

  const hasAttempts = await pgClient.schema.hasTable('quiz_attempts');
  if (!hasAttempts) {
    await pgClient.schema.createTable('quiz_attempts', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('quiz_id').references('id').inTable('quizzes').onDelete('CASCADE');
      table.integer('score').notNullable();
      table.integer('total_questions').notNullable();
      table.integer('xp_earned').notNullable();
      table.integer('coins_earned').notNullable();
      table.timestamp('completed_at').defaultTo(pgClient.fn.now());
    });
  }

  const hasAiBattles = await pgClient.schema.hasTable('ai_battles');
  if (!hasAiBattles) {
    await pgClient.schema.createTable('ai_battles', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('topic').notNullable();
      table.string('difficulty').notNullable();
      table.integer('user_score').defaultTo(0);
      table.integer('ai_score').defaultTo(0);
      table.string('winner'); // user, ai, draw
      table.jsonb('rounds').notNullable();
      table.integer('xp_earned').defaultTo(0);
      table.timestamp('completed_at').defaultTo(pgClient.fn.now());
    });
  }

  const hasAvatars = await pgClient.schema.hasTable('avatars');
  if (!hasAvatars) {
    await pgClient.schema.createTable('avatars', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('image_url').notNullable();
      table.integer('price').notNullable();
      table.string('rarity').notNullable(); // common, rare, legendary
      table.boolean('is_custom_nameable').defaultTo(false);
      table.timestamp('created_at').defaultTo(pgClient.fn.now());
    });
  }

  const hasUserAvatars = await pgClient.schema.hasTable('user_avatars');
  if (!hasUserAvatars) {
    await pgClient.schema.createTable('user_avatars', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('avatar_id').references('id').inTable('avatars').onDelete('CASCADE');
      table.string('custom_name').nullable();
      table.timestamp('purchased_at').defaultTo(pgClient.fn.now());
    });
  }

  // Add custom_name column if it doesn't exist (migration for existing DBs)
  const hasCustomName = await pgClient.schema.hasColumn('user_avatars', 'custom_name');
  if (!hasCustomName) {
    await pgClient.schema.alterTable('user_avatars', table => {
      table.string('custom_name').nullable();
    });
  }

  const hasDuels = await pgClient.schema.hasTable('duels');
  if (!hasDuels) {
    await pgClient.schema.createTable('duels', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('challenger_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('opponent_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('topic').notNullable();
      table.string('difficulty').notNullable(); // easy, medium, hard
      table.string('status').defaultTo('pending'); // pending, active, completed, declined, expired
      table.uuid('winner_id').references('id').inTable('users').onDelete('SET NULL');
      table.integer('challenger_score').defaultTo(0);
      table.integer('opponent_score').defaultTo(0);
      table.integer('xp_stake').defaultTo(50);
      table.integer('coin_stake').defaultTo(20);
      table.timestamp('expires_at').notNullable();
      table.timestamp('created_at').defaultTo(pgClient.fn.now());
    });
  }

  const hasDuelQuestions = await pgClient.schema.hasTable('duel_questions');
  if (!hasDuelQuestions) {
    await pgClient.schema.createTable('duel_questions', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('duel_id').references('id').inTable('duels').onDelete('CASCADE');
      table.text('question_text').notNullable();
      table.jsonb('options').notNullable();
      table.integer('correct_option_index').notNullable();
      table.integer('question_order').notNullable();
    });
  }

  const hasDuelAnswers = await pgClient.schema.hasTable('duel_answers');
  if (!hasDuelAnswers) {
    await pgClient.schema.createTable('duel_answers', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('duel_id').references('id').inTable('duels').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('question_id').references('id').inTable('duel_questions').onDelete('CASCADE');
      table.integer('selected_option').notNullable();
      table.boolean('is_correct').notNullable();
      table.timestamp('answered_at').defaultTo(pgClient.fn.now());
    });
  }

  const hasStudyPreferences = await pgClient.schema.hasTable('study_plan_preferences');
  if (!hasStudyPreferences) {
    await pgClient.schema.createTable('study_plan_preferences', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
      table.string('goal').notNullable();
      table.jsonb('subjects').notNullable();
      table.integer('daily_hours').notNullable();
      table.integer('days_until_exam').notNullable();
      table.jsonb('weak_topics').notNullable();
      table.jsonb('strong_topics').notNullable();
      table.string('preferred_time').notNullable(); // morning, afternoon, evening, night
      table.string('study_style').notNullable(); // intensive, balanced, relaxed
      table.timestamp('created_at').defaultTo(pgClient.fn.now());
      table.timestamp('updated_at').defaultTo(pgClient.fn.now());
    });
  }

  const hasStudyPlans = await pgClient.schema.hasTable('study_plans');
  if (!hasStudyPlans) {
    await pgClient.schema.createTable('study_plans', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('preference_id').references('id').inTable('study_plan_preferences').onDelete('CASCADE');
      table.jsonb('plan_content').notNullable();
      table.integer('week_number').defaultTo(1);
      table.boolean('is_active').defaultTo(true);
      table.timestamp('generated_at').defaultTo(pgClient.fn.now());
    });
  }

  const hasStudyProgress = await pgClient.schema.hasTable('study_plan_progress');
  if (!hasStudyProgress) {
    await pgClient.schema.createTable('study_plan_progress', table => {
      table.uuid('id').primary().defaultTo(pgClient.raw('gen_random_uuid()'));
      table.uuid('plan_id').references('id').inTable('study_plans').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('day_number').notNullable();
      table.string('subject').notNullable();
      table.string('topic').notNullable();
      table.boolean('is_completed').defaultTo(false);
      table.timestamp('completed_at');
      table.integer('session_index').defaultTo(0);
    });
  } else {
    const hasCol = await pgClient.schema.hasColumn('study_plan_progress', 'session_index');
    if (!hasCol) {
      await pgClient.schema.alterTable('study_plan_progress', table => {
        table.integer('session_index').defaultTo(0);
      });
    }
  }
}

// 5 sample quizzes with 5 questions each
const SEED_QUIZZES = [
  {
    title: "Mighty Math Quest",
    topic: "Math",
    difficulty: "medium",
    questions: [
      { question_text: "What is the value of x if 3x + 7 = 22?", options: ["3", "5", "7", "15"], correct_option_index: 1, explanation: "3x = 22 - 7 => 3x = 15 => x = 5." },
      { question_text: "What is the square root of 144?", options: ["10", "11", "12", "14"], correct_option_index: 2, explanation: "12 * 12 = 144." },
      { question_text: "What is the area of a circle with a radius of 7? (Use pi = 22/7)", options: ["154", "44", "49", "98"], correct_option_index: 0, explanation: "Area = pi * r^2 = 22/7 * 7 * 7 = 154." },
      { question_text: "Which of these is a prime number?", options: ["9", "15", "21", "29"], correct_option_index: 3, explanation: "29 has no divisors other than 1 and itself." },
      { question_text: "What is the next number in the Fibonacci sequence: 1, 1, 2, 3, 5, 8, ...?", options: ["10", "12", "13", "15"], correct_option_index: 2, explanation: "5 + 8 = 13." }
    ]
  },
  {
    title: "Cosmic Science Explorer",
    topic: "Science",
    difficulty: "easy",
    questions: [
      { question_text: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct_option_index: 1, explanation: "Mars has iron oxide (rust) on its surface, giving it a red appearance." },
      { question_text: "What is the chemical symbol for Water?", options: ["H2O", "CO2", "O2", "NaCl"], correct_option_index: 0, explanation: "Water is composed of two hydrogen atoms and one oxygen atom." },
      { question_text: "What gas do humans need to breathe in to survive?", options: ["Carbon Dioxide", "Oxygen", "Nitrogen", "Helium"], correct_option_index: 1, explanation: "Oxygen is critical for aerobic respiration in human cells." },
      { question_text: "What is the center of an atom called?", options: ["Proton", "Electron", "Nucleus", "Neutron"], correct_option_index: 2, explanation: "The nucleus is the small, dense region consisting of protons and neutrons at the center of an atom." },
      { question_text: "Which of these animals is a mammal?", options: ["Shark", "Dolphin", "Eagle", "Frog"], correct_option_index: 1, explanation: "Dolphins are warm-blooded mammals that breathe air and nurse their young." }
    ]
  },
  {
    title: "Chronicles of History",
    topic: "History",
    difficulty: "hard",
    questions: [
      { question_text: "In which year did the Titanic sink?", options: ["1908", "1912", "1915", "1920"], correct_option_index: 1, explanation: "The Titanic sank on April 15, 1912, during its maiden voyage." },
      { question_text: "Who was the first Emperor of Rome?", options: ["Julius Caesar", "Augustus", "Nero", "Marcus Aurelius"], correct_option_index: 1, explanation: "Augustus Caesar (Octavian) became the first Emperor of the Roman Empire in 27 BC." },
      { question_text: "Which ancient civilization built the Machu Picchu complex?", options: ["Aztecs", "Mayans", "Incas", "Egyptians"], correct_option_index: 2, explanation: "The Incas built Machu Picchu high in the Andes mountains of Peru." },
      { question_text: "The Magna Carta was signed by which King of England?", options: ["King John", "King Henry VIII", "King Richard I", "King George III"], correct_option_index: 0, explanation: "King John signed the Magna Carta in 1215 at Runnymede." },
      { question_text: "Who was the prime minister of the United Kingdom during most of World War II?", options: ["Neville Chamberlain", "Winston Churchill", "Clement Attlee", "Harold Macmillan"], correct_option_index: 1, explanation: "Winston Churchill led Great Britain from 1940 to 1945 during World War II." }
    ]
  },
  {
    title: "Atlas Odyssey",
    topic: "Geography",
    difficulty: "medium",
    questions: [
      { question_text: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correct_option_index: 2, explanation: "Canberra was selected as the capital in 1908 as a compromise between Sydney and Melbourne." },
      { question_text: "Which is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correct_option_index: 1, explanation: "The Nile River is traditionally considered the longest river in the world, spanning 6,650 km." },
      { question_text: "Which desert is the largest hot desert in the world?", options: ["Gobi", "Sahara", "Kalahari", "Atacama"], correct_option_index: 1, explanation: "The Sahara Desert in Africa covers over 9 million square kilometers." },
      { question_text: "In which country is Mount Kilimanjaro located?", options: ["Kenya", "Tanzania", "Ethiopia", "Uganda"], correct_option_index: 1, explanation: "Mount Kilimanjaro is a dormant volcano in Tanzania and the highest mountain in Africa." },
      { question_text: "Which ocean is the largest on Earth?", options: ["Atlantic Ocean", "Indian Ocean", "Southern Ocean", "Pacific Ocean"], correct_option_index: 3, explanation: "The Pacific Ocean covers more than 30% of the Earth's surface." }
    ]
  },
  {
    title: "The Ultimate Sage Trivia",
    topic: "General Knowledge",
    difficulty: "easy",
    questions: [
      { question_text: "How many bones are in an adult human body?", options: ["156", "206", "256", "306"], correct_option_index: 1, explanation: "An adult human body has 206 bones, whereas infants have around 270." },
      { question_text: "What is the currency of Japan?", options: ["Won", "Yen", "Yuan", "Ringgit"], correct_option_index: 1, explanation: "The Yen is the official currency of Japan." },
      { question_text: "Which country is famous for the Eiffel Tower?", options: ["Italy", "Germany", "United Kingdom", "France"], correct_option_index: 3, explanation: "The Eiffel Tower is located in Paris, France." },
      { question_text: "How many colors are in a standard rainbow?", options: ["5", "6", "7", "8"], correct_option_index: 2, explanation: "A rainbow has 7 colors: Red, Orange, Yellow, Green, Blue, Indigo, and Violet." },
      { question_text: "Which of these is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Quartz"], correct_option_index: 2, explanation: "Diamond is carbon arranged in a covalent tetrahedral structure, making it extremely hard." }
    ]
  }
];

async function seedDbIfEmpty() {
  if (usePg) {
    const quizCount = await pgClient('quizzes').count('* as count').first();
    if (parseInt(quizCount.count) === 0) {
      console.log('Seeding database with sample quizzes...');
      for (const sq of SEED_QUIZZES) {
        const [quiz] = await pgClient('quizzes').insert({
          title: sq.title,
          topic: sq.topic,
          difficulty: sq.difficulty,
          is_ai_battle: false
        }).returning('*');

        for (const q of sq.questions) {
          await pgClient('questions').insert({
            quiz_id: quiz.id,
            question_text: q.question_text,
            options: JSON.stringify(q.options),
            correct_option_index: q.correct_option_index,
            explanation: q.explanation
          });
        }
      }
      console.log('Database seeded.');
    }
  } else {
    if (memoryDb.quizzes.length === 0) {
      console.log('Seeding local JSON database with sample quizzes...');
      for (const sq of SEED_QUIZZES) {
        const quizId = crypto.randomUUID();
        const quiz = {
          id: quizId,
          title: sq.title,
          topic: sq.topic,
          difficulty: sq.difficulty,
          created_by: null,
          is_ai_battle: false,
          created_at: new Date().toISOString()
        };
        memoryDb.quizzes.push(quiz);

        for (const q of sq.questions) {
          memoryDb.questions.push({
            id: crypto.randomUUID(),
            quiz_id: quizId,
            question_text: q.question_text,
            options: q.options,
            correct_option_index: q.correct_option_index,
            explanation: q.explanation
          });
        }
      }
      saveJsonDb();
      console.log('Local JSON Database seeded.');
    }
  }

  // Seed Avatars
  const SEED_AVATARS = [
    { name: "Nova the Curious", price: 50, rarity: "common", is_custom_nameable: false },
    { name: "Blaze the Bold", price: 50, rarity: "common", is_custom_nameable: false },
    { name: "Luna the Wise", price: 75, rarity: "common", is_custom_nameable: false },
    { name: "Pixel the Coder", price: 75, rarity: "common", is_custom_nameable: false },
    { name: "Zara the Explorer", price: 100, rarity: "common", is_custom_nameable: false },
    { name: "Echo the Thinker", price: 100, rarity: "common", is_custom_nameable: false },
    { name: "Titan the Achiever", price: 150, rarity: "rare", is_custom_nameable: false },
    { name: "Ivy the Scholar", price: 150, rarity: "rare", is_custom_nameable: false },
    { name: "Orion the Champion", price: 200, rarity: "rare", is_custom_nameable: false },
    { name: "Phoenix the Legend", price: 250, rarity: "rare", is_custom_nameable: false },
    { name: "Cosmos the Guardian", price: 300, rarity: "legendary", is_custom_nameable: false },
    { name: "★ The Scholar (Custom)", price: 500, rarity: "legendary", is_custom_nameable: true }
  ];

  if (usePg) {
    const avatarCount = await pgClient('avatars').count('* as count').first();
    if (parseInt(avatarCount.count) === 0) {
      console.log('Seeding database with avatars...');
      for (const sa of SEED_AVATARS) {
        const imageUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sa.name)}`;
        await pgClient('avatars').insert({
          name: sa.name,
          price: sa.price,
          rarity: sa.rarity,
          is_custom_nameable: sa.is_custom_nameable,
          image_url: imageUrl
        });
      }
      console.log('Avatars seeded in PG.');
    }
  } else {
    if (!memoryDb.avatars || memoryDb.avatars.length === 0) {
      console.log('Seeding local JSON database with avatars...');
      memoryDb.avatars = [];
      for (const sa of SEED_AVATARS) {
        const imageUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sa.name)}`;
        memoryDb.avatars.push({
          id: crypto.randomUUID(),
          name: sa.name,
          price: sa.price,
          rarity: sa.rarity,
          is_custom_nameable: sa.is_custom_nameable,
          image_url: imageUrl,
          created_at: new Date().toISOString()
        });
      }
      saveJsonDb();
      console.log('Local JSON database seeded with avatars.');
    }
  }
}

// DB Wrapper Object mapping methods identically
export const db = {
  users: {
    async findByEmail(email) {
      if (usePg) {
        return await pgClient('users').where({ email }).first();
      }
      return memoryDb.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },
    async findByUsername(username) {
      if (usePg) {
        return await pgClient('users').where({ username }).first();
      }
      return memoryDb.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
    },
    async findById(id) {
      if (usePg) {
        return await pgClient('users').where({ id }).first();
      }
      return memoryDb.users.find(u => u.id === id) || null;
    },
    async create(user) {
      const id = crypto.randomUUID();
      const newUser = {
        id,
        username: user.username,
        email: user.email,
        password_hash: user.password_hash,
        avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`,
        created_at: new Date().toISOString()
      };
      if (usePg) {
        const [created] = await pgClient('users').insert(newUser).returning('*');
        return created;
      }
      memoryDb.users.push(newUser);
      saveJsonDb();
      return newUser;
    },
    async updateAvatarUrl(id, avatarUrl) {
      if (usePg) {
        const [updated] = await pgClient('users').where({ id }).update({ avatar_url: avatarUrl }).returning('*');
        return updated;
      }
      const idx = memoryDb.users.findIndex(u => u.id === id);
      if (idx !== -1) {
        memoryDb.users[idx].avatar_url = avatarUrl;
        saveJsonDb();
        return memoryDb.users[idx];
      }
      return null;
    }
  },

  profiles: {
    async findByUserId(userId) {
      if (usePg) {
        return await pgClient('profiles').where({ user_id: userId }).first();
      }
      return memoryDb.profiles.find(p => p.user_id === userId) || null;
    },
    async create(profile) {
      const id = crypto.randomUUID();
      const newProfile = {
        id,
        user_id: profile.user_id,
        xp: profile.xp || 0,
        coins: profile.coins || 0,
        level: profile.level || 1,
        streak_count: profile.streak_count || 0,
        last_active_date: profile.last_active_date || null,
        total_quizzes_completed: profile.total_quizzes_completed || 0,
        correct_answers: profile.correct_answers || 0
      };
      if (usePg) {
        const [created] = await pgClient('profiles').insert(newProfile).returning('*');
        return created;
      }
      memoryDb.profiles.push(newProfile);
      saveJsonDb();
      return newProfile;
    },
    async update(userId, data) {
      if (usePg) {
        const [updated] = await pgClient('profiles')
          .where({ user_id: userId })
          .update(data)
          .returning('*');
        return updated;
      }
      const idx = memoryDb.profiles.findIndex(p => p.user_id === userId);
      if (idx !== -1) {
        memoryDb.profiles[idx] = { ...memoryDb.profiles[idx], ...data };
        saveJsonDb();
        return memoryDb.profiles[idx];
      }
      return null;
    }
  },

  quizzes: {
    async findAll(filters = {}) {
      if (usePg) {
        let q = pgClient('quizzes');
        if (filters.topic) q = q.where({ topic: filters.topic });
        if (filters.difficulty) q = q.where({ difficulty: filters.difficulty });
        return await q.select('*');
      }
      let list = memoryDb.quizzes;
      if (filters.topic) {
        list = list.filter(q => q.topic.toLowerCase() === filters.topic.toLowerCase());
      }
      if (filters.difficulty) {
        list = list.filter(q => q.difficulty.toLowerCase() === filters.difficulty.toLowerCase());
      }
      return list;
    },
    async findById(id) {
      if (usePg) {
        return await pgClient('quizzes').where({ id }).first();
      }
      return memoryDb.quizzes.find(q => q.id === id) || null;
    },
    async create(quizData) {
      const id = crypto.randomUUID();
      const newQuiz = {
        id,
        title: quizData.title,
        topic: quizData.topic,
        difficulty: quizData.difficulty,
        created_by: quizData.created_by || null,
        is_ai_battle: quizData.is_ai_battle || false,
        created_at: new Date().toISOString()
      };
      if (usePg) {
        const [created] = await pgClient('quizzes').insert(newQuiz).returning('*');
        return created;
      }
      memoryDb.quizzes.push(newQuiz);
      saveJsonDb();
      return newQuiz;
    }
  },

  questions: {
    async findByQuizId(quizId) {
      if (usePg) {
        const qList = await pgClient('questions').where({ quiz_id: quizId });
        return qList.map(q => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));
      }
      return memoryDb.questions.filter(q => q.quiz_id === quizId);
    },
    async create(questionData) {
      const id = crypto.randomUUID();
      const newQ = {
        id,
        quiz_id: questionData.quiz_id,
        question_text: questionData.question_text,
        options: questionData.options,
        correct_option_index: questionData.correct_option_index,
        explanation: questionData.explanation
      };
      if (usePg) {
        const dbData = { ...newQ, options: JSON.stringify(newQ.options) };
        const [created] = await pgClient('questions').insert(dbData).returning('*');
        return { ...created, options: questionData.options };
      }
      memoryDb.questions.push(newQ);
      saveJsonDb();
      return newQ;
    }
  },

  quizAttempts: {
    async create(attemptData) {
      const id = crypto.randomUUID();
      const newAttempt = {
        id,
        user_id: attemptData.user_id,
        quiz_id: attemptData.quiz_id,
        score: attemptData.score,
        total_questions: attemptData.total_questions,
        xp_earned: attemptData.xp_earned,
        coins_earned: attemptData.coins_earned,
        completed_at: new Date().toISOString()
      };
      if (usePg) {
        const [created] = await pgClient('quiz_attempts').insert(newAttempt).returning('*');
        return created;
      }
      memoryDb.quiz_attempts.push(newAttempt);
      saveJsonDb();
      return newAttempt;
    },
    async findByUserId(userId) {
      if (usePg) {
        return await pgClient('quiz_attempts')
          .join('quizzes', 'quiz_attempts.quiz_id', '=', 'quizzes.id')
          .where({ 'quiz_attempts.user_id': userId })
          .select('quiz_attempts.*', 'quizzes.title as quiz_title', 'quizzes.topic as quiz_topic', 'quizzes.difficulty as quiz_difficulty')
          .orderBy('completed_at', 'desc');
      }
      // Simulate join
      const userAttempts = memoryDb.quiz_attempts.filter(a => a.user_id === userId);
      const joined = userAttempts.map(attempt => {
        const quiz = memoryDb.quizzes.find(q => q.id === attempt.quiz_id) || {};
        return {
          ...attempt,
          quiz_title: quiz.title || 'Unknown Quiz',
          quiz_topic: quiz.topic || 'General',
          quiz_difficulty: quiz.difficulty || 'medium'
        };
      });
      return joined.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    }
  },

  aiBattles: {
    async create(battleData) {
      const id = crypto.randomUUID();
      const newBattle = {
        id,
        user_id: battleData.user_id,
        topic: battleData.topic,
        difficulty: battleData.difficulty,
        user_score: battleData.user_score || 0,
        ai_score: battleData.ai_score || 0,
        winner: battleData.winner || null,
        rounds: battleData.rounds || [],
        xp_earned: battleData.xp_earned || 0,
        coins_earned: battleData.coins_earned || 0, // customized addition
        completed_at: new Date().toISOString()
      };
      if (usePg) {
        const dbData = {
          ...newBattle,
          rounds: JSON.stringify(newBattle.rounds)
        };
        const [created] = await pgClient('ai_battles').insert(dbData).returning('*');
        return {
          ...created,
          rounds: battleData.rounds
        };
      }
      memoryDb.ai_battles.push(newBattle);
      saveJsonDb();
      return newBattle;
    },
    async update(battleId, data) {
      if (usePg) {
        const dbData = { ...data };
        if (data.rounds) dbData.rounds = JSON.stringify(data.rounds);
        const [updated] = await pgClient('ai_battles')
          .where({ id: battleId })
          .update(dbData)
          .returning('*');
        if (updated && typeof updated.rounds === 'string') {
          updated.rounds = JSON.parse(updated.rounds);
        }
        return updated;
      }
      const idx = memoryDb.ai_battles.findIndex(b => b.id === battleId);
      if (idx !== -1) {
        memoryDb.ai_battles[idx] = { ...memoryDb.ai_battles[idx], ...data };
        saveJsonDb();
        return memoryDb.ai_battles[idx];
      }
      return null;
    },
    async findById(id) {
      if (usePg) {
        const battle = await pgClient('ai_battles').where({ id }).first();
        if (battle && typeof battle.rounds === 'string') {
          battle.rounds = JSON.parse(battle.rounds);
        }
        return battle;
      }
      return memoryDb.ai_battles.find(b => b.id === id) || null;
    }
  },

  leaderboard: {
    async getTopUsers(limit = 20) {
      if (usePg) {
        return await pgClient('profiles')
          .join('users', 'profiles.user_id', '=', 'users.id')
          .select('users.id', 'users.username', 'users.avatar_url', 'profiles.xp', 'profiles.level', 'profiles.coins')
          .orderBy('profiles.xp', 'desc')
          .limit(limit);
      }
      // Simulate join
      const joined = memoryDb.profiles.map(p => {
        const user = memoryDb.users.find(u => u.id === p.user_id) || {};
        return {
          id: user.id,
          username: user.username || 'Ghost Questor',
          avatar_url: user.avatar_url,
          xp: p.xp,
          level: p.level,
          coins: p.coins
        };
      });
      return joined.sort((a, b) => b.xp - a.xp).slice(0, limit);
    }
  },

  avatars: {
    async findAll() {
      if (usePg) {
        return await pgClient('avatars').select('*');
      }
      return memoryDb.avatars || [];
    },
    async findById(id) {
      if (usePg) {
        return await pgClient('avatars').where({ id }).first();
      }
      return (memoryDb.avatars || []).find(a => a.id === id) || null;
    }
  },

  userAvatars: {
    async findByUserId(userId) {
      if (usePg) {
        return await pgClient('user_avatars').where({ user_id: userId });
      }
      return (memoryDb.user_avatars || []).filter(ua => ua.user_id === userId);
    },
    async findByUserAndAvatar(userId, avatarId) {
      if (usePg) {
        return await pgClient('user_avatars').where({ user_id: userId, avatar_id: avatarId }).first();
      }
      return (memoryDb.user_avatars || []).find(ua => ua.user_id === userId && ua.avatar_id === avatarId) || null;
    },
    async create(userAvatar) {
      const id = crypto.randomUUID();
      const newUa = {
        id,
        user_id: userAvatar.user_id,
        avatar_id: userAvatar.avatar_id,
        custom_name: userAvatar.custom_name || null
      };
      if (usePg) {
        const [created] = await pgClient('user_avatars').insert(newUa).returning('*');
        return created;
      }
      const memUa = { ...newUa, purchased_at: new Date().toISOString() };
      if (!memoryDb.user_avatars) memoryDb.user_avatars = [];
      memoryDb.user_avatars.push(memUa);
      saveJsonDb();
      return memUa;
    },
    async updateCustomName(userId, avatarId, customName) {
      if (usePg) {
        const [updated] = await pgClient('user_avatars')
          .where({ user_id: userId, avatar_id: avatarId })
          .update({ custom_name: customName })
          .returning('*');
        return updated;
      }
      const idx = (memoryDb.user_avatars || []).findIndex(ua => ua.user_id === userId && ua.avatar_id === avatarId);
      if (idx !== -1) {
        memoryDb.user_avatars[idx].custom_name = customName;
        saveJsonDb();
        return memoryDb.user_avatars[idx];
      }
      return null;
    }
  },

  duels: {
    async create(duelData) {
      const id = crypto.randomUUID();
      const newDuel = {
        id,
        challenger_id: duelData.challenger_id,
        opponent_id: duelData.opponent_id,
        topic: duelData.topic,
        difficulty: duelData.difficulty,
        status: 'pending',
        winner_id: null,
        challenger_score: 0,
        opponent_score: 0,
        xp_stake: duelData.xp_stake || 50,
        coin_stake: duelData.coin_stake || 20,
        expires_at: duelData.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      };
      if (usePg) {
        const [created] = await pgClient('duels').insert(newDuel).returning('*');
        return created;
      }
      if (!memoryDb.duels) memoryDb.duels = [];
      memoryDb.duels.push(newDuel);
      saveJsonDb();
      return newDuel;
    },
    async findById(id) {
      if (usePg) {
        return await pgClient('duels').where({ id }).first();
      }
      return (memoryDb.duels || []).find(d => d.id === id) || null;
    },
    async update(id, data) {
      if (usePg) {
        const [updated] = await pgClient('duels').where({ id }).update(data).returning('*');
        return updated;
      }
      const idx = (memoryDb.duels || []).findIndex(d => d.id === id);
      if (idx !== -1) {
        memoryDb.duels[idx] = { ...memoryDb.duels[idx], ...data };
        saveJsonDb();
        return memoryDb.duels[idx];
      }
      return null;
    },
    async findPendingIncoming(userId) {
      const now = new Date().toISOString();
      if (usePg) {
        return await pgClient('duels')
          .join('users as challenger', 'duels.challenger_id', '=', 'challenger.id')
          .join('profiles as challenger_profile', 'challenger.id', '=', 'challenger_profile.user_id')
          .where({ 'duels.opponent_id': userId, 'duels.status': 'pending' })
          .andWhere('duels.expires_at', '>', now)
          .select(
            'duels.*',
            'challenger.username as challenger_username',
            'challenger.avatar_url as challenger_avatar_url',
            'challenger_profile.level as challenger_level'
          );
      }
      const pending = (memoryDb.duels || []).filter(d => d.opponent_id === userId && d.status === 'pending' && d.expires_at > now);
      return pending.map(d => {
        const challenger = memoryDb.users.find(u => u.id === d.challenger_id) || {};
        const p = memoryDb.profiles.find(prof => prof.user_id === d.challenger_id) || {};
        return {
          ...d,
          challenger_username: challenger.username || 'Unknown',
          challenger_avatar_url: challenger.avatar_url,
          challenger_level: p.level || 1
        };
      });
    },
    async findHistory(userId) {
      if (usePg) {
        return await pgClient('duels')
          .leftJoin('users as challenger', 'duels.challenger_id', '=', 'challenger.id')
          .leftJoin('users as opponent', 'duels.opponent_id', '=', 'opponent.id')
          .where({ 'duels.challenger_id': userId })
          .orWhere({ 'duels.opponent_id': userId })
          .select(
            'duels.*',
            'challenger.username as challenger_username',
            'challenger.avatar_url as challenger_avatar_url',
            'opponent.username as opponent_username',
            'opponent.avatar_url as opponent_avatar_url'
          )
          .orderBy('duels.created_at', 'desc');
      }
      const history = (memoryDb.duels || []).filter(d => d.challenger_id === userId || d.opponent_id === userId);
      return history.map(d => {
        const challenger = memoryDb.users.find(u => u.id === d.challenger_id) || {};
        const opponent = memoryDb.users.find(u => u.id === d.opponent_id) || {};
        return {
          ...d,
          challenger_username: challenger.username || 'Unknown',
          challenger_avatar_url: challenger.avatar_url,
          opponent_username: opponent.username || 'Unknown',
          opponent_avatar_url: opponent.avatar_url
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    async findPendingOrActive(userId) {
      const now = new Date().toISOString();
      if (usePg) {
        return await pgClient('duels')
          .leftJoin('users as challenger', 'duels.challenger_id', '=', 'challenger.id')
          .leftJoin('users as opponent', 'duels.opponent_id', '=', 'opponent.id')
          .where(function() {
            this.where({ 'duels.challenger_id': userId }).orWhere({ 'duels.opponent_id': userId });
          })
          .andWhere(function() {
            this.where({ 'duels.status': 'pending' }).orWhere({ 'duels.status': 'active' });
          })
          .andWhere('duels.expires_at', '>', now)
          .select(
            'duels.*',
            'challenger.username as challenger_username',
            'opponent.username as opponent_username'
          );
      }
      const list = (memoryDb.duels || []).filter(d => 
        (d.challenger_id === userId || d.opponent_id === userId) && 
        (d.status === 'pending' || d.status === 'active') && 
        d.expires_at > now
      );
      return list.map(d => {
        const challenger = memoryDb.users.find(u => u.id === d.challenger_id) || {};
        const opponent = memoryDb.users.find(u => u.id === d.opponent_id) || {};
        return {
          ...d,
          challenger_username: challenger.username || 'Unknown',
          opponent_username: opponent.username || 'Unknown'
        };
      });
    }
  },

  duelQuestions: {
    async create(qData) {
      const id = crypto.randomUUID();
      const newQ = {
        id,
        duel_id: qData.duel_id,
        question_text: qData.question_text,
        options: qData.options,
        correct_option_index: qData.correct_option_index,
        question_order: qData.question_order
      };
      if (usePg) {
        const dbData = { ...newQ, options: JSON.stringify(newQ.options) };
        const [created] = await pgClient('duel_questions').insert(dbData).returning('*');
        return { ...created, options: qData.options };
      }
      if (!memoryDb.duel_questions) memoryDb.duel_questions = [];
      memoryDb.duel_questions.push(newQ);
      saveJsonDb();
      return newQ;
    },
    async findByDuelId(duelId) {
      if (usePg) {
        const list = await pgClient('duel_questions').where({ duel_id: duelId }).orderBy('question_order', 'asc');
        return list.map(q => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));
      }
      return ((memoryDb.duel_questions || []).filter(q => q.duel_id === duelId)).sort((a, b) => a.question_order - b.question_order);
    }
  },

  duelAnswers: {
    async create(ansData) {
      const id = crypto.randomUUID();
      const newAns = {
        id,
        duel_id: ansData.duel_id,
        user_id: ansData.user_id,
        question_id: ansData.question_id,
        selected_option: ansData.selected_option,
        is_correct: ansData.is_correct,
        answered_at: new Date().toISOString()
      };
      if (usePg) {
        const [created] = await pgClient('duel_answers').insert(newAns).returning('*');
        return created;
      }
      if (!memoryDb.duel_answers) memoryDb.duel_answers = [];
      memoryDb.duel_answers.push(newAns);
      saveJsonDb();
      return newAns;
    },
    async findByDuelAndUser(duelId, userId) {
      if (usePg) {
        return await pgClient('duel_answers').where({ duel_id: duelId, user_id: userId });
      }
      return (memoryDb.duel_answers || []).filter(a => a.duel_id === duelId && a.user_id === userId);
    },
    async findByDuelId(duelId) {
      if (usePg) {
        return await pgClient('duel_answers').where({ duel_id: duelId });
      }
      return (memoryDb.duel_answers || []).filter(a => a.duel_id === duelId);
    }
  },

  studyPlanPreferences: {
    async findByUserId(userId) {
      if (usePg) {
        const pref = await pgClient('study_plan_preferences').where({ user_id: userId }).first();
        if (pref) {
          pref.subjects = typeof pref.subjects === 'string' ? JSON.parse(pref.subjects) : pref.subjects;
          pref.weak_topics = typeof pref.weak_topics === 'string' ? JSON.parse(pref.weak_topics) : pref.weak_topics;
          pref.strong_topics = typeof pref.strong_topics === 'string' ? JSON.parse(pref.strong_topics) : pref.strong_topics;
        }
        return pref;
      }
      return (memoryDb.study_plan_preferences || []).find(p => p.user_id === userId) || null;
    },
    async upsert(userId, data) {
      const existing = await this.findByUserId(userId);
      const dbData = {
        user_id: userId,
        goal: data.goal,
        subjects: usePg ? pgClient.raw('?::jsonb', [JSON.stringify(data.subjects)]) : data.subjects,
        daily_hours: parseInt(data.daily_hours),
        days_until_exam: parseInt(data.days_until_exam),
        weak_topics: usePg ? pgClient.raw('?::jsonb', [JSON.stringify(data.weak_topics)]) : data.weak_topics,
        strong_topics: usePg ? pgClient.raw('?::jsonb', [JSON.stringify(data.strong_topics)]) : data.strong_topics,
        preferred_time: data.preferred_time,
        study_style: data.study_style,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        if (usePg) {
          const [updated] = await pgClient('study_plan_preferences')
            .where({ user_id: userId })
            .update(dbData)
            .returning('*');
          updated.subjects = typeof updated.subjects === 'string' ? JSON.parse(updated.subjects) : updated.subjects;
          updated.weak_topics = typeof updated.weak_topics === 'string' ? JSON.parse(updated.weak_topics) : updated.weak_topics;
          updated.strong_topics = typeof updated.strong_topics === 'string' ? JSON.parse(updated.strong_topics) : updated.strong_topics;
          return updated;
        }
        const idx = memoryDb.study_plan_preferences.findIndex(p => p.user_id === userId);
        memoryDb.study_plan_preferences[idx] = { ...memoryDb.study_plan_preferences[idx], ...dbData };
        saveJsonDb();
        return memoryDb.study_plan_preferences[idx];
      } else {
        const id = crypto.randomUUID();
        const newPref = { id, ...dbData, created_at: new Date().toISOString() };
        if (usePg) {
          const [created] = await pgClient('study_plan_preferences').insert(newPref).returning('*');
          created.subjects = typeof created.subjects === 'string' ? JSON.parse(created.subjects) : created.subjects;
          created.weak_topics = typeof created.weak_topics === 'string' ? JSON.parse(created.weak_topics) : created.weak_topics;
          created.strong_topics = typeof created.strong_topics === 'string' ? JSON.parse(created.strong_topics) : created.strong_topics;
          return created;
        }
        if (!memoryDb.study_plan_preferences) memoryDb.study_plan_preferences = [];
        memoryDb.study_plan_preferences.push(newPref);
        saveJsonDb();
        return newPref;
      }
    }
  },

  studyPlans: {
    async create(userId, prefId, planContent, weekNumber = 1) {
      const id = crypto.randomUUID();
      const newPlan = {
        id,
        user_id: userId,
        preference_id: prefId,
        plan_content: usePg ? pgClient.raw('?::jsonb', [JSON.stringify(planContent)]) : planContent,
        week_number: weekNumber,
        is_active: true,
        generated_at: new Date().toISOString()
      };

      if (usePg) {
        // Deactivate previous plans for user
        await pgClient('study_plans').where({ user_id: userId }).update({ is_active: false });
        const [created] = await pgClient('study_plans').insert(newPlan).returning('*');
        const plan = created;
        plan.plan_content = typeof plan.plan_content === 'string' ? JSON.parse(plan.plan_content) : plan.plan_content;
        console.log('Created study plan:', plan);
        console.log('Plan ID:', plan.id);
        return plan;
      }
      if (!memoryDb.study_plans) memoryDb.study_plans = [];
      // Deactivate previous plans
      memoryDb.study_plans.forEach(p => {
        if (p.user_id === userId) p.is_active = false;
      });
      memoryDb.study_plans.push(newPlan);
      saveJsonDb();
      console.log('Created study plan:', newPlan);
      console.log('Plan ID:', newPlan.id);
      return newPlan;
    },
    async findActiveByUserId(userId) {
      if (usePg) {
        const plan = await pgClient('study_plans').where({ user_id: userId, is_active: true }).first();
        if (plan) {
          plan.plan_content = typeof plan.plan_content === 'string' ? JSON.parse(plan.plan_content) : plan.plan_content;
        }
        return plan;
      }
      return (memoryDb.study_plans || []).find(p => p.user_id === userId && p.is_active === true) || null;
    }
  },

  studyPlanProgress: {
    async create(progressData) {
      const id = crypto.randomUUID();
      const newProg = {
        id,
        plan_id: progressData.plan_id,
        user_id: progressData.user_id,
        day_number: progressData.day_number,
        session_index: progressData.session_index || 0,
        subject: progressData.subject,
        topic: progressData.topic,
        is_completed: progressData.is_completed || false,
        completed_at: progressData.completed_at || null
      };
      if (usePg) {
        const [created] = await pgClient('study_plan_progress').insert(newProg).returning('*');
        return created;
      }
      if (!memoryDb.study_plan_progress) memoryDb.study_plan_progress = [];
      memoryDb.study_plan_progress.push(newProg);
      saveJsonDb();
      return newProg;
    },
    async findByPlanId(planId) {
      if (usePg) {
        return await pgClient('study_plan_progress')
          .where({ plan_id: planId })
          .orderBy('day_number', 'asc')
          .orderBy('session_index', 'asc');
      }
      return (memoryDb.study_plan_progress || []).filter(p => p.plan_id === planId)
        .sort((a, b) => (a.day_number - b.day_number) || ((a.session_index || 0) - (b.session_index || 0)));
    },
    async findById(id) {
      if (usePg) {
        return await pgClient('study_plan_progress').where({ id }).first();
      }
      return (memoryDb.study_plan_progress || []).find(p => p.id === id) || null;
    },
    async markComplete(id) {
      const completedAt = new Date().toISOString();
      console.log('markComplete called with id:', id);
      if (usePg) {
        const [updated] = await pgClient('study_plan_progress')
          .where({ id })
          .update({ is_completed: true, completed_at: completedAt })
          .returning('*');
        if (!updated) {
          throw new Error(`Progress item with id ${id} not found in database`);
        }
        return updated;
      }
      const idx = (memoryDb.study_plan_progress || []).findIndex(p => p.id === id);
      if (idx !== -1) {
        memoryDb.study_plan_progress[idx].is_completed = true;
        memoryDb.study_plan_progress[idx].completed_at = completedAt;
        saveJsonDb();
        return memoryDb.study_plan_progress[idx];
      }
      throw new Error(`Progress item with id ${id} not found in database`);
    }
  }
};
