import { useEffect, useReducer, useState } from 'react';
import { Dice } from '../components/Dice';
import { PokemonCard } from '../components/PokemonCard';
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

  const me = state.turnPlayer;
  const foe = OPPONENT_OF[me];
  const myTeam = state.teams[me];
  const foeTeam = state.teams[foe];
  const result = state.lastResult;

  const chooseAttacker = (index: number) => {
    const pokemon = myTeam[index];
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

  const message = (() => {
    if (rolling) return 'サイコロ ころころ…';
    switch (state.phase) {
      case 'selectAttacker':
        return 'だれで こうげきする？';
      case 'selectTarget':
        return 'だれを ねらう？';
      case 'rollDice':
        return 'サイコロを ふろう！';
      case 'resolve':
        return result?.targetFainted ? `${result.targetName}は たおれた！` : '';
      default:
        return '';
    }
  })();

  const selectableMine = !rolling && (state.phase === 'selectAttacker' || state.phase === 'selectTarget');
  const selectableFoe = !rolling && (state.phase === 'selectTarget' || state.phase === 'rollDice');

  return (
    <div className="screen">
      <div className="screen__body">
        <div className={`team-label team-label--${foe}`}>あいて（{playerNames[foe]}）</div>
        <div className="team">
          {foeTeam.map((pokemon, index) => (
            <PokemonCard
              key={pokemon.pickId + index}
              pokemon={pokemon}
              selectable={selectableFoe && isAlive(pokemon)}
              selected={state.selectedTargetIndex === index}
              dimmed={selectableMine && !selectableFoe}
              onSelect={() => dispatch({ type: 'selectTarget', index })}
            />
          ))}
        </div>

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

          {state.phase === 'resolve' && result && (
            <>
              <Dice values={result.rolls} rolling={false} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {result.isSuperEffective && (
                  <span className="badge badge--super">
                    ⚡ ばつぐん！ +{settings.superEffectiveBonus}
                  </span>
                )}
                {result.isTired && <span className="badge badge--tired">💤 つかれて はんぶん</span>}
                {result.megaEvolvedNames.map((name) => (
                  <span key={name} className="badge badge--mega">
                    🌈 {name}が メガシンカ！
                  </span>
                ))}
              </div>
              <div className="damage">-{result.damage}</div>
              <div className="tap-hint">タップして つぎへ 👆</div>
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

        <div className="team">
          {myTeam.map((pokemon, index) => (
            <PokemonCard
              key={pokemon.pickId + index}
              pokemon={pokemon}
              selectable={selectableMine && isAlive(pokemon)}
              selected={state.selectedAttackerIndex === index}
              dimmed={selectableFoe && !selectableMine}
              onSelect={() => chooseAttacker(index)}
            />
          ))}
        </div>
        <div className={`team-label team-label--${me}`}>じぶん（{playerNames[me]}）</div>
      </div>

      {tiredConfirmIndex !== null && (
        <div className="overlay">
          <div className="overlay__panel">
            <div style={{ fontSize: 48 }}>💤</div>
            <div className="overlay__title" style={{ fontSize: 22 }}>
              {myTeam[tiredConfirmIndex]?.name}は つかれてるよ
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

      {state.phase === 'handOff' && (
        <HandOffScreen
          playerName={playerNames[foe]}
          onContinue={() => dispatch({ type: 'next' })}
        />
      )}
    </div>
  );
}
