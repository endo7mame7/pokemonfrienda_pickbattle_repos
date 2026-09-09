import { useEffect, useState } from 'react';
import { Silhouette } from './Silhouette';
import type { PokemonType, SilhouetteShape } from '../domain';

interface Props {
  name: string;
  type: PokemonType;
  shape?: SilhouetteShape | undefined;
}

/** けっしょう が あつまる → はじける → すがたを見せる（合計 = TERA_ANIMATION_MS） */
const GATHER_MS = 900;
const BURST_MS = 450;

type Stage = 'gather' | 'burst' | 'reveal';

/**
 * テラスタル せんよう の カットイン（docs/SPEC.md §3.11）。
 * メガシンカ の カットイン とは 見た目を はっきり 分ける:
 * メガ は にじいろ の おび、テラスタル は **けっしょう が ふってきて つつむ**。
 */
export function TeraCutIn({ name, type, shape }: Props) {
  const [stage, setStage] = useState<Stage>('gather');

  useEffect(() => {
    const toBurst = window.setTimeout(() => setStage('burst'), GATHER_MS);
    const toReveal = window.setTimeout(() => setStage('reveal'), GATHER_MS + BURST_MS);
    return () => {
      window.clearTimeout(toBurst);
      window.clearTimeout(toReveal);
    };
  }, []);

  const isReveal = stage === 'reveal';

  return (
    <div className={`tera-cutin tera-cutin--${stage}`}>
      {/* うえから ふってくる けっしょう */}
      {stage === 'gather' && (
        <div className="tera-cutin__rain">
          {Array.from({ length: 14 }, (_, index) => (
            <span
              key={index}
              className="tera-cutin__shard"
              style={{
                left: `${(index * 7 + 4) % 100}%`,
                animationDelay: `${(index % 7) * 90}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div className="tera-cutin__stage">
        {isReveal && <div className="tera-cutin__gem" />}
        <div className="tera-cutin__figure">
          <Silhouette
            name={name}
            type={type}
            shape={shape}
            tera={isReveal}
            size={isReveal ? 128 : 104}
            key={isReveal ? 'tera' : 'base'}
          />
        </div>
      </div>

      {stage !== 'gather' && <div className="tera-cutin__flash" />}

      {isReveal && (
        <div className="tera-cutin__words">
          <div className="tera-cutin__title">💎 テラスタル！</div>
          <div className="tera-cutin__name">{name}が かがやいた！</div>
          <div className="tera-cutin__caption">ゲージが うんと ゆっくりに なるよ</div>
        </div>
      )}
    </div>
  );
}
