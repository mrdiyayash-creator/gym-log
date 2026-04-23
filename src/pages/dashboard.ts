// Dashboard page — charts and analytics

import { icon } from '../utils/icons';
import { getUnit } from '../utils/units';
import { getDateRange, toDateKey, formatDateShort, fromDateKey, getWeekStart } from '../utils/date';
import { getWorkoutsInRange, calcVolume, calcTotalSets, getExerciseHistory, getWorkoutsWithData } from '../db/workouts';
import { getAllExercises } from '../db/exercises';
import { MUSCLE_GROUPS } from '../data/exercise-seed';
import { type Workout } from '../db/database';
import type { Chart } from 'chart.js';

let ChartClass: any = null;

type ViewMode = 'overview' | 'muscle' | 'exercise';
type Timeframe = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'ALL': 9999
};

let currentView: ViewMode = 'overview';
let currentTimeframe: Timeframe = '1M';
let selectedMuscleGroup: string | null = null;
let selectedExerciseId: string | null = null;
let pageEl: HTMLElement | null = null;
let charts: Chart[] = [];

async function ensureChartLoaded() {
  if (!ChartClass) {
    const chartModule = await import('chart.js');
    ChartClass = chartModule.Chart;
    ChartClass.register(...chartModule.registerables);
  }
}
let cachedWorkouts: Workout[] | null = null;
let cachedTimeframe: Timeframe | null = null;

function destroyCharts(): void {
  charts.forEach(c => c.destroy());
  charts = [];
}

function chartDefaults(): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#5c5c75', font: { size: 10, family: 'Inter' }, maxTicksLimit: 6 },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#5c5c75', font: { size: 10, family: 'Inter' } },
        border: { display: false },
        beginAtZero: true,
      }
    }
  };
}

async function getWorkoutsForTimeframe(): Promise<Workout[]> {
  if (cachedWorkouts && cachedTimeframe === currentTimeframe) return cachedWorkouts;
  const days = TIMEFRAME_DAYS[currentTimeframe];
  if (days >= 9999) {
    cachedWorkouts = await getWorkoutsWithData();
  } else {
    const { from, to } = getDateRange(days);
    cachedWorkouts = await getWorkoutsInRange(from, to);
  }
  cachedTimeframe = currentTimeframe;
  return cachedWorkouts;
}

