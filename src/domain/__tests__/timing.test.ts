import { describe, expect, it } from 'vitest';
import { calcDamage, ceilTo10 } from '../damage';
import { MOVE_POWER, moveName } from '../moves';
import { POKEMON_TYPES } from '../types';
import { MEGA_ZONE_SCALE, TIMING_ZONES, TIRED_ZONE_SCALE, judgeTiming, zonesFor } from '../timing';
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

describe('つかれ と メガシンカ で ねらう はば が変わる（docs/SPEC.md §3.6・§3.7）', () => {
  it('つかれていると せまくなる', () => {
    const base = zonesFor('normal');
    const tired = zonesFor('normal', { tired: true });
    expect(tired.perfect).toBeLessThan(base.perfect);
    expect(tired.near).toBeLessThan(base.near);
    expect(tired.perfect).toBeCloseTo(base.perfect * TIRED_ZONE_SCALE.perfect);
  });

  it('メガシンカ中は ひろくなる', () => {
    const base = zonesFor('strong');
    const mega = zonesFor('strong', { megaEvolved: true });
    expect(mega.perfect).toBeGreaterThan(base.perfect);
    expect(mega.perfect).toBeCloseTo(base.perfect * MEGA_ZONE_SCALE.perfect);
  });

  it('つかれた状態でも メガシンカ中なら 少し取り返せる', () => {
    const tired = zonesFor('normal', { tired: true });
    const both = zonesFor('normal', { tired: true, megaEvolved: true });
    expect(both.perfect).toBeGreaterThan(tired.perfect);
  });

  it('おなじ位置でも、つかれていると ぴったり が とれなくなる', () => {
    const position = 0.5 + TIMING_ZONES.normal.perfect - 0.01; // ふつうなら ぴったり
    expect(judgeTiming(position, 'normal')).toBe('perfect');
    expect(judgeTiming(position, 'normal', { tired: true })).not.toBe('perfect');
  });

  it('おなじ位置でも、メガシンカ中なら ぴったり になる', () => {
    const position = 0.5 + TIMING_ZONES.strong.perfect + 0.01; // ふつうなら ちかい
    expect(judgeTiming(position, 'strong')).toBe('near');
    expect(judgeTiming(position, 'strong', { megaEvolved: true })).toBe('perfect');
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

  it('つかれていても ダメージは減らない（かわりに ねらいにくくなる）', () => {
    const tired = makePokemon({ type: 'ほのお', tired: true });
    expect(hit('normal', 'near', tired)).toBe(hit('normal', 'near'));
    expect(hit('strong', 'perfect', tired)).toBe(hit('strong', 'perfect'));
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
