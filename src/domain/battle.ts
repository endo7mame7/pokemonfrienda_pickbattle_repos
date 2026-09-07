import { calcDamage } from './damage';
import { diceCountFor } from './dice';
import { updateFatigue } from './fatigue';
import { findMegaCandidateIndex } from './megaEvolution';
import { OPPONENT_OF } from './types';
import type { BattlePokemon, Pick, PlayerId, PokemonType, Settings } from './types';

export type BattlePhase =
  /** メガシンカ できる子がいる。する / しない を選ぶ */
  | 'megaPrompt'
  /** メガシンカ の演出中 */
  | 'megaEvolving'
  | 'selectAttacker'
  | 'selectTarget'
  | 'rollDice'
  /** サイコロは出たが、まだ当たっていない。攻撃エフェクトを見せる */
  | 'attacking'
  | 'resolve'
  | 'handOff'
  | 'finished';

/** 1回の攻撃の結果。演出と読み上げに使う */
export interface TurnResult {
  attackerName: string;
  /** 攻撃エフェクトの見た目に使う */
  attackerType: PokemonType;
  targetName: string;
  /** エフェクトを出す位置に使う */
  targetIndex: number;
  rolls: number[];
  damage: number;
  isSuperEffective: boolean;
  isTired: boolean;
  targetFainted: boolean;
}

export interface BattleState {
  teams: Record<PlayerId, BattlePokemon[]>;
  turnPlayer: PlayerId;
  turnCount: number;
  phase: BattlePhase;
  selectedAttackerIndex: number | null;
  selectedTargetIndex: number | null;
  /** メガシンカ できる自分のポケモン。いなければ null */
  megaCandidateIndex: number | null;
  lastResult: TurnResult | null;
  winner: PlayerId | null;
  settings: Settings;
}

export type BattleAction =
  /** メガシンカ する */
  | { type: 'megaEvolve' }
  /** いまは メガシンカ しない。このターンは もう聞かない */
  | { type: 'declineMega' }
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
    ...(pick.silhouette ? { silhouette: pick.silhouette } : {}),
    ...(pick.photo ? { photo: pick.photo } : {}),
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
    megaCandidateIndex: null,
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

/** ターンのはじめ。メガシンカ できる子がいれば、まずそれを聞く */
function startTurn(state: BattleState, turnPlayer: PlayerId): BattleState {
  const megaCandidateIndex = findMegaCandidateIndex(state.teams[turnPlayer], state.settings);
  return {
    ...state,
    turnPlayer,
    phase: megaCandidateIndex === null ? 'selectAttacker' : 'megaPrompt',
    megaCandidateIndex,
    selectedAttackerIndex: null,
    selectedTargetIndex: null,
  };
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'megaEvolve': {
      if (state.phase !== 'megaPrompt' || state.megaCandidateIndex === null) return state;
      const teams = cloneTeams(state.teams);
      const pokemon = teams[state.turnPlayer][state.megaCandidateIndex];
      if (!pokemon) return state;
      pokemon.megaEvolved = true;
      return { ...state, teams, phase: 'megaEvolving' };
    }

    case 'declineMega': {
      if (state.phase !== 'megaPrompt') return state;
      // 断ったら、このターンはもう聞かない（次のターンにまた聞く）
      return { ...state, phase: 'selectAttacker', megaCandidateIndex: null };
    }

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

      const attacker = state.teams[state.turnPlayer][attackerIndex];
      const target = state.teams[OPPONENT_OF[state.turnPlayer]][targetIndex];
      if (!attacker || !target) return state;

      // ここでは当てない。攻撃エフェクトを見せてから当てる
      const { damage, isSuperEffective, isTired } = calcDamage(
        attacker,
        target,
        action.rolls,
        state.settings,
      );

      return {
        ...state,
        phase: 'attacking',
        lastResult: {
          attackerName: attacker.name,
          attackerType: attacker.type,
          targetName: target.name,
          targetIndex,
          rolls: action.rolls,
          damage,
          isSuperEffective,
          isTired,
          targetFainted: false,
        },
      };
    }

    case 'next': {
      // 攻撃エフェクトが終わった。ここでダメージが当たる
      if (state.phase === 'attacking') {
        const result = state.lastResult;
        const attackerIndex = state.selectedAttackerIndex;
        if (!result || attackerIndex === null) return state;

        const teams = cloneTeams(state.teams);
        const attackerTeam = teams[state.turnPlayer];
        const attacker = attackerTeam[attackerIndex];
        const target = teams[OPPONENT_OF[state.turnPlayer]][result.targetIndex];
        if (!attacker || !target) return state;

        target.hp = Math.max(0, target.hp - result.damage);
        attacker.damageDealt += result.damage;

        if (state.settings.fatigueEnabled) {
          updateFatigue(attackerTeam, attackerIndex, result.isTired);
        }
        // メガシンカはここでは起こさない。やられた側が自分のターンのはじめに選ぶ

        return {
          ...state,
          teams,
          phase: 'resolve',
          lastResult: { ...result, targetFainted: target.hp === 0 },
        };
      }

      if (state.phase === 'resolve') {
        const defenderTeam = state.teams[OPPONENT_OF[state.turnPlayer]];
        if (isTeamWipedOut(defenderTeam)) {
          return { ...state, phase: 'finished', winner: state.turnPlayer };
        }
        return { ...state, phase: 'handOff' };
      }

      // メガシンカの演出が終わった。ほかにもできる子がいれば続けて聞く
      if (state.phase === 'megaEvolving') {
        return startTurn(state, state.turnPlayer);
      }

      if (state.phase === 'handOff') {
        return {
          ...startTurn(state, OPPONENT_OF[state.turnPlayer]),
          turnCount: state.turnCount + 1,
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