async function renderOverview(container: HTMLElement): Promise<void> {
  const workouts = await getWorkoutsForTimeframe();
  const unit = getUnit();
  const totalVol = workouts.reduce((s, w) => s + calcVolume(w.entries), 0);
  const totalSets = workouts.reduce((s, w) => s + calcTotalSets(w.entries), 0);
  const totalExercises = new Set(workouts.flatMap(w => w.entries.map(e => e.exerciseId))).size;

  container.innerHTML = `
    <div class="summary-grid">
      <div class="stat-card stat-card--accent">
        <span class="stat-card__label">Total Volume</span>
        <span class="stat-card__value">${totalVol >= 1000 ? (totalVol/1000).toFixed(1)+'k' : totalVol}</span>
        <span class="stat-card__sub">${unit}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Sessions</span>
        <span class="stat-card__value">${workouts.length}</span>
        <span class="stat-card__sub">workouts</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Total Sets</span>
        <span class="stat-card__value">${totalSets}</span>
        <span class="stat-card__sub">sets</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Exercises</span>
        <span class="stat-card__value">${totalExercises}</span>
        <span class="stat-card__sub">unique</span>
      </div>
    </div>
    <div class="chart-card" id="volume-chart-card">
      <div class="chart-card__title">Volume Over Time</div>
      <canvas id="dash-volume-chart"></canvas>
    </div>
    <div class="chart-card" id="frequency-chart-card">
      <div class="chart-card__title">Workout Frequency</div>
      <canvas id="dash-frequency-chart"></canvas>
    </div>
    <div class="chart-card" id="bodyweight-chart-card">
      <div class="chart-card__title">Body Weight Trend</div>
      <canvas id="dash-bodyweight-chart"></canvas>
    </div>
    <div class="chart-card" id="distribution-chart-card">
      <div class="chart-card__title">Muscle Group Distribution</div>
      <canvas id="dash-distribution-chart" style="height: 220px !important;"></canvas>
    </div>
  `;

  // Volume over time (weekly aggregation)
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  const weeklyVol: Record<string, number> = {};
  for (const w of sorted) {
    const ws = getWeekStart(fromDateKey(w.date));
    const key = toDateKey(ws);
    weeklyVol[key] = (weeklyVol[key] || 0) + calcVolume(w.entries);
  }
  const volLabels = Object.keys(weeklyVol).map(k => formatDateShort(fromDateKey(k)));
  const volData = Object.values(weeklyVol);

  const volCanvas = container.querySelector('#dash-volume-chart') as HTMLCanvasElement;
  if (volCanvas && volData.length > 0) {
    await ensureChartLoaded();
    charts.push(new ChartClass(volCanvas, {
      type: 'line',
      data: {
        labels: volLabels,
        datasets: [{
          data: volData,
          borderColor: '#7c5cfc',
          backgroundColor: 'rgba(124,92,252,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#7c5cfc',
        }]
      },
      options: { ...chartDefaults(), scales: { ...chartDefaults().scales, y: { ...chartDefaults().scales.y, ticks: { ...chartDefaults().scales.y.ticks, callback: (v: any) => v >= 1000 ? (v/1000).toFixed(0)+'k' : v } } } },
    }));
  } else if (volCanvas) {
    container.querySelector('#volume-chart-card')!.innerHTML =
      '<div class="chart-card__title">Volume Over Time</div><div class="empty-state" style="padding:24px"><div class="empty-state__text">Log workouts to see volume trends</div></div>';
  }

  // Frequency (sessions per week)
  const weeklyFreq: Record<string, number> = {};
  for (const w of sorted) {
    const ws = getWeekStart(fromDateKey(w.date));
    const key = toDateKey(ws);
    weeklyFreq[key] = (weeklyFreq[key] || 0) + 1;
  }
  const freqCanvas = container.querySelector('#dash-frequency-chart') as HTMLCanvasElement;
  if (freqCanvas && Object.keys(weeklyFreq).length > 0) {
    await ensureChartLoaded();
    charts.push(new ChartClass(freqCanvas, {
      type: 'bar',
      data: {
        labels: Object.keys(weeklyFreq).map(k => formatDateShort(fromDateKey(k))),
        datasets: [{
          data: Object.values(weeklyFreq),
          backgroundColor: 'rgba(91,154,255,0.3)',
          borderColor: '#5b9aff',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: chartDefaults(),
    }));
  } else if (freqCanvas) {
    container.querySelector('#frequency-chart-card')!.innerHTML =
      '<div class="chart-card__title">Workout Frequency</div><div class="empty-state" style="padding:24px"><div class="empty-state__text">Log workouts to see frequency</div></div>';
  }

  // Body weight
  const bwData = sorted.filter(w => w.bodyWeight).map(w => ({ label: formatDateShort(fromDateKey(w.date)), value: w.bodyWeight! }));
  const bwCanvas = container.querySelector('#dash-bodyweight-chart') as HTMLCanvasElement;
  if (bwCanvas && bwData.length > 0) {
    await ensureChartLoaded();
    charts.push(new ChartClass(bwCanvas, {
      type: 'line',
      data: {
        labels: bwData.map(d => d.label),
        datasets: [{
          data: bwData.map(d => d.value),
          borderColor: '#34d399',
          backgroundColor: 'rgba(52,211,153,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#34d399',
        }]
      },
      options: chartDefaults(),
    }));
  } else if (bwCanvas) {
    container.querySelector('#bodyweight-chart-card')!.innerHTML += '<div class="empty-state" style="padding: 20px"><div class="empty-state__text">Log body weight to see trends</div></div>';
    bwCanvas.style.display = 'none';
  }

  // Muscle group distribution
  const groupCounts: Record<string, number> = {};
  const exercises = await getAllExercises();
  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]));
  for (const w of workouts) {
    for (const entry of w.entries) {
      const group = exMap[entry.exerciseId]?.muscleGroup || 'other';
      groupCounts[group] = (groupCounts[group] || 0) + entry.sets.length;
    }
  }
  const distCanvas = container.querySelector('#dash-distribution-chart') as HTMLCanvasElement;
  if (distCanvas && Object.keys(groupCounts).length > 0) {
    const labels = Object.keys(groupCounts).map(g => MUSCLE_GROUPS[g]?.label || g);
    const colors = Object.keys(groupCounts).map(g => MUSCLE_GROUPS[g]?.color || '#7c5cfc');
    await ensureChartLoaded();
    charts.push(new ChartClass(distCanvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: Object.values(groupCounts), backgroundColor: colors, borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#9898b0', font: { size: 11, family: 'Inter' }, padding: 12, boxWidth: 12, boxHeight: 12, borderRadius: 3 }
          }
        },
        cutout: '65%',
      }
    }));
  } else if (distCanvas) {
    container.querySelector('#distribution-chart-card')!.innerHTML =
      '<div class="chart-card__title">Muscle Group Distribution</div><div class="empty-state" style="padding:24px"><div class="empty-state__text">Log workouts to see distribution</div></div>';
  }
}

