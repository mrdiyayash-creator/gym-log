// Rest timer component — auto-starts after completing a set

let timerInterval: ReturnType<typeof setInterval> | null = null;
let remainingSeconds = 0;
let timerEl: HTMLElement | null = null;

const DEFAULT_REST = 90; // seconds

export function getRestDuration(): number {
  const saved = localStorage.getItem('gymlog_rest_timer');
  return saved ? parseInt(saved) : DEFAULT_REST;
}

export function setRestDuration(seconds: number): void {
  localStorage.setItem('gymlog_rest_timer', String(seconds));
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function startRestTimer(): void {
  stopRestTimer(); // clear any existing

  remainingSeconds = getRestDuration();
  if (remainingSeconds <= 0) return;

  // Create timer UI
  timerEl = document.createElement('div');
  timerEl.className = 'rest-timer';
  timerEl.innerHTML = `
    <div class="rest-timer__content">
      <div class="rest-timer__label">Rest</div>
      <div class="rest-timer__time" id="rest-time">${formatTime(remainingSeconds)}</div>
      <div class="rest-timer__actions">
        <button class="rest-timer__btn" id="rest-minus15">-15s</button>
        <button class="rest-timer__btn rest-timer__btn--skip" id="rest-skip">Skip</button>
        <button class="rest-timer__btn" id="rest-plus15">+15s</button>
      </div>
    </div>
  `;

  document.body.appendChild(timerEl);
  requestAnimationFrame(() => timerEl?.classList.add('active'));

  // Countdown
  timerInterval = setInterval(() => {
    remainingSeconds--;
    const timeEl = timerEl?.querySelector('#rest-time');
    if (timeEl) timeEl.textContent = formatTime(Math.max(0, remainingSeconds));
    if (remainingSeconds <= 0) {
      stopRestTimer();
      // Optional: vibrate on completion
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, 1000);

  // Button events
  timerEl.querySelector('#rest-skip')?.addEventListener('click', stopRestTimer);
  timerEl.querySelector('#rest-minus15')?.addEventListener('click', () => {
    remainingSeconds = Math.max(0, remainingSeconds - 15);
    const timeEl = timerEl?.querySelector('#rest-time');
    if (timeEl) timeEl.textContent = formatTime(remainingSeconds);
  });
  timerEl.querySelector('#rest-plus15')?.addEventListener('click', () => {
    remainingSeconds += 15;
    const timeEl = timerEl?.querySelector('#rest-time');
    if (timeEl) timeEl.textContent = formatTime(remainingSeconds);
  });
}

export function stopRestTimer(): void {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (timerEl) {
    timerEl.classList.remove('active');
    setTimeout(() => { timerEl?.remove(); timerEl = null; }, 300);
  }
}
