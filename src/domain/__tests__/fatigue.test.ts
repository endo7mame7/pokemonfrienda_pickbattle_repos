import { describe, expect, it } from 'vitest';
import { updateFatigue } from '../fatigue';
import { makePokemon } from './testHelpers';

describe('updateFatigue（docs/SPEC.md §3.7）', () => {
  it('全力で攻撃した子は つかれる', () => {
    const team = [makePokemon({ name: 'A' }), makePokemon({ name: 'B' })];
    updateFatigue(team, 0, false);
    expect(team[0]!.tired).toBe(true);
  });

  it('つかれた状態で攻撃した子は 元気に戻る', () => {
    const team = [makePokemon({ name: 'A', tired: true })];
    updateFatigue(team, 0, true);
    expect(team[0]!.tired).toBe(false);
  });

  it('攻撃しなかった（休んだ）子は 元気に戻る', () => {
    const team = [makePokemon({ name: 'A' }), makePokemon({ name: 'B', tired: true })];
    updateFatigue(team, 0, false);
    expect(team[1]!.tired).toBe(false);
  });

  it('1体だけのとき（1vs1）は ぜんりょく → はんぶん → ぜんりょく と交互になる', () => {
    const team = [makePokemon()];
    const history: boolean[] = [];
    for (let turn = 0; turn < 6; turn += 1) {
      const wasTired = team[0]!.tired;
      history.push(wasTired);
      updateFatigue(team, 0, wasTired);
    }
    expect(history).toEqual([false, true, false, true, false, true]);
  });

  it('3体を順番に交代して使えば、だれも つかれた状態で攻撃しない', () => {
    const team = [makePokemon({ name: 'A' }), makePokemon({ name: 'B' }), makePokemon({ name: 'C' })];
    for (let turn = 0; turn < 9; turn += 1) {
      const index = turn % 3;
      expect(team[index]!.tired).toBe(false);
      updateFatigue(team, index, team[index]!.tired);
    }
  });

  it('同じ子を連打すると、半分の攻撃が交互に混ざる', () => {
    const team = [makePokemon({ name: 'A' }), makePokemon({ name: 'B' })];
    const tiredAttacks: boolean[] = [];
    for (let turn = 0; turn < 6; turn += 1) {
      const wasTired = team[0]!.tired;
      tiredAttacks.push(wasTired);
      updateFatigue(team, 0, wasTired);
    }
    expect(tiredAttacks.filter(Boolean)).toHaveLength(3);
  });
});
