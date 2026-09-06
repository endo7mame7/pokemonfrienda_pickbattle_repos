import { calcDamage } from './damage';
import { diceCountFor } from './dice';
import { updateFatigue } from './fatigue';
import { applyMegaEvolution } from './megaEvolution';
import { OPPONENT_OF } from './types';
import type { BattlePokemon, Pick, PlayerId, Settings } from './types';

export type BattlePhase =
  | 'selectAttacker'
  | 'selectTarget'
  | 'rollDice'
  | 'resolve'
  | 'handOff'
  | 'finished';

/** 1回の攻撃の結果。演出と読み上げに使う */
export interface TurnResult {
  attackerName: string;
  targetName: string;
  rolls: number[];
  damage: number;
  isSuperEffective: boolean;
  isTired: boolean;
  targetFainted: boolean;
  /** この攻撃をきっかけにメガシンカしたポケモンの名前 */
  megaEvolvedNames: string[];
}

export interface BattleState {
  teams: Record<PlayerId, BattlePokemon[]>;
  turnPlayer: PlayerId;
  turnCount: number;
  phase: BattlePhase;
  selectedAttackerIndex: number | null;
  selectedTargetIndex: number | null;
  lastResult: TurnResult | null;
  winner: PlayerId | null;
  settings: Settings;
}

export type BattleAction =
  | { type: 'selectAttacker'; index: number }
  | { type: 'selectTarget'; index: number }
  /** 選択をやり直す。サイコロを振るまではいつでも戻れる */
  | { type: 'clearSelection' }
  | { type: 'rollDice'; rolls: number[] }
  /** 結果の演出が終わった／受け渡し画面を閉じた */
  | { type: 'next' };

export function toBattlePokemon(pick: Pick): BattlePokemon {
  return {
    pickId: pick.id,
    name: pick.name,
    type: pick.type,
    maxHp: pick.energy,
    hp: pick.energy,
    canMegaEvolve: pick.canMegaEvolve,
    megaEvolved: false,
    tired: false,
    damageDealt: 0,
  };
}

export function createBattle(
  p1: Pick[],
  p2: Pick[],
  firstPlayer: PlayerId,
  settings: Settings,
): BattleState {
  return {
    teams: { p1: p1.map(toBattlePokemon), p2: p2.map(toBattlePokemon) },
    turnPlayer: firstPlayer,
    turnCount: 1,
    phase: 'selectAttacker',
    selectedAttackerIndex: null,
    selectedTargetIndex: null,
    lastResult: null,
    winner: null,
    settings,
  };
}

export const isAlive = (pokemon: BattlePokemon): boolean => pokemon.hp > 0;

export const isTeamWipedOut = (team: BattlePokemon[]): boolean => !team.some(isAlive);

/** このターンに振るサイコロの数。攻撃するポケモンを選ぶ前は1個として扱う */
export function diceCountForTurn(state: BattleState): number {
  const attacker = selectedAttacker(state);
  return diceCountFor(attacker?.megaEvolved ?? false);
}

export function selectedAttacker(state: BattleState): BattlePokemon | null {
  const { selectedAttackerIndex } = state;
  if (selectedAttackerIndex === null) return null;
  return state.teams[state.turnPlayer][selectedAttackerIndex] ?? null;
}

export function selectedTarget(state: BattleState): BattlePokemon | null {
  const { selectedTargetIndex } = state;
  if (selectedTargetIndex === null) return null;
  return state.teams[OPPONENT_OF[state.turnPlayer]][selectedTargetIndex] ?? null;
}

function cloneTeams(teams: Record<PlayerId, BattlePokemon[]>): Record<PlayerId, BattlePokemon[]> {
  return {
    p1: teams.p1.map((pokemon) => ({ ...pokemon })),
    p2: teams.p2.map((pokemon) => ({ ...pokemon })),
  };
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'selectAttacker': {
      if (state.phase !== 'selectAttacker' && state.phase !== 'selectTarget') return state;
      const pokemon = state.teams[state.turnPlayer][action.index];
      // ひんしのポケモンは選べない
      if (!pokemon || !isAlive(pokemon)) return state;
      return {
        ...state,
        phase: 'selectTarget',
        selectedAttackerIndex: action.index,
        selectedTargetIndex: null,
      };
    }

    case 'selectTarget': {
      if (state.phase !== 'selectTarget' && state.phase !== 'rollDice') return state;
      const pokemon = state.teams[OPPONENT_OF[state.turnPlayer]][action.index];
      if (!pokemon || !isAlive(pokemon)) return state;
      return { ...state, phase: 'rollDice', selectedTargetIndex: action.index };
    }

    case 'clearSelection': {
      // サイコロを振ったあとは戻れない
      if (state.phase !== 'selectTarget' && state.phase !== 'rollDice') return state;
      return {
        ...state,
        phase: 'selectAttacker',
        selectedAttackerIndex: null,
        selectedTargetIndex: null,
      };
    }

    case 'rollDice': {
      if (state.phase !== 'rollDice') return state;
      const attackerIndex = state.selectedAttackerIndex;
      const targetIndex = state.selectedTargetIndex;
      if (attackerIndex === null || targetIndex === null) return state;

      const teams = cloneTeams(state.teams);
      const attackerTeam = teams[state.turnPlayer];
      const defenderTeam = teams[OPPONENT_OF[state.turnPlayer]];
      const attacker = attackerTeam[attackerIndex];
      const target = defenderTeam[targetIndex];
      if (!attacker || !target) return state;

      const { damage, isSuperEffective, isTired } = calcDamage(
        attacker,
        target,
        action.rolls,
        state.settings,
      );

      target.hp = Math.max(0, target.hp - damage);
      attacker.damageDealt += damage;

      if (state.settings.fatigueEnabled) {
        updateFatigue(attackerTeam, attackerIndex, isTired);
      }
      // メガシンカは、ダメージを受けた側について攻撃解決の直後に判定する
      const megaEvolved = applyMegaEvolution(defenderTeam, state.settings);

      return {
        ...state,
        teams,
        phase: 'resolve',
        lastResult: {
          attackerName: attacker.name,
          targetName: target.name,
          rolls: action.rolls,
          damage,
          isSuperEffective,
          isTired,
          targetFainted: target.hp === 0,
          megaEvolvedNames: megaEvolved.map((pokemon) => pokemon.name),
        },
      };
    }

    case 'next': {
      if (state.phase === 'resolve') {
        const defenderTeam = state.teams[OPPONENT_OF[state.turnPlayer]];
        if (isTeamWipedOut(defenderTeam)) {
          return { ...state, phase: 'finished', winner: state.turnPlayer };
        }
        return { ...state, phase: 'handOff' };
      }

      if (state.phase === 'handOff') {
        return {
          ...state,
          turnPlayer: OPPONENT_OF[state.turnPlayer],
          turnCount: state.turnCount + 1,
          phase: 'selectAttacker',
          selectedAttackerIndex: null,
          selectedTargetIndex: null,
        };
      }

      return state;
    }

    default:
      return state;
  }
}

/** いちばん多くダメージを与えたポケモン。結果画面で「がんばったで賞」に使う */
export function mvpOf(team: BattlePokemon[]): BattlePokemon | null {
  return team.reduce<BattlePokemon | null>(
    (best, pokemon) => (best === null || pokemon.damageDealt > best.damageDealt ? pokemon : best),
    null,
  );
}
