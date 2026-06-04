import Groq from 'groq-sdk';
import { db } from '../config/db.js';

let groqClient = null;

function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

export const aiService = {
  // Generate 5 questions via Groq API
  async generateQuestions(topic, difficulty) {
    const client = getGroqClient();

    if (!client) {
      console.warn('GROQ_API_KEY is not set. Falling back to pre-seeded database questions.');
      return await this.getFallbackQuestions(topic, difficulty);
    }

    const prompt = `Generate 5 multiple choice questions about ${topic} at ${difficulty} difficulty. Return ONLY a raw JSON array with no markdown, no backticks, no extra text: [{"question": "text", "options": ["option 1", "option 2", "option 3", "option 4"], "correct_index": 0, "explanation": "explanation string"}]`;

    try {
      const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      });

      let content = completion.choices[0]?.message?.content || "";
      
      // Clean markdown blocks if present
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const questions = JSON.parse(content);
        if (Array.isArray(questions) && questions.length === 5) {
          // Format standard keys
          return questions.map(q => ({
            question_text: q.question || q.question_text || "Sample Question?",
            options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["A", "B", "C", "D"],
            correct_option_index: typeof q.correct_index === 'number' ? q.correct_index : (typeof q.correct_option_index === 'number' ? q.correct_option_index : 0),
            explanation: q.explanation || "No explanation provided."
          }));
        } else {
          throw new Error("Invalid array format or length from AI");
        }
      } catch (parseErr) {
        console.error('Groq JSON parsing failed. Content was:', content);
        console.error('Parse error:', parseErr.message);
        return await this.getFallbackQuestions(topic, difficulty);
      }

    } catch (apiErr) {
      console.error('Groq API call failed:', apiErr.message);
      return await this.getFallbackQuestions(topic, difficulty);
    }
  },

  // Fallback to pre-seeded database questions
  async getFallbackQuestions(topic, difficulty) {
    console.log(`Searching fallback questions for topic: ${topic}, difficulty: ${difficulty}`);
    
    // Find all quizzes
    const allQuizzes = await db.quizzes.findAll();
    
    // Find a quiz that matches the topic or difficulty, or just select any quiz if none matches
    let matchedQuiz = allQuizzes.find(q => q.topic.toLowerCase() === topic.toLowerCase());
    
    if (!matchedQuiz) {
      // Find by difficulty
      matchedQuiz = allQuizzes.find(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    
    if (!matchedQuiz) {
      // Just take the first quiz
      matchedQuiz = allQuizzes[0];
    }

    if (matchedQuiz) {
      const dbQs = await db.questions.findByQuizId(matchedQuiz.id);
      if (dbQs && dbQs.length >= 5) {
        return dbQs.slice(0, 5).map(q => ({
          question_text: q.question_text,
          options: q.options,
          correct_option_index: q.correct_option_index,
          explanation: q.explanation
        }));
      }
    }

    // Ultimate hardcoded fallback
    return [
      {
        question_text: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correct_option_index: 1,
        explanation: "Simple addition: 2 + 2 equals 4."
      },
      {
        question_text: "Which planet is closest to the Sun?",
        options: ["Venus", "Earth", "Mercury", "Mars"],
        correct_option_index: 2,
        explanation: "Mercury is the closest planet to the Sun."
      },
      {
        question_text: "Who wrote 'Romeo and Juliet'?",
        options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"],
        correct_option_index: 1,
        explanation: "William Shakespeare is the author of Romeo and Juliet."
      },
      {
        question_text: "What is the capital of France?",
        options: ["Berlin", "London", "Rome", "Paris"],
        correct_option_index: 3,
        explanation: "Paris is the capital and largest city of France."
      },
      {
        question_text: "Which gas is most abundant in Earth's atmosphere?",
        options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"],
        correct_option_index: 2,
        explanation: "Nitrogen makes up about 78% of Earth's atmosphere."
      }
    ];
  },

  // Simulate AI opponent answering correctly based on difficulty
  // 70% on easy, 80% on medium, 90% on hard
  simulateAiAnswer(correctIndex, difficulty) {
    let accuracy = 0.8;
    if (difficulty === 'easy') accuracy = 0.7;
    else if (difficulty === 'hard') accuracy = 0.9;

    const isCorrect = Math.random() < accuracy;
    if (isCorrect) {
      return correctIndex;
    } else {
      // Pick any incorrect index (0 to 3, excluding correctIndex)
      const wrongIndices = [0, 1, 2, 3].filter(idx => idx !== correctIndex);
      const randomIndex = Math.floor(Math.random() * wrongIndices.length);
      return wrongIndices[randomIndex];
    }
  }
};
