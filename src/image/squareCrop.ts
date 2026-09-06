export interface CropRect {
  sx: number;
  sy: number;
  size: number;
}

/**
 * 写真の まんなか を正方形に切り取る範囲を求める。
 * カードは正方形にちかい形で出すため、保存する前に切っておく。
 */
export function squareCrop(width: number, height: number): CropRect {
  const size = Math.min(width, height);
  return {
    sx: Math.round((width - size) / 2),
    sy: Math.round((height - size) / 2),
    size,
  };
}
