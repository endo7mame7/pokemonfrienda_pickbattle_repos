import { useEffect, useMemo, useRef, useState } from 'react';
import { gaugeCycleMs, ratioAtDistance, zonesFor } from '../domain';
import type { GaugeSpeed, PokemonType, TimingMoveKind } from '../domain';
import { TYPE_COLORS } from '../ui/typeColors';

interface Props {
  move: TimingMoveKind;
  type: PokemonType;
  /** つかれていると カーブが とがって ねらいにくい */
  tired: boolean;
  /** メガシンカ中は カーブが ひろがって ねらいやすい */
  megaEvolved: boolean;
  /** ゲージの はやさ の せってい */
  gaugeSpeed: GaugeSpeed;
  onStop: (position: number) => void;
}

/** カーブを 色に するときの きざみ。多いほど なめらか */
const STOPS = 40;

/** '#rrggbb' → 'r, g, b' */
function rgbOf(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

/**
 * タイミングゲージ（docs/SPEC.md §3.4）。
 *
 * バーが左右に動くので、まんなかで止める。
 * ダメージは ゾーンではなく **つりがねの カーブ** で決まるので、
 * バーの色も まんなかが こく、はしに いくほど うすくなる。
 * つよい わざ ほど カーブが とがっていて、バーも はやく動く。
 */
export function TimingGauge({ move, type, tired, megaEvolved, gaugeSpeed, onStop }: Props) {
  const modifiers = { tired, megaEvolved };
  const zones = zonesFor(move, modifiers);
  const cycleMs = gaugeCycleMs(gaugeSpeed, move);
  const [position, setPosition] = useState(0.5);
  const stopped = useRef(false);
  const startedAt = useRef(performance.now());

  // カーブの こさ を そのまま バーの グラデーション にする
  const gradient = useMemo(() => {
    const rgb = rgbOf(TYPE_COLORS[type]);
    const stops = Array.from({ length: STOPS + 1 }, (_, index) => {
      const at = index / STOPS;
      const ratio = ratioAtDistance(move, Math.abs(at - 0.5), modifiers);
      return `rgba(${rgb}, ${ratio.toFixed(3)}) ${(at * 100).toFixed(1)}%`;
    });
    return `linear-gradient(to right, ${stops.join(', ')})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move, type, tired, megaEvolved]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (stopped.current) return;
      const elapsed = (performance.now() - startedAt.current) % cycleMs;
      // 0 → 1 → 0 を くりかえす
      const half = cycleMs / 2;
      setPosition(elapsed < half ? elapsed / half : 2 - elapsed / half);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cycleMs]);

  const stop = () => {
    if (stopped.current) return;
    stopped.current = true;
    onStop(position);
  };

  const percent = (value: number) => `${value * 100}%`;

  return (
    <button type="button" className="gauge" onClick={stop} aria-label="ゲージを とめる">
      <div className="gauge__bar">
        <div className="gauge__curve" style={{ background: gradient }} />
        {/* ここで とめれば さいだい、という めじるし */}
        <div
          className="gauge__core"
          style={{ left: percent(0.5 - zones.perfect), width: percent(zones.perfect * 2) }}
        />
        {/* ここから そとは 0ダメージ（つよいわざ だけ） */}
        {zones.zero < 0.5 && (
          <>
            <div className="gauge__dead" style={{ left: 0, width: percent(0.5 - zones.zero) }} />
            <div
              className="gauge__dead"
              style={{ left: percent(0.5 + zones.zero), width: percent(0.5 - zones.zero) }}
            />
          </>
        )}
        <div className="gauge__marker" style={{ left: percent(position) }} />
      </div>
      <div className="gauge__hint">
        {tired && '💤 つかれてて ねらいにくい… '}
        {megaEvolved && '🌈 メガシンカで ねらいやすい！ '}
        まんなかで タップ！
      </div>
      {move === 'strong' && (
        <div className="gauge__warn">⚫ はしの くろい ところは 0ダメージ！</div>
      )}
    </button>
  );
}
