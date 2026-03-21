type AppsInTossRuntime = {
  operationalEnvironment?: unknown;
  tossAppVersion?: unknown;
};

function ensureStringProperty(
  target: AppsInTossRuntime,
  key: keyof AppsInTossRuntime,
  fallbackValue: string
) {
  const currentValue = target[key];
  if (typeof currentValue === 'string' && currentValue.length > 0) {
    return;
  }

  try {
    target[key] = fallbackValue;
  } catch {
    // noop
  }
}

export function normalizeAppsInTossRuntime(runtime: unknown) {
  if (runtime == null || typeof runtime !== 'object') {
    return;
  }

  const runtimeObject = runtime as AppsInTossRuntime;

  // Sandbox simulator environment can return empty bridge constants during bootstrap.
  // Without this guard, framework version checks can crash before AppRegistry registration.
  ensureStringProperty(runtimeObject, 'operationalEnvironment', 'sandbox');
  ensureStringProperty(runtimeObject, 'tossAppVersion', '0.0.0');
}
