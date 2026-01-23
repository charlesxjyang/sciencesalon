// Curated list of scientific topics based on arXiv, chemrxiv, and other classifications
// Each topic has a user-friendly name, description, and mappings to arXiv categories

export interface Topic {
  id: string;
  name: string;
  description: string;
  category: string; // Broad category for grouping
  arxivCategories?: string[]; // arXiv category codes that map to this topic
  keywords?: string[]; // Additional keywords for matching
}

export const TOPIC_CATEGORIES = [
  "Computer Science",
  "Physics",
  "Mathematics",
  "Biology",
  "Chemistry",
  "Earth & Environment",
  "Engineering",
  "Medicine & Health",
  "Social Sciences",
] as const;

export type TopicCategory = typeof TOPIC_CATEGORIES[number];

export const TOPICS: Topic[] = [
  // Computer Science
  {
    id: "ai-ml",
    name: "AI & Machine Learning",
    description: "Artificial intelligence, deep learning, neural networks",
    category: "Computer Science",
    arxivCategories: ["cs.AI", "cs.LG", "cs.NE", "stat.ML"],
    keywords: ["artificial intelligence", "machine learning", "deep learning", "neural network"],
  },
  {
    id: "nlp",
    name: "Natural Language Processing",
    description: "Language models, text analysis, computational linguistics",
    category: "Computer Science",
    arxivCategories: ["cs.CL"],
    keywords: ["nlp", "language model", "text mining", "computational linguistics"],
  },
  {
    id: "computer-vision",
    name: "Computer Vision",
    description: "Image recognition, object detection, visual AI",
    category: "Computer Science",
    arxivCategories: ["cs.CV"],
    keywords: ["computer vision", "image recognition", "object detection"],
  },
  {
    id: "robotics",
    name: "Robotics",
    description: "Robot systems, autonomous agents, control systems",
    category: "Computer Science",
    arxivCategories: ["cs.RO"],
    keywords: ["robotics", "autonomous", "robot"],
  },
  {
    id: "hci",
    name: "Human-Computer Interaction",
    description: "User interfaces, accessibility, interaction design",
    category: "Computer Science",
    arxivCategories: ["cs.HC"],
    keywords: ["human-computer interaction", "hci", "user interface", "ux"],
  },
  {
    id: "systems",
    name: "Systems & Networking",
    description: "Distributed systems, networks, operating systems",
    category: "Computer Science",
    arxivCategories: ["cs.DC", "cs.NI", "cs.OS"],
    keywords: ["distributed systems", "networking", "cloud computing"],
  },
  {
    id: "security",
    name: "Security & Cryptography",
    description: "Cybersecurity, encryption, privacy",
    category: "Computer Science",
    arxivCategories: ["cs.CR"],
    keywords: ["security", "cryptography", "privacy", "encryption"],
  },
  {
    id: "algorithms",
    name: "Algorithms & Theory",
    description: "Computational complexity, data structures, optimization",
    category: "Computer Science",
    arxivCategories: ["cs.DS", "cs.CC", "cs.DM"],
    keywords: ["algorithms", "complexity", "optimization"],
  },

  // Physics
  {
    id: "quantum-physics",
    name: "Quantum Physics",
    description: "Quantum mechanics, quantum computing, quantum information",
    category: "Physics",
    arxivCategories: ["quant-ph", "physics.atom-ph"],
    keywords: ["quantum", "qubit", "entanglement"],
  },
  {
    id: "condensed-matter",
    name: "Condensed Matter",
    description: "Solid state physics, superconductivity, materials physics",
    category: "Physics",
    arxivCategories: ["cond-mat"],
    keywords: ["condensed matter", "solid state", "superconductor"],
  },
  {
    id: "high-energy-physics",
    name: "High Energy Physics",
    description: "Particle physics, colliders, standard model",
    category: "Physics",
    arxivCategories: ["hep-th", "hep-ph", "hep-ex", "hep-lat"],
    keywords: ["particle physics", "high energy", "collider", "higgs"],
  },
  {
    id: "astrophysics",
    name: "Astrophysics & Cosmology",
    description: "Stars, galaxies, cosmology, dark matter",
    category: "Physics",
    arxivCategories: ["astro-ph"],
    keywords: ["astrophysics", "cosmology", "galaxy", "dark matter", "black hole"],
  },
  {
    id: "optics",
    name: "Optics & Photonics",
    description: "Light, lasers, optical systems",
    category: "Physics",
    arxivCategories: ["physics.optics"],
    keywords: ["optics", "photonics", "laser", "optical"],
  },
  {
    id: "nuclear-physics",
    name: "Nuclear Physics",
    description: "Nuclear reactions, radioactivity, nuclear structure",
    category: "Physics",
    arxivCategories: ["nucl-th", "nucl-ex"],
    keywords: ["nuclear", "radioactive", "isotope"],
  },

  // Mathematics
  {
    id: "pure-math",
    name: "Pure Mathematics",
    description: "Algebra, topology, number theory, geometry",
    category: "Mathematics",
    arxivCategories: ["math.AG", "math.NT", "math.GT", "math.AT", "math.GR"],
    keywords: ["algebra", "topology", "number theory", "geometry"],
  },
  {
    id: "applied-math",
    name: "Applied Mathematics",
    description: "Numerical methods, modeling, mathematical physics",
    category: "Mathematics",
    arxivCategories: ["math.NA", "math.AP", "math-ph"],
    keywords: ["applied mathematics", "numerical", "modeling"],
  },
  {
    id: "statistics",
    name: "Statistics",
    description: "Statistical methods, probability, data analysis",
    category: "Mathematics",
    arxivCategories: ["stat.TH", "stat.ME", "stat.AP", "math.ST", "math.PR"],
    keywords: ["statistics", "probability", "bayesian"],
  },

  // Biology
  {
    id: "molecular-biology",
    name: "Molecular Biology",
    description: "DNA, RNA, proteins, gene expression",
    category: "Biology",
    arxivCategories: ["q-bio.BM", "q-bio.GN"],
    keywords: ["molecular biology", "dna", "rna", "protein", "gene"],
  },
  {
    id: "cell-biology",
    name: "Cell Biology",
    description: "Cell structure, signaling, cellular processes",
    category: "Biology",
    arxivCategories: ["q-bio.CB", "q-bio.SC"],
    keywords: ["cell biology", "cellular", "cell signaling"],
  },
  {
    id: "neuroscience",
    name: "Neuroscience",
    description: "Brain, neurons, cognition, neural systems",
    category: "Biology",
    arxivCategories: ["q-bio.NC"],
    keywords: ["neuroscience", "brain", "neuron", "cognitive", "neural"],
  },
  {
    id: "genomics",
    name: "Genomics & Bioinformatics",
    description: "Genome sequencing, computational biology",
    category: "Biology",
    arxivCategories: ["q-bio.GN", "q-bio.QM"],
    keywords: ["genomics", "bioinformatics", "sequencing", "transcriptomics"],
  },
  {
    id: "ecology",
    name: "Ecology & Evolution",
    description: "Ecosystems, biodiversity, evolutionary biology",
    category: "Biology",
    arxivCategories: ["q-bio.PE"],
    keywords: ["ecology", "evolution", "biodiversity", "ecosystem"],
  },
  {
    id: "microbiology",
    name: "Microbiology",
    description: "Bacteria, viruses, microbiomes",
    category: "Biology",
    arxivCategories: [],
    keywords: ["microbiology", "bacteria", "virus", "microbiome", "pathogen"],
  },

  // Chemistry
  {
    id: "organic-chemistry",
    name: "Organic Chemistry",
    description: "Organic synthesis, reaction mechanisms",
    category: "Chemistry",
    arxivCategories: [],
    keywords: ["organic chemistry", "synthesis", "organic reaction"],
  },
  {
    id: "inorganic-chemistry",
    name: "Inorganic Chemistry",
    description: "Metals, coordination compounds, catalysis",
    category: "Chemistry",
    arxivCategories: [],
    keywords: ["inorganic chemistry", "coordination", "metal complex"],
  },
  {
    id: "physical-chemistry",
    name: "Physical Chemistry",
    description: "Thermodynamics, kinetics, spectroscopy",
    category: "Chemistry",
    arxivCategories: ["physics.chem-ph"],
    keywords: ["physical chemistry", "thermodynamics", "kinetics", "spectroscopy"],
  },
  {
    id: "biochemistry",
    name: "Biochemistry",
    description: "Enzymes, metabolism, biomolecules",
    category: "Chemistry",
    arxivCategories: [],
    keywords: ["biochemistry", "enzyme", "metabolism", "biomolecule"],
  },
  {
    id: "materials-chemistry",
    name: "Materials Chemistry",
    description: "Nanomaterials, polymers, materials synthesis",
    category: "Chemistry",
    arxivCategories: ["cond-mat.mtrl-sci"],
    keywords: ["materials chemistry", "nanomaterials", "polymer", "materials science"],
  },
  {
    id: "computational-chemistry",
    name: "Computational Chemistry",
    description: "Molecular modeling, simulations, DFT",
    category: "Chemistry",
    arxivCategories: [],
    keywords: ["computational chemistry", "molecular dynamics", "dft", "simulation"],
  },

  // Earth & Environment
  {
    id: "climate-science",
    name: "Climate Science",
    description: "Climate change, atmospheric science, meteorology",
    category: "Earth & Environment",
    arxivCategories: ["physics.ao-ph"],
    keywords: ["climate", "atmospheric", "meteorology", "global warming"],
  },
  {
    id: "geology",
    name: "Geology & Geophysics",
    description: "Earth structure, tectonics, seismology",
    category: "Earth & Environment",
    arxivCategories: ["physics.geo-ph"],
    keywords: ["geology", "geophysics", "seismic", "tectonic"],
  },
  {
    id: "environmental-science",
    name: "Environmental Science",
    description: "Pollution, sustainability, environmental impact",
    category: "Earth & Environment",
    arxivCategories: [],
    keywords: ["environmental", "pollution", "sustainability", "conservation"],
  },
  {
    id: "oceanography",
    name: "Oceanography",
    description: "Ocean systems, marine science",
    category: "Earth & Environment",
    arxivCategories: [],
    keywords: ["oceanography", "marine", "ocean"],
  },

  // Engineering
  {
    id: "electrical-engineering",
    name: "Electrical Engineering",
    description: "Circuits, electronics, signal processing",
    category: "Engineering",
    arxivCategories: ["eess.SP", "eess.SY"],
    keywords: ["electrical engineering", "electronics", "circuit", "signal processing"],
  },
  {
    id: "mechanical-engineering",
    name: "Mechanical Engineering",
    description: "Mechanics, thermodynamics, manufacturing",
    category: "Engineering",
    arxivCategories: [],
    keywords: ["mechanical engineering", "mechanics", "manufacturing"],
  },
  {
    id: "biomedical-engineering",
    name: "Biomedical Engineering",
    description: "Medical devices, tissue engineering, biomechanics",
    category: "Engineering",
    arxivCategories: [],
    keywords: ["biomedical engineering", "medical device", "tissue engineering"],
  },
  {
    id: "chemical-engineering",
    name: "Chemical Engineering",
    description: "Process engineering, reaction engineering",
    category: "Engineering",
    arxivCategories: [],
    keywords: ["chemical engineering", "process engineering", "reactor"],
  },
  {
    id: "aerospace",
    name: "Aerospace Engineering",
    description: "Aircraft, spacecraft, aerodynamics",
    category: "Engineering",
    arxivCategories: [],
    keywords: ["aerospace", "aerodynamics", "spacecraft", "aircraft"],
  },

  // Medicine & Health
  {
    id: "medicine",
    name: "Medicine & Clinical Research",
    description: "Clinical trials, treatments, diagnostics",
    category: "Medicine & Health",
    arxivCategories: [],
    keywords: ["medicine", "clinical", "treatment", "diagnostic", "therapy"],
  },
  {
    id: "public-health",
    name: "Public Health & Epidemiology",
    description: "Disease surveillance, health policy, epidemics",
    category: "Medicine & Health",
    arxivCategories: [],
    keywords: ["public health", "epidemiology", "epidemic", "health policy"],
  },
  {
    id: "pharmacology",
    name: "Pharmacology & Drug Discovery",
    description: "Drug development, pharmaceuticals, toxicology",
    category: "Medicine & Health",
    arxivCategories: [],
    keywords: ["pharmacology", "drug discovery", "pharmaceutical", "toxicology"],
  },
  {
    id: "immunology",
    name: "Immunology",
    description: "Immune system, vaccines, autoimmunity",
    category: "Medicine & Health",
    arxivCategories: [],
    keywords: ["immunology", "immune", "vaccine", "antibody"],
  },
  {
    id: "oncology",
    name: "Oncology",
    description: "Cancer research, tumors, cancer treatment",
    category: "Medicine & Health",
    arxivCategories: [],
    keywords: ["oncology", "cancer", "tumor", "carcinoma"],
  },

  // Social Sciences
  {
    id: "economics",
    name: "Economics",
    description: "Economic theory, markets, policy",
    category: "Social Sciences",
    arxivCategories: ["econ", "q-fin"],
    keywords: ["economics", "economic", "market", "financial"],
  },
  {
    id: "psychology",
    name: "Psychology",
    description: "Behavior, cognition, mental health",
    category: "Social Sciences",
    arxivCategories: [],
    keywords: ["psychology", "cognitive", "behavioral", "mental health"],
  },
  {
    id: "sociology",
    name: "Sociology",
    description: "Social structures, culture, demographics",
    category: "Social Sciences",
    arxivCategories: ["physics.soc-ph"],
    keywords: ["sociology", "social", "demographic", "cultural"],
  },
];

