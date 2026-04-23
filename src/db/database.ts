// IndexedDB setup using idb library

import { openDB, type IDBPDatabase } from 'idb';
import { EXERCISES } from '../data/exercise-seed';

const DB_NAME = 'gymlog';
const DB_VERSION = 1;

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  isStarred: boolean;
  isCustom: boolean;
  createdAt: number;
}

export interface SetData {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutEntry {
  exerciseId: string;
  sets: SetData[];
  notes: string;
}

export interface Workout {
  id: string;        // date key e.g. "2026-04-23"
  date: string;
  bodyWeight: number | null;
  unit: string;
  entries: WorkoutEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface DayPattern {
  dayOfWeek: number;
  exerciseFrequency: Record<string, number>;
  lastUpdated: number;
}

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Exercises store
      if (!db.objectStoreNames.contains('exercises')) {
        const exStore = db.createObjectStore('exercises', { keyPath: 'id' });
        exStore.createIndex('muscleGroup', 'muscleGroup');
        exStore.createIndex('isStarred', 'isStarred');
      }

      // Workouts store
      if (!db.objectStoreNames.contains('workouts')) {
        const wStore = db.createObjectStore('workouts', { keyPath: 'id' });
        wStore.createIndex('date', 'date');
      }

      // Day patterns store
      if (!db.objectStoreNames.contains('dayPatterns')) {
        db.createObjectStore('dayPatterns', { keyPath: 'dayOfWeek' });
      }
    }
  });

  return dbInstance;
}

export async function seedExercises(): Promise<void> {
  const db = await getDB();
  const count = await db.count('exercises');
  if (count > 0) return; // already seeded

  const tx = db.transaction('exercises', 'readwrite');
  for (const ex of EXERCISES) {
    await tx.store.put({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      isStarred: false,
      isCustom: false,
      createdAt: Date.now(),
    });
  }
  await tx.done;
}

export async function initDB(): Promise<void> {
  await getDB();
  await seedExercises();
}
