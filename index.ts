import { register } from '@granite-js/react-native';
import type { ErrorUtils } from 'react-native';

type ErrorUtilsGlobal = {
  ErrorUtils?: Pick<ErrorUtils, 'setGlobalHandler' | 'getGlobalHandler'>;
  __decrypt?: (value: string, key: number) => string;
  window?: {
    addEventListener?: (type: string, listener: (...args: unknown[]) => void, options?: unknown) => void;
    removeEventListener?: (type: string, listener: (...args: unknown[]) => void, options?: unknown) => void;
    dispatchEvent?: (event: unknown) => boolean;
    __CONSTANT_HANDLER_MAP?: Record<string, unknown>;
    navigator?: {
      userAgent?: string;
    };
  };
};

function installDecryptShim() {
  const globalObject = globalThis as unknown as ErrorUtilsGlobal;
  if (typeof globalObject.__decrypt === 'function') {
    return;
  }

  globalObject.__decrypt = (value: string, key: number) => {
    let decoded = '';
    for (let index = 0; index < value.length; index += 1) {
      // Toss obfuscated bundles decode by shifting each char with key + index
      // in a printable ASCII ring [34..126].
      let decodedCode = value.charCodeAt(index) + key + index;
      while (decodedCode > 126) {
        decodedCode -= 93;
      }
      while (decodedCode < 34) {
        decodedCode += 93;
      }
      decoded += String.fromCharCode(decodedCode);
    }
    return decoded;
  };
}

installDecryptShim();

function installUserAgentShim() {
  const globalObject = globalThis as unknown as ErrorUtilsGlobal;
  const runtimeWindow = globalObject.window;
  if (runtimeWindow?.navigator == null) {
    return;
  }
  if (typeof runtimeWindow.navigator.userAgent === 'string') {
    return;
  }

  try {
    runtimeWindow.navigator.userAgent = 'ReactNative';
  } catch {
    // noop
  }
}

installUserAgentShim();

function installWindowEventShim() {
  const globalObject = globalThis as unknown as ErrorUtilsGlobal;
  const runtimeWindow = globalObject.window;
  if (runtimeWindow == null) {
    return;
  }

  if (typeof runtimeWindow.addEventListener !== 'function') {
    runtimeWindow.addEventListener = () => {};
  }
  if (typeof runtimeWindow.removeEventListener !== 'function') {
    runtimeWindow.removeEventListener = () => {};
  }
  if (typeof runtimeWindow.dispatchEvent !== 'function') {
    runtimeWindow.dispatchEvent = () => false;
  }
}

installWindowEventShim();

function inferFallbackConstant(method: string) {
  if (method === 'deploymentId' || method === 'getDeploymentId') {
    return 'local';
  }
  if (method === 'brandDisplayName') {
    return 'AppsInToss Sandbox';
  }
  if (method === 'brandIcon') {
    return '';
  }
  if (method === 'brandPrimaryColor') {
    return '#3182f6';
  }
  if (method === 'getAppName') {
    return 'merchandisegpt';
  }
  if (method === 'getWebViewType') {
    return 'miniapp';
  }
  if (method === 'getOperationalEnvironment') {
    return 'sandbox';
  }
  if (method === 'getTossAppVersion') {
    return '0.0.0';
  }
  if (method === 'getPlatformOS') {
    return 'ios';
  }
  if (method === 'getLocale') {
    return 'ko-KR';
  }
  if (method === 'getSchemeUri') {
    return 'intoss-sandbox://merchandisegpt';
  }
  if (method === 'getDeviceId') {
    return 'simulator';
  }
  if (method === 'getSafeAreaInsets') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  if (method.endsWith('_isSupported')) {
    return false;
  }
  return null;
}

function installConstantHandlerShim() {
  const globalObject = globalThis as unknown as ErrorUtilsGlobal;
  const runtimeWindow = globalObject.window;
  if (runtimeWindow == null) {
    return;
  }

  const baseMap = runtimeWindow.__CONSTANT_HANDLER_MAP ?? {};
  runtimeWindow.__CONSTANT_HANDLER_MAP = new Proxy(baseMap, {
    has(target, property) {
      if (typeof property !== 'string') {
        return Reflect.has(target, property);
      }
      return Reflect.has(target, property) || inferFallbackConstant(property) !== undefined;
    },
    get(target, property, receiver) {
      if (typeof property !== 'string') {
        return Reflect.get(target, property, receiver);
      }
      if (Reflect.has(target, property)) {
        return Reflect.get(target, property, receiver);
      }
      return inferFallbackConstant(property);
    },
  });
}

installConstantHandlerShim();

if (__DEV__) {
  const globalObject = globalThis as unknown as ErrorUtilsGlobal;
  const errorUtils = globalObject.ErrorUtils;
  if (errorUtils?.setGlobalHandler != null) {
    const previousHandler = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error, isFatal) => {
      // Keep this as plain logging so we can capture pre-register bootstrap exceptions.
      console.error('[bootstrap-error]', error?.name, error?.message, error?.stack);
      previousHandler?.(error, isFatal);
    });
  }
}

const App = require('./src/_app').default;
register(App);
