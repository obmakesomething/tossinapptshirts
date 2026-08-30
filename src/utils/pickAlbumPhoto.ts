import { fetchAlbumPhotos } from '@apps-in-toss/native-modules';
import { toImageDataUrl } from './imageMime';

/**
 * Opening the album, from wherever the customer asked for it.
 *
 * This lived inside the editor, so home's 사진 올리고 시작하기 could only do
 * the 시작하기 half: it moved to the editor and left a second 사진 올리기
 * waiting there. Two taps, and the first button had promised one.
 *
 * The caller decides what to say about each outcome, because the wording
 * belongs to the screen — but they are kept apart here so that a customer who
 * closed the picker is not told something went wrong.
 */

export type PickAlbumPhotoResult =
  | { status: 'picked'; dataUrl: string }
  | { status: 'denied' }
  | { status: 'empty' }
  | { status: 'failed' };

/**
 * This is the print source, not a thumbnail. 1024px across a 12-inch print is
 * ~85 DPI; 2048 keeps a full-chest design inside the warning threshold in
 * utils/printResolution.
 */
const PRINT_SOURCE_MAX_WIDTH = 2048;

export async function pickAlbumPhoto(): Promise<PickAlbumPhotoResult> {
  try {
    const permission = await fetchAlbumPhotos.getPermission();
    if (permission !== 'allowed') {
      const next = await fetchAlbumPhotos.openPermissionDialog();
      if (next !== 'allowed') return { status: 'denied' };
    }

    const photos = await fetchAlbumPhotos({
      maxCount: 1,
      maxWidth: PRINT_SOURCE_MAX_WIDTH,
      base64: true,
    });
    const photo = photos[0];
    // No photo is the picker being closed, which is not a failure.
    if (!photo || !photo.dataUri) return { status: 'empty' };

    return { status: 'picked', dataUrl: toImageDataUrl(photo.dataUri) };
  } catch {
    return { status: 'failed' };
  }
}
