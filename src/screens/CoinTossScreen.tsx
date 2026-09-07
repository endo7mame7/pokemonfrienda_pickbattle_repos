import { useState } from 'react';
import type { PlayerId } from '../domain';

interface Props {
  playerNames: Record<PlayerId, string>;
  onDecided: (firstPlayer: PlayerId) => void;
}

/**
 * コイントスで先攻を決める（docs/SPEC.md §3.1）。
 * コインの表があか、裏があお。出た色のチームが先攻。
 * 「どっちが出るか当てる」よりも、色がそのままチームなので園児にも分かりやすい。
 */
export function CoinTossScreen({ playerNames, onDecided }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<PlayerId | null>(null);

  const toss = () => {
    setSpinning(true);
    const landed: PlayerId = Math.random() < 0.5 ? 'p1' : 'p2';
    window.setTimeout(() => {
      setSpinning(false);
      setResult(landed);
    }, 1200);
  };

  return (
    <div className="screen">
      <div className="screen__body stack">
        <h1 className="title">どっちが さきばん？</h1>

        <div
          className={[
            'coin',
            spinning && 'coin--spinning',
            result && `coin--${result}`,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {!spinning && result && playerNames[result]}
          {!spinning && !result && '？'}
        </div>

        {result === null && !spinning && (
          <button type="button" className="btn btn--big" onClick={toss}>
            コインを なげる
          </button>
        )}

        {spinning && <div className="message">くるくる…</div>}

        {result !== null && (
          <>
            <div className="message">{playerNames[result]}チームが さきばん！</div>
            <button type="button" className="btn btn--big" onClick={() => onDecided(result)}>
              バトル スタート！
            </button>
          </>
        )}
      </div>
    </div>
  );
}
