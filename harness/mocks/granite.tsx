/**
 * Stand-in for @granite-js/react-native.
 *
 * The real router owns navigation inside the Toss host. In the harness the URL
 * path is the source of truth, so createRoute returns the same shape backed by
 * history — screens stay untouched.
 */
import React from 'react';

type Params = Record<string, unknown>;

const listeners = new Set<() => void>();

export function navigateTo(path: string, params?: Params) {
  const url = new URL(window.location.href);
  url.pathname = path;
  url.search = params
    ? `?${new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString()}`
    : '';
  window.history.pushState({}, '', url.toString());
  listeners.forEach((fn) => fn());
}

export function useHarnessLocation() {
  const [path, setPath] = React.useState(window.location.pathname);
  React.useEffect(() => {
    const update = () => setPath(window.location.pathname);
    listeners.add(update);
    window.addEventListener('popstate', update);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return path;
}

const navigation = {
  navigate: (path: string, params?: Params) => navigateTo(path, params),
  goBack: () => window.history.back(),
  push: (path: string, params?: Params) => navigateTo(path, params),
  replace: (path: string, params?: Params) => navigateTo(path, params),
};

export function createRoute(path: string, config: { component: React.ComponentType }) {
  return {
    path,
    component: config.component,
    useNavigation: () => navigation,
    useParams: () => Object.fromEntries(new URLSearchParams(window.location.search)),
  };
}

export const useNavigation = () => navigation;
