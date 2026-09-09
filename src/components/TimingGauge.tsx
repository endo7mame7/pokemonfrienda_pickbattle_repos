import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MEGA_POWER_MULTIPLIER, SPEED_POWER_SCALE, ceilTo10, gaugeCycleMs, stepsFor } from '../domain';
import type { BattleSpeed, GaugeSpeed, PokemonType, TimingMoveKind } from '../domain';
import { TYPE_COLORS } from '../ui/typeColors';

interface Props {
  move: TimingMoveKind;
  type: PokemonType;
  /** つかれていると 段が せまくなる */
  tired: boolean;
  /** メガシンカ中は 段が ひろくなり、ちからも 上がる */
  megaEvolved: boolean;
  /** ゲージの はやさ の せってい */
  gaugeSpeed: GaugeSpeed;
  /** バトルの ながさ の せってい。数字の 表示に つかう */
  battleSpeed: BattleSpeed;
  /** テラスタル中は ゲージが うんと ゆっくりになる（§3.11） */
  terastallized: boolean;
  onStop: (position: number) => void;
}

/** 段ごとの こさ。まんなかが いちばん こい */
const STEP_ALPHA = [1, 0.62, 0.34, 0.15];

/**
 * こさ を 白と まぜて べた塗りの色にする。
 * opacity で うすくすると、下に かさなる 0ダメージ帯（くろ）が すけて
 * にごってしまうため、はじめから まぜた色を つかう。
 */
function tintOf(hex: string, alpha: number): { color: string; dark: boolean } {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(255 - (255 - channel) * alpha);
  const r = mix((value >> 16) & 255);
  const g = mix((value >> 8) & 255);
  const b = mix(value & 255);
  // こい色のうえは 白い字、うすい色のうえは くろい字にする（18タイプ どれでも読める）
  return { color: `rgb(${r}, ${g}, ${b})`, dark: 0.299 * r + 0.587 * g + 0.114 * b < 150 };
}

/** これより せまい段には 数字を 書かない（つぶれて 読めないため） */
const MIN_LABEL_PX = 22;

/**
 * タイミングゲージ（docs/SPEC.md §3.4）。
 *
 * バーが左右に動くので、まんなかで止める。
 * ダメージは **段** で決まるので、バーも 段に区切って
 * 「どこで とめると 何ダメージか」を そのまま 数字で書く。
 * つよい わざ ほど まんなかの段が せまく、バーも はやく動く。
 */
export function TimingGauge({
  move, type, tired, megaEvolved, gaugeSpeed, battleSpeed, terastallized, onStop,
}: Props) {
  const steps = stepsFor(move, { tired, megaEvolved });
  const cycleMs = gaugeCycleMs(gaugeSpeed, move, terastallized);
  const [position, setPosition] = useState(0.5);
  const stopped = useRef(false);
  const startedAt = useRef(performance.now());
  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(340);

  useLayoutEffect(() => {
    if (barRef.current) setBarWidth(barRef.current.offsetWidth);
  }, []);

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
  /** その段で ほんとうに 出る ダメージ（ばつぐん は べつの バッジで 出す） */
  const damageOf = (power: number) =>
    ceilTo10(power * SPEED_POWER_SCALE[battleSpeed] * (megaEvolved ? MEGA_POWER_MULTIPLIER : 1));

  return (
    <button type="button" className="gauge" onClick={stop} aria-label="ゲージを とめる">
      <div className="gauge__bar" ref={barRef}>
        {/* 外がわ の 段から かさねて 塗る */}
        {[...steps].reverse().map((step, reversed) => {
          const index = steps.length - 1 - reversed;
          const zero = step.power === 0;
          return (
            <div
              key={index}
              className={zero ? 'gauge__step gauge__step--zero' : 'gauge__step'}
              style={{
                left: percent(0.5 - step.until),
                width: percent(step.until * 2),
                ...(zero ? {} : { background: tintOf(TYPE_COLORS[type], STEP_ALPHA[index] ?? 0.15).color }),
              }}
            />
          );
        })}

        {/* 段の さかいめ */}
        {steps.slice(0, -1).map((step, index) => (
          <div key={`edge-${index}`}>
            <div className="gauge__edge" style={{ left: percent(0.5 - step.until) }} />
            <div className="gauge__edge" style={{ left: percent(0.5 + step.until) }} />
          </div>
        ))}

        {/* 段ごとの ダメージ。いちばん内がわ は まんなかに 1つだけ */}
        {steps.map((step, index) => {
          const inner = index === 0 ? 0 : (steps[index - 1]?.until ?? 0);
          const widthPx = (step.until - inner) * 2 * barWidth;
          if (widthPx < MIN_LABEL_PX * 2 && index > 0) return null;
          const middle = (inner + step.until) / 2;
          const spots = index === 0 ? [0.5] : [0.5 - middle, 0.5 + middle];
          const light = step.power === 0 || tintOf(TYPE_COLORS[type], STEP_ALPHA[index] ?? 0.15).dark;
          return spots.map((at) => (
            <span
              key={`${index}-${at}`}
              className={light ? 'gauge__num gauge__num--light' : 'gauge__num'}
              style={{ left: percent(at), fontSize: widthPx < 70 ? 11 : 13 }}
            >
              {damageOf(step.power)}
            </span>
          ));
        })}

        <div className="gauge__marker" style={{ left: percent(position) }} />
      </div>
      <div className="gauge__hint">
        {tired && '💤 つかれてて ねらいにくい… '}
        {megaEvolved && '🌈 メガシンカで ねらいやすい！ '}
        {terastallized && '💎 テラスタルで ゆっくり！ '}
        まんなかで タップ！
      </div>
      {move === 'strong' && (
        <div className="gauge__warn">⚫ はしの くろい ところは 0ダメージ！</div>
      )}
    </button>
  );
}
