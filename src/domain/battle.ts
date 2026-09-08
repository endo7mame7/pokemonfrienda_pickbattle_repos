import { calcDamage } from './damage';
import type { AttackInput } from './damage';
import { moveName } from './moves';
import type { MoveKind } from './moves';
import { judgeTiming } from './timing';
import type { TimingResult } from './timing';
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
  /** どの わざ を つかう？（タイミングのとき） */
  | 'chooseMove'
  /** ゲージを止める（タイミングのとき） */
  | 'timing'
  /** ボタンを連打してゲージをためる（メガわざのとき） */
  | 'mashing'
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
  /** わざの名前。演出とよみあげに使う */
  moveName: string;
  /** サイコロのときだけ */
  rolls?: number[];
  /** タイミングのときだけ */
  timing?: TimingResult;
  /** メガわざのときだけ。ゲージの たまりぐあい（0〜1） */
  mashFill?: number;
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
  /** えらんだ わざ（タイミングのとき） */
  selectedMove: MoveKind | null;
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
  /** つかう わざ をえらぶ（タイミングのとき） */
  | { type: 'chooseMove'; move: MoveKind }
  /** ゲージを止める。position は 0〜1 で 0.5 がまんなか */
  | { type: 'stopTiming'; position: number }
  /** メガわざの連打がおわった。fill は 0〜1 */
  | { type: 'finishMash'; fill: number }
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
    selectedMove: null,
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

/**
 * こうげきを計算して、エフェクトを見せる段階へ進む。
 * ここではまだ当てない（docs/SPEC.md §3.10）。
 */
function resolveAttack(state: BattleState, input: AttackInput): BattleState {
  const attackerIndex = state.selectedAttackerIndex;
  const targetIndex = state.selectedTargetIndex;
  if (attackerIndex === null || targetIndex === null) return state;

  const attacker = state.teams[state.turnPlayer][attackerIndex];
  const target = state.teams[OPPONENT_OF[state.turnPlayer]][targetIndex];
  if (!attacker || !target) return state;

  const { damage, isSuperEffective, isTired } = calcDamage(attacker, target, input, state.settings);

  return {
    ...state,
    phase: 'attacking',
    lastResult: {
      attackerName: attacker.name,
      attackerType: attacker.type,
      targetName: target.name,
      targetIndex,
      moveName: moveName(
        attacker.type,
        input.style === 'timing' ? input.move : input.style === 'mash' ? 'mega' : 'normal',
      ),
      ...(input.style === 'dice' ? { rolls: input.rolls } : {}),
      ...(input.style === 'timing' ? { timing: input.timing } : {}),
      ...(input.style === 'mash' ? { mashFill: input.fill } : {}),
      damage,
      isSuperEffective,
      isTired,
      targetFainted: false,
    },
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
    selectedMove: null,
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
        selectedMove: null,
      };
    }

    case 'selectTarget': {
      if (state.phase !== 'selectTarget' && state.phase !== 'rollDice') return state;
      const pokemon = state.teams[OPPONENT_OF[state.turnPlayer]][action.index];
      if (!pokemon || !isAlive(pokemon)) return state;
      // タイミングのときは わざ をえらんでから、サイコロのときはそのまま振る
      return {
        ...state,
        phase: state.settings.attackStyle === 'timing' ? 'chooseMove' : 'rollDice',
        selectedTargetIndex: action.index,
      };
    }

    case 'clearSelection': {
      // こうげきが始まったあとは戻れない
      const undoable: BattlePhase[] = ['selectTarget', 'rollDice', 'chooseMove'];
      if (!undoable.includes(state.phase)) return state;
      return {
        ...state,
        phase: 'selectAttacker',
        selectedAttackerIndex: null,
        selectedTargetIndex: null,
        selectedMove: null,
      };
    }

    case 'chooseMove': {
      if (state.phase !== 'chooseMove') return state;
      const attacker =
        state.selectedAttackerIndex === null
          ? undefined
          : state.teams[state.turnPlayer][state.selectedAttackerIndex];
      // メガわざは メガシンカ中の子だけ
      if (action.move === 'mega' && !attacker?.megaEvolved) return state;
      return {
        ...state,
        phase: action.move === 'mega' ? 'mashing' : 'timing',
        selectedMove: action.move,
      };
    }

    case 'finishMash': {
      if (state.phase !== 'mashing') return state;
      return resolveAttack(state, { style: 'mash', fill: action.fill });
    }

    case 'stopTiming': {
      if (state.phase !== 'timing' || state.selectedMove === null || state.selectedMove === 'mega') {
        return state;
      }
      const attacker =
        state.selectedAttackerIndex === null
          ? undefined
          : state.teams[state.turnPlayer][state.selectedAttackerIndex];
      if (!attacker) return state;
      return resolveAttack(state, {
        style: 'timing',
        move: state.selectedMove,
        timing: judgeTiming(action.position, state.selectedMove, {
          tired: state.settings.fatigueEnabled && attacker.tired,
          megaEvolved: attacker.megaEvolved,
        }),
      });
    }

    case 'rollDice': {
      if (state.phase !== 'rollDice') return state;
      return resolveAttack(state, { style: 'dice', rolls: action.rolls });
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
