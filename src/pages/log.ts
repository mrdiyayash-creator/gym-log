// Log page — main workout logger

import { icon } from '../utils/icons';
import { toDateKey, addDays, isToday, getDayName, formatDateFull, relativeDateLabel } from '../utils/date';
import { getUnit } from '../utils/units';
import { getOrCreateWorkout, addExerciseToWorkout, getExerciseHistory, saveWorkout, getLastSameDayWorkout } from '../db/workouts';
import { getSuggestions, updatePatterns } from '../db/predictions';
import { getExercise, getGroupedExercises, toggleStar, addCustomExercise } from '../db/exercises';
import { MUSCLE_GROUPS } from '../data/exercise-seed';
import { type Workout, type WorkoutEntry, type Exercise } from '../db/database';
import { showToast } from '../components/toast';
import { renderSetRowTemplate, renderExerciseEntryTemplate, renderMuscleGroupTemplate } from '../views/log-templates';

let currentDate = new Date();
let workout: Workout | null = null;
let exerciseCache: Record<string, Exercise> = {};
let pageEl: HTMLElement | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
// Track collapsed state: muscle groups and individual exercises
let collapsedGroups: Set<string> = new Set();
let collapsedExercises: Set<string> = new Set();

function dateKey(): string { return toDateKey(currentDate); }

async function loadExercise(id: string): Promise<Exercise | undefined> {
  if (exerciseCache[id]) return exerciseCache[id];
  const ex = await getExercise(id);
  if (ex) exerciseCache[id] = ex;
  return ex;
}



function summarizeSets(sets: { weight: number; reps: number; completed: boolean }[]): string {
  const valid = sets.filter(s => s.weight > 0 || s.reps > 0);
  if (valid.length === 0) return 'No sets';
  const weights = [...new Set(valid.map(s => s.weight))];
  const reps = [...new Set(valid.map(s => s.reps))];
  if (weights.length === 1 && weights[0] > 0 && reps.length === 1) {
    return `${valid.length}×${reps[0]} @ ${weights[0]} ${getUnit()}`;
  }
  if (weights.length === 1 && weights[0] > 0) {
    const repRange = `${Math.min(...valid.map(s => s.reps))}-${Math.max(...valid.map(s => s.reps))}`;
    return `${valid.length}× ${repRange} @ ${weights[0]} ${getUnit()}`;
  }
  return `${valid.length} set${valid.length > 1 ? 's' : ''}`;
}

function debounceSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    if (workout) {
      await saveWorkout(workout);
    }
  }, 800);
}

async function flushPatterns(): Promise<void> {
  if (workout && workout.entries.length > 0) {
    await saveWorkout(workout);
    await updatePatterns(workout);
  }
}

// Removed renderSetRow, now using renderSetRowTemplate

async function renderExerciseEntry(entry: WorkoutEntry): Promise<string> {
  const ex = await loadExercise(entry.exerciseId);
  if (!ex) return '';
  const isCollapsed = collapsedExercises.has(entry.exerciseId);
  
  // Get previous session data for ghost text
  const history = await getExerciseHistory(entry.exerciseId, 2);
  const prevSets = history.length > 0 ? history[0].entry.sets : undefined;

  return renderExerciseEntryTemplate(ex, entry, isCollapsed, prevSets, summarizeSets(entry.sets), getUnit());
}

async function renderGroupedEntries(): Promise<string> {
  if (!workout || workout.entries.length === 0) return '';

  // Group entries by muscle group
  const groups: Record<string, WorkoutEntry[]> = {};
  for (const entry of workout.entries) {
    const ex = await loadExercise(entry.exerciseId);
    const group = ex?.muscleGroup || 'other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(entry);
  }

  let html = '';
  for (const [groupKey, entries] of Object.entries(groups)) {
    const groupInfo = MUSCLE_GROUPS[groupKey] || { label: 'Other', icon: '📋', color: '#7c5cfc' };
    const isGroupCollapsed = collapsedGroups.has(groupKey);
    const totalSets = entries.reduce((sum, e) => sum + e.sets.filter(s => s.weight > 0 || s.reps > 0).length, 0);

    let entriesHTML = '';
    for (const entry of entries) {
      entriesHTML += await renderExerciseEntry(entry);
    }

    html += renderMuscleGroupTemplate(groupKey, groupInfo, entriesHTML, entries.length, totalSets, isGroupCollapsed);
  }

  return html;
}

