/**
 * Tulip Compatibility Scoring Algorithm
 *
 * Dimensions and weights:
 *  1. Relationship goal   25 pts  — must align
 *  2. Religion            20 pts  — scaled by importance
 *  3. Lifestyle           20 pts  — smoking + drinking + exercise
 *  4. Family values       15 pts  — family_importance scale
 *  5. Hobbies             10 pts  — Jaccard overlap (boosted)
 *  6. Social style        10 pts  — social_frequency proximity
 *  Total                 100 pts
 */

const GOAL_COMPAT = {
  marriage:       { marriage: 1.0, companionship: 0.4, friendship: 0.1, open: 0.3 },
  companionship:  { marriage: 0.4, companionship: 1.0, friendship: 0.5, open: 0.6 },
  friendship:     { marriage: 0.1, companionship: 0.5, friendship: 1.0, open: 0.5 },
  open:           { marriage: 0.3, companionship: 0.6, friendship: 0.5, open: 1.0 },
};

const SMOKING_COMPAT = {
  never:        { never: 1.0, quit: 0.7, occasionally: 0.2, regularly: 0.0 },
  quit:         { never: 0.7, quit: 1.0, occasionally: 0.5, regularly: 0.2 },
  occasionally: { never: 0.2, quit: 0.5, occasionally: 1.0, regularly: 0.7 },
  regularly:    { never: 0.0, quit: 0.2, occasionally: 0.7, regularly: 1.0 },
};

/** Returns 0–1 score based on ordinal proximity. */
function ordinal(val1, val2, map) {
  const a = map[val1] ?? 0;
  const b = map[val2] ?? 0;
  const max = Math.max(...Object.values(map));
  const diff = Math.abs(a - b);
  return 1 - (diff / max) * 0.8;
}

function calculateCompatibilityScore(p1, p2) {
  const dims = [];

  // 1. Relationship goal (weight 25)
  if (p1.relationship_goal && p2.relationship_goal) {
    const score = GOAL_COMPAT[p1.relationship_goal]?.[p2.relationship_goal] ?? 0.5;
    dims.push({ score, weight: 25 });
  }

  // 2. Religion (weight 20)
  if (p1.religion != null && p2.religion != null) {
    const imp1 = (p1.religion_importance ?? 3) / 5;
    const imp2 = (p2.religion_importance ?? 3) / 5;
    const avgImp = (imp1 + imp2) / 2;

    let base;
    if (p1.religion === p2.religion)          base = 1.0;
    else if (p1.religion === 'none' || p2.religion === 'none') base = 0.55;
    else                                       base = 0.25;

    // High mutual importance amplifies compatibility if same religion, penalises if different
    const score = base + (p1.religion === p2.religion ? avgImp * 0.2 : -avgImp * 0.2);
    dims.push({ score: Math.max(0, Math.min(1, score)), weight: 20 });
  }

  // 3. Lifestyle (weight 20): smoking + drinking + exercise
  const lifestyle = [];
  if (p1.smoking && p2.smoking)
    lifestyle.push(SMOKING_COMPAT[p1.smoking]?.[p2.smoking] ?? 0.5);
  if (p1.drinking && p2.drinking)
    lifestyle.push(ordinal(p1.drinking, p2.drinking, { never: 0, rarely: 1, socially: 2, regularly: 3 }));
  if (p1.exercise_frequency && p2.exercise_frequency)
    lifestyle.push(ordinal(p1.exercise_frequency, p2.exercise_frequency, { never: 0, rarely: 1, sometimes: 2, regularly: 3 }));
  if (lifestyle.length)
    dims.push({ score: lifestyle.reduce((a, b) => a + b, 0) / lifestyle.length, weight: 20 });

  // 4. Family values (weight 15)
  if (p1.family_importance != null && p2.family_importance != null) {
    const diff = Math.abs(p1.family_importance - p2.family_importance);
    dims.push({ score: 1 - (diff / 4) * 0.8, weight: 15 });
  }

  // 5. Hobbies (weight 10) — Jaccard × 3 capped at 1
  if (p1.hobbies?.length && p2.hobbies?.length) {
    const s1 = new Set(p1.hobbies);
    const overlap = p2.hobbies.filter(h => s1.has(h)).length;
    const union = new Set([...p1.hobbies, ...p2.hobbies]).size;
    dims.push({ score: Math.min((overlap / union) * 3, 1), weight: 10 });
  }

  // 6. Social style (weight 10)
  if (p1.social_frequency && p2.social_frequency) {
    const map = { rarely: 0, sometimes: 1, often: 2, very_often: 3 };
    dims.push({ score: ordinal(p1.social_frequency, p2.social_frequency, map), weight: 10 });
  }

  if (!dims.length) return 50;

  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  const weightedSum = dims.reduce((s, d) => s + d.score * d.weight, 0);
  return Math.round((weightedSum / totalWeight) * 100);
}

module.exports = { calculateCompatibilityScore };
