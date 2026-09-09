import { useEffect, useMemo, useRef, useState } from 'react';
import { TAP_DURATION_MS, tapCrystalCount, tapFill } from '../domain';
import type { PokemonType } from '../domain';
import { TYPE_COLORS } from '../ui/typeColors';

interface Props {
  type: PokemonType;
  /** つかれていると けっしょう が ふえる */
  tired: boolean;
  onFinish: (fill: number) => void;
}

/** けっしょう を ならべる ます目（よこ×たて）。ここに ちらして かさならないようにする */
const COLUMNS = 3;
const ROWS = 3;

/**
 * テラスタルわざ の けっしょうタップ（docs/SPEC.md §3.11）。
 *
 * ゲージを とめる でも、ボタンを れんだ する でもない 3つめの だしかた。
 * バトル画面ぜんたい に ちらばった けっしょう を、じかん内に ぜんぶ タップする。
 * とれた 数が そのまま ちから になる。
 */
export function CrystalTap({ type, tired, onFinish }: Props) {
  const total = tapCrystalCount(tired);
  const [tapped, setTapped] = useState<number[]>([]);
  const [remaining, setRemaining] = useState(TAP_DURATION_MS);
  const tappedRef = useRef(0);
  const done = useRef(false);

  // ます目 に ばらして、そのなかで すこし ずらす（毎回 ちがう ならび になる）
  const crystals = useMemo(
    () =>
      Array.from({ length: total }, (_, index) => {
        const cell = index % (COLUMNS * ROWS);
        const column = cell % COLUMNS;
        const row = Math.floor(cell / COLUMNS);
        // はしに よりすぎると 画面から はみ出すので、内がわに おさめる
        const clamp = (value: number, min: number, max: number) =>
          Math.min(max, Math.max(min, value));
        return {
          left: clamp(((column + 0.5) / COLUMNS) * 100 + (Math.random() - 0.5) * 14, 14, 86),
          top: clamp(((row + 0.5) / ROWS) * 100 + (Math.random() - 0.5) * 14, 14, 86),
          spin: Math.round((Math.random() - 0.5) * 40),
        };
      }),
    [total],
  );

  const finish = (count: number) => {
    if (done.current) return;
    done.current = true;
    onFinish(tapFill(count, tired));
  };

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    const tick = () => {
      const left = TAP_DURATION_MS - (performance.now() - startedAt);
      if (left <= 0) {
        finish(tappedRef.current);
        return;
      }
      setRemaining(left);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const take = (index: number) => {
    if (done.current || tapped.includes(index)) return;
    const next = [...tapped, index];
    tappedRef.current = next.length;
    setTapped(next);
    // ぜんぶ とれたら、またずに おわる
    if (next.length >= total) finish(next.length);
  };

  return (
    <div className="crystal-tap">
      <div className="crystal-tap__head">
        <div className="crystal-tap__count">
          💎 {tapped.length} / {total}
        </div>
        <div className="crystal-tap__timer">
          <div
            className="crystal-tap__timer-fill"
            style={{ width: `${(remaining / TAP_DURATION_MS) * 100}%` }}
          />
        </div>
      </div>

      {crystals.map((crystal, index) => (
        <button
          key={index}
          type="button"
          className={tapped.includes(index) ? 'crystal crystal--taken' : 'crystal'}
          style={{
            left: `${crystal.left}%`,
            top: `${crystal.top}%`,
            ['--crystal-spin' as string]: `${crystal.spin}deg`,
            ['--crystal-color' as string]: TYPE_COLORS[type],
            animationDelay: `${index * 40}ms`,
          }}
          onPointerDown={() => take(index)}
          aria-label="けっしょうを タップ"
        >
          <span className="crystal__shine" />
        </button>
      ))}
    </div>
  );
}
