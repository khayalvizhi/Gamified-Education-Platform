import Groq from 'groq-sdk';
import { db } from '../config/db.js';

let groqClient = null;

function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// Dynamically construct prompts for the AI based on the topic
function getAiPrompt(topic, difficulty) {
  let specificContext = "";
  const normTopic = topic.trim().toLowerCase();
  
  if (normTopic.includes('antigravity') || normTopic.includes('anti-gravity') || normTopic.includes('anti gravity')) {
    specificContext = "For this topic (Antigravity), you must focus specifically on gravitational shielding, Podkletnov experiments, theoretical propulsion (such as Alcubierre warp drive or negative mass models), and anti-gravity physics. Avoid superficial questions.";
  } else {
    specificContext = `Focus on the core theoretical foundations, notable experiments/methodologies, major technical challenges, and real-world applications of ${topic}. Avoid generic, repetitive, or simple definitional questions.`;
  }

  return `Generate exactly 5 multiple choice questions about "${topic}" at "${difficulty}" difficulty level.
${specificContext}

Each question must contain:
1. "question": The question text.
2. "options": An array of exactly 4 options.
3. "correct_index": The index (0-3) of the correct option.
4. "explanation": A detailed, educational explanation of the correct answer.

Return ONLY a raw JSON array of objects with the keys: "question", "options", "correct_index", "explanation". Do not wrap the JSON in markdown code blocks, do not use backticks, and do not write any introductory or concluding text.`;
}

function shuffleQuestionOptions(q) {
  const optionsWithFlags = q.options.map((opt, idx) => ({
    text: opt,
    isCorrect: idx === q.correct_option_index
  }));
  const shuffledOptions = [...optionsWithFlags].sort(() => 0.5 - Math.random());
  const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);
  return {
    question_text: q.question_text,
    options: shuffledOptions.map(o => o.text),
    correct_option_index: newCorrectIndex,
    explanation: q.explanation
  };
}

