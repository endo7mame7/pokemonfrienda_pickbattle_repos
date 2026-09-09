import { describe, expect, it } from 'vitest';
import { calcDamage, ceilTo10 } from '../damage';
import { MOVE_POWER, moveName } from '../moves';
import { POKEMON_TYPES } from '../types';
import {
  GAUGE_SPEED_SCALE,
  MEGA_STEP_SCALE,
  MOVE_STEPS,
  TIRED_STEP_SCALE,
  gaugeCycleMs,
  judgeTiming,
  stepIndexAtDistance,
  stepPowerAt,
  stepsFor,
} from '../timing';
import { makePokemon, makeSettings } from './testHelpers';

describe('あたりかたの 段（docs/SPEC.md §3.4.1）', () => {
  it('いちばん内がわ の ちから は MOVE_POWER と そろっている', () => {
    for (const kind of ['normal', 'strong'] as const) {
      expect(MOVE_STEPS[kind][0]!.power).toBe(MOVE_POWER[kind]);
    }
  });

  it('外へ いくほど ちから が 下がる（谷が ない）', () => {
    for (const kind of ['normal', 'strong'] as const) {
      const steps = MOVE_STEPS[kind];
      for (let i = 1; i < steps.length; i += 1) {
        expect(steps[i]!.power).toBeLessThan(steps[i - 1]!.power);
        expect(steps[i]!.until).toBeGreaterThan(steps[i - 1]!.until);
      }
      expect(steps[steps.length - 1]!.until).toBe(0.5);
    }
  });

  it('つよいわざ は まんなかの段が せまく、ちから が 大きい', () => {
    expect(MOVE_STEPS.strong[0]!.until).toBeLessThan(MOVE_STEPS.normal[0]!.until);
    expect(MOVE_STEPS.strong[0]!.power).toBeGreaterThan(MOVE_STEPS.normal[0]!.power);
  });

  it('ふつうわざ は はずしても ちから が のこる／つよいわざ は 0 になる', () => {
    expect(MOVE_STEPS.normal[MOVE_STEPS.normal.length - 1]!.power).toBeGreaterThan(0);
    expect(MOVE_STEPS.strong[MOVE_STEPS.strong.length - 1]!.power).toBe(0);
  });

  it('どこで とめても どれかの段に 入る', () => {
    for (const kind of ['normal', 'strong'] as const) {
      for (const tired of [false, true]) {
        for (const megaEvolved of [false, true]) {
          for (let d = 0; d <= 0.5; d += 0.01) {
            const index = stepIndexAtDistance(kind, d, { tired, megaEvolved });
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThan(MOVE_STEPS[kind].length);
          }
        }
      }
    }
  });

  it('左右どちらに ずれても おなじ段', () => {
    for (const distance of [0.05, 0.15, 0.4]) {
      expect(stepPowerAt(0.5 - distance, 'normal')).toBe(stepPowerAt(0.5 + distance, 'normal'));
    }
  });
});

describe('judgeTiming（見せかたの ラベル）', () => {
  it('まんなかで止めれば ぴったり', () => {
    expect(judgeTiming(0.5, 'normal')).toBe('perfect');
    expect(judgeTiming(0.5, 'strong')).toBe('perfect');
  });

  it('つよい わざ ほど ぴったりの はば が せまい', () => {
    expect(stepsFor('strong')[0]!.until).toBeLessThan(stepsFor('normal')[0]!.until);
    expect(stepsFor('strong')[1]!.until).toBeLessThan(stepsFor('normal')[1]!.until);
    // ふつうなら ぴったり になる ずれ でも、つよい わざ では ぴったり にならない
    expect(judgeTiming(0.5 + 0.1, 'normal')).toBe('perfect');
    expect(judgeTiming(0.5 + 0.1, 'strong')).not.toBe('perfect');
  });

  it('ずれるほど ぴったり → ちかい → はずれ の じゅんに 変わる', () => {
    const steps = stepsFor('normal');
    expect(judgeTiming(0.5 + steps[0]!.until - 0.001, 'normal')).toBe('perfect');
    expect(judgeTiming(0.5 + steps[0]!.until + 0.001, 'normal')).toBe('near');
    expect(judgeTiming(0.5 + steps[1]!.until + 0.001, 'normal')).toBe('miss');
  });

  it('あいだに はずれ帯 は ない（ぴったり の となりは かならず ちかい）', () => {
    for (const kind of ['normal', 'strong'] as const) {
      const steps = stepsFor(kind);
      expect(judgeTiming(0.5 + steps[0]!.until + 0.001, kind)).toBe('near');
    }
  });

  it('大きく ずれると はずれ', () => {
    expect(judgeTiming(0, 'normal')).toBe('miss');
    expect(judgeTiming(1, 'normal')).toBe('miss');
  });
});