async function renderSuggestions(): Promise<string> {
  const suggestedIds = await getSuggestions(currentDate.getDay(), 6);
  if (suggestedIds.length === 0) return '';
  
  const suggestions: { id: string; name: string }[] = [];
  for (const id of suggestedIds) {
    if (workout?.entries.some(e => e.exerciseId === id)) continue;
    const ex = await loadExercise(id);
    if (ex) suggestions.push({ id: ex.id, name: ex.name });
  }
  if (suggestions.length === 0) return '';

  return `
    <div class="log-suggestions">
      <div class="section-subtitle">${icon('brain')} Suggested for ${getDayName(currentDate)}</div>
      <div class="log-suggestions__list">
        ${suggestions.map(s => `
          <button class="suggestion-chip" data-action="add-suggestion" data-exercise-id="${s.id}">
            ${icon('plus')} ${s.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

async function refreshPage(): Promise<void> {
  if (!pageEl) return;

  pageEl.innerHTML = `
    <div style="padding: var(--page-padding)">
      <div class="skeleton skeleton-text" style="width:50%;height:32px;margin-bottom:24px"></div>
      <div class="skeleton skeleton-card" style="height:64px;margin-bottom:32px"></div>
      <div class="skeleton skeleton-text" style="width:30%;height:16px;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px;margin-bottom:32px">
        <div class="skeleton skeleton-card" style="flex:1;height:40px"></div>
        <div class="skeleton skeleton-card" style="flex:1;height:40px"></div>
        <div class="skeleton skeleton-card" style="flex:1;height:40px"></div>
      </div>
      <div class="skeleton skeleton-card" style="height:120px"></div>
    </div>
  `;

  try {
    workout = await getOrCreateWorkout(dateKey());
    exerciseCache = {};

    const dayLabel = isToday(currentDate) ? 'Today' : relativeDateLabel(currentDate);
    const groupedHTML = await renderGroupedEntries();
    const suggestionsHTML = await renderSuggestions();

    let repeatHTML = '';
    if (workout.entries.length === 0) {
      const prev = await getLastSameDayWorkout(currentDate);
      if (prev) {
        repeatHTML = `
          <button class="repeat-workout-btn" id="repeat-workout-btn" data-prev="${prev.date}">
            ${icon('rotateCcw')} Copy from last ${getDayName(currentDate)}
          </button>
        `;
      }
    }

    pageEl.innerHTML = `
      <div class="stagger-in">
        <div class="log-header">
          <div class="log-date-nav">
            <button class="log-date-nav__btn" data-action="prev-day" id="log-prev-day" aria-label="Previous day">${icon('chevronLeft')}</button>
            <div class="log-date-display">
              <div class="log-date-display__day">${dayLabel}</div>
              <div class="log-date-display__full">${formatDateFull(currentDate)}</div>
            </div>
            <button class="log-date-nav__btn" data-action="next-day" id="log-next-day" aria-label="Next day">${icon('chevronRight')}</button>
          </div>
        </div>

        <div class="log-bodyweight">
          <div class="log-bodyweight__icon">${icon('scale')}</div>
          <div class="log-bodyweight__label">Body Weight</div>
          <input type="number" class="log-bodyweight__input" id="log-body-weight"
            value="${workout.bodyWeight || ''}" placeholder="—"
            inputmode="decimal" step="0.1" />
          <span class="log-bodyweight__unit">${getUnit()}</span>
        </div>

        ${repeatHTML}

        ${suggestionsHTML}

        <div class="log-exercises" id="log-exercises-list">
          ${groupedHTML}
        </div>

        <button class="add-exercise-btn" id="add-exercise-btn" style="margin-top: var(--space-md)">
          ${icon('plus')} Add Exercise
        </button>
      </div>
    `;

    attachLogEvents();
  } catch (err) {
    console.error('Log page render error:', err);
    pageEl.innerHTML = `<div style="padding:20px;color:#f87171;">Error loading log: ${err}</div>`;
  }
}

function attachLogEvents(): void {
  if (!pageEl) return;

  // Date navigation
  pageEl.querySelector('[data-action="prev-day"]')?.addEventListener('click', async () => {
    await flushPatterns();
    currentDate = addDays(currentDate, -1);
    refreshPage();
  });
  pageEl.querySelector('[data-action="next-day"]')?.addEventListener('click', async () => {
    await flushPatterns();
    currentDate = addDays(currentDate, 1);
    refreshPage();
  });

  // Body weight
  pageEl.querySelector('#log-body-weight')?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (workout) {
      workout.bodyWeight = isNaN(val) ? null : val;
      debounceSave();
    }
  });

  // Add exercise
  pageEl.querySelector('#add-exercise-btn')?.addEventListener('click', () => openExercisePicker());

  // Copy previous workout
  pageEl.querySelector('#repeat-workout-btn')?.addEventListener('click', async (e) => {
    const btn = e.target as HTMLElement;
    const prevId = btn.closest('button')?.getAttribute('data-prev');
    if (prevId && workout) {
      const prevWorkout = await getOrCreateWorkout(prevId);
      if (prevWorkout && prevWorkout.entries.length > 0) {
        // Deep copy entries
        workout.entries = prevWorkout.entries.map(en => ({
          exerciseId: en.exerciseId,
          sets: en.sets.map(s => ({ weight: s.weight, reps: s.reps, completed: false })),
          notes: ''
        }));
        debounceSave();
        showToast('Workout copied', 'success');
        refreshPage();
      }
    }
  });

  // Suggestions
  pageEl.querySelectorAll('[data-action="add-suggestion"]').forEach(el => {
    el.addEventListener('click', async () => {
      const id = el.getAttribute('data-exercise-id');
      if (id) {
        await addExerciseToWorkout(dateKey(), id);
        showToast('Exercise added', 'success');
        refreshPage();
      }
    });
  });

  // Set input events + click events (delegation)
  const list = pageEl.querySelector('#log-exercises-list');
  if (list) {
    list.addEventListener('input', handleSetInput);
    list.addEventListener('click', handleListClick);
    // Add notes handler
    list.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      if (!target.classList.contains('exercise-notes')) return;
      const exerciseId = target.getAttribute('data-exercise');
      if (!exerciseId || !workout) return;
      const entry = workout.entries.find(en => en.exerciseId === exerciseId);
      if (entry) {
        entry.notes = target.value;
        debounceSave();
      }
    });
  }

  // Swipe gesture for date navigation
  let touchStartX = 0;
  let touchStartY = 0;
  pageEl.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  pageEl.addEventListener('touchend', async (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    // Only trigger on horizontal swipes > 80px, and not too vertical
    if (Math.abs(dx) > 80 && Math.abs(dy) < Math.abs(dx) * 0.5) {
      if (dx > 0) {
        // Swipe right → previous day
        await flushPatterns();
        currentDate = addDays(currentDate, -1);
        refreshPage();
      } else {
        // Swipe left → next day
        await flushPatterns();
        currentDate = addDays(currentDate, 1);
        refreshPage();
      }
    }
  }, { passive: true });
}

function handleSetInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (!target.classList.contains('set-row__input')) return;
  
  const row = target.closest('.set-row') as HTMLElement;
  if (!row) return;
  const exerciseId = row.getAttribute('data-exercise');
  const setIdx = parseInt(row.getAttribute('data-set') || '0');
  if (!exerciseId || !workout) return;

  const entry = workout.entries.find(en => en.exerciseId === exerciseId);
  if (!entry || !entry.sets[setIdx]) return;

  const field = target.getAttribute('data-field');
  const val = parseFloat(target.value) || 0;
  if (field === 'weight') entry.sets[setIdx].weight = val;
  if (field === 'reps') entry.sets[setIdx].reps = val;
  
  debounceSave();

  // Update summary
  const entryEl = pageEl?.querySelector(`#entry-${exerciseId}`);
  const summaryEl = entryEl?.querySelector('.exercise-entry__summary');
  if (summaryEl) summaryEl.textContent = summarizeSets(entry.sets);
}

async function handleListClick(e: Event): Promise<void> {
  const target = e.target as HTMLElement;

  // ── Specific set-row actions (check FIRST, before broad collapse handlers) ──

  // Delete individual set (with confirmation)
  const delSetBtn = target.closest('[data-action="delete-set"]') as HTMLElement;
  if (delSetBtn) {
    const exerciseId = delSetBtn.getAttribute('data-exercise');
    const setIdx = parseInt(delSetBtn.getAttribute('data-set') || '-1');
    if (exerciseId && workout && setIdx >= 0) {
      const entry = workout.entries.find(en => en.exerciseId === exerciseId);
      if (entry && entry.sets.length > 1) {
        showDeleteConfirm(`Set ${setIdx + 1}`, () => {
          if (!workout) return;
          const entry = workout.entries.find(en => en.exerciseId === exerciseId);
          if (!entry) return;
          entry.sets.splice(setIdx, 1);
          debounceSave();

          // Animate and remove the row from DOM
          const row = delSetBtn.closest('.set-row') as HTMLElement;
          if (row) {
            row.style.transition = 'all 0.2s ease';
            row.style.opacity = '0';
            row.style.height = row.offsetHeight + 'px';
            requestAnimationFrame(() => {
              row.style.height = '0';
              row.style.marginBottom = '0';
              row.style.overflow = 'hidden';
            });
            setTimeout(() => {
              row.remove();

              // Renumber remaining set rows
              const entryEl = pageEl?.querySelector(`#entry-${exerciseId}`);
              if (entryEl) {
                const rows = entryEl.querySelectorAll('.set-row');
                rows.forEach((r, i) => {
                  r.setAttribute('data-set', String(i));
                  const numEl = r.querySelector('.set-row__num');
                  if (numEl) numEl.textContent = String(i + 1);
                  const delBtn = r.querySelector('[data-action="delete-set"]') as HTMLElement;
                  if (delBtn) {
                    delBtn.setAttribute('data-set', String(i));
                    delBtn.style.visibility = rows.length <= 1 ? 'hidden' : '';
                  }
                });

                // Update summary
                const summaryEl = entryEl.querySelector('.exercise-entry__summary');
                if (summaryEl) summaryEl.textContent = summarizeSets(entry.sets);
              }
            }, 220);
          }
        });
      }
    }
    return;
  }

  // Add set
  const addSetBtn = target.closest('[data-action="add-set"]') as HTMLElement;
  if (addSetBtn) {
    const exerciseId = addSetBtn.getAttribute('data-exercise');
    if (exerciseId && workout) {
      const entry = workout.entries.find(en => en.exerciseId === exerciseId);
      if (entry) {
        const lastSet = entry.sets[entry.sets.length - 1];
        const newSet = { weight: lastSet?.weight || 0, reps: lastSet?.reps || 0, completed: false };
        entry.sets.push(newSet);
        debounceSave();
        
        // Insert new row into DOM
        const newRowHTML = renderSetRowTemplate(newSet, entry.sets.length - 1, exerciseId, entry.sets.length);
        const temp = document.createElement('div');
        temp.innerHTML = newRowHTML;
        const newRow = temp.firstElementChild!;
        addSetBtn.parentElement!.insertBefore(newRow, addSetBtn);
        
        // Update summary
        const entryEl = pageEl?.querySelector(`#entry-${exerciseId}`);
        const summaryEl = entryEl?.querySelector('.exercise-entry__summary');
        if (summaryEl) summaryEl.textContent = summarizeSets(entry.sets);
      }
    }
    return;
  }

  // Remove exercise — with confirmation dialog
  const removeBtn = target.closest('[data-action="remove"]') as HTMLElement;
  if (removeBtn) {
    const exerciseId = removeBtn.getAttribute('data-exercise');
    if (exerciseId && workout) {
      const ex = await loadExercise(exerciseId);
      const name = ex?.name || 'this exercise';
      
      showDeleteConfirm(name, () => {
        if (!workout) return;
        workout.entries = workout.entries.filter(e => e.exerciseId !== exerciseId);
        debounceSave();
        
        const entryEl = pageEl?.querySelector(`#entry-${exerciseId}`);
        if (entryEl) {
          (entryEl as HTMLElement).style.transition = 'all 0.25s ease';
          (entryEl as HTMLElement).style.opacity = '0';
          (entryEl as HTMLElement).style.height = entryEl.scrollHeight + 'px';
          requestAnimationFrame(() => {
            (entryEl as HTMLElement).style.height = '0';
            (entryEl as HTMLElement).style.marginBottom = '0';
            (entryEl as HTMLElement).style.padding = '0';
          });
          setTimeout(() => {
            entryEl.remove();
            const sections = pageEl?.querySelectorAll('.muscle-group-section');
            sections?.forEach(sec => {
              if (sec.querySelectorAll('.exercise-entry').length === 0) {
                (sec as HTMLElement).style.transition = 'all 0.2s ease';
                (sec as HTMLElement).style.opacity = '0';
                setTimeout(() => sec.remove(), 200);
              }
            });
          }, 250);
        }
        showToast('Exercise removed', 'info');
      });
    }
    return;
  }

  // ── Broad collapse handlers (checked LAST) ──

  // Toggle muscle group collapse
  const groupHeader = target.closest('[data-action="toggle-group"]') as HTMLElement;
  if (groupHeader) {
    const groupKey = groupHeader.getAttribute('data-group');
    if (groupKey) {
      const section = groupHeader.closest('.muscle-group-section') as HTMLElement;
      if (collapsedGroups.has(groupKey)) {
        collapsedGroups.delete(groupKey);
        section?.classList.remove('collapsed');
      } else {
        collapsedGroups.add(groupKey);
        section?.classList.add('collapsed');
      }
    }
    return;
  }

  // Toggle exercise collapse
  const exHeader = target.closest('[data-action="toggle-exercise"]') as HTMLElement;
  if (exHeader) {
    const exerciseId = exHeader.getAttribute('data-exercise');
    if (exerciseId) {
      const entryEl = exHeader.closest('.exercise-entry') as HTMLElement;
      if (collapsedExercises.has(exerciseId)) {
        collapsedExercises.delete(exerciseId);
        entryEl?.classList.remove('collapsed');
      } else {
        collapsedExercises.add(exerciseId);
        entryEl?.classList.add('collapsed');
      }
    }
    return;
  }
}

