import { initDb } from '../config/db.js';
import { aiService } from '../services/aiService.js';

async function runTests() {
  console.log("Initializing database...");
  await initDb();
  console.log("Database initialized. Starting AI generation tests...\n");

  const topicsToTest = [
    { name: "Antigravity", desc: "Pre-seeded Topic (Physics / Gravity)" },
    { name: "Cybersecurity", desc: "Pre-seeded Topic (IT / Cryptography)" },
    { name: "Quantum entanglement", desc: "Dynamic Topic (Wikipedia Science API)" },
    { name: "Sourdough bread", desc: "Dynamic Topic (Wikipedia General/Food API)" },
    { name: "Flugelhorn plink", desc: "Nonsense Topic (Domain Classifier Fallback)" }
  ];

  for (const topic of topicsToTest) {
    console.log(`================================================================================`);
    console.log(`TESTING TOPIC: "${topic.name}" (${topic.desc})`);
    console.log(`================================================================================`);
    
    try {
      const start = Date.now();
      const questions = await aiService.generateQuestions(topic.name, "medium");
      const duration = Date.now() - start;

      console.log(`Generated ${questions.length} questions in ${duration}ms.\n`);

      questions.forEach((q, idx) => {
        console.log(`${idx + 1}. Q: ${q.question_text}`);
        console.log(`   Options:`);
        q.options.forEach((opt, oIdx) => {
          const prefix = oIdx === q.correct_option_index ? "   [*] " : "   [ ] ";
          console.log(`${prefix}${opt}`);
        });
        console.log(`   Explanation: ${q.explanation}`);
        console.log();
      });
    } catch (err) {
      console.error(`Failed to generate questions for "${topic.name}":`, err);
    }
    console.log("\n");
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
});