describe('つかれ と メガシンカ で ねらいやすさ が変わる（docs/SPEC.md §3.6・§3.7）', () => {
  it('つかれていると 段が せまくなる', () => {
    expect(stepsFor('normal', { tired: true })[0]!.until).toBeCloseTo(
      MOVE_STEPS.normal[0]!.until * TIRED_STEP_SCALE,
    );
  });

  it('メガシンカ中は 段が ひろくなる', () => {
    expect(stepsFor('strong', { megaEvolved: true })[0]!.until).toBeCloseTo(
      MOVE_STEPS.strong[0]!.until * MEGA_STEP_SCALE,
    );
  });

  it('つかれた状態でも メガシンカ中なら 少し取り返せる', () => {
    const tired = stepsFor('normal', { tired: true })[0]!.until;
    const both = stepsFor('normal', { tired: true, megaEvolved: true })[0]!.until;
    expect(both).toBeGreaterThan(tired);
  });

  it('おなじ位置でも、つかれていると ぴったり が とれなくなる', () => {
    const position = 0.5 + MOVE_STEPS.normal[0]!.until - 0.01;
    expect(judgeTiming(position, 'normal')).toBe('perfect');
    expect(judgeTiming(position, 'normal', { tired: true })).not.toBe('perfect');
  });

  it('おなじ位置でも、メガシンカ中なら ぴったり になる', () => {
    const position = 0.5 + MOVE_STEPS.strong[0]!.until + 0.005;
    expect(judgeTiming(position, 'strong')).toBe('near');
    expect(judgeTiming(position, 'strong', { megaEvolved: true })).toBe('perfect');
  });

  it('どの じょうたい でも 段の さかいめ は 外へ いくほど 大きい', () => {
    for (const kind of ['normal', 'strong'] as const) {
      for (const tired of [false, true]) {
        for (const megaEvolved of [false, true]) {
          const steps = stepsFor(kind, { tired, megaEvolved });
          for (let i = 1; i < steps.length; i += 1) {
            expect(steps[i]!.until).toBeGreaterThanOrEqual(steps[i - 1]!.until);
          }
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
  const hitAt = (move: 'normal' | 'strong', position: number, a = attacker, t = target) => {
    const modifiers = { tired: a.tired, megaEvolved: a.megaEvolved };
    return calcDamage(
      a,
      t,
      {
        style: 'timing',
        move,
        power: stepPowerAt(position, move, modifiers),
        timing: judgeTiming(position, move, modifiers),
      },
      settings,
    ).damage;
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
    const outermost = MOVE_STEPS.normal[MOVE_STEPS.normal.length - 1]!.power;
    expect(hitAt('normal', 0)).toBe(ceilTo10(outermost));
  });

  it('つよいわざ を 大きく はずすと 0ダメージ（ばつぐん でも 0）', () => {
    expect(hitAt('strong', 0)).toBe(0);
    expect(hitAt('strong', 0, attacker, weak)).toBe(0);
    const mega = makePokemon({ type: 'ほのお', megaEvolved: true });
    expect(hitAt('strong', 0, mega)).toBe(0);
  });

  it('つよいわざ は ぴったり なら ふつうわざ より 大きいが、少し ずれると 負ける', () => {
    expect(hitAt('strong', 0.5)).toBeGreaterThan(hitAt('normal', 0.5));
    // つよいわざ は 0ダメージ帯 まで ずれると ふつうわざ に 負ける
    expect(hitAt('strong', 0.5 + 0.25)).toBeLessThan(hitAt('normal', 0.5 + 0.25));
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
        { style: 'timing', move: 'normal', power: MOVE_POWER.normal, timing: 'perfect' },
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
