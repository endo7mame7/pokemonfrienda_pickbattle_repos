import { describe, expect, it } from 'vitest';
import { calcDamage, ceilTo10 } from '../damage';
import { MOVE_POWER, moveName } from '../moves';
import { POKEMON_TYPES } from '../types';
import { TIMING_ZONES, judgeTiming } from '../timing';
import { makePokemon, makeSettings } from './testHelpers';

describe('judgeTiming（ゲージを止めた判定）', () => {
  it('まんなかで止めれば ぴったり', () => {
    expect(judgeTiming(0.5, 'normal')).toBe('perfect');
    expect(judgeTiming(0.5, 'strong')).toBe('perfect');
  });

  it('つよい わざ ほど ぴったりの はば が せまい', () => {
    expect(TIMING_ZONES.strong.perfect).toBeLessThan(TIMING_ZONES.normal.perfect);
    expect(TIMING_ZONES.strong.near).toBeLessThan(TIMING_ZONES.normal.near);
    // ふつうなら ぴったり になる ずれ でも、つよい わざ では ぴったり にならない
    expect(judgeTiming(0.5 + 0.1, 'normal')).toBe('perfect');
    expect(judgeTiming(0.5 + 0.1, 'strong')).not.toBe('perfect');
  });

  it('すこし ずれると ちかい', () => {
    expect(judgeTiming(0.5 + TIMING_ZONES.normal.perfect + 0.01, 'normal')).toBe('near');
  });

  it('大きく ずれると はずれ', () => {
    expect(judgeTiming(0, 'normal')).toBe('miss');
    expect(judgeTiming(1, 'normal')).toBe('miss');
  });

  it('左右どちらに ずれても おなじ判定', () => {
    for (const distance of [0.05, 0.15, 0.4]) {
      expect(judgeTiming(0.5 - distance, 'normal')).toBe(judgeTiming(0.5 + distance, 'normal'));
    }
  });
});

describe('わざの名前', () => {
  it('18タイプすべてに ふつう と つよい の名前がある', () => {
    for (const type of POKEMON_TYPES) {
      expect(moveName(type, 'normal').length).toBeGreaterThan(0);
      expect(moveName(type, 'strong').length).toBeGreaterThan(0);
      expect(moveName(type, 'normal')).not.toBe(moveName(type, 'strong'));
    }
  });
});

describe('タイミングのダメージ', () => {
  const settings = makeSettings({ attackStyle: 'timing', superEffectiveBonus: 20 });
  const attacker = makePokemon({ type: 'ほのお' });
  const target = makePokemon({ type: 'みず' });
  const weak = makePokemon({ type: 'くさ' }); // ほのお → くさ は ばつぐん

  const hit = (move: 'normal' | 'strong', timing: 'perfect' | 'near' | 'miss', a = attacker, t = target) =>
    calcDamage(a, t, { style: 'timing', move, timing }, settings).damage;

  it('ぴったり は ちかい の2倍', () => {
    expect(hit('normal', 'near')).toBe(MOVE_POWER.normal);
    expect(hit('normal', 'perfect')).toBe(MOVE_POWER.normal * 2);
  });

  it('はずれ でも 半分は当たる（0にはならない）', () => {
    expect(hit('normal', 'miss')).toBe(ceilTo10(MOVE_POWER.normal / 2));
    expect(hit('strong', 'miss')).toBeGreaterThan(0);
  });

  it('つよい わざ は ちからが 大きい', () => {
    expect(hit('strong', 'near')).toBeGreaterThan(hit('normal', 'near'));
  });

  it('ばつぐん のボーナスが のる', () => {
    expect(hit('normal', 'near', attacker, weak)).toBe(MOVE_POWER.normal + 20);
  });

  it('メガシンカ中は ちからが上がる', () => {
    const mega = makePokemon({ type: 'ほのお', megaEvolved: true });
    expect(hit('normal', 'near', mega)).toBeGreaterThan(hit('normal', 'near'));
  });

  it('つかれていると 半分になる', () => {
    const tired = makePokemon({ type: 'ほのお', tired: true });
    expect(hit('normal', 'near', tired)).toBe(ceilTo10(MOVE_POWER.normal / 2));
    expect(hit('strong', 'perfect', tired)).toBe(hit('strong', 'perfect') / 2);
  });

  it('バトルの ながさ の設定で ちから が変わる', () => {
    const at = (speed: 'fast' | 'normal' | 'slow') =>
      calcDamage(
        attacker,
        target,
        { style: 'timing', move: 'normal', timing: 'near' },
        makeSettings({ attackStyle: 'timing', battleSpeed: speed }),
      ).damage;
    expect(at('fast')).toBeGreaterThan(at('normal'));
    expect(at('normal')).toBeGreaterThan(at('slow'));
  });

  it('どの組み合わせでも 10の倍数で、0にならない', () => {
    for (const move of ['normal', 'strong'] as const) {
      for (const timing of ['perfect', 'near', 'miss'] as const) {
        for (const mega of [false, true]) {
          for (const tired of [false, true]) {
            for (const t of [target, weak]) {
              const a = makePokemon({ type: 'ほのお', megaEvolved: mega, tired });
              const damage = calcDamage(a, t, { style: 'timing', move, timing }, settings).damage;
              expect(damage % 10).toBe(0);
              expect(damage).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });
});
