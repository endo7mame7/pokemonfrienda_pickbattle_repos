import { useEffect, useRef, useState } from 'react';
import { TIMING_ZONES } from '../domain';
import type { MoveKind, PokemonType } from '../domain';
import { TYPE_COLORS } from '../ui/typeColors';

interface Props {
  move: MoveKind;
  type: PokemonType;
  onStop: (position: number) => void;
}

/** ゲージが 左右を 1往復する時間 */
const CYCLE_MS = 1400;

/**
 * タイミングゲージ（docs/SPEC.md §3.4）。
 * バーが左右に動くので、まんなかの あかいゾーンで止める。
 * つよい わざ ほど ゾーンが せまい。
 */
export function TimingGauge({ move, type, onStop }: Props) {
  const zones = TIMING_ZONES[move];
  const [position, setPosition] = useState(0.5);
  const stopped = useRef(false);
  const startedAt = useRef(performance.now());

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (stopped.current) return;
      const elapsed = (performance.now() - startedAt.current) % CYCLE_MS;
      // 0 → 1 → 0 を くりかえす
      const half = CYCLE_MS / 2;
      setPosition(elapsed < half ? elapsed / half : 2 - elapsed / half);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const stop = () => {
    if (stopped.current) return;
    stopped.current = true;
    onStop(position);
  };

  const percent = (value: number) => `${value * 100}%`;

  return (
    <button type="button" className="gauge" onClick={stop} aria-label="ゲージを とめる">
      <div className="gauge__bar">
        {/* ちかい ゾーン */}
        <div
          className="gauge__zone gauge__zone--near"
          style={{ left: percent(0.5 - zones.near), width: percent(zones.near * 2) }}
        />
        {/* ぴったり ゾーン */}
        <div
          className="gauge__zone gauge__zone--perfect"
          style={{
            left: percent(0.5 - zones.perfect),
            width: percent(zones.perfect * 2),
            background: TYPE_COLORS[type],
          }}
        />
        <div className="gauge__marker" style={{ left: percent(position) }} />
      </div>
      <div className="gauge__hint">まんなかで タップ！</div>
    </button>
  );
}
