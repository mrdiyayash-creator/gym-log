// Smart suggestion engine — learns what you do on which day

import { getDB, type DayPattern } from './database';
import { type Workout } from './database';
import { getExerciseHistory } from './workouts';

export async function updatePatterns(workout: Workout): Promise<void> {
  const db = await getDB();
  const date = new Date(workout.date + 'T00:00:00');
  const dow = date.getDay();

  let pattern = await db.get('dayPatterns', dow) as DayPattern | undefined;
  if (!pattern) {
    pattern = { dayOfWeek: dow, exerciseFrequency: {}, lastUpdated: Date.now() };
  }

  // Apply decay: reduce all existing frequencies by 10% before adding new data
  for (const key of Object.keys(pattern.exerciseFrequency)) {
    pattern.exerciseFrequency[key] *= 0.9;
    // Remove entries with negligible frequency
    if (pattern.exerciseFrequency[key] < 0.1) {
      delete pattern.exerciseFrequency[key];
    }
  }

  // Add current workout exercises
  for (const entry of workout.entries) {
    if (entry.sets.some(s => (s.weight > 0 && s.reps > 0) || s.completed)) {
      pattern.exerciseFrequency[entry.exerciseId] = (pattern.exerciseFrequency[entry.exerciseId] || 0) + 1;
    }
  }
  pattern.lastUpdated = Date.now();

  await db.put('dayPatterns', pattern);
}

export async function getSuggestions(dayOfWeek: number, limit = 8): Promise<string[]> {
  const db = await getDB();
  const pattern = await db.get('dayPatterns', dayOfWeek) as DayPattern | undefined;
  if (!pattern) return [];

  // Get starred exercises to boost
  const allExercises = await db.getAll('exercises');
  const starredSet = new Set(allExercises.filter(e => e.isStarred).map(e => e.id));

  // Score: frequency + 2x boost for starred
  const scored = Object.entries(pattern.exerciseFrequency).map(([id, freq]) => ({
    id,
    score: freq * (starredSet.has(id) ? 2 : 1),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.id);
}

export interface WeightPrediction {
  weight: number;
  reps: number;
  source: 'progressive' | 'last' | 'default';
}

export async function predictWeightReps(exerciseId: string): Promise<WeightPrediction> {
  const history = await getExerciseHistory(exerciseId, 3);
  if (history.length === 0) return { weight: 0, reps: 0, source: 'default' };

  const lastEntry = history[0].entry;
  const lastSet = lastEntry.sets.find(s => s.weight > 0 && s.reps > 0) || lastEntry.sets[0];

  if (history.length >= 3) {
    // Check for progressive overload pattern
    const weights = history.map(h => {
      const maxSet = h.entry.sets.reduce((best, s) => s.weight > best.weight ? s : best, { weight: 0, reps: 0, completed: false });
      return maxSet.weight;
    });

    // If weights have been consistently increasing
    if (weights[0] > weights[1] && weights[1] > weights[2]) {
      const increment = weights[0] - weights[1];
      return {
        weight: weights[0] + Math.min(increment, 5), // cap increment at 5
        reps: lastSet.reps,
        source: 'progressive',
      };
    }
  }

  return { weight: lastSet.weight, reps: lastSet.reps, source: 'last' };
}
