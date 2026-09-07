import { TYPE_EFFECTS, effectIntensity, particleCount } from '../ui/attackEffects';
import { TYPE_COLORS } from '../ui/typeColors';
import type { PokemonType } from '../domain';

interface Props {
  type: PokemonType;
  damage: number;
  isSuperEffective: boolean;
}

/**
 * 攻撃が当たるときのエフェクト（docs/SPEC.md §3.10）。
 * タイプごとに見た目が変わり、ダメージが大きいほど はでになる。
 */
export function AttackEffect({ type, damage, isSuperEffective }: Props) {
  const { particle, center } = TYPE_EFFECTS[type];
  const intensity = effectIntensity(damage);
  const count = particleCount(intensity);

  return (
    <div
      className="fx"
      style={{
        // CSS から使う。強さで大きさ・速さを変える
        ['--fx-intensity' as string]: intensity,
        ['--fx-color' as string]: TYPE_COLORS[type],
      }}
    >
      <div className="fx__ring" />
      {isSuperEffective && <div className="fx__ring fx__ring--extra" />}
      <div className="fx__center">{center}</div>
      {Array.from({ length: count }, (_, index) => {
        // かけらを ぐるりと均等にばらまく
        const angle = (360 / count) * index;
        return (
          <div
            key={index}
            className="fx__particle"
            style={{
              ['--fx-angle' as string]: `${angle}deg`,
              ['--fx-delay' as string]: `${(index % 4) * 40}ms`,
            }}
          >
            {particle}
          </div>
        );
      })}
    </div>
  );
}