async function renderMuscleView(container: HTMLElement): Promise<void> {
  const exercises = await getAllExercises();
  const workouts = await getWorkoutsForTimeframe();
  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]));
  const groups = Object.keys(MUSCLE_GROUPS);

  // Count sets per group
  const groupSets: Record<string, number> = {};
  for (const w of workouts) {
    for (const e of w.entries) {
      const g = exMap[e.exerciseId]?.muscleGroup || 'other';
      groupSets[g] = (groupSets[g] || 0) + e.sets.filter(s => s.weight > 0 || s.reps > 0).length;
    }
  }

  if (!selectedMuscleGroup) {
    container.innerHTML = `
      <div class="section-subtitle">Select a muscle group</div>
      <div class="drilldown-grid">
        ${groups.map(g => `
          <div class="drilldown-card" data-group="${g}">
            <div class="drilldown-card__icon">${MUSCLE_GROUPS[g].icon}</div>
            <div class="drilldown-card__name">${MUSCLE_GROUPS[g].label}</div>
            <div class="drilldown-card__count">${groupSets[g] || 0} sets</div>
          </div>
        `).join('')}
      </div>
    `;
    container.querySelectorAll('.drilldown-card').forEach(el => {
      el.addEventListener('click', () => {
        selectedMuscleGroup = el.getAttribute('data-group');
        renderDashboard();
      });
    });
  } else {
    // Show exercises in this group
    const groupExercises = exercises.filter(e => e.muscleGroup === selectedMuscleGroup);
    const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));

    // Volume per week for this group
    const weeklyVol: Record<string, number> = {};
    for (const w of sorted) {
      for (const e of w.entries) {
        if (exMap[e.exerciseId]?.muscleGroup === selectedMuscleGroup) {
          const ws = getWeekStart(fromDateKey(w.date));
          const key = toDateKey(ws);
          weeklyVol[key] = (weeklyVol[key] || 0) + e.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
        }
      }
    }

    container.innerHTML = `
      <button class="back-btn" id="muscle-back">${icon('arrowLeft')} All Groups</button>
      <h3 style="margin-bottom: var(--space-md)">${MUSCLE_GROUPS[selectedMuscleGroup]?.icon} ${MUSCLE_GROUPS[selectedMuscleGroup]?.label}</h3>
      <div class="chart-card">
        <div class="chart-card__title">Volume Progression</div>
        <canvas id="muscle-vol-chart"></canvas>
      </div>
      <div class="section-subtitle" style="margin-top: var(--space-md)">Exercises in this group</div>
      <div style="display: flex; flex-direction: column; gap: var(--space-sm)">
        ${groupExercises.map(ex => {
          const count = workouts.reduce((s, w) => s + (w.entries.some(e => e.exerciseId === ex.id) ? 1 : 0), 0);
          return `
            <div class="card" style="cursor: pointer" data-exercise-drill="${ex.id}">
              <div style="display: flex; align-items: center; justify-content: space-between">
                <span class="font-medium text-sm">${ex.name}</span>
                <span class="text-xs text-muted">${count} sessions</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelector('#muscle-back')?.addEventListener('click', () => {
      selectedMuscleGroup = null;
      renderDashboard();
    });

    container.querySelectorAll('[data-exercise-drill]').forEach(el => {
      el.addEventListener('click', () => {
        selectedExerciseId = el.getAttribute('data-exercise-drill');
        currentView = 'exercise';
        renderDashboard();
      });
    });

    const volCanvas = container.querySelector('#muscle-vol-chart') as HTMLCanvasElement;
    if (volCanvas && Object.keys(weeklyVol).length > 0) {
      await ensureChartLoaded();
      const color = MUSCLE_GROUPS[selectedMuscleGroup]?.color || '#7c5cfc';
      charts.push(new ChartClass(volCanvas, {
        type: 'line',
        data: {
          labels: Object.keys(weeklyVol).map(k => formatDateShort(fromDateKey(k))),
          datasets: [{
            data: Object.values(weeklyVol),
            borderColor: color,
            backgroundColor: color + '1a',
            fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: color,
          }]
        },
        options: chartDefaults(),
      }));
    }
  }
}

