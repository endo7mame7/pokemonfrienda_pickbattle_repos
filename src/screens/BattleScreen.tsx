import { useEffect, useReducer, useState } from 'react';
import { Dice } from '../components/Dice';
import { PokemonCard } from '../components/PokemonCard';
import { Silhouette } from '../components/Silhouette';
import {
  battleReducer,
  createBattle,
  diceCountForTurn,
  isAlive,
  randomDie,
  rollDice,
  OPPONENT_OF,
} from '../domain';
import type { BattleState, Pick, PlayerId, Settings } from '../domain';
import { HandOffScreen } from './HandOffScreen';

interface Props {
  p1: Pick[];
  p2: Pick[];
  firstPlayer: PlayerId;
  settings: Settings;
  playerNames: Record<PlayerId, string>;
  onFinish: (state: BattleState) => void;
}

const ROLL_ANIMATION_MS = 700;
const ATTACK_EFFECT_MS = 780;
const MEGA_ANIMATION_MS = 2400;

/** 対面で遊ぶので、チームの場所は入れかわらない。あかは上、あおは下で固定 */
const TOP: PlayerId = 'p1';
const BOTTOM: PlayerId = 'p2';

export function BattleScreen({ p1, p2, firstPlayer, settings, playerNames, onFinish }: Props) {
  const [state, dispatch] = useReducer(
    battleReducer,
    { p1, p2, firstPlayer, settings },
    (init) => createBattle(init.p1, init.p2, init.firstPlayer, init.settings),
  );
  const [rolling, setRolling] = useState(false);
  // つかれている子を選んだときの「それでも いい？」確認（docs/SPEC.md §3.7）
  const [tiredConfirmIndex, setTiredConfirmIndex] = useState<number | null>(null);

  useEffect(() => {
    if (state.phase === 'finished') onFinish(state);
  }, [state, onFinish]);

  // 攻撃エフェクトを見せてから、ダメージを当てる
  useEffect(() => {
    if (state.phase !== 'attacking') return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'next' }), ATTACK_EFFECT_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  // メガシンカの演出は、見せてから自動で次に進む
  useEffect(() => {
    if (state.phase !== 'megaEvolving') return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'next' }), MEGA_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  const attackerSide = state.turnPlayer;
  const targetSide = OPPONENT_OF[state.turnPlayer];
  const result = state.lastResult;
  const megaCandidate =
    state.megaCandidateIndex === null
      ? null
      : (state.teams[attackerSide][state.megaCandidateIndex] ?? null);

  const chooseAttacker = (index: number) => {
    const pokemon = state.teams[attackerSide][index];
    if (!pokemon || !isAlive(pokemon)) return;
    if (settings.fatigueEnabled && pokemon.tired) {
      setTiredConfirmIndex(index);
      return;
    }
    dispatch({ type: 'selectAttacker', index });
  };

  const roll = () => {
    setRolling(true);
    const rolls = rollDice(diceCountForTurn(state), randomDie);
    window.setTimeout(() => {
      setRolling(false);
      dispatch({ type: 'rollDice', rolls });
    }, ROLL_ANIMATION_MS);
  };

  const turnName = playerNames[attackerSide];
  const message = (() => {
    if (rolling) return 'サイコロ ころころ…';
    switch (state.phase) {
      case 'selectAttacker':
        return `${turnName}の ばん。だれで こうげきする？`;
      case 'selectTarget':
        return 'だれを ねらう？';
      case 'rollDice':
        return 'サイコロを ふろう！';
      case 'attacking':
        return `${result?.attackerName}の こうげき！`;
      case 'resolve':
        return result?.targetFainted ? `${result.targetName}は たおれた！` : '';
      default:
        return '';
    }
  })();

  const canPickAttacker =
    !rolling && (state.phase === 'selectAttacker' || state.phase === 'selectTarget');
  const canPickTarget = !rolling && (state.phase === 'selectTarget' || state.phase === 'rollDice');

  const renderTeam = (side: PlayerId) => {
    const isAttackerSide = side === attackerSide;
    const selectable = isAttackerSide ? canPickAttacker : canPickTarget;
    // 攻撃する側を選んでいる間は、相手側を暗くする（どっちを選ぶのか迷わないように）
    const dimmed = isAttackerSide ? canPickTarget && !canPickAttacker : canPickAttacker && !canPickTarget;

    return (
      // いま こうげきする側か、ねらわれる側かを持たせる
      <div className="team" data-side={side} data-role={isAttackerSide ? 'attacker' : 'target'}>
        {state.teams[side].map((pokemon, index) => (
          <PokemonCard
            key={pokemon.pickId + index}
            pokemon={pokemon}
            selectable={selectable && isAlive(pokemon)}
            selected={
              isAttackerSide
                ? state.selectedAttackerIndex === index
                : state.selectedTargetIndex === index
            }
            dimmed={dimmed}
            hit={
              state.phase === 'attacking' &&
              result &&
              side === targetSide &&
              result.targetIndex === index
                ? {
                    type: result.attackerType,
                    damage: result.damage,
                    isSuperEffective: result.isSuperEffective,
                  }
                : undefined
            }
            onSelect={() =>
              isAttackerSide
                ? chooseAttacker(index)
                : dispatch({ type: 'selectTarget', index })
            }
          />
        ))}
      </div>
    );
  };

  const teamLabel = (side: PlayerId) => (
    <div
      className={`team-label team-label--${side}${side === attackerSide ? ' team-label--turn' : ''}`}
    >
      {playerNames[side]}チーム{side === attackerSide ? '（いま こうげき）' : ''}
    </div>
  );

  return (
    <div className="screen">
      <div className="screen__body">
        {teamLabel(TOP)}
        {renderTeam(TOP)}

        <div
          className={
            state.phase === 'resolve' ? 'battle-center battle-center--tappable' : 'battle-center'
          }
          onClick={state.phase === 'resolve' ? () => dispatch({ type: 'next' }) : undefined}
        >
          <div className="message">{message}</div>

          {(state.phase === 'rollDice' || rolling) && (
            <button
              type="button"
              className="dice-button"
              disabled={rolling}
              onClick={roll}
              aria-label="サイコロを ふる"
            >
              <Dice values={Array.from({ length: diceCountForTurn(state) }, () => 1)} rolling />
            </button>
          )}

          {(state.phase === 'attacking' || state.phase === 'resolve') && result && (
            <>
              <Dice values={result.rolls} rolling={false} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {result.isSuperEffective && (
                  <span className="badge badge--super">
                    ⚡ ばつぐん！ +{settings.superEffectiveBonus}
                  </span>
                )}
                {result.isTired && <span className="badge badge--tired">💤 つかれて はんぶん</span>}
              </div>
              {/* ダメージの数は、エフェクトが終わってから出す */}
              {state.phase === 'resolve' && (
                <>
                  <div className="damage">-{result.damage}</div>
                  <div className="tap-hint">タップして つぎへ 👆</div>
                </>
              )}
            </>
          )}

          {(state.phase === 'selectAttacker' || state.phase === 'selectTarget') &&
            !rolling &&
            state.selectedAttackerIndex !== null && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => dispatch({ type: 'clearSelection' })}
              >
                えらびなおす
              </button>
            )}
        </div>

        {renderTeam(BOTTOM)}
        {teamLabel(BOTTOM)}
      </div>

      {tiredConfirmIndex !== null && (
        <div className="overlay">
          <div className="overlay__panel">
            <div style={{ fontSize: 48 }}>💤</div>
            <div className="overlay__title" style={{ fontSize: 22 }}>
              {state.teams[attackerSide][tiredConfirmIndex]?.name}は つかれてるよ
            </div>
            <p style={{ margin: 0 }}>ダメージが はんぶんに なるけど、それでも いい？</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                dispatch({ type: 'selectAttacker', index: tiredConfirmIndex });
                setTiredConfirmIndex(null);
              }}
            >
              これで いく！
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setTiredConfirmIndex(null)}
            >
              ほかの子に する
            </button>
          </div>
        </div>
      )}

      {state.phase === 'megaPrompt' && megaCandidate && (
        <div className="overlay">
          <div className="overlay__panel">
            <Silhouette
              name={megaCandidate.name}
              type={megaCandidate.type}
              shape={megaCandidate.silhouette}
              size={92}
              key={megaCandidate.name}
            />
            <div className="overlay__title" style={{ fontSize: 22 }}>
              {megaCandidate.name}は メガシンカ できる！
            </div>
            <p style={{ margin: 0 }}>メガシンカ すると サイコロが 2こに なるよ</p>
            <button type="button" className="btn" onClick={() => dispatch({ type: 'megaEvolve' })}>
              🌈 メガシンカ する！
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => dispatch({ type: 'declineMega' })}
            >
              いまは しない
            </button>
          </div>
        </div>
      )}

      {state.phase === 'megaEvolving' && megaCandidate && (
        <div className="overlay">
          <div className="mega-stage">
            <div className="mega-stage__glow">
              <div className="mega-stage__figure">
                <Silhouette
                  name={megaCandidate.name}
                  type={megaCandidate.type}
                  shape={megaCandidate.silhouette}
                  size={110}
                />
              </div>
            </div>
            <div className="mega-stage__title">🌈 メガシンカ！</div>
            <div className="tap-hint" style={{ color: '#fff' }}>
              {megaCandidate.name}の サイコロが 2こに なった！
            </div>
          </div>
          <div className="mega-flash" />
        </div>
      )}

      {state.phase === 'handOff' && (
        <HandOffScreen
          playerName={playerNames[targetSide]}
          onContinue={() => dispatch({ type: 'next' })}
        />
      )}
    </div>
  );
}
