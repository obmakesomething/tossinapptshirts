/**
 * Sniff the image type from the head of a base64 payload.
 *
 * The album module hands back bare base64 with no mime type. PNG must be
 * detected rather than assumed away: transparency is the only way to get a
 * cut-out design onto a garment, and defaulting everything to JPEG silently
 * flattens the alpha channel into a white box.
 */
export function guessImageMimeType(base64: string): string {
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

/** Wrap a bare base64 payload as a data URL, leaving real data URLs alone. */
export function toImageDataUrl(value: string): string {
  if (value.startsWith('data:')) return value;
  return `data:${guessImageMimeType(value)};base64,${value}`;
}
