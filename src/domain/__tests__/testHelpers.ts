import type { BattlePokemon, Pick, PokemonType, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

let seq = 0;

export function makePick(overrides: Partial<Pick> = {}): Pick {
  seq += 1;
  return {
    id: `pick-${seq}`,
    name: `ポケモン${seq}`,
    type: 'ノーマル',
    energy: 200,
    canMegaEvolve: false,
    useCount: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

export function makePokemon(overrides: Partial<BattlePokemon> = {}): BattlePokemon {
  const maxHp = overrides.maxHp ?? 200;
  return {
    pickId: 'x',
    name: 'テストポケモン',
    type: 'ノーマル' as PokemonType,
    maxHp,
    hp: maxHp,
    canMegaEvolve: false,
    megaEvolved: false,
    megaUsed: false,
    tired: false,
    damageDealt: 0,
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}
