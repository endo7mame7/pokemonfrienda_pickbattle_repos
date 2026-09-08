import { describe, expect, it } from 'vitest';
import { SILHOUETTE_SHAPES } from '../types';
import { shapeForName } from '../../ui/silhouette';

describe('かげの かたち', () => {
  it('16しゅるい あって、名前が かぶっていない', () => {
    expect(SILHOUETTE_SHAPES).toHaveLength(16);
    expect(new Set(SILHOUETTE_SHAPES).size).toBe(16);
  });

  it('かたちを えらばなくても、名前から きまる', () => {
    for (const name of ['ピカチュウ', 'リザードン', 'ゲンガー', 'イーブイ', 'ア', '']) {
      expect(SILHOUETTE_SHAPES).toContain(shapeForName(name));
    }
  });

  it('おなじ名前なら いつも おなじ かたち', () => {
    expect(shapeForName('カビゴン')).toBe(shapeForName('カビゴン'));
  });

  it('名前がちがえば、かたちも ばらける', () => {
    const names = ['ピカチュウ', 'リザードン', 'ゲンガー', 'カビゴン', 'ギャラドス', 'サーナイト'];
    expect(new Set(names.map(shapeForName)).size).toBeGreaterThan(1);
  });
});
