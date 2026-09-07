import { TYPE_EFFECTS, effectIntensity, particleCount } from '../ui/attackEffects';
import { TYPE_COLORS } from '../ui/typeColors';
import type { PokemonType } from '../domain';

/** こうげきする子と、ねらわれた子の画面じょうの位置（バトル画面の左上からの px） */
export interface AttackPath {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface Props {
  path: AttackPath;
  type: PokemonType;
  damage: number;
  isSuperEffective: boolean;
  /** 'attacking' = 飛んでいって当たる ／ 'resolve' = ダメージの数を見せる */
  phase: 'attacking' | 'resolve';
}

/**
 * 攻撃の演出（docs/SPEC.md §3.10）。
 * カードの中ではなくバトル画面ぜんたいに広げて、
 * 「だれが → だれを」こうげきしたのかが目で追えるようにする。
 */
export function AttackAnimation({ path, type, damage, isSuperEffective, phase }: Props) {
  const { particle, center } = TYPE_EFFECTS[type];
  const intensity = effectIntensity(damage);
  const count = particleCount(intensity);

  const style = {
    ['--fx-from-x' as string]: `${path.fromX}px`,
    ['--fx-from-y' as string]: `${path.fromY}px`,
    ['--fx-to-x' as string]: `${path.toX}px`,
    ['--fx-to-y' as string]: `${path.toY}px`,
    ['--fx-intensity' as string]: intensity,
    ['--fx-color' as string]: TYPE_COLORS[type],
  };

  if (phase === 'resolve') {
    return (
      <div className="fx-layer" style={style}>
        <div className="fx-damage">-{damage}</div>
      </div>
    );
  }

  return (
    <div className="fx-layer" style={style}>
      <div className="fx-flash" />

      {/* こうげきする子から、ねらわれた子へ飛んでいく */}
      <div className="fx-shot">{center}</div>

      {/* 当たったところで はじける */}
      <div className="fx-impact">
        <div className="fx-impact__ring" />
        {isSuperEffective && <div className="fx-impact__ring fx-impact__ring--extra" />}
        <div className="fx-impact__center">{center}</div>
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="fx-impact__particle"
            style={{ ['--fx-angle' as string]: `${(360 / count) * index}deg` }}
          >
            {particle}
          </div>
        ))}
      </div>
    </div>
  );
}
