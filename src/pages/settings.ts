// Settings page — preferences, export, data management

import { icon } from '../utils/icons';
import { getUnit, setUnit, type WeightUnit } from '../utils/units';
import { exportData, downloadExport, type ExportFormat } from '../utils/export';
import { showToast } from '../components/toast';
import { getWorkoutsWithData } from '../db/workouts';
import { getAllExercises } from '../db/exercises';
import { getDB } from '../db/database';
import { getWeekStartDay, setWeekStartDay } from '../utils/date';
import { getRestDuration, setRestDuration } from '../components/rest-timer';

let pageEl: HTMLElement | null = null;

async function refresh(): Promise<void> {
  if (!pageEl) return;

  pageEl.innerHTML = `
    <div style="padding: var(--page-padding)">
      <div class="skeleton skeleton-text" style="width:40%;height:28px;margin-bottom:24px"></div>
      <div class="skeleton skeleton-card" style="height:60px"></div>
      <div class="skeleton skeleton-card" style="height:60px"></div>
      <div class="skeleton skeleton-card" style="height:60px"></div>
    </div>
  `;

  const unit = getUnit();
  const workouts = await getWorkoutsWithData();
  const exercises = await getAllExercises();
  const starredCount = exercises.filter(e => e.isStarred).length;
  const customCount = exercises.filter(e => e.isCustom).length;
  const weekStart = getWeekStartDay() === 0 ? 'Sun' : 'Mon';
  const restDuration = getRestDuration();

  pageEl.innerHTML = `
    <div class="stagger-in">
      <div class="settings-header">
        <h1 class="settings-header__title">Settings</h1>
      </div>

      <div class="settings-section">
        <div class="settings-section__title">Preferences</div>
        <div class="settings-item" id="setting-unit">
          <div class="settings-item__left">
            <div class="settings-item__icon settings-item__icon--purple">${icon('scale')}</div>
            <div class="settings-item__info">
              <div class="settings-item__name">Weight Unit</div>
              <div class="settings-item__desc">Toggle between kg and lbs</div>
            </div>
          </div>
          <div class="settings-item__right">
            <span class="settings-item__value">${unit.toUpperCase()}</span>
            <div class="toggle ${unit === 'lbs' ? 'active' : ''}" id="unit-toggle"></div>
          </div>
        </div>
        <div class="settings-item" id="setting-weekstart" style="cursor: pointer">
          <div class="settings-item__left">
            <div class="settings-item__icon settings-item__icon--blue">${icon('calendar')}</div>
            <div class="settings-item__info">
              <div class="settings-item__name">First Day of Week</div>
              <div class="settings-item__desc">Affects dashboard charts</div>
            </div>
          </div>
          <div class="settings-item__right">
            <span class="settings-item__value">${weekStart}</span>
            ${icon('chevronRight')}
          </div>
        </div>
        <div class="settings-item" id="setting-rest" style="cursor: pointer">
          <div class="settings-item__left">
            <div class="settings-item__icon settings-item__icon--green">${icon('clock')}</div>
            <div class="settings-item__info">
              <div class="settings-item__name">Auto Rest Timer</div>
              <div class="settings-item__desc">Duration after completing a set</div>
            </div>
          </div>
          <div class="settings-item__right">
            <span class="settings-item__value">${restDuration}s</span>
            ${icon('chevronRight')}
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section__title">Data Export</div>
        <div class="settings-item" style="cursor: pointer" id="setting-export">
          <div class="settings-item__left">
            <div class="settings-item__icon settings-item__icon--green">${icon('download')}</div>
            <div class="settings-item__info">
              <div class="settings-item__name">Export Workouts</div>
              <div class="settings-item__desc">JSON, CSV, or Markdown (LLM-friendly)</div>
            </div>
          </div>
          <div class="settings-item__right">
            ${icon('chevronRight')}
          </div>
        </div>
        <div class="settings-item" style="cursor: pointer" id="setting-import">
          <div class="settings-item__left">
            <div class="settings-item__icon settings-item__icon--blue">${icon('upload')}</div>
            <div class="settings-item__info">
              <div class="settings-item__name">Import Data</div>
              <div class="settings-item__desc">Upload previously exported JSON</div>
            </div>
          </div>
          <div class="settings-item__right">
            ${icon('chevronRight')}
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section__title">Exercises</div>
        <div class="settings-item">
          <div class="settings-item__left">
            <div class="settings-item__icon settings-item__icon--orange">${icon('star')}</div>
            <div class="settings-item__info">
              <div class="settings-item__name">Starred Exercises</div>
              <div class="settings-item__desc">Quick-access favorites</div>
            </div>
          </div>
          <div class="settings-item__right">
            <span class="badge badge--blue">${starredCount}</span>
          </div>
        </div>
        <div class="settings-item">
          <div class="settings-item__left">
            <div class="settings-item__icon settings-item__icon--purple">${icon('pencil')}</div>
            <div class="settings-item__info">
              <div class="settings-item__name">Custom Exercises</div>
              <div class="settings-item__desc">User-created exercises</div>
            </div>
          </div>
          <div class="settings-item__right">
            <span class="badge badge--blue">${customCount}</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section__title">Data</div>
        <div class="settings-item">
          <div class="settings-item__left">
            <div class="settings-item__icon settings-item__icon--blue">${icon('barChart')}</div>
            <div class="settings-item__info">
              <div class="settings-item__name">Stored Workouts</div>
              <div class="settings-item__desc">Total workout sessions logged</div>
            </div>
          </div>
          <div class="settings-item__right">
            <span class="badge badge--green">${workouts.length}</span>
          </div>
        </div>
        <div class="settings-warning">
          <span class="settings-warning__icon">${icon('alertTriangle')}</span> <strong>Recommendation:</strong> Please export a backup of your data using the "Export Workouts" option above before resetting the app.
        </div>
        <div class="settings-item settings-item--danger" id="setting-reset">
          <div class="settings-item__left">
            <div class="settings-item__icon settings-item__icon--red">${icon('trash')}</div>
            <div class="settings-item__info">
              <div class="settings-item__name" style="color: var(--accent-danger)">Reset All Data</div>
              <div class="settings-item__desc">Delete all workouts and patterns</div>
            </div>
          </div>
          <div class="settings-item__right">
            ${icon('chevronRight')}
          </div>
        </div>
      </div>

      <div style="text-align: center; padding: var(--space-xl) 0; color: var(--text-muted); font-size: var(--font-size-xs);">
        <div style="margin-bottom: 4px;">GymLog v1.0</div>
        <div>Built with <span class="settings-footer__heart">${icon('heart')}</span> for gains</div>
      </div>
    </div>
  `;

  // Unit toggle
  pageEl.querySelector('#unit-toggle')?.addEventListener('click', () => {
    const newUnit: WeightUnit = getUnit() === 'kg' ? 'lbs' : 'kg';
    setUnit(newUnit);
    showToast(`Display unit set to ${newUnit.toUpperCase()}. Existing values are not converted.`, 'info');
    refresh();
  });

  // Week Start toggle
  pageEl.querySelector('#setting-weekstart')?.addEventListener('click', () => {
    const current = getWeekStartDay();
    const next = current === 0 ? 1 : 0;
    setWeekStartDay(next);
    showToast(`Week start set to ${next === 0 ? 'Sunday' : 'Monday'}`, 'success');
    refresh();
  });

  // Rest Timer duration
  pageEl.querySelector('#setting-rest')?.addEventListener('click', () => {
    const current = getRestDuration();
    const input = prompt('Enter rest timer duration in seconds (0 to disable):', current.toString());
    if (input !== null) {
      const parsed = parseInt(input, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        setRestDuration(parsed);
        showToast(parsed === 0 ? 'Rest timer disabled' : `Rest timer set to ${parsed}s`, 'success');
        refresh();
      } else {
        showToast('Invalid duration', 'error');
      }
    }
  });

  // Export
  pageEl.querySelector('#setting-export')?.addEventListener('click', () => openExportModal());

  // Import
  pageEl.querySelector('#setting-import')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.workouts && Array.isArray(data.workouts)) {
          // Build name→id map from current exercise DB
          const allEx = await getAllExercises();
          const nameToId: Record<string, string> = {};
          for (const ex of allEx) {
            nameToId[ex.name.toLowerCase()] = ex.id;
          }

          const db = await getDB();
          const tx = db.transaction('workouts', 'readwrite');
          let imported = 0;
          for (const w of data.workouts) {
            if (!w.date) continue;
            const entries = (w.exercises || w.entries || []).map((ex: any) => {
              // Try to match by exerciseId first, then by name lookup
              let id = ex.exerciseId || nameToId[ex.name?.toLowerCase()] || ex.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'unknown';
              return {
                exerciseId: id,
                sets: (ex.sets || []).map((s: any) => ({
                  weight: s.weight || 0,
                  reps: s.reps || 0,
                  completed: s.completed || false,
                })),
                notes: ex.notes || '',
              };
            });
            await tx.store.put({
              id: w.date,
              date: w.date,
              bodyWeight: w.bodyWeight ?? null,
              unit: w.unit || 'kg',
              entries,
              createdAt: w.createdAt || Date.now(),
              updatedAt: Date.now(),
            });
            imported++;
          }
          await tx.done;
          showToast(`Imported ${imported} workouts`, 'success');
          refresh();
        } else {
          showToast('No workouts found in file', 'error');
        }
      } catch (err) {
        console.error('Import error:', err);
        showToast('Invalid file format', 'error');
      }
    };
    input.click();
  });

  // Reset
  pageEl.querySelector('#setting-reset')?.addEventListener('click', async () => {
    if (confirm('Are you sure? This will delete ALL workout data. This cannot be undone.')) {
      if (confirm('Really delete everything? Last chance!')) {
        const db = await getDB();
        await db.clear('workouts');
        await db.clear('dayPatterns');
        showToast('All data cleared', 'info');
        refresh();
      }
    }
  });
}

