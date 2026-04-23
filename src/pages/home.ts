// Home page — stats overview, streak, PRs, predicted workout

import { icon } from '../utils/icons';
import { getGreeting, formatDateFull, formatDateShort, fromDateKey } from '../utils/date';
import { getUnit } from '../utils/units';
import { getStreak, getRecentPRs, getWorkoutsInRange, calcVolume } from '../db/workouts';
import { getSuggestions } from '../db/predictions';
import { getExercise } from '../db/exercises';
import { navigate } from '../router';
import type { Chart } from 'chart.js';

let homeChart: Chart | null = null;

export async function renderHome(container: HTMLElement): Promise<void> {
  try {
  // Show loading state immediately
  container.innerHTML = `
    <div style="padding: var(--page-padding)">
      <div class="skeleton skeleton-text" style="width:40%;height:20px;margin-bottom:16px"></div>
      <div class="skeleton skeleton-text" style="width:60%;height:28px;margin-bottom:24px"></div>
      <div style="display:flex;gap:8px;margin-bottom:24px">
        <div class="skeleton skeleton-card" style="flex:1;height:72px"></div>
        <div class="skeleton skeleton-card" style="flex:1;height:72px"></div>
        <div class="skeleton skeleton-card" style="flex:1;height:72px"></div>
      </div>
      <div class="skeleton skeleton-card" style="height:120px"></div>
    </div>
  `;

  if (homeChart) { homeChart.destroy(); homeChart = null; }
  const today = new Date();
  const unit = getUnit();
  
  // Fetch data
  const streak = await getStreak();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0,0,0,0);
  const weekWorkouts = await getWorkoutsInRange(weekStart, today);
  const weekVolume = weekWorkouts.reduce((sum, w) => sum + calcVolume(w.entries), 0);
  
  // Recent PRs
  const prs = await getRecentPRs(14);
  for (const pr of prs) {
    const ex = await getExercise(pr.exerciseId);
    if (ex) pr.exerciseName = ex.name;
  }
  
  // Smart suggestions for today
  const suggestedIds = await getSuggestions(today.getDay(), 6);
  const suggestions: { id: string; name: string }[] = [];
  for (const id of suggestedIds) {
    const ex = await getExercise(id);
    if (ex) suggestions.push({ id: ex.id, name: ex.name });
  }

  // Weekly volume chart data (last 4 weeks)
  const weeklyData: { label: string; volume: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const ws = new Date(weekStart);
    ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    const workouts = await getWorkoutsInRange(ws, we);
    const vol = workouts.reduce((sum, w) => sum + calcVolume(w.entries), 0);
    weeklyData.push({ label: formatDateShort(ws), volume: vol });
  }

  container.innerHTML = `
    <div class="stagger-in">
      <div class="home-greeting">
        <div class="home-greeting__date">${formatDateFull(today)}</div>
        <h1 class="home-greeting__title">${getGreeting()}</h1>
      </div>

      <div class="home-stats-row">
        <div class="stat-card stat-card--accent">
          <span class="stat-card__label">Streak</span>
          <span class="stat-card__value">${streak}</span>
          <span class="stat-card__sub"><span class="stat-icon">${icon('fire')}</span> days</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">This Week</span>
          <span class="stat-card__value">${weekWorkouts.length}</span>
          <span class="stat-card__sub">sessions</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">Volume</span>
          <span class="stat-card__value">${weekVolume >= 1000 ? (weekVolume / 1000).toFixed(1) + 'k' : weekVolume}</span>
          <span class="stat-card__sub">${unit}</span>
        </div>
      </div>

      ${suggestions.length > 0 ? `
        <div class="prediction-card">
          <div class="prediction-card__header">
            <div class="prediction-card__icon">${icon('brain')}</div>
            <div>
              <div class="prediction-card__title">Today's Predicted Workout</div>
              <div class="prediction-card__sub">Based on your patterns</div>
            </div>
          </div>
          <div class="prediction-exercises">
            ${suggestions.map(s => `
              <button class="suggestion-chip" data-exercise-id="${s.id}">
                ${icon('plus')} ${s.name}
              </button>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="prediction-card">
          <div class="prediction-card__header">
            <div class="prediction-card__icon">${icon('dumbbell')}</div>
            <div>
              <div class="prediction-card__title">Start Logging!</div>
              <div class="prediction-card__sub">Log a few workouts and I'll learn your routine</div>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="home-start-log">
            ${icon('plus')} Log Workout
          </button>
        </div>
      `}

      <div class="weekly-chart-container">
        <div class="section-header">
          <span class="section-title">Weekly Volume</span>
          <span class="text-xs text-muted">${unit}</span>
        </div>
        <canvas id="weekly-volume-chart"></canvas>
      </div>

      ${prs.length > 0 ? `
        <div>
          <div class="section-header">
            <span class="section-title">Recent PRs</span>
          </div>
          <div class="pr-list">
            ${prs.map(pr => `
              <div class="pr-item">
                <div class="pr-item__badge">${icon('trophy')}</div>
                <div class="pr-item__info">
                  <div class="pr-item__exercise">${pr.exerciseName || pr.exerciseId}</div>
                  <div class="pr-item__detail">${pr.weight} ${unit} × ${pr.reps} reps</div>
                </div>
                <div class="pr-item__date">${formatDateShort(fromDateKey(pr.date))}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Weekly volume chart
  const chartCanvas = container.querySelector('#weekly-volume-chart') as HTMLCanvasElement;
  if (chartCanvas) {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    homeChart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: weeklyData.map(d => d.label),
        datasets: [{
          data: weeklyData.map(d => d.volume),
          backgroundColor: 'rgba(124, 92, 252, 0.3)',
          borderColor: '#7c5cfc',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#5c5c75', font: { size: 10, family: 'Inter' } },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#5c5c75', font: { size: 10, family: 'Inter' }, callback: (v: any) => v >= 1000 ? (v/1000).toFixed(0) + 'k' : v },
            border: { display: false },
            beginAtZero: true,
          }
        }
      }
    });
  }

  // Event listeners
  container.querySelector('#home-start-log')?.addEventListener('click', () => navigate('log'));
  container.querySelectorAll('.suggestion-chip').forEach(el => {
    el.addEventListener('click', () => navigate('log'));
  });
  } catch (err) {
    console.error('Home page render error:', err);
    container.innerHTML = `<div style="padding:20px;color:#f87171;">Error loading home: ${err}</div>`;
  }
}
