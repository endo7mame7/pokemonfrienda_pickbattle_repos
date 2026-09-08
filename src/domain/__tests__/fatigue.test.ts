import { describe, expect, it } from 'vitest';
import { clearFatigueIfAlone, updateFatigue } from '../fatigue';
import { makePokemon } from './testHelpers';

describe('updateFatigue（docs/SPEC.md §3.7）', () => {
  const team3 = () => [
    makePokemon({ name: 'A' }),
    makePokemon({ name: 'B' }),
    makePokemon({ name: 'C' }),
  ];

  it('攻撃した子は つかれる', () => {
    const team = team3();
    updateFatigue(team, 0);
    expect(team[0]!.tired).toBe(true);
  });

  it('攻撃しなかった（休んだ）子は 元気に戻る', () => {
    const team = team3();
    team[1]!.tired = true;
    updateFatigue(team, 0);
    expect(team[1]!.tired).toBe(false);
  });

  it('つかれたまま攻撃しても、つかれは とれない', () => {
    const team = team3();
    team[0]!.tired = true;
    updateFatigue(team, 0);
    expect(team[0]!.tired).toBe(true);
  });

  it('順番に交代して使えば、だれも つかれた状態で攻撃しない', () => {
    const team = team3();
    for (let turn = 0; turn < 9; turn += 1) {
      const index = turn % 3;
      expect(team[index]!.tired).toBe(false);
      updateFatigue(team, index);
    }
  });

  it('同じ子を連打すると、2回目からは ずっと つかれたまま', () => {
    const team = team3();
    const tiredAtAttack: boolean[] = [];
    for (let turn = 0; turn < 5; turn += 1) {
      tiredAtAttack.push(team[0]!.tired);
      updateFatigue(team, 0);
    }
    expect(tiredAtAttack).toEqual([false, true, true, true, true]);
  });
});

describe('交代できないときは つかれない', () => {
  it('戦える子が1体だけなら、攻撃しても つかれない', () => {
    const team = [makePokemon()];
    updateFatigue(team, 0);
    expect(team[0]!.tired).toBe(false);
  });

  it('仲間がたおれて1体だけになったら、ついていた つかれも消える', () => {
    const team = [makePokemon({ name: 'A', tired: true }), makePokemon({ name: 'B', hp: 0 })];
    clearFatigueIfAlone(team);
    expect(team[0]!.tired).toBe(false);
  });

  it('まだ2体いるなら、つかれは そのまま', () => {
    const team = [makePokemon({ name: 'A', tired: true }), makePokemon({ name: 'B' })];
    clearFatigueIfAlone(team);
    expect(team[0]!.tired).toBe(true);
  });

  it('ひんしの子は かぞえない', () => {
    const team = [makePokemon({ name: 'A' }), makePokemon({ name: 'B', hp: 0 })];
    updateFatigue(team, 0);
    expect(team[0]!.tired).toBe(false);
  });
});
