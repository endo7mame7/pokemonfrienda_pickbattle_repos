import { describe, expect, it } from 'vitest';
import { TYPE_CHART, isSuperEffective } from '../typeChart';
import { POKEMON_TYPES } from '../types';

describe('TYPE_CHART（docs/SPEC.md §3.5）', () => {
  it('18タイプすべてが定義されている', () => {
    expect(Object.keys(TYPE_CHART)).toHaveLength(18);
    for (const type of POKEMON_TYPES) {
      expect(TYPE_CHART[type]).toBeDefined();
    }
  });

  it('相性表に未知のタイプが混ざっていない', () => {
    for (const type of POKEMON_TYPES) {
      for (const target of TYPE_CHART[type]) {
        expect(POKEMON_TYPES).toContain(target);
      }
    }
  });

  it('ノーマルは どのタイプにも ばつぐんにならない', () => {
    for (const type of POKEMON_TYPES) {
      expect(isSuperEffective('ノーマル', type)).toBe(false);
    }
  });

  it('代表的な相性が正しい', () => {
    expect(isSuperEffective('ほのお', 'くさ')).toBe(true);
    expect(isSuperEffective('みず', 'ほのお')).toBe(true);
    expect(isSuperEffective('でんき', 'みず')).toBe(true);
    expect(isSuperEffective('くさ', 'みず')).toBe(true);
    expect(isSuperEffective('ほのお', 'みず')).toBe(false);
  });

  it('ばつぐんの発生率がバランス検証の前提（約15.7%）と一致する', () => {
    const total = POKEMON_TYPES.length ** 2;
    const hits = POKEMON_TYPES.flatMap((attack) =>
      POKEMON_TYPES.filter((target) => isSuperEffective(attack, target)),
    ).length;
    expect(hits / total).toBeCloseTo(0.157, 3);
  });
});
