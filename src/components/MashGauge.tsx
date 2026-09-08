import { useEffect, useRef, useState } from 'react';
import { MASH_DURATION_MS, mashFill, mashTargetTaps } from '../domain';
import type { PokemonType } from '../domain';
import { TYPE_COLORS } from '../ui/typeColors';

interface Props {
  type: PokemonType;
  tired: boolean;
  onFinish: (fill: number) => void;
}

/**
 * メガわざ の れんだゲージ（docs/SPEC.md §3.4.2）。
 * ねらう必要はなく、ボタンを たくさん たたくほど つよくなる。
 */
export function MashGauge({ type, tired, onFinish }: Props) {
  const [taps, setTaps] = useState(0);
  const [remaining, setRemaining] = useState(MASH_DURATION_MS);
  const tapsRef = useRef(0);
  const done = useRef(false);

  const target = mashTargetTaps(tired);
  const fill = mashFill(taps, tired);

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    const tick = () => {
      const left = MASH_DURATION_MS - (performance.now() - startedAt);
      if (left <= 0) {
        if (!done.current) {
          done.current = true;
          onFinish(mashFill(tapsRef.current, tired));
        }
        return;
      }
      setRemaining(left);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onFinish, tired]);

  const tap = () => {
    if (done.current) return;
    tapsRef.current += 1;
    setTaps(tapsRef.current);
  };

  const full = fill >= 1;

  return (
    <div className="mash">
      <div className="mash__bar">
        <div
          className="mash__fill"
          style={{ width: `${fill * 100}%`, background: TYPE_COLORS[type] }}
        />
        {full && <div className="mash__max">MAX！</div>}
      </div>

      <button
        type="button"
        className={full ? 'mash__button mash__button--full' : 'mash__button'}
        onClick={tap}
        style={{ background: TYPE_COLORS[type] }}
      >
        れんだ！
        <span className="mash__count">
          {taps} / {target}
        </span>
      </button>

      <div className="mash__timer">
        <div
          className="mash__timer-fill"
          style={{ width: `${(remaining / MASH_DURATION_MS) * 100}%` }}
        />
      </div>
    </div>
  );
}
