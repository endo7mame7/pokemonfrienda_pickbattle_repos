import { describe, expect, it } from 'vitest';
import { calcDamage, ceilTo10 } from '../damage';
import { makePokemon, makeSettings } from './testHelpers';

describe('ceilTo10', () => {
  it('10の倍数はそのまま', () => {
    expect(ceilTo10(60)).toBe(60);
  });

  it('端数は切り上げる（子どもに有利な側へ）', () => {
    expect(ceilTo10(25)).toBe(30);
    expect(ceilTo10(15)).toBe(20);
    expect(ceilTo10(1)).toBe(10);
  });
});

describe('calcDamage（docs/SPEC.md §3.4 の実例）', () => {
  const settings = makeSettings({ damageMultiplier: 20, superEffectiveBonus: 20 });
  const attacker = makePokemon({ type: 'ほのお' });
  const normalTarget = makePokemon({ type: 'みず' });
  const weakTarget = makePokemon({ type: 'くさ' }); // ほのお → くさ は ばつぐん

  it('ふつう: 出目3 → 60', () => {
    const result = calcDamage(attacker, normalTarget, [3], settings);
    expect(result.damage).toBe(60);
    expect(result.isSuperEffective).toBe(false);
    expect(result.isTired).toBe(false);
  });

  it('ばつぐん: 出目3 → 60 + 20 = 80', () => {
    const result = calcDamage(attacker, weakTarget, [3], settings);
    expect(result.damage).toBe(80);
    expect(result.isSuperEffective).toBe(true);
  });

  it('つかれてる: 出目3 → 60 ÷ 2 = 30', () => {
    const tired = makePokemon({ type: 'ほのお', tired: true });
    const result = calcDamage(tired, normalTarget, [3], settings);
    expect(result.damage).toBe(30);
    expect(result.isTired).toBe(true);
  });

  it('つかれてる + ばつぐん: (60 + 20) ÷ 2 = 40', () => {
    const tired = makePokemon({ type: 'ほのお', tired: true });
    expect(calcDamage(tired, weakTarget, [3], settings).damage).toBe(40);
  });

  it('メガシンカ中はサイコロ2個ぶん: 出目 4+5 → 180', () => {
    expect(calcDamage(attacker, normalTarget, [4, 5], settings).damage).toBe(180);
  });

  it('メガシンカ中 + ばつぐん: 180 + 20 = 200', () => {
    expect(calcDamage(attacker, weakTarget, [4, 5], settings).damage).toBe(200);
  });
});

describe('calcDamage の設定', () => {
  it('ダメージばいりつを変えられる', () => {
    const attacker = makePokemon();
    const target = makePokemon();
    expect(calcDamage(attacker, target, [3], makeSettings({ damageMultiplier: 10 })).damage).toBe(30);
    expect(calcDamage(attacker, target, [3], makeSettings({ damageMultiplier: 30 })).damage).toBe(90);
  });

  it('ばつぐんボーナスを変えられる', () => {
    const attacker = makePokemon({ type: 'ほのお' });
    const target = makePokemon({ type: 'くさ' });
    for (const bonus of [0, 10, 20, 40, 60] as const) {
      const settings = makeSettings({ damageMultiplier: 20, superEffectiveBonus: bonus });
      expect(calcDamage(attacker, target, [3], settings).damage).toBe(60 + bonus);
    }
  });

  it('つかれルールをオフにすると、つかれていても半分にならない', () => {
    const tired = makePokemon({ tired: true });
    const settings = makeSettings({ fatigueEnabled: false, damageMultiplier: 20 });
    const result = calcDamage(tired, makePokemon(), [3], settings);
    expect(result.damage).toBe(60);
    expect(result.isTired).toBe(false);
  });

  it('どんな設定でも、ダメージは必ず10の倍数になる', () => {
    const multipliers = [10, 20, 30] as const;
    const bonuses = [0, 10, 20, 40, 60] as const;
    for (const damageMultiplier of multipliers) {
      for (const superEffectiveBonus of bonuses) {
        for (const tired of [false, true]) {
          for (const rolls of [[1], [6], [1, 1], [6, 6], [3, 4]]) {
            const settings = makeSettings({ damageMultiplier, superEffectiveBonus });
            const attacker = makePokemon({ type: 'ほのお', tired });
            const target = makePokemon({ type: 'くさ' });
            expect(calcDamage(attacker, target, rolls, settings).damage % 10).toBe(0);
          }
        }
      }
    }
  });

  it('ダメージが0になることはない（園児が「なにも できなかった」体験をしない）', () => {
    const settings = makeSettings({ damageMultiplier: 10 });
    const attacker = makePokemon({ tired: true });
    expect(calcDamage(attacker, makePokemon(), [1], settings).damage).toBeGreaterThan(0);
  });
});
