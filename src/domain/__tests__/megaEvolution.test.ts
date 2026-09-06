import { describe, expect, it } from 'vitest';
import { findMegaCandidateIndex, shouldMegaEvolve } from '../megaEvolution';
import { makePokemon, makeSettings } from './testHelpers';

describe('shouldMegaEvolve（docs/SPEC.md §3.6）', () => {
  const settings = makeSettings({ megaThreshold: 'third' });

  it('たいりょくが 1/3 以下になったら発動する', () => {
    const pokemon = makePokemon({ maxHp: 300, hp: 100, canMegaEvolve: true });
    expect(shouldMegaEvolve(pokemon, settings)).toBe(true);
  });

  it('1/3 より多く残っていれば発動しない', () => {
    const pokemon = makePokemon({ maxHp: 300, hp: 110, canMegaEvolve: true });
    expect(shouldMegaEvolve(pokemon, settings)).toBe(false);
  });

  it('メガシンカできないポケモンは発動しない', () => {
    const pokemon = makePokemon({ maxHp: 300, hp: 50, canMegaEvolve: false });
    expect(shouldMegaEvolve(pokemon, settings)).toBe(false);
  });

  it('ひんしになったら発動しない（0になったら倒れる）', () => {
    const pokemon = makePokemon({ maxHp: 300, hp: 0, canMegaEvolve: true });
    expect(shouldMegaEvolve(pokemon, settings)).toBe(false);
  });

  it('1バトルに1回だけ', () => {
    const pokemon = makePokemon({ maxHp: 300, hp: 50, canMegaEvolve: true, megaEvolved: true });
    expect(shouldMegaEvolve(pokemon, settings)).toBe(false);
  });

  it('発動ラインを設定で変えられる', () => {
    const pokemon = makePokemon({ maxHp: 300, hp: 140, canMegaEvolve: true });
    expect(shouldMegaEvolve(pokemon, makeSettings({ megaThreshold: 'half' }))).toBe(true);
    expect(shouldMegaEvolve(pokemon, makeSettings({ megaThreshold: 'third' }))).toBe(false);
    expect(shouldMegaEvolve(pokemon, makeSettings({ megaThreshold: 'quarter' }))).toBe(false);
  });

  it('「つかわない」設定ならメガシンカしない', () => {
    const pokemon = makePokemon({ maxHp: 300, hp: 10, canMegaEvolve: true });
    expect(shouldMegaEvolve(pokemon, makeSettings({ megaThreshold: 'off' }))).toBe(false);
  });
});

describe('findMegaCandidateIndex', () => {
  const settings = makeSettings({ megaThreshold: 'third' });

  it('メガシンカ できる子をさがす。さがすだけで、かってに進化はしない', () => {
    const team = [
      makePokemon({ name: 'A', maxHp: 300, hp: 250, canMegaEvolve: true }),
      makePokemon({ name: 'B', maxHp: 300, hp: 90, canMegaEvolve: true }),
      makePokemon({ name: 'C', maxHp: 300, hp: 10, canMegaEvolve: false }),
    ];
    expect(findMegaCandidateIndex(team, settings)).toBe(1);
    expect(team.every((pokemon) => !pokemon.megaEvolved)).toBe(true);
  });

  it('だれもできないときは null', () => {
    const team = [makePokemon({ maxHp: 300, hp: 300, canMegaEvolve: true })];
    expect(findMegaCandidateIndex(team, settings)).toBeNull();
  });
});
