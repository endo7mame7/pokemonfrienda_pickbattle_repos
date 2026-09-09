import { describe, expect, it } from 'vitest';
import { calcDamage, ceilTo10 } from '../damage';
import { MOVE_POWER, moveName } from '../moves';
import { POKEMON_TYPES } from '../types';
import {
  GAUGE_SPEED_SCALE,
  MEGA_SIGMA_SCALE,
  MOVE_CURVE,
  TIRED_SIGMA_SCALE,
  gaugeCycleMs,
  judgeTiming,
  ratioAt,
  ratioAtDistance,
  sigmaFor,
  zonesFor,
} from '../timing';
import { makePokemon, makeSettings } from './testHelpers';

describe('あたりかたの カーブ（docs/SPEC.md §3.4.1）', () => {
  it('まんなかが さいだい で、はなれるほど かならず 小さくなる', () => {
    for (const kind of ['normal', 'strong'] as const) {
      expect(ratioAtDistance(kind, 0)).toBeCloseTo(1);
      let previous = 1;
      for (let d = 0.01; d <= 0.5; d += 0.01) {
        const ratio = ratioAtDistance(kind, d);
        // 谷 が できない（近づくほど 損、が おきない）
        expect(ratio).toBeLessThanOrEqual(previous + 1e-9);
        previous = ratio;
      }
    }
  });

  it('つよいわざ は とがっていて、ふつうわざ は なだらか', () => {
    expect(MOVE_CURVE.strong.sigma).toBeLessThan(MOVE_CURVE.normal.sigma);
    // おなじ ずれ でも つよいわざ のほうが がくんと 落ちる
    expect(ratioAtDistance('strong', 0.12)).toBeLessThan(ratioAtDistance('normal', 0.12));
  });

  it('ふつうわざ は はずしても floor までしか 下がらない', () => {
    expect(MOVE_CURVE.normal.floor).toBeGreaterThan(0);
    expect(ratioAtDistance('normal', 0.5)).toBeGreaterThan(MOVE_CURVE.normal.floor * 0.99);
  });

  it('つよいわざ は 大きく はずすと きっちり 0 になる', () => {
    const { zero } = zonesFor('strong');
    expect(zero).toBeLessThan(0.5);
    expect(ratioAtDistance('strong', zero + 0.01)).toBe(0);
    expect(ratioAtDistance('strong', 0.5)).toBe(0);
  });

  it('左右どちらに ずれても おなじ', () => {
    for (const distance of [0.05, 0.15, 0.4]) {
      expect(ratioAt(0.5 - distance, 'normal')).toBeCloseTo(ratioAt(0.5 + distance, 'normal'));
    }
  });
});

describe('judgeTiming（見せかたの ラベル）', () => {
  it('まんなかで止めれば ぴったり', () => {
    expect(judgeTiming(0.5, 'normal')).toBe('perfect');
    expect(judgeTiming(0.5, 'strong')).toBe('perfect');
  });

  it('つよい わざ ほど ぴったりの はば が せまい', () => {
    expect(zonesFor('strong').perfect).toBeLessThan(zonesFor('normal').perfect);
    expect(zonesFor('strong').near).toBeLessThan(zonesFor('normal').near);
    // ふつうなら ぴったり になる ずれ でも、つよい わざ では ぴったり にならない
    expect(judgeTiming(0.5 + 0.1, 'normal')).toBe('perfect');
    expect(judgeTiming(0.5 + 0.1, 'strong')).not.toBe('perfect');
  });

  it('ずれるほど ぴったり → ちかい → はずれ の じゅんに 変わる', () => {
    const zones = zonesFor('normal');
    expect(judgeTiming(0.5 + zones.perfect - 0.001, 'normal')).toBe('perfect');
    expect(judgeTiming(0.5 + zones.perfect + 0.001, 'normal')).toBe('near');
    expect(judgeTiming(0.5 + zones.near + 0.001, 'normal')).toBe('miss');
  });

  it('あいだに はずれ帯 は ない（ぴったり の となりは かならず ちかい）', () => {
    for (const kind of ['normal', 'strong'] as const) {
      const zones = zonesFor(kind);
      expect(judgeTiming(0.5 + zones.perfect + 0.001, kind)).toBe('near');
    }
  });

  it('大きく ずれると はずれ', () => {
    expect(judgeTiming(0, 'normal')).toBe('miss');
    expect(judgeTiming(1, 'normal')).toBe('miss');
  });
});

