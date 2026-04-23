import { icon } from '../utils/icons';
import { type WorkoutEntry, type Exercise } from '../db/database';

export function renderSetRowTemplate(
  set: { weight: number; reps: number; completed: boolean }, 
  idx: number, 
  exerciseId: string, 
  totalSets: number, 
  prevSets?: { weight: number; reps: number }[]
): string {
  const prev = prevSets && prevSets[idx];
  const weightPlaceholder = prev ? `${prev.weight}` : '0';
  const repsPlaceholder = prev ? `${prev.reps}` : '0';
  
  return `
    <div class="set-row" data-exercise="${exerciseId}" data-set="${idx}">
      <div class="set-row__num">${idx + 1}</div>
      <input type="number" class="set-row__input set-weight" 
        value="${set.weight || ''}" placeholder="${weightPlaceholder}"
        inputmode="decimal" data-field="weight" />
      <input type="number" class="set-row__input set-reps" 
        value="${set.reps || ''}" placeholder="${repsPlaceholder}"
        inputmode="numeric" data-field="reps" />
      <button class="set-row__delete" data-action="delete-set" data-exercise="${exerciseId}" data-set="${idx}" style="${totalSets > 1 ? '' : 'visibility: hidden'}" aria-label="Delete set">
        ${icon('x')}
      </button>
    </div>
  `;
}

export function renderExerciseEntryTemplate(
  ex: Exercise,
  entry: WorkoutEntry,
  isCollapsed: boolean,
  prevSets: { weight: number; reps: number }[] | undefined,
  summaryText: string,
  unit: string
): string {
  const setsHTML = entry.sets.map((set, idx) => 
    renderSetRowTemplate(set, idx, entry.exerciseId, entry.sets.length, prevSets)
  ).join('');

  return `
    <div class="exercise-entry ${isCollapsed ? 'collapsed' : ''}" data-exercise-id="${entry.exerciseId}" id="entry-${entry.exerciseId}">
      <div class="exercise-entry__header" data-action="toggle-exercise" data-exercise="${entry.exerciseId}">
        <div class="exercise-entry__chevron">${icon('chevronRight')}</div>
        <div class="exercise-entry__info">
          <div class="exercise-entry__name">${ex.name}</div>
        </div>
        <span class="exercise-entry__summary">${summaryText}</span>
        <div class="exercise-entry__actions">
          <button class="exercise-entry__delete" data-action="remove" data-exercise="${entry.exerciseId}" aria-label="Remove exercise">
            ${icon('trash')}
          </button>
        </div>
      </div>
      <div class="exercise-sets-wrapper">
        <div class="exercise-sets">
          <div class="sets-header">
            <span>SET</span>
            <span>${unit.toUpperCase()}</span>
            <span>REPS</span>
            <span></span>
          </div>
          ${setsHTML}
          <button class="add-set-btn" data-action="add-set" data-exercise="${entry.exerciseId}">
            ${icon('plus')} Add Set
          </button>
          <textarea class="exercise-notes" data-exercise="${entry.exerciseId}" 
            placeholder="Notes (e.g., used belt, slow negatives...)"
            rows="1">${entry.notes || ''}</textarea>
        </div>
      </div>
    </div>
  `;
}

export function renderMuscleGroupTemplate(
  groupKey: string,
  groupInfo: { label: string; icon: string; color: string },
  entriesHTML: string,
  entriesCount: number,
  totalSets: number,
  isCollapsed: boolean
): string {
  return `
    <div class="muscle-group-section ${isCollapsed ? 'collapsed' : ''}" data-group="${groupKey}">
      <div class="muscle-group-header" data-action="toggle-group" data-group="${groupKey}" style="--group-color: ${groupInfo.color}">
        <div class="muscle-group-header__chevron">${icon('chevronRight')}</div>
        <span class="muscle-group-header__icon">${icon(groupInfo.icon)}</span>
        <span class="muscle-group-header__name">${groupInfo.label}</span>
        <span class="muscle-group-header__count">${entriesCount} exercise${entriesCount > 1 ? 's' : ''} · ${totalSets} sets</span>
      </div>
      <div class="muscle-group-body">
        ${entriesHTML}
      </div>
    </div>
  `;
}