function openExportModal(): void {
  let format: ExportFormat = 'markdown';
  let rangeType = 'month';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';

  function getRangeDates(): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();
    switch (rangeType) {
      case 'day': break; // from = today
      case 'week': from.setDate(to.getDate() - 7); break;
      case 'month': from.setMonth(to.getMonth() - 1); break;
      case 'year': from.setFullYear(to.getFullYear() - 1); break;
      case 'all': from.setFullYear(2020); break;
    }
    return { from, to };
  }

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <span class="modal__title">Export Data</span>
        <button class="btn-icon btn-ghost" id="export-close" aria-label="Close modal">${icon('x')}</button>
      </div>
      <div class="modal__body">
        <div class="section-subtitle">Format</div>
        <div class="export-options" id="export-format">
          <div class="export-option selected" data-format="markdown">
            <div class="export-option__radio"></div>
            <div class="export-option__info">
              <div class="export-option__name">📝 Markdown</div>
              <div class="export-option__desc">Best for LLM analysis — structured tables</div>
            </div>
          </div>
          <div class="export-option" data-format="json">
            <div class="export-option__radio"></div>
            <div class="export-option__info">
              <div class="export-option__name">📋 JSON</div>
              <div class="export-option__desc">Machine-readable, import back later</div>
            </div>
          </div>
          <div class="export-option" data-format="csv">
            <div class="export-option__radio"></div>
            <div class="export-option__info">
              <div class="export-option__name">📊 CSV</div>
              <div class="export-option__desc">Spreadsheet-friendly, one row per set</div>
            </div>
          </div>
        </div>

        <div class="section-subtitle">Time Range</div>
        <div class="tabs" id="export-range" style="margin-bottom: var(--space-lg)">
          <button class="tab" data-range="day">Day</button>
          <button class="tab" data-range="week">Week</button>
          <button class="tab tab--active" data-range="month">Month</button>
          <button class="tab" data-range="year">Year</button>
          <button class="tab" data-range="all">All</button>
        </div>

        <button class="btn btn-primary w-full" id="export-btn">
          ${icon('download')} Export
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.querySelector('#export-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // Format selection
  overlay.querySelector('#export-format')?.addEventListener('click', (e) => {
    const opt = (e.target as HTMLElement).closest('.export-option') as HTMLElement;
    if (!opt) return;
    format = opt.getAttribute('data-format') as ExportFormat;
    overlay.querySelectorAll('.export-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
  });

  // Range selection
  overlay.querySelector('#export-range')?.addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement).closest('.tab') as HTMLElement;
    if (!tab) return;
    rangeType = tab.getAttribute('data-range') || 'month';
    overlay.querySelectorAll('#export-range .tab').forEach(t => t.classList.remove('tab--active'));
    tab.classList.add('tab--active');
  });

  // Export
  overlay.querySelector('#export-btn')?.addEventListener('click', async () => {
    const { from, to } = getRangeDates();
    const content = await exportData(format, from, to);
    downloadExport(content, format);
    showToast('Export downloaded!', 'success');
    close();
  });
}

export async function renderSettings(container: HTMLElement): Promise<void> {
  pageEl = container;
  await refresh();
}