// Get topics grouped by category
export function getTopicsByCategory(): Record<TopicCategory, Topic[]> {
  const grouped = {} as Record<TopicCategory, Topic[]>;
  for (const category of TOPIC_CATEGORIES) {
    grouped[category] = TOPICS.filter((t) => t.category === category);
  }
  return grouped;
}

// Find topics that match an arXiv category
export function findTopicsByArxivCategory(arxivCategory: string): Topic[] {
  // Normalize the category (e.g., "cs.AI" or just "cs")
  const normalized = arxivCategory.toLowerCase();

  return TOPICS.filter((topic) => {
    if (!topic.arxivCategories) return false;
    return topic.arxivCategories.some((cat) => {
      const catLower = cat.toLowerCase();
      return catLower === normalized ||
             normalized.startsWith(catLower) ||
             catLower.startsWith(normalized.split(".")[0]);
    });
  });
}

// Find topics that match keywords in text (title, abstract, etc.)
export function findTopicsByKeywords(text: string): Topic[] {
  const textLower = text.toLowerCase();
  const matchedTopics: { topic: Topic; score: number }[] = [];

  for (const topic of TOPICS) {
    let score = 0;

    // Check keywords
    if (topic.keywords) {
      for (const keyword of topic.keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
    }

    // Check topic name
    if (textLower.includes(topic.name.toLowerCase())) {
      score += 2;
    }

    if (score > 0) {
      matchedTopics.push({ topic, score });
    }
  }

  // Sort by score and return unique topics
  return matchedTopics
    .sort((a, b) => b.score - a.score)
    .map((m) => m.topic);
}
