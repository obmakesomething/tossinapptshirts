import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The app must import each Apps-in-Toss symbol from the package that actually
 * ships it at runtime.
 *
 * `@apps-in-toss/framework` re-exports enough types that TypeScript accepts
 * `import { appLogin } from '@apps-in-toss/framework'` without complaint, but
 * its JavaScript never exports that name — it only imports a handful of
 * specific ones from `@apps-in-toss/native-modules` for its own use. So the
 * binding is `undefined` at runtime and every call silently does nothing.
 *
 * That is how login, payment, storage, sharing and analytics all shipped
 * broken: six of eight imports named things the package does not export, and
 * neither `tsc` nor the bundler said a word. This test reads the real
 * type surface of each package and checks the app is asking the right one.
 */

const ROOT = path.join(__dirname, '..', '..');

function exportsOf(pkg: string): string {
  const candidates = [
    `node_modules/${pkg}/dist/index.d.ts`,
    `node_modules/${pkg}/dist/index.d.cts`,
  ];
  for (const relative of candidates) {
    try {
      return readFileSync(path.join(ROOT, relative), 'utf8');
    } catch {
      // try the next candidate
    }
  }
  return '';
}

/** Names the framework's own runtime bundle actually defines or re-exports. */
function frameworkRuntimeHas(name: string): boolean {
  const source = (() => {
    try {
      return readFileSync(
        path.join(ROOT, 'node_modules/@apps-in-toss/framework/dist/index.js'),
        'utf8',
      );
    } catch {
      return '';
    }
  })();
  if (!source) return false;
  // The bundle lists its public names in a single export statement.
  const exportBlocks = source.match(/export\s*\{[^}]*\}/g) ?? [];
  return exportBlocks.some((block) =>
    new RegExp(`\\b${name}\\b`).test(block),
  );
}

describe('Apps in Toss SDK imports', () => {
  const importLines = execSync(
    "grep -rn \"from '@apps-in-toss/\" src --include=*.ts --include=*.tsx || true",
    { cwd: ROOT, encoding: 'utf8' },
  )
    .split('\n')
    .filter(Boolean)
    // This file quotes the specifier in prose; skip itself.
    .filter((line) => !line.includes('sdkImports.test.ts'));

  it('finds the import sites to check', () => {
    expect(importLines.length).toBeGreaterThan(0);
  });

  it('only asks @apps-in-toss/framework for names it exports at runtime', () => {
    const offenders: string[] = [];
    for (const line of importLines) {
      const match = line.match(
        /import\s*\{([^}]*)\}\s*from\s*'@apps-in-toss\/framework'/,
      );
      if (!match) continue;
      const names = match[1]!
        .split(',')
        .map((n) => n.trim().split(/\s+as\s+/)[0]!.trim())
        .filter(Boolean);
      for (const name of names) {
        if (!frameworkRuntimeHas(name)) {
          offenders.push(`${line.split(':')[0]} → ${name}`);
        }
      }
    }
    // Anything here resolves to undefined in the app and fails silently.
    expect(offenders).toEqual([]);
  });

  it('keeps native-module symbols pointed at native-modules', () => {
    const nativeSurface = exportsOf('@apps-in-toss/native-modules');
    // Skip if the package is not installed in this environment.
    if (!nativeSurface) return;

    const nativeOnly = [
      'appLogin',
      'TossPay',
      'Storage',
      'share',
      'getTossShareLink',
      'eventLog',
      'fetchAlbumPhotos',
    ].filter((name) => new RegExp(`\\b${name}\\b`).test(nativeSurface));

    const misrouted = importLines.filter((line) => {
      if (!line.includes("from '@apps-in-toss/framework'")) return false;
      return nativeOnly.some((name) => new RegExp(`\\b${name}\\b`).test(line));
    });
    expect(misrouted).toEqual([]);
  });
});
