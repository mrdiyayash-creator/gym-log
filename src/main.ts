// GymLog — Main entry point

import './styles/index.css';
import './styles/components.css';
import './styles/home.css';
import './styles/log.css';
import './styles/dashboard.css';
import './styles/settings.css';

import { initDB } from './db/database';
import { registerRoute, initRouter } from './router';
import { renderNavBar } from './components/nav-bar';
import { renderHome } from './pages/home';
import { renderLog } from './pages/log';
import { renderDashboardPage } from './pages/dashboard';
import { renderSettings } from './pages/settings';

async function boot(): Promise<void> {
  // Initialize database
  await initDB();

  // Get app container
  const app = document.getElementById('app')!;

  // Create page container
  const pageContainer = document.createElement('div');
  pageContainer.id = 'page-container';
  app.appendChild(pageContainer);

  // Add nav bar
  app.appendChild(renderNavBar());

  // Register page routes
  registerRoute('home', renderHome);
  registerRoute('log', renderLog);
  registerRoute('dashboard', renderDashboardPage);
  registerRoute('settings', renderSettings);

  // Start router
  initRouter(pageContainer);
  // Offline indicator logic
  const offlineIndicator = document.getElementById('offline-indicator');
  const updateOnlineStatus = () => {
    if (!navigator.onLine) {
      offlineIndicator?.classList.add('active');
    } else {
      offlineIndicator?.classList.remove('active');
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus(); // Check initial state
}

// Boot the app
boot().catch(console.error);