// Helper to normalize topic string for dictionary comparison
function normalizeTopic(topic) {
  if (!topic) return '';
  return topic.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Map the user input topic to one of the 10 pre-seeded keys
function getPreSeededKey(topic) {
  const norm = normalizeTopic(topic);
  if (norm.includes('antigravity')) return 'antigravity';
  if (norm.includes('cybersecurity') || norm === 'security') return 'cybersecurity';
  if (norm.includes('artificialintelligence') || norm === 'ai' || norm.includes('machinelearning')) return 'artificialintelligence';
  if (norm.includes('mythology') || norm.includes('myth')) return 'ancientmythology';
  if (norm.includes('atomsandmolecules') || norm === 'atoms' || norm === 'molecules' || norm === 'atom' || norm === 'molecule' || norm.includes('atomic')) return 'atomsandmolecules';
  if (norm === 'physics') return 'physics';
  if (norm === 'chemistry') return 'chemistry';
  if (norm === 'biology') return 'biology';
  if (norm === 'space' || norm === 'astronomy' || norm === 'astrophysics') return 'space';
  if (norm === 'computerscience' || norm === 'cs' || norm === 'programming' || norm === 'coding') return 'computerscience';
  return null;
}

// Helper to select random items from array
function getRandomElements(arr, num, exclude = []) {
  const filtered = arr.filter(el => !exclude.includes(el));
  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}

// Simple keyword classifier for dynamic fallback domain selection
function classifyTopic(topic, description = "", extract = "") {
  const textToAnalyze = `${topic} ${description} ${extract}`.toLowerCase();
  
  const scores = {
    science: 0,
    technology: 0,
    humanities: 0,
    business: 0,
    general: 0
  };

  const keywords = {
    science: ['physics', 'chemistry', 'biology', 'science', 'atom', 'molecule', 'quantum', 'gravity', 'space', 'astronomy', 'organism', 'cell', 'particle', 'energy', 'thermodynamic', 'chemical', 'geology', 'planet', 'star', 'cosmos', 'evolution', 'dna', 'rna', 'gene', 'astrophysics', 'matter', 'force', 'equation', 'scientific'],
    technology: ['computer', 'software', 'network', 'cyber', 'security', 'programming', 'code', 'database', 'algorithm', 'cryptography', 'digital', 'tech', 'internet', 'cloud', 'server', 'application', 'developer', 'web', 'system', 'hardware', 'encryption', 'hacker', 'app', 'data', 'it_security'],
    humanities: ['mythology', 'myth', 'history', 'philosophy', 'art', 'literature', 'ancient', 'culture', 'social', 'religion', 'deity', 'god', 'goddess', 'empire', 'historical', 'language', 'archaeology', 'greek', 'roman', 'egyptian', 'bible', 'literary', 'historical', 'paint', 'sculpture'],
    business: ['business', 'finance', 'economic', 'market', 'corporate', 'price', 'pricing', 'strategy', 'accounting', 'management', 'investment', 'inflation', 'stock', 'trade', 'supply chain', 'consumer', 'capital', 'audit', 'tax', 'revenue', 'profit']
  };

  const tokens = textToAnalyze.match(/[a-z0-9]+/g) || [];

  for (const token of tokens) {
    for (const [domain, list] of Object.entries(keywords)) {
      if (list.includes(token)) {
        scores[domain] += 1;
      }
    }
  }

  let bestDomain = 'general';
  let maxScore = 0;
  for (const [domain, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

const DOMAIN_DISTRACTORS = {
  science: [
    "An inert chemical reaction that only occurs in high-pressure gaseous states.",
    "A geological phenomenon describing the movement of tectonic plates.",
    "A biological process responsible for cellular division in single-celled organisms.",
    "A quantum anomaly that occurs only at absolute zero temperatures.",
    "A thermodynamic system where energy is transferred without mass movement.",
    "A spectroscopic technique used to analyze the molecular structure of polymers.",
    "An atmospheric pressure gradient causing high-velocity wind patterns.",
    "An astronomical boundary where gravitational collapse becomes inevitable."
  ],
  technology: [
    "A software design pattern used exclusively for database replication in high-latency networks.",
    "A decentralized consensus algorithm used in blockchain networks.",
    "A cryptographic protocol for securing wireless local area networks.",
    "An automated compilation pipeline for optimizing serverless architecture.",
    "A microservice deployment strategy that minimizes memory footprint.",
    "A hardware virtualization layer managing containerized execution environments.",
    "A cache invalidation mechanism operating on a least-recently-used policy.",
    "A query optimization routine for relational database management systems."
  ],
  humanities: [
    "A major philosophical school of thought originating in the early Hellenistic period.",
    "A cultural renaissance movement characterized by linear perspective in painting.",
    "An ancient linguistic dialect spoken primarily in the Mesopotamian basin.",
    "A sociopolitical system based on feudal land tenure and vassalage.",
    "A literary device used to evoke emotional catharsis in classical tragedy.",
    "An archaeological theory regarding the migration of early hominids.",
    "A religious practice centered around ancestral worship in the Bronze Age.",
    "An epic narrative structure prioritizing the psychological growth of the protagonist."
  ],
  business: [
    "A financial hedging strategy designed to minimize exposure to currency volatility.",
    "A market penetration model focused on optimizing supply chain logistics.",
    "A corporate governance framework for managing risk and regulatory compliance.",
    "A pricing strategy based on price elasticity of consumer demand.",
    "An accounting methodology for depreciating intangible capital assets.",
    "A macroeconomic policy aimed at controlling inflation through interest rates.",
    "A venture capital funding framework for early-stage enterprise startups.",
    "A consumer behavior analysis predicting purchasing choices via demographic segmentation."
  ],
  general: [
    "A popular recreational sport played with a spherical ball on a grassy field.",
    "A traditional culinary technique used to ferment organic ingredients.",
    "A competitive strategy game involving tile placement and resource management.",
    "A common daily routine for maintaining personal physical fitness.",
    "An artistic craft involving the weaving of natural fibers into textiles.",
    "A seasonal meteorological event causing temporary shifts in wind patterns.",
    "A widely adopted domestic gardening practice to cultivate flowering plants.",
    "A traditional folklore performance involving wooden puppets and oral storytelling."
  ]
};

const DOMAIN_TERMS = {
  science: [
    "Quantum superposition",
    "Nuclear fission",
    "Photoelectric effect",
    "Dark matter",
    "Gravitational waves",
    "Tectonic subduction",
    "Cellular mitosis",
    "Covalent bonding",
    "Electromagnetic radiation",
    "Thermodynamic entropy"
  ],
  technology: [
    "Kubernetes orchestration",
    "Symmetric encryption",
    "Microservice architecture",
    "Load balancing",
    "SQL injection",
    "Relational database",
    "Docker containerization",
    "Continuous integration",
    "Asynchronous processing",
    "RESTful API design"
  ],
  humanities: [
    "Stoicism philosophy",
    "Feudal vassalage",
    "Hellenistic period",
    "Cuneiform script",
    "Romanticism movement",
    "Existential nihilism",
    "Monotheism",
    "Classical tragedy",
    "Imperial hegemony",
    "Enlightenment humanism"
  ],
  business: [
    "Capital depreciation",
    "Market penetration",
    "Asset liquidity",
    "Fiscal inflation",
    "Supply chain logistics",
    "Corporate governance",
    "Portfolio diversification",
    "Price elasticity",
    "Market capitalization",
    "Strategic hedging"
  ],
  general: [
    "Recreational sports",
    "Culinary fermentation",
    "Resource management",
    "Aerobic exercise",
    "Fiber weaving",
    "Meteorological pressure",
    "Cardiovascular fitness",
    "Strategic planning",
    "Creative writing",
    "Musical improvisation"
  ]
};

const PRE_SEEDED_TOPICS = {
  antigravity: [
    {
      question_text: "In theoretical physics, which effect describes a small attractive force between two uncharged parallel conducting plates, which is sometimes cited in antigravity and vacuum energy research?",
      options: ["Casimir effect", "Hall effect", "Photoelectric effect", "Seebeck effect"],
      correct_option_index: 0,
      explanation: "The Casimir effect is a physical force arising from a quantized field. It is often studied in the context of vacuum energy and potential negative energy densities for exotic propulsion."
    },
    {
      question_text: "Which controversial Russian researcher published claims in the 1990s regarding gravitational shielding using rotating superconducting discs?",
      options: ["Eugene Podkletnov", "Nikola Tesla", "Igor Sikorsky", "Konstantin Tsiolkovsky"],
      correct_option_index: 0,
      explanation: "Eugene Podkletnov claimed that a rotating superconducting disc could shield objects from gravity, though these experiments have never been successfully replicated or validated by mainstream science."
    },
    {
      question_text: "The Alcubierre warp drive metric requires which hypothetical substance to expand space-time behind a spacecraft and contract it in front?",
      options: ["Negative mass or exotic energy", "Liquid hydrogen", "Dark matter", "Tachyon particles"],
      correct_option_index: 0,
      explanation: "Miguel Alcubierre's mathematical model for a warp drive requires negative energy density (exotic matter) to function, which violates known classical energy conditions."
    },
    {
      question_text: "In the context of Einstein's general relativity, what is the term for the gravitational field generated by a rotating mass, which drags spacetime around it?",
      options: ["Frame-dragging (Lense-Thirring effect)", "Gravitational lensing", "Gravitational redshift", "Equivalence principle"],
      correct_option_index: 0,
      explanation: "Frame-dragging (or the Lense-Thirring effect) is a relativistic phenomenon where a massive rotating object drags the fabric of spacetime around with it."
    },
    {
      question_text: "Why does standard General Relativity forbid classical anti-gravity devices that shield against gravity?",
      options: ["Because gravity is a curvature of spacetime, not a force that can be blocked or reflected.", "Because Earth's core possesses too much magnetic force.", "Because gravitational constants are inversely proportional to temperature.", "Because the strong nuclear force binds gravity to matter."],
      correct_option_index: 0,
      explanation: "In General Relativity, gravity is the geometry of spacetime rather than an exchange force. Thus, you cannot block gravity with a shield in the same way you block electromagnetic waves."
    }
  ],
  cybersecurity: [
    {
      question_text: "Which cryptographic method uses a pair of keys, public and private, to encrypt and decrypt data?",
      options: ["Asymmetric cryptography", "Symmetric cryptography", "Hashing algorithm", "Rotational cipher"],
      correct_option_index: 0,
      explanation: "Asymmetric cryptography (or public-key cryptography) utilizes a public key for encryption and a private key for decryption, ensuring secure key exchange."
    },
    {
      question_text: "What is the primary way to prevent SQL Injection vulnerability in web applications?",
      options: ["Using parameterized queries (prepared statements)", "Enabling JavaScript validation on the client side", "Encrypting the database storage drive", "Using a shorter session timeout value"],
      correct_option_index: 0,
      explanation: "Parameterized queries separate the SQL code from user-provided data, preventing malicious input from being interpreted as executable SQL commands."
    },
    {
      question_text: "Which security model operates on the principle of 'never trust, always verify' regardless of whether a user is inside or outside the network perimeter?",
      options: ["Zero Trust Architecture", "Defense in Depth", "Role-Based Access Control", "Perimeter Security"],
      correct_option_index: 0,
      explanation: "Zero Trust is a strategic initiative that prevents data breaches by eliminating the concept of trust from an organization's network architecture."
    },
    {
      question_text: "In multi-factor authentication (MFA), what category of factor does a fingerprint or retina scan represent?",
      options: ["Inherence factor (something you are)", "Knowledge factor (something you know)", "Possession factor (something you have)", "Location factor (somewhere you are)"],
      correct_option_index: 0,
      explanation: "Biometrics like fingerprints, face scans, and retina scans are inherence factors because they are unique physical characteristics of the user."
    },
    {
      question_text: "What term describes a cyber attack that encrypts a victim's files and demands payment in exchange for the decryption key?",
      options: ["Ransomware", "Spyware", "Phishing", "Man-in-the-Middle"],
      correct_option_index: 0,
      explanation: "Ransomware is malicious software designed to block access to a computer system or data until a sum of money is paid."
    }
  ],
  artificialintelligence: [
    {
      question_text: "In neural networks, what mathematical method is used to calculate the gradient of the loss function with respect to the weights?",
      options: ["Backpropagation", "Forward propagation", "Principal Component Analysis", "Linear regression"],
      correct_option_index: 0,
      explanation: "Backpropagation uses the calculus chain rule to compute gradients of the loss function, which are then used to update weights in gradient descent."
    },
    {
      question_text: "Which model architecture introduced by Google in 2017 relies entirely on self-attention mechanisms to process sequential data?",
      options: ["Transformer", "Recurrent Neural Network", "Convolutional Neural Network", "Autoencoder"],
      correct_option_index: 0,
      explanation: "The Transformer architecture, introduced in the paper 'Attention Is All You Need', replaced recurrent architectures for NLP and forms the basis of modern LLMs."
    },
    {
      question_text: "What occurs when a machine learning model learns the training data too well, including its noise and outliers, causing poor generalization to new data?",
      options: ["Overfitting", "Underfitting", "Data leakage", "Vanishing gradient"],
      correct_option_index: 0,
      explanation: "Overfitting happens when a model is overly complex relative to the simplicity of the data, capturing noise instead of the underlying pattern."
    },
    {
      question_text: "In reinforcement learning, what mathematical framework is typically used to formalize decision-making in environment-agent interactions?",
      options: ["Markov Decision Process (MDP)", "Support Vector Machines", "Naive Bayes Classifier", "K-Means Clustering"],
      correct_option_index: 0,
      explanation: "Markov Decision Processes provide a mathematical framework for modeling decision-making in situations where outcomes are partly random and partly under control."
    },
    {
      question_text: "Which optimization algorithm is most commonly used to minimize the cost or loss function in training deep learning models?",
      options: ["Gradient Descent", "Genetic Algorithm", "Simulated Annealing", "A* Search"],
      correct_option_index: 0,
      explanation: "Gradient Descent is an iterative optimization algorithm used to find the minimum of a function by moving in the direction of steepest descent."
    }
  ],
  ancientmythology: [
    {
      question_text: "In Greek mythology, what is the name of the deep abyss used as a dungeon of torment for the Titans and wicked souls?",
      options: ["Tartarus", "Elysium", "Asphodel Meadows", "Underworld"],
      correct_option_index: 0,
      explanation: "Tartarus is a primordial force and place in the underworld, lower than Hades, where Zeus imprisoned the Titans."
    },
    {
      question_text: "In Norse mythology, what is the name of the massive ash tree that connects the nine worlds of the cosmos?",
      options: ["Yggdrasil", "Mjolnir", "Valhalla", "Bifrost"],
      correct_option_index: 0,
      explanation: "Yggdrasil is the sacred world tree around which the nine realms, including Asgard and Midgard, exist."
    },
    {
      question_text: "Which Egyptian deity, recognizable by a jackal's head, is the god of mummification and guide of souls in the afterlife?",
      options: ["Anubis", "Osiris", "Horus", "Ra"],
      correct_option_index: 0,
      explanation: "Anubis is the god of embalming and the dead, famous for weighing the hearts of deceased souls against the feather of Ma'at."
    },
    {
      question_text: "What is the name of the legendary King of Uruk whose heroic exploits are detailed in one of the earliest surviving works of literature?",
      options: ["Gilgamesh", "Enkidu", "Hammurabi", "Sargon"],
      correct_option_index: 0,
      explanation: "The Epic of Gilgamesh is an ancient Mesopotamian odyssey centering on Gilgamesh, the mythological king of Uruk, and his quest for immortality."
    },
    {
      question_text: "In Hindu mythology, which epic narrative tells the story of Prince Rama's quest to rescue his wife Sita from the demon king Ravana?",
      options: ["The Ramayana", "The Mahabharata", "The Upanishads", "The Rigveda"],
      correct_option_index: 0,
      explanation: "The Ramayana is one of the two major Sanskrit epics of ancient India, depicting the journey of virtue, duty, and the rescue of Sita."
    }
  ],
  atomsandmolecules: [
    {
      question_text: "What type of chemical bond is formed when two atoms share one or more pairs of electrons?",
      options: ["Covalent bond", "Ionic bond", "Hydrogen bond", "Metallic bond"],
      correct_option_index: 0,
      explanation: "A covalent bond involves the sharing of electron pairs between atoms, typically occurring between nonmetal elements."
    },
    {
      question_text: "Which theory in chemistry is used to predict the 3D geometry of molecules based on the repulsion of electron pairs around a central atom?",
      options: ["VSEPR Theory", "Molecular Orbital Theory", "Valence Bond Theory", "Lewis Structure Theory"],
      correct_option_index: 0,
      explanation: "Valence Shell Electron Pair Repulsion (VSEPR) theory states that electron pairs around a central atom repel each other, dictating molecular shape."
    },
    {
      question_text: "What term describes atoms of the same chemical element that have the same number of protons but different numbers of neutrons?",
      options: ["Isotopes", "Isomers", "Allotropes", "Ions"],
      correct_option_index: 0,
      explanation: "Isotopes share the same atomic number and chemical behavior but differ in atomic mass due to varying numbers of neutrons."
    },
    {
      question_text: "Which fundamental constant represents the number of constituent particles (usually atoms or molecules) in one mole of a substance?",
      options: ["Avogadro's number", "Planck's constant", "Boltzmann's constant", "Gas constant"],
      correct_option_index: 0,
      explanation: "Avogadro's number is approximately 6.022 x 10^23, representing the number of particles in a single mole of any substance."
    },
    {
      question_text: "What is the term for the energy required to remove an electron from a gaseous atom or ion in its ground state?",
      options: ["Ionization energy", "Electron affinity", "Electronegativity", "Lattice energy"],
      correct_option_index: 0,
      explanation: "Ionization energy is a measure of the capability of an element to enter into chemical reactions requiring ion formation."
    }
  ],
  physics: [
    {
      question_text: "Which law of thermodynamics states that the entropy of an isolated system always increases over time?",
      options: ["Second Law", "First Law", "Third Law", "Zeroth Law"],
      correct_option_index: 0,
      explanation: "The Second Law of Thermodynamics dictates that natural processes are irreversible, leading to an increase in total entropy (disorder)."
    },
    {
      question_text: "What phenomenon refers to the change in frequency of a wave in relation to an observer who is moving relative to the wave source?",
      options: ["Doppler effect", "Photoelectric effect", "Refraction", "Diffraction"],
      correct_option_index: 0,
      explanation: "The Doppler effect explains why sirens sound higher-pitched as they approach you and lower-pitched as they move away."
    },
    {
      question_text: "According to Einstein's Special Relativity, what constant is the absolute speed limit for all energy and information in the universe?",
      options: ["The speed of light in a vacuum (c)", "The speed of sound in dry air", "The escape velocity of Earth", "The orbital speed of the Moon"],
      correct_option_index: 0,
      explanation: "The speed of light in a vacuum is approximately 299,792,458 meters per second and represents the upper limit for velocity in spacetime."
    },
    {
      question_text: "Which experiment demonstrated that light can behave as both a wave and a stream of particles, validating wave-particle duality?",
      options: ["Double-slit experiment", "Michelson-Morley experiment", "Cavendish experiment", "Rutherford gold foil experiment"],
      correct_option_index: 0,
      explanation: "Thomas Young's double-slit experiment (and its quantum versions) shows interference patterns typical of waves, while detector interactions act like particles."
    },
    {
      question_text: "What physical force keeps planets in orbit around the Sun and governs the motion of celestial bodies?",
      options: ["Gravitational force", "Electromagnetic force", "Strong nuclear force", "Weak nuclear force"],
      correct_option_index: 0,
      explanation: "Gravity is the mutually attractive force exerted by mass, holding solar systems and galaxies together."
    }
  ],
  chemistry: [
    {
      question_text: "What is the term for a substance that increases the rate of a chemical reaction without undergoing any permanent chemical change itself?",
      options: ["Catalyst", "Reactant", "Inhibitor", "Solvent"],
      correct_option_index: 0,
      explanation: "A catalyst provides an alternative reaction pathway with lower activation energy, speeding up the reaction rate."
    },
    {
      question_text: "Which principle states that if a dynamic equilibrium is disturbed by changing the conditions, the position of equilibrium shifts to counteract the change?",
      options: ["Le Chatelier's principle", "Hund's rule", "Pauli exclusion principle", "Aufbau principle"],
      correct_option_index: 0,
      explanation: "Le Chatelier's principle helps predict how chemical systems adjust to changes in temperature, pressure, or concentration."
    },
    {
      question_text: "What scale is used to specify the acidity or basicity of an aqueous solution, ranging from 0 to 14?",
      options: ["pH scale", "Kelvin scale", "Richter scale", "Decibel scale"],
      correct_option_index: 0,
      explanation: "The pH scale measures the concentration of hydrogen ions. Values below 7 are acidic, while values above 7 are basic."
    },
    {
      question_text: "In organic chemistry, which functional group consists of a carbon atom double-bonded to an oxygen atom (C=O)?",
      options: ["Carbonyl group", "Hydroxyl group", "Carboxyl group", "Ether group"],
      correct_option_index: 0,
      explanation: "The carbonyl group is a functional group composed of a carbon atom double-bonded to an oxygen atom, found in aldehydes and ketones."
    },
    {
      question_text: "Which chemical law states that at a constant temperature, the volume of a given mass of gas is inversely proportional to its pressure?",
      options: ["Boyle's Law", "Charles's Law", "Avogadro's Law", "Gay-Lussac's Law"],
      correct_option_index: 0,
      explanation: "Boyle's Law states that P1 * V1 = P2 * V2 when temperature and the amount of gas remain constant."
    }
  ],
  biology: [
    {
      question_text: "In eukaryotic cells, which organelle is responsible for generating adenosine triphosphate (ATP) through cellular respiration?",
      options: ["Mitochondria", "Ribosome", "Golgi apparatus", "Lysosome"],
      correct_option_index: 0,
      explanation: "Mitochondria are known as the powerhouses of the cell because they produce the chemical energy required for cellular functions."
    },
    {
      question_text: "What is the process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water?",
      options: ["Photosynthesis", "Cellular respiration", "Fermentation", "Transpiration"],
      correct_option_index: 0,
      explanation: "Photosynthesis converts light energy into chemical energy stored in glucose, releasing oxygen as a byproduct."
    },
    {
      question_text: "Which type of cell division results in four daughter cells each with half the number of chromosomes of the parent cell, producing gametes?",
      options: ["Meiosis", "Mitosis", "Binary fission", "Budding"],
      correct_option_index: 0,
      explanation: "Meiosis is a specialized form of cell division that reduces the chromosome number by half, creating haploid sperm and egg cells."
    },
    {
      question_text: "What macromolecule contains the genetic instructions used in the development, functioning, and reproduction of all known living organisms?",
      options: ["Deoxyribonucleic acid (DNA)", "Ribonucleic acid (RNA)", "Proteins", "Polysaccharides"],
      correct_option_index: 0,
      explanation: "DNA is a double-helix molecule that encodes the genetic blueprint of life."
    },
    {
      question_text: "Which evolutionary mechanism, first formulated by Charles Darwin, describes the differential survival and reproduction of individuals due to differences in phenotype?",
      options: ["Natural selection", "Genetic drift", "Gene flow", "Mutation pressure"],
      correct_option_index: 0,
      explanation: "Natural selection is the primary driving force of evolution, where traits that aid survival are passed on to successive generations."
    }
  ],
  space: [
    {
      question_text: "What boundary surrounding a black hole represents the threshold where the escape velocity exceeds the speed of light?",
      options: ["Event horizon", "Singularity", "Accretion disk", "Photon sphere"],
      correct_option_index: 0,
      explanation: "The event horizon is the point of no return around a black hole, inside of which nothing, not even light, can escape."
    },
    {
      question_text: "Which cosmological discovery represents the faint electromagnetic radiation left over from the early stage of the universe, shortly after the Big Bang?",
      options: ["Cosmic Microwave Background (CMB)", "Pulsars", "Quasars", "Gravitational waves"],
      correct_option_index: 0,
      explanation: "The CMB is thermal radiation filling the universe, acting as a crucial piece of observational evidence for the Big Bang theory."
    },
    {
      question_text: "What law of astronomy states that the recessional velocity of a galaxy is directly proportional to its distance from Earth, demonstrating that the universe is expanding?",
      options: ["Hubble's Law", "Kepler's First Law", "Newton's Law of Gravitation", "Stefan-Boltzmann Law"],
      correct_option_index: 0,
      explanation: "Edwin Hubble discovered that distant galaxies are moving away from us, and the speed is proportional to how far away they are."
    },
    {
      question_text: "What is the term for the violent and explosive death of a massive star at the end of its life cycle?",
      options: ["Supernova", "Nebula", "White dwarf", "Red giant"],
      correct_option_index: 0,
      explanation: "A supernova is a stellar explosion that briefly outshines an entire galaxy, dispersing heavy elements into the interstellar medium."
    },
    {
      question_text: "How many laws of planetary motion did Johannes Kepler formulate to describe the orbits of planets around the Sun?",
      options: ["Three", "Two", "Four", "Five"],
      correct_option_index: 0,
      explanation: "Kepler's three laws of planetary motion describe how planets move in elliptical orbits, sweep out equal areas in equal times, and relate orbital periods to distances."
    }
  ],
  computerscience: [
    {
      question_text: "What notation is used in computer science to describe the performance or complexity of an algorithm, representing its worst-case scenario?",
      options: ["Big O notation", "Little o notation", "Theta notation", "Omega notation"],
      correct_option_index: 0,
      explanation: "Big O notation describes the upper bound of the execution time or space requirement of an algorithm in terms of the input size."
    },
    {
      question_text: "Which data structure operates on a First-In, First-Out (FIFO) access policy?",
      options: ["Queue", "Stack", "Binary Tree", "Heap"],
      correct_option_index: 0,
      explanation: "A queue processes elements in the order they arrive (FIFO), whereas a stack uses Last-In, First-Out (LIFO)."
    },
    {
      question_text: "What term describes the OOP concept where a subclass provides a specific implementation of a method that is already defined in its superclass?",
      options: ["Method overriding", "Method overloading", "Encapsulation", "Multiple inheritance"],
      correct_option_index: 0,
      explanation: "Overriding allows a child class to change the execution of a method inherited from a parent class."
    },
    {
      question_text: "What is the primary difference between a compiler and an interpreter?",
      options: ["A compiler translates the entire source code into machine code before execution, while an interpreter translates code line-by-line during execution.", "A compiler is only used for high-level languages, while an interpreter is for assembly languages.", "A compiler runs code faster, but an interpreter uses less memory.", "A compiler is hardware-based, while an interpreter is software-based."],
      correct_option_index: 0,
      explanation: "Compilers generate an executable file in advance, whereas interpreters execute instructions directly from source code on the fly."
    },
    {
      question_text: "In database design, what property of a transaction guarantees that it will either complete entirely or fail completely without partial changes?",
      options: ["Atomicity", "Consistency", "Isolation", "Durability"],
      correct_option_index: 0,
      explanation: "Atomicity is the 'all-or-nothing' property of database transactions, ensuring that no partial updates occur if a transaction is aborted."
    }
  ]
};

export const aiService = {
  // Generate 5 questions via Groq API
  async generateQuestions(topic, difficulty) {
    const client = getGroqClient();

    if (!client) {
      console.warn('GROQ_API_KEY is not set. Falling back to pre-seeded database questions.');
      return await this.getFallbackQuestions(topic, difficulty);
    }

    const prompt = getAiPrompt(topic, difficulty);

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

  // Generate fallback questions dynamically or by matching existing quizzes
  async getFallbackQuestions(topic, difficulty) {
    console.log(`Searching fallback questions for topic: ${topic}, difficulty: ${difficulty}`);
    
    // Find all quizzes
    const allQuizzes = await db.quizzes.findAll();
    
    // Find a quiz that matches the topic exactly
    let matchedQuiz = allQuizzes.find(q => q.topic.toLowerCase() === topic.toLowerCase());
    
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

    // Otherwise, generate questions dynamically using the topic
    return await this.generateDynamicQuestions(topic, difficulty);
  },

  // Helper to generate dynamic questions based on a topic
  async generateDynamicQuestions(topic, difficulty) {
    // 1. Tier 1: Check Pre-seeded
    const preSeededKey = getPreSeededKey(topic);
    if (preSeededKey && PRE_SEEDED_TOPICS[preSeededKey]) {
      console.log(`[aiService] Match found in pre-seeded database for key: ${preSeededKey}`);
      // Shuffle options of the pre-seeded questions
      return PRE_SEEDED_TOPICS[preSeededKey].map(q => shuffleQuestionOptions(q));
    }

    // Cleaned topic title
    const cleanTopic = topic.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    let summaryText = "";
    let descriptionText = "";
    let wikiTitle = cleanTopic;
    let fetchedOk = false;

    // 2. Tier 2: Wikipedia API
    if (typeof globalThis.fetch === 'function') {
      try {
        console.log(`[aiService] Fetching Wikipedia summary for topic: ${topic}`);
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.trim().replace(/\s+/g, '_'))}`;
        const response = await globalThis.fetch(wikiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.type === 'standard' && data.extract) {
            summaryText = data.extract;
            descriptionText = data.description || "";
            wikiTitle = data.title || cleanTopic;
            fetchedOk = true;
            console.log(`[aiService] Wikipedia summary successfully fetched for: ${wikiTitle}`);
          }
        } else {
          console.warn(`[aiService] Wikipedia request failed with status: ${response.status}`);
        }
      } catch (err) {
        console.error(`[aiService] Error fetching Wikipedia summary:`, err.message);
      }
    } else {
      console.warn(`[aiService] globalThis.fetch is not a function. Skipping Wikipedia fetch.`);
    }

    // 3. Classify Topic
    const domain = classifyTopic(cleanTopic, descriptionText, summaryText);
    console.log(`[aiService] Classified topic "${cleanTopic}" as domain: ${domain}`);

    // Get distractors for this domain
    const distractorPool = DOMAIN_DISTRACTORS[domain] || DOMAIN_DISTRACTORS.general;
    const termPool = DOMAIN_TERMS[domain] || DOMAIN_TERMS.general;

    // Process sentences
    let validSentences = [];
    if (fetchedOk && summaryText) {
      const cleanSummary = summaryText.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
      const rawSentences = cleanSummary.split(/(?<=[.!?])\s+/);
      validSentences = rawSentences
        .map(s => s.trim())
        .filter(s => s.length >= 25 && s.length <= 220);
    }

    const questions = [];

    // Helper to get random distractors
    const getDistractors = (excludeText) => {
      return getRandomElements(distractorPool, 3, [excludeText]);
    };

    // Construct 5 questions:
    // Q1: Definition Question
    {
      const correctText = validSentences[0] || `${wikiTitle} refers to the specialized systems, core theories, and operational principles within this subject area.`;
      const qText = `Which of the following describes the core definition or concept of ${wikiTitle}?`;
      questions.push({
        question_text: qText,
        options: [correctText, ...getDistractors(correctText)],
        correct_option_index: 0,
        explanation: `Based on verified references, ${correctText}`
      });
    }

    // Q2: Characteristic/Fact
    {
      const correctText = validSentences[1] || `${wikiTitle} is actively studied and applied by researchers to analyze key dynamics and solve field-specific challenges.`;
      const qText = `In the context of ${wikiTitle}, which of the following statements represents a verified characteristic or fact?`;
      questions.push({
        question_text: qText,
        options: [correctText, ...getDistractors(correctText)],
        correct_option_index: 0,
        explanation: `Analysis indicates: ${correctText}`
      });
    }

    // Q3: Detail/Application
    {
      const correctText = validSentences[2] || `Advancements in our understanding of ${wikiTitle} directly influence adjacent fields, professional standards, and methodology.`;
      const qText = `Which of the following is a key detail regarding the study or application of ${wikiTitle}?`;
      questions.push({
        question_text: qText,
        options: [correctText, ...getDistractors(correctText)],
        correct_option_index: 0,
        explanation: `Academic context confirms: ${correctText}`
      });
    }

    // Q4: Fill-in-the-blank / Term identification
    {
      let qText = `Which term correctly completes this description: "________ is associated with the core principles of ${wikiTitle}"?`;
      const correctText = wikiTitle;
      const termDistractors = getRandomElements(termPool, 3, [correctText]);

      // Try to find a sentence to mask the title
      let sentenceToMask = validSentences[0] || validSentences[1] || "";
      const titleRegex = new RegExp(wikiTitle, 'gi');
      if (sentenceToMask && titleRegex.test(sentenceToMask)) {
        qText = `Which term correctly completes this description: "${sentenceToMask.replace(titleRegex, '________')}"?`;
      }

      questions.push({
        question_text: qText,
        options: [correctText, ...termDistractors],
        correct_option_index: 0,
        explanation: `The term "${wikiTitle}" correctly fits the context of the description.`
      });
    }

    // Q5: Objective/Challenge
    {
      const correctText = validSentences[3] || `A primary objective of specialists in the field is developing accurate models and protocols that account for variables within ${wikiTitle}.`;
      const qText = `When analyzing the primary concerns surrounding ${wikiTitle}, what is a major consideration or objective for researchers?`;
      questions.push({
        question_text: qText,
        options: [correctText, ...getDistractors(correctText)],
        correct_option_index: 0,
        explanation: `Expert consensus highlights that: ${correctText}`
      });
    }

    // Shuffle options of all generated questions
    return questions.map(q => shuffleQuestionOptions(q));
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
