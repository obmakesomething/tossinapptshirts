import { guessImageMimeType, toImageDataUrl } from './imageMime';

describe('guessImageMimeType', () => {
  it('detects PNG so transparency survives the trip to the editor', () => {
    expect(guessImageMimeType('iVBORw0KGgoAAAANSUhEUg')).toBe('image/png');
  });

  it('detects GIF and WebP', () => {
    expect(guessImageMimeType('R0lGODlhAQABAIAAAP')).toBe('image/gif');
    expect(guessImageMimeType('UklGRiIAAABXRUJQ')).toBe('image/webp');
  });

  it('falls back to JPEG', () => {
    expect(guessImageMimeType('/9j/4AAQSkZJRgABAQ')).toBe('image/jpeg');
  });
});

describe('toImageDataUrl', () => {
  it('leaves an existing data URL untouched', () => {
    const uri = 'data:image/png;base64,iVBORw0KGgo';
    expect(toImageDataUrl(uri)).toBe(uri);
  });

  it('wraps bare base64 with the sniffed type', () => {
    expect(toImageDataUrl('iVBORw0KGgo')).toBe(
      'data:image/png;base64,iVBORw0KGgo',
    );
  });
});
