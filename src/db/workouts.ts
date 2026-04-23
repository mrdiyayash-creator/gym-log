// Workout CRUD operations

import { getDB, type Workout, type WorkoutEntry } from './database';
import { toDateKey } from '../utils/date';
import { getUnit } from '../utils/units';

export async function getWorkout(dateKey: string): Promise<Workout | undefined> {
  const db = await getDB();
  return db.get('workouts', dateKey);
}

export async function saveWorkout(workout: Workout): Promise<void> {
  const db = await getDB();
  workout.updatedAt = Date.now();
  await db.put('workouts', workout);
}

export async function getOrCreateWorkout(dateKey: string): Promise<Workout> {
  let w = await getWorkout(dateKey);
  if (!w) {
    w = {
      id: dateKey,
      date: dateKey,
      bodyWeight: null,
      unit: getUnit(),
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveWorkout(w);
  }
  return w;
}

export async function addExerciseToWorkout(dateKey: string, exerciseId: string): Promise<Workout> {
  const w = await getOrCreateWorkout(dateKey);
  // Don't add duplicates
  if (w.entries.some(e => e.exerciseId === exerciseId)) return w;
  w.entries.push({
    exerciseId,
    sets: [{ weight: 0, reps: 0, completed: false }],
    notes: '',
  });
  await saveWorkout(w);
  return w;
}

export async function removeExerciseFromWorkout(dateKey: string, exerciseId: string): Promise<Workout> {
  const w = await getOrCreateWorkout(dateKey);
  w.entries = w.entries.filter(e => e.exerciseId !== exerciseId);
  await saveWorkout(w);
  return w;
}

export async function updateWorkoutEntry(dateKey: string, exerciseId: string, entry: WorkoutEntry): Promise<void> {
  const w = await getOrCreateWorkout(dateKey);
  const idx = w.entries.findIndex(e => e.exerciseId === exerciseId);
  if (idx >= 0) {
    w.entries[idx] = entry;
    await saveWorkout(w);
  }
}

export async function updateBodyWeight(dateKey: string, weight: number | null): Promise<void> {
  const w = await getOrCreateWorkout(dateKey);
  w.bodyWeight = weight;
  await saveWorkout(w);
}

export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDB();
  return db.getAll('workouts');
}

export async function getWorkoutsInRange(from: Date, to: Date): Promise<Workout[]> {
  const db = await getDB();
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  const range = IDBKeyRange.bound(fromKey, toKey);
  const all = await db.getAllFromIndex('workouts', 'date', range);
  return all.filter(w => w.entries.length > 0);
}

export async function getWorkoutsWithData(): Promise<Workout[]> {
  const all = await getAllWorkouts();
  return all.filter(w => w.entries.length > 0).sort((a, b) => b.date.localeCompare(a.date));
}

// Get last N workouts containing a specific exercise
export async function getExerciseHistory(exerciseId: string, limit = 10): Promise<{ date: string; entry: WorkoutEntry }[]> {
  const all = await getWorkoutsWithData();
  const results: { date: string; entry: WorkoutEntry }[] = [];
  for (const w of all) {
    const entry = w.entries.find(e => e.exerciseId === exerciseId);
    if (entry) {
      results.push({ date: w.date, entry });
      if (results.length >= limit) break;
    }
  }
  return results;
}

export async function getLastSameDayWorkout(currentDate: Date): Promise<Workout | null> {
  const dow = currentDate.getDay();
  const all = await getWorkoutsWithData();
  const currentKey = toDateKey(currentDate);
  // Find most recent workout on the same day-of-week, excluding today
  for (const w of all) {
    if (w.date === currentKey) continue;
    const wDate = new Date(w.date + 'T00:00:00');
    if (wDate.getDay() === dow && w.entries.length > 0) {
      return w;
    }
  }
  return null;
}

// Calculate total volume for a workout
export function calcVolume(entries: WorkoutEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const set of entry.sets) {
      total += (set.weight || 0) * (set.reps || 0);
    }
  }
  return total;
}

// Calculate total sets
export function calcTotalSets(entries: WorkoutEntry[]): number {
  return entries.reduce((sum, e) => sum + e.sets.filter(s => s.completed || (s.weight > 0 && s.reps > 0)).length, 0);
}

// Get streak (consecutive days with workouts)
export async function getStreak(): Promise<number> {
  const workouts = await getWorkoutsWithData();
  if (workouts.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if today or yesterday has a workout (to not break streak mid-day)
  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(new Date(today.getTime() - 86400000));
  const dateSet = new Set(workouts.map(w => w.date));
  
  if (!dateSet.has(todayKey) && !dateSet.has(yesterdayKey)) return 0;

  let checkDate = dateSet.has(todayKey) ? today : new Date(today.getTime() - 86400000);
  
  while (dateSet.has(toDateKey(checkDate))) {
    streak++;
    checkDate = new Date(checkDate.getTime() - 86400000);
  }

  return streak;
}

// Personal records detection
export interface PR {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
}

export async function getRecentPRs(days = 7): Promise<PR[]> {
  const all = await getWorkoutsWithData();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = toDateKey(cutoff);

  // Build max weight map for each exercise across ALL history
  const maxWeightMap: Record<string, { weight: number; date: string }> = {};
  const recentPRs: PR[] = [];

  // Sort oldest first
  const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));

  for (const w of sorted) {
    for (const entry of w.entries) {
      const maxSet = entry.sets.reduce((best, s) => s.weight > best.weight ? s : best, { weight: 0, reps: 0, completed: false });
      if (maxSet.weight <= 0) continue;

      const prev = maxWeightMap[entry.exerciseId];
      if (!prev || maxSet.weight > prev.weight) {
        maxWeightMap[entry.exerciseId] = { weight: maxSet.weight, date: w.date };
        if (w.date >= cutoffKey) {
          recentPRs.push({
            exerciseId: entry.exerciseId,
            exerciseName: '', // filled later
            weight: maxSet.weight,
            reps: maxSet.reps,
            date: w.date,
          });
        }
      }
    }
  }

  // Only keep PRs that are still current maximums
  return recentPRs.filter(pr => {
    const current = maxWeightMap[pr.exerciseId];
    return current && current.weight === pr.weight && current.date === pr.date;
  }).slice(0, 5);
}