async function renderExerciseView(container: HTMLElement): Promise<void> {
  if (!selectedExerciseId) {
    // Show exercise selector
    const exercises = await getAllExercises();
    const workouts = await getWorkoutsForTimeframe();
    const usedIds = new Set(workouts.flatMap(w => w.entries.map(e => e.exerciseId)));
    const usedExercises = exercises.filter(e => usedIds.has(e.id));

    container.innerHTML = `
      <div class="section-subtitle">Select an exercise</div>
      <select class="exercise-select" id="exercise-drill-select">
        <option value="">Choose exercise...</option>
        ${Object.keys(MUSCLE_GROUPS).map(g => {
          const exs = usedExercises.filter(e => e.muscleGroup === g);
          if (exs.length === 0) return '';
          return `<optgroup label="${MUSCLE_GROUPS[g].label}">
            ${exs.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
          </optgroup>`;
        }).join('')}
      </select>
    `;
    container.querySelector('#exercise-drill-select')?.addEventListener('change', (e) => {
      selectedExerciseId = (e.target as HTMLSelectElement).value || null;
      if (selectedExerciseId) renderDashboard();
    });
    return;
  }

  const ex = await getAllExercises().then(all => all.find(e => e.id === selectedExerciseId));
  if (!ex) return;

  const history = await getExerciseHistory(selectedExerciseId, 50);
  const unit = getUnit();

  // Weight progression
  const weightData = history.reverse().map(h => {
    const maxW = Math.max(...h.entry.sets.map(s => s.weight || 0));
    return { label: formatDateShort(fromDateKey(h.date)), weight: maxW };
  });

  // Volume per session
  const volumeData = history.map(h => {
    const vol = h.entry.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
    return { label: formatDateShort(fromDateKey(h.date)), volume: vol };
  });

  // Best set & 1RM
  let bestWeight = 0, bestReps = 0;
  let estimated1RM = 0;
  for (const h of history) {
    for (const s of h.entry.sets) {
      if (s.weight > bestWeight) {
        bestWeight = s.weight;
        bestReps = s.reps;
      }
      if (s.weight > 0 && s.reps > 0) {
        const e1RM = s.weight * (1 + s.reps / 30);
        if (e1RM > estimated1RM) {
          estimated1RM = e1RM;
        }
      }
    }
  }

  container.innerHTML = `
    <button class="back-btn" id="exercise-back">${icon('arrowLeft')} Back</button>
    <h3 style="margin-bottom: var(--space-xs)">${ex.name}</h3>
    <div class="text-xs text-muted mb-md">${MUSCLE_GROUPS[ex.muscleGroup]?.label || ex.muscleGroup} • ${history.length} sessions</div>
    
    <div class="summary-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card stat-card--accent">
        <span class="stat-card__label">Best Wt</span>
        <span class="stat-card__value">${bestWeight}</span>
        <span class="stat-card__sub">${unit} × ${bestReps}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Est. 1RM</span>
        <span class="stat-card__value">${Math.round(estimated1RM)}</span>
        <span class="stat-card__sub">${unit}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Sessions</span>
        <span class="stat-card__value">${history.length}</span>
        <span class="stat-card__sub">total</span>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card__title">Weight Progression</div>
      <canvas id="ex-weight-chart"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-card__title">Volume Per Session</div>
      <canvas id="ex-volume-chart"></canvas>
    </div>
  `;

  container.querySelector('#exercise-back')?.addEventListener('click', () => {
    selectedExerciseId = null;
    if (selectedMuscleGroup) {
      currentView = 'muscle';
    }
    renderDashboard();
  });

  const wCanvas = container.querySelector('#ex-weight-chart') as HTMLCanvasElement;
  if (wCanvas && weightData.length > 0) {
    await ensureChartLoaded();
    const color = MUSCLE_GROUPS[ex.muscleGroup]?.color || '#7c5cfc';
    charts.push(new ChartClass(wCanvas, {
      type: 'line',
      data: {
        labels: weightData.map(d => d.label),
        datasets: [{
          data: weightData.map(d => d.weight),
          borderColor: color, backgroundColor: color + '1a',
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: color,
        }]
      },
      options: chartDefaults(),
    }));
  }

  const vCanvas = container.querySelector('#ex-volume-chart') as HTMLCanvasElement;
  if (vCanvas && volumeData.length > 0) {
    await ensureChartLoaded();
    charts.push(new ChartClass(vCanvas, {
      type: 'bar',
      data: {
        labels: volumeData.map(d => d.label),
        datasets: [{
          data: volumeData.map(d => d.volume),
          backgroundColor: 'rgba(124,92,252,0.3)', borderColor: '#7c5cfc',
          borderWidth: 2, borderRadius: 6, borderSkipped: false,
        }]
      },
      options: chartDefaults(),
    }));
  }
}

async function renderDashboard(): Promise<void> {
  if (!pageEl) return;
  
  pageEl.innerHTML = `
    <div style="padding: var(--page-padding)">
      <div class="skeleton skeleton-text" style="width:40%;height:28px;margin-bottom:24px"></div>
      <div style="display:flex;gap:8px;margin-bottom:24px">
        <div class="skeleton skeleton-card" style="flex:1;height:36px"></div>
        <div class="skeleton skeleton-card" style="flex:1;height:36px"></div>
        <div class="skeleton skeleton-card" style="flex:1;height:36px"></div>
      </div>
      <div class="skeleton skeleton-card" style="height:200px"></div>
      <div class="skeleton skeleton-card" style="height:200px"></div>
    </div>
  `;

  destroyCharts();

  pageEl.innerHTML = `
    <div class="stagger-in">
      <div class="dashboard-header">
        <h1 class="dashboard-header__title">Dashboard</h1>
      </div>
      <div class="timeframe-selector" id="timeframe-sel">
        ${(['1W','1M','3M','6M','1Y','ALL'] as Timeframe[]).map(t => `
          <button class="timeframe-btn${t === currentTimeframe ? ' active' : ''}" data-tf="${t}">${t}</button>
        `).join('')}
      </div>
      <div class="dashboard-tabs" id="view-tabs">
        <button class="dashboard-tab${currentView === 'overview' ? ' active' : ''}" data-view="overview">Overview</button>
        <button class="dashboard-tab${currentView === 'muscle' ? ' active' : ''}" data-view="muscle">Muscle Group</button>
        <button class="dashboard-tab${currentView === 'exercise' ? ' active' : ''}" data-view="exercise">Exercise</button>
      </div>
      <div id="dashboard-content"></div>
    </div>
  `;

  // Timeframe
  pageEl.querySelector('#timeframe-sel')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.timeframe-btn') as HTMLElement;
    if (!btn) return;
    currentTimeframe = btn.getAttribute('data-tf') as Timeframe;
    cachedWorkouts = null; // invalidate cache
    renderDashboard();
  });

  // View tabs
  pageEl.querySelector('#view-tabs')?.addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement).closest('.dashboard-tab') as HTMLElement;
    if (!tab) return;
    currentView = tab.getAttribute('data-view') as ViewMode;
    selectedMuscleGroup = null;
    selectedExerciseId = null;
    renderDashboard();
  });

  const content = pageEl.querySelector('#dashboard-content') as HTMLElement;
  switch (currentView) {
    case 'overview': await renderOverview(content); break;
    case 'muscle': await renderMuscleView(content); break;
    case 'exercise': await renderExerciseView(content); break;
  }
}

export async function renderDashboardPage(container: HTMLElement): Promise<void> {
  pageEl = container;
  currentView = 'overview';
  currentTimeframe = '1M';
  selectedMuscleGroup = null;
  selectedExerciseId = null;
  cachedWorkouts = null;
  cachedTimeframe = null;
  await renderDashboard();
}