describe('つかれ と メガシンカ で ねらいやすさ が変わる（docs/SPEC.md §3.6・§3.7）', () => {
  it('つかれていると とがって せまくなる', () => {
    expect(sigmaFor('normal', { tired: true })).toBeCloseTo(
      MOVE_CURVE.normal.sigma * TIRED_SIGMA_SCALE,
    );
    expect(zonesFor('normal', { tired: true }).perfect).toBeLessThan(zonesFor('normal').perfect);
  });

  it('メガシンカ中は ひろがって ねらいやすい', () => {
    expect(sigmaFor('strong', { megaEvolved: true })).toBeCloseTo(
      MOVE_CURVE.strong.sigma * MEGA_SIGMA_SCALE,
    );
    expect(zonesFor('strong', { megaEvolved: true }).perfect).toBeGreaterThan(
      zonesFor('strong').perfect,
    );
  });

  it('つかれた状態でも メガシンカ中なら 少し取り返せる', () => {
    const tired = zonesFor('normal', { tired: true });
    const both = zonesFor('normal', { tired: true, megaEvolved: true });
    expect(both.perfect).toBeGreaterThan(tired.perfect);
  });

  it('おなじ位置でも、つかれていると ぴったり が とれなくなる', () => {
    const position = 0.5 + zonesFor('normal').perfect - 0.01;
    expect(judgeTiming(position, 'normal')).toBe('perfect');
    expect(judgeTiming(position, 'normal', { tired: true })).not.toBe('perfect');
  });

  it('おなじ位置でも、メガシンカ中なら ぴったり になる', () => {
    const position = 0.5 + zonesFor('strong').perfect + 0.005;
    expect(judgeTiming(position, 'strong')).toBe('near');
    expect(judgeTiming(position, 'strong', { megaEvolved: true })).toBe('perfect');
  });

  it('どの じょうたい でも ぴったり ≦ ちかい ≦ 0ダメージ の じゅんばん', () => {
    for (const kind of ['normal', 'strong'] as const) {
      for (const tired of [false, true]) {
        for (const megaEvolved of [false, true]) {
          const zones = zonesFor(kind, { tired, megaEvolved });
          expect(zones.perfect).toBeLessThanOrEqual(zones.near);
          expect(zones.near).toBeLessThanOrEqual(zones.zero);
        }
      }
    }
  });
});

