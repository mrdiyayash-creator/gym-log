// Exercise CRUD operations

import { getDB, type Exercise } from './database';

export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDB();
  return db.getAll('exercises');
}

export async function getExercisesByGroup(group: string): Promise<Exercise[]> {
  const db = await getDB();
  return db.getAllFromIndex('exercises', 'muscleGroup', group);
}

export async function getStarredExercises(): Promise<Exercise[]> {
  const all = await getAllExercises();
  return all.filter(e => e.isStarred);
}

export async function toggleStar(id: string): Promise<boolean> {
  const db = await getDB();
  const ex = await db.get('exercises', id);
  if (!ex) return false;
  ex.isStarred = !ex.isStarred;
  await db.put('exercises', ex);
  return ex.isStarred;
}

export async function addCustomExercise(name: string, muscleGroup: string): Promise<Exercise> {
  const db = await getDB();
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const exercise: Exercise = {
    id: `custom-${id}-${Date.now()}`,
    name,
    muscleGroup,
    isStarred: false,
    isCustom: true,
    createdAt: Date.now(),
  };
  await db.put('exercises', exercise);
  return exercise;
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const all = await getAllExercises();
  const q = query.toLowerCase().trim();
  if (!q) return all;
  return all.filter(e => e.name.toLowerCase().includes(q));
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  const db = await getDB();
  return db.get('exercises', id);
}

export async function deleteExercise(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('exercises', id);
}

// Group exercises by muscle group, starred first
export async function getGroupedExercises(): Promise<Record<string, Exercise[]>> {
  const all = await getAllExercises();
  const grouped: Record<string, Exercise[]> = {};
  for (const ex of all) {
    if (!grouped[ex.muscleGroup]) grouped[ex.muscleGroup] = [];
    grouped[ex.muscleGroup].push(ex);
  }
  // Sort each group: starred first, then alphabetical
  for (const group of Object.keys(grouped)) {
    grouped[group].sort((a, b) => {
      if (a.isStarred !== b.isStarred) return a.isStarred ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }
  return grouped;
}
