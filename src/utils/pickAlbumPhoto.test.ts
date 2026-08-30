import { pickAlbumPhoto } from './pickAlbumPhoto';
import { fetchAlbumPhotos } from '@apps-in-toss/native-modules';

jest.mock('@apps-in-toss/native-modules', () => {
  const fn: any = jest.fn();
  fn.getPermission = jest.fn();
  fn.openPermissionDialog = jest.fn();
  return { fetchAlbumPhotos: fn };
});

const album = fetchAlbumPhotos as unknown as jest.Mock & {
  getPermission: jest.Mock;
  openPermissionDialog: jest.Mock;
};

beforeEach(() => {
  album.mockReset();
  album.getPermission.mockReset();
  album.openPermissionDialog.mockReset();
});

describe('opening the album', () => {
  it('returns the photo as a data url', async () => {
    album.getPermission.mockResolvedValue('allowed');
    album.mockResolvedValue([{ dataUri: 'iVBORw0KGgo=' }]);
    const result = await pickAlbumPhoto();
    expect(result.status).toBe('picked');
    expect(result).toHaveProperty('dataUrl', expect.stringContaining('data:'));
  });

  it('asks for permission once when it does not have it', async () => {
    album.getPermission.mockResolvedValue('denied');
    album.openPermissionDialog.mockResolvedValue('allowed');
    album.mockResolvedValue([{ dataUri: 'iVBORw0KGgo=' }]);
    expect((await pickAlbumPhoto()).status).toBe('picked');
    expect(album.openPermissionDialog).toHaveBeenCalledTimes(1);
  });

  it('reports a refusal as a refusal, not a failure', async () => {
    album.getPermission.mockResolvedValue('denied');
    album.openPermissionDialog.mockResolvedValue('denied');
    expect(await pickAlbumPhoto()).toEqual({ status: 'denied' });
    expect(album).not.toHaveBeenCalled();
  });

  /**
   * Closing the picker is a decision, not an error. Telling somebody their
   * photo failed to load when they changed their mind is a lie.
   */
  it('separates an empty pick from a broken one', async () => {
    album.getPermission.mockResolvedValue('allowed');
    album.mockResolvedValue([]);
    expect(await pickAlbumPhoto()).toEqual({ status: 'empty' });

    album.mockRejectedValue(new Error('bridge is down'));
    expect(await pickAlbumPhoto()).toEqual({ status: 'failed' });
  });

  it('asks for a print-sized source, not a thumbnail', async () => {
    album.getPermission.mockResolvedValue('allowed');
    album.mockResolvedValue([{ dataUri: 'iVBORw0KGgo=' }]);
    await pickAlbumPhoto();
    // 1024 across a 12-inch print is ~85 DPI, under the warning threshold.
    expect(album.mock.calls[0]![0]).toMatchObject({
      maxWidth: 2048,
      base64: true,
      maxCount: 1,
    });
  });
});
