import { squareCrop } from './squareCrop';

export const PHOTO_SIZE = 512;
const JPEG_QUALITY = 0.8;

/**
 * えらばれた画像を、正方形512pxのJPEGにして返す（docs/SPEC.md §10.5）。
 *
 * iPhone の写真は向きの情報を持つので、imageOrientation: 'from-image' で
 * 回転を反映させてから描く。HEIC はファイル入力を通ると JPEG で渡ってくる。
 */
export async function fileToSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { sx, sy, size } = squareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas が つかえません');
    context.drawImage(bitmap, sx, sy, size, size, 0, 0, PHOTO_SIZE, PHOTO_SIZE);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('しゃしんを ほぞんできません'))),
        'image/jpeg',
        JPEG_QUALITY,
      );
    });
  } finally {
    bitmap.close();
  }
}
