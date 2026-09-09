import { describe, expect, it } from 'vitest';
import { calcDamage, ceilTo10 } from '../damage';
import { MOVE_POWER, moveName } from '../moves';
import { POKEMON_TYPES } from '../types';
import {
  MEGA_ZONE_SCALE,
  MISS_MULTIPLIER,
  TIMING_ZONES,
  TIRED_ZONE_SCALE,
  judgeTiming,
  zonesFor,
} from '../timing';
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

  it('つよいわざ は ぴったり の すぐ そとが「あいだの はずれ」', () => {
    const zones = zonesFor('strong');
    expect(zones.gap).toBeGreaterThan(zones.perfect);
    // ぴったり を ほんの少し外すと、ちかい ではなく はずれ
    expect(judgeTiming(0.5 + zones.perfect + 0.001, 'strong')).toBe('miss');
    // あいだの はずれ を こえると ちかい に もどる
    expect(judgeTiming(0.5 + zones.gap + 0.001, 'strong')).toBe('near');
    // その そと は また はずれ
    expect(judgeTiming(0.5 + zones.near + 0.001, 'strong')).toBe('miss');
  });

  it('ふつうわざ には あいだの はずれ が ない', () => {
    const zones = zonesFor('normal');
    expect(zones.gap).toBe(zones.perfect);
    expect(judgeTiming(0.5 + zones.perfect + 0.001, 'normal')).toBe('near');
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
    const position = 0.5 + TIMING_ZONES.strong.perfect + 0.01; // ふつうなら あいだの はずれ
    expect(judgeTiming(position, 'strong')).toBe('miss');
    expect(judgeTiming(position, 'strong', { megaEvolved: true })).toBe('perfect');
  });

  it('メガシンカ中は あいだの はずれ が せまくなる', () => {
    const base = zonesFor('strong');
    const mega = zonesFor('strong', { megaEvolved: true });
    expect(mega.gap - mega.perfect).toBeLessThan(base.gap - base.perfect);
  });

  it('つかれていると あいだの はずれ が ひろくなる', () => {
    const base = zonesFor('strong');
    const tired = zonesFor('strong', { tired: true });
    expect(tired.gap - tired.perfect).toBeGreaterThan(base.gap - base.perfect);
  });

  it('どの じょうたい でも ぴったり ≦ あいだの はずれ ≦ ちかい の じゅんばん', () => {
    for (const kind of ['normal', 'strong'] as const) {
      for (const tired of [false, true]) {
        for (const megaEvolved of [false, true]) {
          const zones = zonesFor(kind, { tired, megaEvolved });
          expect(zones.perfect).toBeLessThanOrEqual(zones.gap);
          expect(zones.gap).toBeLessThanOrEqual(zones.near);
        }
      }
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

  it('ふつうわざ は はずれ でも 半分は当たる', () => {
    expect(MISS_MULTIPLIER.normal).toBe(0.5);
    expect(hit('normal', 'miss')).toBe(ceilTo10(MOVE_POWER.normal / 2));
  });

  it('つよいわざ を はずすと 0ダメージ（じぶんで えらんだ ばくち）', () => {
    expect(MISS_MULTIPLIER.strong).toBe(0);
    expect(hit('strong', 'miss')).toBe(0);
    // ばつぐん でも はずれ は 0 のまま
    expect(hit('strong', 'miss', attacker, weak)).toBe(0);
    const result = calcDamage(
      attacker,
      weak,
      { style: 'timing', move: 'strong', timing: 'miss' },
      settings,
    );
    expect(result.isSuperEffective).toBe(false);
    // メガシンカ中でも 0
    const mega = makePokemon({ type: 'ほのお', megaEvolved: true });
    expect(hit('strong', 'miss', mega)).toBe(0);
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

  it('どの組み合わせでも 10の倍数。0になるのは つよいわざ を はずした ときだけ', () => {
    for (const move of ['normal', 'strong'] as const) {
      for (const timing of ['perfect', 'near', 'miss'] as const) {
        for (const mega of [false, true]) {
          for (const tired of [false, true]) {
            for (const t of [target, weak]) {
              const a = makePokemon({ type: 'ほのお', megaEvolved: mega, tired });
              const damage = calcDamage(a, t, { style: 'timing', move, timing }, settings).damage;
              expect(damage % 10).toBe(0);
              if (move === 'strong' && timing === 'miss') {
                expect(damage).toBe(0);
              } else {
                expect(damage).toBeGreaterThan(0);
              }
            }
          }
        }
      }
    }
  });
});
