import type { AttackPath } from './AttackAnimation';

interface Props {
  path: AttackPath;
}

/**
 * メガシンカ が とける ときの エフェクト（docs/SPEC.md §3.6）。
 * メガわざ で ちからを つかいきると、こうげき した子の うえで
 * オーラが かけらに なって しぼんでいく。
 * 「メガシンカ が とけた」の文字は まんなかの バッジ が出すので、
 * ここでは 出さない（カードの なまえ と かさなって 読めなくなるため）。
 */
export function MegaEndEffect({ path }: Props) {
  const style = {
    ['--fx-from-x' as string]: `${path.fromX}px`,
    ['--fx-from-y' as string]: `${path.fromY}px`,
  };

  return (
    <div className="fx-layer">
      <div className="mega-end" style={style}>
        <div className="mega-end__glow" />
        <div className="mega-end__ring" />
        <div className="mega-end__ring mega-end__ring--2" />
        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={index}
            className="mega-end__shard"
            style={{
              ['--shard' as string]: `${index * (360 / 14)}deg`,
              animationDelay: `${index * 35}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
