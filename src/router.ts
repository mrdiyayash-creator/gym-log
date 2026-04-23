// Simple hash-based SPA router

export type Route = 'home' | 'log' | 'dashboard' | 'settings';

type RouteHandler = (container: HTMLElement) => void | Promise<void>;

const routes: Record<Route, RouteHandler | null> = {
  home: null,
  log: null,
  dashboard: null,
  settings: null,
};

let currentRoute: Route = 'home';
let pageContainer: HTMLElement | null = null;

export function registerRoute(route: Route, handler: RouteHandler): void {
  routes[route] = handler;
}

export function getCurrentRoute(): Route {
  return currentRoute;
}

export function navigate(route: Route): void {
  window.location.hash = route === 'home' ? '' : route;
}

function getRouteFromHash(): Route {
  const hash = window.location.hash.replace('#', '').replace('/', '');
  if (hash in routes) return hash as Route;
  return 'home';
}

// Define route order for directional transitions
const routeOrder: Record<Route, number> = {
  home: 0,
  log: 1,
  dashboard: 2,
  settings: 3
};

async function renderRoute(route: Route): Promise<void> {
  if (!pageContainer) return;
  const handler = routes[route];
  if (!handler) return;

  // Determine transition direction
  const isGoingRight = currentRoute ? routeOrder[route] > routeOrder[currentRoute] : true;
  const exitClass = isGoingRight ? 'page-exit-left' : 'page-exit-right';
  const enterClass = isGoingRight ? 'page-enter-right' : 'page-enter-left';

  // Remove old page
  const oldPage = pageContainer.querySelector('.page');
  if (oldPage) {
    oldPage.classList.add(exitClass);
    await new Promise(r => setTimeout(r, 150));
    oldPage.remove();
  }

  // Create new page
  const page = document.createElement('div');
  page.className = `page ${enterClass}`;
  page.id = `page-${route}`;
  pageContainer.appendChild(page);

  currentRoute = route;
  await handler(page);

  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-route') === route);
  });
}

export function initRouter(container: HTMLElement): void {
  pageContainer = container;

  window.addEventListener('hashchange', () => {
    const route = getRouteFromHash();
    if (route !== currentRoute) {
      renderRoute(route);
    }
  });

  // Initial render
  const initial = getRouteFromHash();
  renderRoute(initial);
}
