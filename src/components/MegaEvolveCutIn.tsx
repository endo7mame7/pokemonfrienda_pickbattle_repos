import { useEffect, useState } from 'react';
import { Silhouette } from './Silhouette';
import type { PokemonType, SilhouetteShape } from '../domain';

interface Props {
  name: string;
  type: PokemonType;
  shape?: SilhouetteShape | undefined;
  /** さいごに出す ひとこと */
  caption: string;
}

/** ためる → はじける → すがたを見せる の じかん（合計 = MEGA_ANIMATION_MS） */
const CHARGE_MS = 950;
const BURST_MS = 450;

type Stage = 'charge' | 'burst' | 'reveal';

/**
 * メガシンカ せんよう の カットイン（docs/SPEC.md §3.10）。
 *
 * 1. ためる  … まわりから ひかりが あつまり、もとの かげ が ふるえる
 * 2. はじける … まっしろに光って、かげ が メガの すがた に かわる
 * 3. お ひろめ … にじいろの わ の中で、なまえ と いっしょに 見せる
 */
export function MegaEvolveCutIn({ name, type, shape, caption }: Props) {
  const [stage, setStage] = useState<Stage>('charge');

  useEffect(() => {
    const toBurst = window.setTimeout(() => setStage('burst'), CHARGE_MS);
    const toReveal = window.setTimeout(() => setStage('reveal'), CHARGE_MS + BURST_MS);
    return () => {
      window.clearTimeout(toBurst);
      window.clearTimeout(toReveal);
    };
  }, []);

  const isReveal = stage === 'reveal';

  return (
    <div className={`mega-cutin mega-cutin--${stage}`}>
      {/* ななめの にじいろ の おび */}
      <div className="mega-cutin__band" />
      <div className="mega-cutin__band mega-cutin__band--2" />

      {/* まわりから ひかりが あつまってくる */}
      {stage === 'charge' && (
        <div className="mega-cutin__rays">
          {Array.from({ length: 12 }, (_, index) => (
            <span
              key={index}
              className="mega-cutin__ray"
              style={{ ['--ray' as string]: `${index * 30}deg`, animationDelay: `${index * 40}ms` }}
            />
          ))}
        </div>
      )}

      {/* かげ と、そのまわりの わ。大きさを きめて 文字と かさならないようにする */}
      <div className="mega-cutin__stage">
        {/* お ひろめ のときだけ にじいろの わ を まわす */}
        {isReveal && <div className="mega-cutin__halo" />}
        <div className="mega-cutin__figure">
          <Silhouette
            name={name}
            type={type}
            shape={shape}
            mega={isReveal}
            size={isReveal ? 128 : 104}
            key={isReveal ? 'mega' : 'base'}
          />
        </div>
      </div>

      {/* はじけた しゅんかん の しろい ひかり */}
      {stage !== 'charge' && <div className="mega-cutin__flash" />}

      {isReveal && (
        <div className="mega-cutin__words">
          <div className="mega-cutin__title">🌈 メガシンカ！</div>
          <div className="mega-cutin__name">メガ{name}</div>
          <div className="mega-cutin__caption">{caption}</div>
        </div>
      )}
    </div>
  );
}
