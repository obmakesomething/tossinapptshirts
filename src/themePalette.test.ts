import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { theme } from './components/ui';

const scopedFiles = [
  'src/components/ui.tsx',
  'src/pages/upload.tsx',
  'src/pages/editor.tsx',
  'src/pages/generate.tsx',
  'src/pages/preview.tsx',
  'src/pages/products.tsx',
  'src/pages/faq.tsx',
  'src/pages/designs.tsx',
];

describe('warm theme palette', () => {
  it('uses the orange and warm-neutral shared palette', () => {
    expect(theme.colors.background).toBe('#FFF8F1');
    expect(theme.colors.surface).toBe('#FFFFFF');
    expect(theme.colors.surfaceSecondary).toBe('#FFF2E5');
    expect(theme.colors.primary).toBe('#FF6A00');
    expect(theme.colors.textPrimary).toBe('#2E231B');
    expect(theme.colors.textSecondary).toBe('#776556');
    expect(theme.colors.border).toBe('#F0DFCF');
  });

  it('removes the legacy navy palette from the restored screens', () => {
    const legacyPalette = ['#071a35', '#15325d', '#0f2a53', '#FF5000'];

    scopedFiles.forEach((relativeFile) => {
      const contents = fs.readFileSync(
        path.join(process.cwd(), relativeFile),
        'utf8',
      );

      legacyPalette.forEach((color) => {
        expect(contents).not.toContain(color);
      });
    });
  });
});
