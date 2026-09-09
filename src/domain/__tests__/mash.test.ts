import { describe, expect, it } from 'vitest';
import { calcDamage } from '../damage';
import { MASH_BASE_TAPS, mashFill, mashMultiplier, mashTargetTaps } from '../mash';
import { MOVE_NAMES } from '../moves';
import { POKEMON_TYPES } from '../types';
import { makePokemon, makeSettings } from './testHelpers';

describe('メガわざ の れんだ（docs/SPEC.md §3.4.2）', () => {
  it('たくさん たたくほど ゲージが たまる', () => {
    expect(mashFill(0, false)).toBe(0);
    expect(mashFill(MASH_BASE_TAPS / 2, false)).toBe(0.5);
    expect(mashFill(MASH_BASE_TAPS, false)).toBe(1);
  });

  it('たたきすぎても マックスどまり', () => {
    expect(mashFill(MASH_BASE_TAPS * 3, false)).toBe(1);
  });

  it('つかれていると もっと たたかないと たまらない', () => {
    expect(mashTargetTaps(true)).toBeGreaterThan(mashTargetTaps(false));
    expect(mashFill(MASH_BASE_TAPS, true)).toBeLessThan(1);
  });

  it('1つも たたけなくても ダメージは 0にならない', () => {
    expect(mashMultiplier(0)).toBeGreaterThan(0);
  });

  it('マックスなら 2倍', () => {
    expect(mashMultiplier(1)).toBe(2);
  });
});

describe('メガわざ の 名前と ダメージ', () => {
  const settings = makeSettings({ attackStyle: 'timing' });
  const mega = makePokemon({ type: 'ほのお', megaEvolved: true });
  const target = makePokemon({ type: 'みず' });

  const megaHit = (fill: number) =>
    calcDamage(mega, target, { style: 'mash', fill }, settings).damage;

  it('18タイプすべてに メガわざ の名前がある', () => {
    for (const type of POKEMON_TYPES) {
      const names = MOVE_NAMES[type];
      expect(names.mega.length).toBeGreaterThan(0);
      expect(new Set([names.normal, names.strong, names.mega]).size).toBe(3);
    }
  });

  it('ゲージが たまるほど つよい', () => {
    expect(megaHit(1)).toBeGreaterThan(megaHit(0.5));
    expect(megaHit(0.5)).toBeGreaterThan(megaHit(0));
  });

  it('ぜんぜん たたけなくても そこそこ当たる（はずれ が ない）', () => {
    expect(megaHit(0)).toBeGreaterThan(0);
  });

  it('マックスでも、つよいわざ の ぴったり ほどは 出ない（ねらわなくていいぶん ひかえめ）', () => {
    const strongPerfect = calcDamage(
      mega,
      target,
      { style: 'timing', move: 'strong', ratio: 1, timing: 'perfect' },
      settings,
    ).damage;
    expect(megaHit(1)).toBeLessThan(strongPerfect);
  });

  it('どの たまりぐあい でも 10の倍数', () => {
    for (const fill of [0, 0.13, 0.5, 0.77, 1]) {
      expect(megaHit(fill) % 10).toBe(0);
    }
  });
});
