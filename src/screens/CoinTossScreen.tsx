import { useState } from 'react';
import type { PlayerId } from '../domain';

interface Props {
  p1Name: string;
  p2Name: string;
  onDecided: (firstPlayer: PlayerId) => void;
}

type Side = 'ball' | 'foot';

const SIDE_LABEL: Record<Side, string> = { ball: 'モンスターボール', foot: 'あしあと' };
const SIDE_EMOJI: Record<Side, string> = { ball: '⚪', foot: '🐾' };

/**
 * コイントスで先攻を決める（docs/SPEC.md §3.1）。
 * 先に「どっちが でるか」を選ばせて、当事者感を出す。
 */
export function CoinTossScreen({ p1Name, p2Name, onDecided }: Props) {
  const [called, setCalled] = useState<Side | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Side | null>(null);

  const toss = (call: Side) => {
    setCalled(call);
    setSpinning(true);
    const landed: Side = Math.random() < 0.5 ? 'ball' : 'foot';
    window.setTimeout(() => {
      setSpinning(false);
      setResult(landed);
    }, 1100);
  };

  // 当てた側が先攻。p1 が予想する形にしている
  const firstPlayer: PlayerId | null =
    result === null || called === null ? null : result === called ? 'p1' : 'p2';

  return (
    <div className="screen">
      <div className="screen__body stack">
        <h1 className="title">どっちが でるかな？</h1>
        <p className="subtitle">{p1Name}が よそうしてね</p>

        <button
          type="button"
          className={spinning ? 'coin coin--spinning' : 'coin'}
          disabled={!spinning && result === null}
        >
          {spinning ? '🌀' : SIDE_EMOJI[result ?? called ?? 'ball']}
        </button>

        {result === null && !spinning && (
          <div className="btn-row" style={{ width: '100%' }}>
            {(['ball', 'foot'] as const).map((side) => (
              <button key={side} type="button" className="btn" onClick={() => toss(side)}>
                {SIDE_EMOJI[side]}
                <span style={{ display: 'block', fontSize: 14 }}>{SIDE_LABEL[side]}</span>
              </button>
            ))}
          </div>
        )}

        {result !== null && firstPlayer !== null && (
          <>
            <div className="message">
              {SIDE_LABEL[result]}！ {firstPlayer === 'p1' ? p1Name : p2Name}が さきばん！
            </div>
            <button type="button" className="btn btn--big" onClick={() => onDecided(firstPlayer)}>
              ばとる スタート！
            </button>
          </>
        )}
      </div>
    </div>
  );
}
