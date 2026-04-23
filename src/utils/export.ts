// Export engine — JSON, CSV, and Markdown formats


import { getWorkoutsInRange } from '../db/workouts';
import { getAllExercises } from '../db/exercises';
import { formatDateFull } from './date';
import { fromDateKey } from './date';

export type ExportFormat = 'json' | 'csv' | 'markdown';

async function getExportData(from: Date, to: Date) {
  const workouts = await getWorkoutsInRange(from, to);
  const exercises = await getAllExercises();
  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));
  return { workouts: workouts.sort((a, b) => a.date.localeCompare(b.date)), exerciseMap };
}

export async function exportJSON(from: Date, to: Date): Promise<string> {
  const { workouts, exerciseMap } = await getExportData(from, to);
  const data = {
    exportDate: new Date().toISOString(),
    range: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
    totalWorkouts: workouts.length,
    workouts: workouts.map(w => ({
      date: w.date,
      bodyWeight: w.bodyWeight,
      unit: w.unit,
      exercises: w.entries.map(e => ({
        name: exerciseMap[e.exerciseId]?.name || e.exerciseId,
        muscleGroup: exerciseMap[e.exerciseId]?.muscleGroup || 'unknown',
        sets: e.sets.filter(s => s.weight > 0 || s.reps > 0).map(s => ({ weight: s.weight, reps: s.reps })),
        notes: e.notes || undefined,
      })),
    })),
  };
  return JSON.stringify(data, null, 2);
}

export async function exportCSV(from: Date, to: Date): Promise<string> {
  const { workouts, exerciseMap } = await getExportData(from, to);
  const rows = ['Date,Body Weight,Exercise,Muscle Group,Set,Weight,Reps'];
  for (const w of workouts) {
    for (const entry of w.entries) {
      const ex = exerciseMap[entry.exerciseId];
      entry.sets.forEach((s, i) => {
        if (s.weight > 0 || s.reps > 0) {
          rows.push([
            w.date,
            w.bodyWeight ?? '',
            `"${ex?.name || entry.exerciseId}"`,
            ex?.muscleGroup || 'unknown',
            i + 1,
            s.weight,
            s.reps,
          ].join(','));
        }
      });
    }
  }
  return rows.join('\n');
}

export async function exportMarkdown(from: Date, to: Date): Promise<string> {
  const { workouts, exerciseMap } = await getExportData(from, to);
  const lines: string[] = [];
  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  lines.push(`# Workout Log: ${fromStr} to ${toStr}`);
  lines.push(`\n> Exported on ${new Date().toLocaleDateString()} • ${workouts.length} workout sessions\n`);

  for (const w of workouts) {
    const date = fromDateKey(w.date);
    lines.push(`## ${formatDateFull(date)}`);
    if (w.bodyWeight) lines.push(`**Body Weight:** ${w.bodyWeight} ${w.unit}`);
    lines.push('');

    // Group entries by muscle group
    const groups: Record<string, typeof w.entries> = {};
    for (const entry of w.entries) {
      const group = exerciseMap[entry.exerciseId]?.muscleGroup || 'other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(entry);
    }

    for (const [group, entries] of Object.entries(groups)) {
      lines.push(`### ${group.charAt(0).toUpperCase() + group.slice(1)}`);
      lines.push('| Exercise | Set | Weight | Reps |');
      lines.push('|----------|-----|--------|------|');
      for (const entry of entries) {
        const name = exerciseMap[entry.exerciseId]?.name || entry.exerciseId;
        entry.sets.forEach((s, i) => {
          if (s.weight > 0 || s.reps > 0) {
            lines.push(`| ${name} | ${i + 1} | ${s.weight} ${w.unit} | ${s.reps} |`);
          }
        });
      }
      lines.push('');
    }

    // Summary
    let totalVol = 0;
    let totalSets = 0;
    for (const e of w.entries) {
      for (const s of e.sets) {
        if (s.weight > 0 && s.reps > 0) {
          totalVol += s.weight * s.reps;
          totalSets++;
        }
      }
    }
    lines.push(`**Summary:** ${w.entries.length} exercises, ${totalSets} sets, ${totalVol.toLocaleString()} ${w.unit} total volume\n`);
    lines.push('---\n');
  }

  return lines.join('\n');
}

export async function exportData(format: ExportFormat, from: Date, to: Date): Promise<string> {
  switch (format) {
    case 'json': return exportJSON(from, to);
    case 'csv': return exportCSV(from, to);
    case 'markdown': return exportMarkdown(from, to);
  }
}

export function downloadExport(content: string, format: ExportFormat): void {
  const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md';
  const mime = format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/markdown';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gymlog-export-${new Date().toISOString().split('T')[0]}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
