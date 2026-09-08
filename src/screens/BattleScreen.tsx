import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { AttackAnimation } from '../components/AttackAnimation';
import { MashGauge } from '../components/MashGauge';
import { TimingGauge } from '../components/TimingGauge';
import type { AttackPath } from '../components/AttackAnimation';
import { Dice } from '../components/Dice';
import { PokemonCard } from '../components/PokemonCard';
import { Silhouette } from '../components/Silhouette';
import {
  MOVE_NAMES,
  battleReducer,
  createBattle,
  diceCountForTurn,
  isAlive,
  randomDie,
  rollDice,
  OPPONENT_OF,
} from '../domain';
import type { BattleState, Pick, PlayerId, Settings, TimingMoveKind } from '../domain';
import { TYPE_COLORS } from '../ui/typeColors';
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
  const bodyRef = useRef<HTMLDivElement>(null);
  // 攻撃エフェクトを、こうげきする子から ねらわれた子へ飛ばすための位置
  const [path, setPath] = useState<AttackPath | null>(null);
  // つかれている子を選んだときの「それでも いい？」確認（docs/SPEC.md §3.7）
  const [tiredConfirmIndex, setTiredConfirmIndex] = useState<number | null>(null);

  useEffect(() => {
    if (state.phase === 'finished') onFinish(state);
  }, [state, onFinish]);

  // カードの位置を測って、そこへエフェクトを飛ばす
  useLayoutEffect(() => {
    if (state.phase !== 'attacking') return;
    const body = bodyRef.current;
    const result = state.lastResult;
    if (!body || !result || state.selectedAttackerIndex === null) return;

    const center = (id: string) => {
      const card = body.querySelector(`[data-card-id="${id}"]`);
      if (!card) return null;
      const area = body.getBoundingClientRect();
      const box = card.getBoundingClientRect();
      return {
        x: box.left + box.width / 2 - area.left,
        y: box.top + box.height / 2 - area.top,
      };
    };

    const from = center(`${state.turnPlayer}-${state.selectedAttackerIndex}`);
    const to = center(`${OPPONENT_OF[state.turnPlayer]}-${result.targetIndex}`);
    if (from && to) {
      setPath({ fromX: from.x, fromY: from.y, toX: to.x, toY: to.y });
    }
  }, [state.phase, state.lastResult, state.selectedAttackerIndex, state.turnPlayer]);

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
  const attackerPokemon =
    state.selectedAttackerIndex === null
      ? null
      : (state.teams[attackerSide][state.selectedAttackerIndex] ?? null);
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
      case 'chooseMove':
        return 'どの わざに する？';
      case 'timing':
        return 'まんなかで とめよう！';
      case 'mashing':
        return attackerPokemon && settings.fatigueEnabled && attackerPokemon.tired
          ? '💤 つかれてる… もっと れんだ！'
          : 'ボタンを れんだ！';
      case 'attacking':
        return `${result?.attackerName}の ${result?.moveName}！`;
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
            cardId={`${side}-${index}`}
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
                ? { damage: result.damage }
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
      <div className="screen__body screen__body--battle" ref={bodyRef}>
        {teamLabel(TOP)}
        {renderTeam(TOP)}

        <div
          className={
            state.phase === 'resolve' ? 'battle-center battle-center--tappable' : 'battle-center'
          }
          onClick={state.phase === 'resolve' ? () => dispatch({ type: 'next' }) : undefined}
        >
          <div className="message">{message}</div>

          {state.phase === 'chooseMove' && attackerPokemon && (
            <>
              <div className="move-row">
                {(['normal', 'strong'] as TimingMoveKind[]).map((move) => (
                  <button
                    key={move}
                    type="button"
                    className="move-btn"
                    style={{ background: TYPE_COLORS[attackerPokemon.type] }}
                    onClick={() => dispatch({ type: 'chooseMove', move })}
                  >
                    {MOVE_NAMES[attackerPokemon.type][move]}
                    <span className="move-btn__sub">
                      {move === 'normal' ? 'あてやすい' : 'つよいけど むずかしい'}
                    </span>
                  </button>
                ))}
              </div>
              {/* メガシンカ中だけ つかえる れんだ わざ */}
              {attackerPokemon.megaEvolved && (
                <button
                  type="button"
                  className="move-btn move-btn--mega"
                  onClick={() => dispatch({ type: 'chooseMove', move: 'mega' })}
                >
                  🌈 {MOVE_NAMES[attackerPokemon.type].mega}
                  <span className="move-btn__sub">ねらわなくていい！ ボタンを れんだ</span>
                </button>
              )}
            </>
          )}

          {state.phase === 'mashing' && attackerPokemon && (
            <MashGauge
              type={attackerPokemon.type}
              tired={settings.fatigueEnabled && attackerPokemon.tired}
              onFinish={(fill) => dispatch({ type: 'finishMash', fill })}
            />
          )}

          {state.phase === 'timing' && state.selectedMove && state.selectedMove !== 'mega' && attackerPokemon && (
            <TimingGauge
              move={state.selectedMove}
              type={attackerPokemon.type}
              tired={settings.fatigueEnabled && attackerPokemon.tired}
              megaEvolved={attackerPokemon.megaEvolved}
              onStop={(position) => dispatch({ type: 'stopTiming', position })}
            />
          )}

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
              {result.rolls && <Dice values={result.rolls} rolling={false} small />}
              {result.mashFill !== undefined && (
                <div
                  className={`timing-result timing-result--${
                    result.mashFill >= 1 ? 'perfect' : result.mashFill >= 0.6 ? 'near' : 'miss'
                  }`}
                >
                  {result.mashFill >= 1
                    ? '🌈 MAX！ さいきょう'
                    : `🌈 ゲージ ${Math.round(result.mashFill * 100)}%`}
                </div>
              )}
              {result.timing && (
                <div className={`timing-result timing-result--${result.timing}`}>
                  {result.timing === 'perfect' && '🎯 ぴったり！ 2ばい'}
                  {result.timing === 'near' && '⭕ ちかい！'}
                  {result.timing === 'miss' && '💦 はずれ… はんぶん'}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {result.isSuperEffective && (
                  <span className="badge badge--super">
                    ⚡ ばつぐん！ +{settings.superEffectiveBonus}
                  </span>
                )}
                {result.isTired && (
                  <span className="badge badge--tired">
                    {settings.attackStyle === 'timing' ? '💤 つかれて ねらいにくい' : '💤 つかれて はんぶん'}
                  </span>
                )}
              </div>
              {/* ダメージの数は、当たった場所に大きく出す（下の演出レイヤー） */}
              {state.phase === 'resolve' && <div className="tap-hint">タップして つぎへ 👆</div>}
            </>
          )}

          {(state.phase === 'selectAttacker' ||
            state.phase === 'selectTarget' ||
            state.phase === 'chooseMove') &&
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

        {path && result && (state.phase === 'attacking' || state.phase === 'resolve') && (
          <AttackAnimation
            key={`${state.turnCount}-${state.phase}`}
            path={path}
            type={result.attackerType}
            damage={result.damage}
            isSuperEffective={result.isSuperEffective}
            phase={state.phase}
          />
        )}
      </div>

      {tiredConfirmIndex !== null && (
        <div className="overlay">
          <div className="overlay__panel">
            <div style={{ fontSize: 48 }}>💤</div>
            <div className="overlay__title" style={{ fontSize: 22 }}>
              {state.teams[attackerSide][tiredConfirmIndex]?.name}は つかれてるよ
            </div>
            <p style={{ margin: 0 }}>
              {settings.attackStyle === 'timing'
                ? 'ねらう ところが せまく なるけど、それでも いい？'
                : 'ダメージが はんぶんに なるけど、それでも いい？'}
            </p>
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
                  mega
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
