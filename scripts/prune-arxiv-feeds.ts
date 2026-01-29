/**
 * Keep only the top 50 most popular arXiv categories
 */

import { createClient } from '@supabase/supabase-js';

// Top 50 most popular/active arXiv categories
const TOP_50_CATEGORIES = [
  // Computer Science (most active)
  "cs.LG",   // Machine Learning
  "cs.AI",   // Artificial Intelligence
  "cs.CV",   // Computer Vision
  "cs.CL",   // Computation and Language (NLP)
  "cs.CR",   // Cryptography and Security
  "cs.RO",   // Robotics
  "cs.NE",   // Neural and Evolutionary Computing
  "cs.SE",   // Software Engineering
  "cs.DC",   // Distributed Computing
  "cs.DS",   // Data Structures and Algorithms
  "cs.IR",   // Information Retrieval
  "cs.HC",   // Human-Computer Interaction
  "cs.SI",   // Social and Information Networks
  "cs.PL",   // Programming Languages
  "cs.DB",   // Databases

  // Statistics
  "stat.ML", // Machine Learning (Stats)
  "stat.ME", // Methodology
  "stat.TH", // Statistics Theory

  // Physics
  "quant-ph",         // Quantum Physics
  "hep-th",           // High Energy Physics - Theory
  "hep-ph",           // High Energy Physics - Phenomenology
  "cond-mat.str-el",  // Strongly Correlated Electrons
  "cond-mat.mes-hall", // Mesoscale and Nanoscale Physics
  "cond-mat.mtrl-sci", // Materials Science
  "cond-mat.stat-mech", // Statistical Mechanics
  "gr-qc",            // General Relativity
  "astro-ph.CO",      // Cosmology
  "astro-ph.GA",      // Astrophysics of Galaxies
  "astro-ph.HE",      // High Energy Astrophysical Phenomena
  "physics.optics",   // Optics
  "physics.comp-ph",  // Computational Physics
  "physics.bio-ph",   // Biological Physics

  // Mathematics
  "math.OC",  // Optimization and Control
  "math.PR",  // Probability
  "math.ST",  // Statistics Theory
  "math.NA",  // Numerical Analysis
  "math.CO",  // Combinatorics
  "math.AG",  // Algebraic Geometry
  "math.NT",  // Number Theory
  "math.AP",  // Analysis of PDEs
  "math.DG",  // Differential Geometry

  // Quantitative Biology
  "q-bio.NC", // Neurons and Cognition
  "q-bio.GN", // Genomics
  "q-bio.QM", // Quantitative Methods

  // Electrical Engineering
  "eess.IV",  // Image and Video Processing
  "eess.SP",  // Signal Processing
  "eess.AS",  // Audio and Speech Processing

  // Economics/Finance
  "econ.EM",  // Econometrics
  "q-fin.ST", // Statistical Finance
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log(`Keeping top ${TOP_50_CATEGORIES.length} categories, deleting the rest...\n`);

  // Get all bot users
  const { data: allBots, error: fetchError } = await supabase
    .from("users")
    .select("orcid_id, name, bot_category")
    .eq("is_bot", true);

  if (fetchError) {
    console.error("Error fetching bots:", fetchError.message);
    process.exit(1);
  }

  const toKeep = allBots?.filter(b => TOP_50_CATEGORIES.includes(b.bot_category)) || [];
  const toDelete = allBots?.filter(b => !TOP_50_CATEGORIES.includes(b.bot_category)) || [];

  console.log(`Keeping: ${toKeep.length} bots`);
  console.log(`Deleting: ${toDelete.length} bots\n`);

  if (toDelete.length === 0) {
    console.log("Nothing to delete!");
    return;
  }

  // Delete bots not in top 50
  const orcidIds = toDelete.map(b => b.orcid_id);

  const { error: deleteError } = await supabase
    .from("users")
    .delete()
    .in("orcid_id", orcidIds);

  if (deleteError) {
    console.error("Error deleting bots:", deleteError.message);
    process.exit(1);
  }

  console.log(`Deleted ${toDelete.length} bot users.`);
  console.log("\nRemaining categories:");
  toKeep.forEach(b => console.log(`  - ${b.bot_category}: ${b.name}`));
}

main();
