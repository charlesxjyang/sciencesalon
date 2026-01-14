export const JOURNAL_TO_FIELD: Record<string, string[]> = {
  // Physics
  "physical review letters": ["physics", "condensed-matter"],
  "physical review": ["physics"],
  "physical review a": ["physics", "quantum-physics"],
  "physical review b": ["physics", "condensed-matter"],
  "physical review c": ["physics", "nuclear-physics"],
  "physical review d": ["physics", "particle-physics"],
  "physical review e": ["physics", "statistical-physics"],
  "physical review x": ["physics"],
  "nature physics": ["physics"],
  "reviews of modern physics": ["physics"],
  "journal of physics": ["physics"],
  "physics reports": ["physics"],
  "new journal of physics": ["physics"],
  "quantum": ["quantum-physics", "physics"],

  // Quantum
  "npj quantum information": ["quantum-physics", "quantum-computing"],
  "quantum science and technology": ["quantum-physics", "quantum-computing"],
  "prx quantum": ["quantum-physics", "quantum-computing"],

  // Biology & Life Sciences
  "nature": ["multidisciplinary"],
  "science": ["multidisciplinary"],
  "cell": ["biology", "cell-biology"],
  "nature cell biology": ["cell-biology", "biology"],
  "molecular cell": ["cell-biology", "molecular-biology"],
  "nature genetics": ["genetics", "biology"],
  "genome research": ["genetics", "genomics"],
  "genome biology": ["genetics", "genomics"],
  "plos genetics": ["genetics"],
  "nature methods": ["biology", "methods"],
  "nature protocols": ["biology", "methods"],
  "elife": ["biology"],
  "plos biology": ["biology"],
  "current biology": ["biology"],

  // Neuroscience
  "nature neuroscience": ["neuroscience", "biology"],
  "neuron": ["neuroscience"],
  "journal of neuroscience": ["neuroscience"],
  "cerebral cortex": ["neuroscience"],
  "brain": ["neuroscience"],
  "neuroimage": ["neuroscience", "neuroimaging"],
  "plos computational biology": ["computational-biology", "biology"],

  // Chemistry
  "journal of the american chemical society": ["chemistry"],
  "angewandte chemie": ["chemistry"],
  "nature chemistry": ["chemistry"],
  "chemical reviews": ["chemistry"],
  "acs nano": ["chemistry", "nanotechnology"],
  "nano letters": ["nanotechnology", "chemistry"],

  // Computer Science & AI
  "journal of machine learning research": ["cs.LG", "machine-learning"],
  "neurips": ["cs.LG", "machine-learning"],
  "icml": ["cs.LG", "machine-learning"],
  "iclr": ["cs.LG", "machine-learning"],
  "aaai": ["cs.AI", "artificial-intelligence"],
  "ijcai": ["cs.AI", "artificial-intelligence"],
  "cvpr": ["cs.CV", "computer-vision"],
  "iccv": ["cs.CV", "computer-vision"],
  "eccv": ["cs.CV", "computer-vision"],
  "acl": ["cs.CL", "natural-language-processing"],
  "emnlp": ["cs.CL", "natural-language-processing"],
  "naacl": ["cs.CL", "natural-language-processing"],
  "transactions on pattern analysis": ["cs.CV", "machine-learning"],
  "ieee transactions on neural networks": ["cs.LG", "neural-networks"],
  "artificial intelligence": ["cs.AI", "artificial-intelligence"],
  "journal of artificial intelligence research": ["cs.AI"],

  // Robotics
  "ieee robotics and automation": ["cs.RO", "robotics"],
  "international journal of robotics research": ["cs.RO", "robotics"],
  "autonomous robots": ["cs.RO", "robotics"],
  "robotics and autonomous systems": ["cs.RO", "robotics"],
  "science robotics": ["cs.RO", "robotics"],

  // Medicine
  "new england journal of medicine": ["medicine"],
  "lancet": ["medicine"],
  "jama": ["medicine"],
  "bmj": ["medicine"],
  "nature medicine": ["medicine"],
  "annals of internal medicine": ["medicine"],

  // Multidisciplinary
  "pnas": ["multidisciplinary"],
  "proceedings of the national academy": ["multidisciplinary"],
  "scientific reports": ["multidisciplinary"],
  "nature communications": ["multidisciplinary"],
  "science advances": ["multidisciplinary"],
  "plos one": ["multidisciplinary"],

  // Mathematics
  "annals of mathematics": ["mathematics"],
  "inventiones mathematicae": ["mathematics"],
  "journal of the american mathematical society": ["mathematics"],
  "communications on pure and applied mathematics": ["mathematics"],

  // Economics
  "american economic review": ["economics"],
  "quarterly journal of economics": ["economics"],
  "econometrica": ["economics"],
  "journal of political economy": ["economics"],
  "review of economic studies": ["economics"],

  // Psychology
  "psychological science": ["psychology"],
  "journal of experimental psychology": ["psychology"],
  "cognition": ["psychology", "cognitive-science"],
  "trends in cognitive sciences": ["cognitive-science"],
};

/**
 * Map a journal title to research fields
 */
export function mapJournalToFields(journalTitle: string): string[] {
  if (!journalTitle) return [];

  const normalized = journalTitle.toLowerCase().trim();

  // Direct lookup
  if (JOURNAL_TO_FIELD[normalized]) {
    return JOURNAL_TO_FIELD[normalized];
  }

  // Partial match
  for (const [journal, fields] of Object.entries(JOURNAL_TO_FIELD)) {
    if (normalized.includes(journal) || journal.includes(normalized)) {
      return fields;
    }
  }

  return [];
}
