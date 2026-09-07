import { describe, expect, it } from 'vitest';
import { squareCrop } from '../squareCrop';

describe('squareCrop', () => {
  it('よこながの写真は、よこの まんなかを切る', () => {
    expect(squareCrop(1000, 600)).toEqual({ sx: 200, sy: 0, size: 600 });
  });

  it('たてながの写真は、たての まんなかを切る', () => {
    expect(squareCrop(600, 1000)).toEqual({ sx: 0, sy: 200, size: 600 });
  });

  it('もともと正方形なら そのまま', () => {
    expect(squareCrop(512, 512)).toEqual({ sx: 0, sy: 0, size: 512 });
  });

  it('切り取る範囲が 写真からはみ出さない', () => {
    for (const [w, h] of [[1, 3], [3, 1], [1234, 567], [4032, 3024]] as const) {
      const { sx, sy, size } = squareCrop(w, h);
      expect(sx + size).toBeLessThanOrEqual(w);
      expect(sy + size).toBeLessThanOrEqual(h);
      expect(size).toBeGreaterThan(0);
    }
  });
});
