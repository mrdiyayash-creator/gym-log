// Bottom navigation bar component

import { icon } from '../utils/icons';
import { navigate, type Route } from '../router';

const NAV_ITEMS: { route: Route; label: string; iconName: string }[] = [
  { route: 'home', label: 'Home', iconName: 'home' },
  { route: 'log', label: 'Log', iconName: 'clipboard' },
  { route: 'dashboard', label: 'Stats', iconName: 'barChart' },
  { route: 'settings', label: 'Settings', iconName: 'settings' },
];

export function renderNavBar(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'nav-bar';
  nav.id = 'main-nav';

  nav.innerHTML = NAV_ITEMS.map(item => `
    <div class="nav-item${item.route === 'home' ? ' active' : ''}" data-route="${item.route}" id="nav-${item.route}">
      ${icon(item.iconName)}
      <span class="nav-item__label">${item.label}</span>
    </div>
  `).join('');

  nav.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.nav-item') as HTMLElement;
    if (!item) return;
    const route = item.getAttribute('data-route') as Route;
    if (route) navigate(route);
  });

  return nav;
}