// Delete confirmation popup
function showDeleteConfirm(exerciseName: string, onConfirm: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '0 32px';
  
  overlay.innerHTML = `
    <div style="
      width: 100%; max-width: 320px; margin: 0 auto;
      background: var(--bg-modal); border: 1px solid var(--border-medium);
      border-radius: var(--radius-lg); padding: 24px;
      text-align: center;
    ">
      <div style="
        width: 48px; height: 48px; border-radius: var(--radius-full);
        background: var(--accent-danger-dim); margin: 0 auto 16px;
        display: flex; align-items: center; justify-content: center;
      ">
        ${icon('trash')}
      </div>
      <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: 8px; color: var(--text-primary);">
        Remove Exercise?
      </div>
      <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: 20px;">
        Remove <strong>${exerciseName}</strong> and all its sets from this workout?
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary" id="confirm-cancel" style="flex:1;">Cancel</button>
        <button class="btn" id="confirm-delete" style="flex:1; background: var(--accent-danger); color: white;">Remove</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#confirm-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#confirm-delete')?.addEventListener('click', () => {
    close();
    onConfirm();
  });
}

// ── Exercise Picker Modal ──
async function openExercisePicker(): Promise<void> {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'exercise-picker-overlay';

  const grouped = await getGroupedExercises();
  const groups = Object.keys(MUSCLE_GROUPS);
  let activeGroup = 'all';

  function renderList(exercises: Exercise[]): string {
    if (exercises.length === 0) return '<div class="empty-state"><div class="empty-state__text">No exercises found</div></div>';
    return exercises.map(ex => `
      <div class="picker-item" data-exercise-id="${ex.id}">
        <button class="picker-item__star ${ex.isStarred ? 'starred' : ''}" data-action="star" data-id="${ex.id}" aria-label="${ex.isStarred ? 'Unstar' : 'Star'} exercise">
          ${ex.isStarred ? icon('starFilled') : icon('star')}
        </button>
        <span class="picker-item__name">${ex.name}</span>
        <div class="picker-item__add" data-action="pick" data-id="${ex.id}">
          ${icon('plus')}
        </div>
      </div>
    `).join('');
  }

  function getAllExercisesFlat(): Exercise[] {
    return Object.values(grouped).flat();
  }

  function getFilteredExercises(group: string, query: string): Exercise[] {
    let list = group === 'all' ? getAllExercisesFlat() : (grouped[group] || []);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      if (a.isStarred !== b.isStarred) return a.isStarred ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <span class="modal__title">Add Exercise</span>
        <button class="btn-icon btn-ghost" id="picker-close" aria-label="Close picker">${icon('x')}</button>
      </div>
      <div class="picker-search">
        <div class="picker-search-wrapper">
          ${icon('search')}
          <input type="text" class="picker-search__input" id="picker-search-input" placeholder="Search exercises..." />
        </div>
      </div>
      <div class="picker-groups" id="picker-groups">
        <button class="chip chip--active" data-group="all">All</button>
        ${groups.map(g => `
          <button class="chip" data-group="${g}"><span class="chip__icon">${icon(MUSCLE_GROUPS[g].icon)}</span> ${MUSCLE_GROUPS[g].label}</button>
        `).join('')}
      </div>
      <div class="picker-list modal__body" id="picker-list">
        ${renderList(getFilteredExercises('all', ''))}
      </div>
      <div style="padding: 12px 24px; border-top: 1px solid var(--border-subtle); flex-shrink: 0;">
        <button class="btn btn-secondary btn-sm w-full" id="picker-add-custom">
          ${icon('plus')} Create Custom Exercise
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.querySelector('#picker-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const searchInput = overlay.querySelector('#picker-search-input') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    const listEl = overlay.querySelector('#picker-list');
    if (listEl) listEl.innerHTML = renderList(getFilteredExercises(activeGroup, searchInput.value));
  });

  overlay.querySelector('#picker-groups')?.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('.chip') as HTMLElement;
    if (!chip) return;
    activeGroup = chip.getAttribute('data-group') || 'all';
    overlay.querySelectorAll('#picker-groups .chip').forEach(c => c.classList.remove('chip--active'));
    chip.classList.add('chip--active');
    const listEl = overlay.querySelector('#picker-list');
    if (listEl) listEl.innerHTML = renderList(getFilteredExercises(activeGroup, searchInput?.value || ''));
  });

  overlay.querySelector('#picker-list')?.addEventListener('click', async (e) => {
    const pickBtn = (e.target as HTMLElement).closest('[data-action="pick"]') as HTMLElement;
    if (pickBtn) {
      const id = pickBtn.getAttribute('data-id');
      if (id) {
        await addExerciseToWorkout(dateKey(), id);
        showToast('Exercise added', 'success');
        close();
        refreshPage();
      }
      return;
    }

    const starBtn = (e.target as HTMLElement).closest('[data-action="star"]') as HTMLElement;
    if (starBtn) {
      const id = starBtn.getAttribute('data-id');
      if (id) {
        const isStarred = await toggleStar(id);
        starBtn.classList.toggle('starred', isStarred);
        starBtn.innerHTML = isStarred ? icon('starFilled') : icon('star');
        const ex = await getExercise(id);
        if (ex) {
          exerciseCache[id] = ex;
          const g = ex.muscleGroup;
          if (grouped[g]) {
            const idx = grouped[g].findIndex(e => e.id === id);
            if (idx >= 0) grouped[g][idx].isStarred = isStarred;
          }
        }
      }
    }
  });

  overlay.querySelector('#picker-add-custom')?.addEventListener('click', async () => {
    const name = prompt('Exercise name:');
    if (!name || !name.trim()) return;

    // If a specific group is selected, use it. Otherwise, ask.
    let group = activeGroup !== 'all' ? activeGroup : '';
    if (!group) {
      const groupNames = Object.keys(MUSCLE_GROUPS);
      const groupLabels = groupNames.map((g, i) => `${i + 1}. ${MUSCLE_GROUPS[g].label}`).join('\n');
      const choice = prompt(`Select muscle group (enter number):\n${groupLabels}`);
      const idx = parseInt(choice || '') - 1;
      group = groupNames[idx] || 'chest';
    }

    const ex = await addCustomExercise(name.trim(), group);
    await addExerciseToWorkout(dateKey(), ex.id);
    showToast(`"${name}" added to ${MUSCLE_GROUPS[group]?.label || group}`, 'success');
    close();
    refreshPage();
  });

  setTimeout(() => searchInput?.focus(), 300);
}

let cleanupFn: (() => void) | null = null;

export async function renderLog(container: HTMLElement): Promise<void> {
  // Clean up previous instance
  if (cleanupFn) cleanupFn();

  pageEl = container;
  currentDate = new Date();
  collapsedGroups = new Set();
  collapsedExercises = new Set();
  await refreshPage();

  // Save patterns when user navigates away
  const onBeforeUnload = () => flushPatterns();
  window.addEventListener('beforeunload', onBeforeUnload);
  cleanupFn = () => {
    flushPatterns();
    window.removeEventListener('beforeunload', onBeforeUnload);
  };
}