describe('ゲージの はやさ（docs/SPEC.md §4）', () => {
  it('せっていで ゆっくり／ふつう／はやめ を えらべる', () => {
    expect(gaugeCycleMs('slow', 'normal')).toBeGreaterThan(gaugeCycleMs('normal', 'normal'));
    expect(gaugeCycleMs('normal', 'normal')).toBeGreaterThan(gaugeCycleMs('fast', 'normal'));
    expect(GAUGE_SPEED_SCALE.normal).toBe(1);
  });

  it('つよいわざ は ふつうわざ より ゲージが はやい', () => {
    for (const speed of ['slow', 'normal', 'fast'] as const) {
      expect(gaugeCycleMs(speed, 'strong')).toBeLessThan(gaugeCycleMs(speed, 'normal'));
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

  /** ゲージの いち で うつ */
  const hitAt = (
    move: 'normal' | 'strong',
    position: number,
    a = attacker,
    t = target,
  ) => {
    const modifiers = { tired: a.tired, megaEvolved: a.megaEvolved };
    const ratio = ratioAt(position, move, modifiers);
    return calcDamage(a, t, { style: 'timing', move, ratio, timing: judgeTiming(position, move, modifiers) }, settings)
      .damage;
  };

  it('まんなかで とめると わざの ちから そのまま', () => {
    expect(hitAt('normal', 0.5)).toBe(MOVE_POWER.normal);
    expect(hitAt('strong', 0.5)).toBe(MOVE_POWER.strong);
  });

  it('まんなかから はなれるほど ダメージが 下がる（谷が ない）', () => {
    for (const move of ['normal', 'strong'] as const) {
      let previous = Infinity;
      for (let d = 0; d <= 0.5; d += 0.01) {
        const damage = hitAt(move, 0.5 + d);
        expect(damage).toBeLessThanOrEqual(previous);
        previous = damage;
      }
    }
  });

  it('ふつうわざ は はずしても 0にならない', () => {
    const floorDamage = ceilTo10(MOVE_POWER.normal * MOVE_CURVE.normal.floor);
    expect(hitAt('normal', 0)).toBeGreaterThanOrEqual(floorDamage);
    // すその ぶん を入れても、floor から 10 以内に おさまる
    expect(hitAt('normal', 0)).toBeLessThanOrEqual(floorDamage + 10);
  });

  it('つよいわざ を 大きく はずすと 0ダメージ（ばつぐん でも 0）', () => {
    expect(hitAt('strong', 0)).toBe(0);
    expect(hitAt('strong', 0, attacker, weak)).toBe(0);
    const mega = makePokemon({ type: 'ほのお', megaEvolved: true });
    expect(hitAt('strong', 0, mega)).toBe(0);
  });

  it('つよいわざ は ぴったり なら ふつうわざ より 大きいが、少し ずれると 負ける', () => {
    expect(hitAt('strong', 0.5)).toBeGreaterThan(hitAt('normal', 0.5));
    expect(hitAt('strong', 0.5 + 0.15)).toBeLessThan(hitAt('normal', 0.5 + 0.15));
  });

  it('ばつぐん のボーナスが のる', () => {
    expect(hitAt('normal', 0.5, attacker, weak)).toBe(MOVE_POWER.normal + 20);
  });

  it('メガシンカ中は ちからが上がる', () => {
    const mega = makePokemon({ type: 'ほのお', megaEvolved: true });
    expect(hitAt('normal', 0.5, mega)).toBeGreaterThan(hitAt('normal', 0.5));
  });

  it('つかれていても ダメージは減らない（かわりに ねらいにくくなる）', () => {
    const tired = makePokemon({ type: 'ほのお', tired: true });
    expect(hitAt('normal', 0.5, tired)).toBe(hitAt('normal', 0.5));
    // 少し ずれると、つかれている ほうが 損をする
    expect(hitAt('normal', 0.6, tired)).toBeLessThan(hitAt('normal', 0.6));
  });

  it('バトルの ながさ の設定で ちから が変わる', () => {
    const at = (speed: 'fast' | 'normal' | 'slow') =>
      calcDamage(
        attacker,
        target,
        { style: 'timing', move: 'normal', ratio: 1, timing: 'perfect' },
        makeSettings({ attackStyle: 'timing', battleSpeed: speed }),
      ).damage;
    expect(at('fast')).toBeGreaterThan(at('normal'));
    expect(at('normal')).toBeGreaterThan(at('slow'));
  });

  it('どの組み合わせでも 10の倍数。0になるのは つよいわざ を 大きく はずした ときだけ', () => {
    for (const move of ['normal', 'strong'] as const) {
      for (let d = 0; d <= 0.5; d += 0.02) {
        for (const megaEvolved of [false, true]) {
          for (const tired of [false, true]) {
            for (const t of [target, weak]) {
              const a = makePokemon({ type: 'ほのお', megaEvolved, tired });
              const damage = hitAt(move, 0.5 + d, a, t);
              expect(damage % 10).toBe(0);
              if (damage === 0) expect(move).toBe('strong');
            }
          }
        }
      }
    }
  });
});
