import { Silhouette } from './Silhouette';
import { TYPE_EFFECTS, effectIntensity, particleCount } from '../ui/attackEffects';
import { TYPE_COLORS } from '../ui/typeColors';
import type { MoveKind, PokemonType, SilhouetteShape } from '../domain';

/** こうげきする子と、ねらわれた子の画面じょうの位置（バトル画面の左上からの px） */
export interface AttackPath {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/** カットインに出す こうげきする子 */
export interface Attacker {
  name: string;
  type: PokemonType;
  shape?: SilhouetteShape | undefined;
  megaEvolved: boolean;
}

interface Props {
  path: AttackPath;
  attacker: Attacker;
  moveName: string;
  moveKind: MoveKind;
  damage: number;
  isSuperEffective: boolean;
  /**
   * cutIn = わざの なまえ を大きく見せる／strike = 飛んで当たる／
   * damage = ダメージの数を見せる
   */
  stage: 'cutIn' | 'strike' | 'damage';
}

/**
 * 攻撃の演出（docs/SPEC.md §3.10）。
 * カットイン → 飛んでいって当たる → ダメージ の3段階で見せる。
 * メガわざ のときは 専用の はでな エフェクトになる。
 */
export function AttackAnimation({
  path, attacker, moveName, moveKind, damage, isSuperEffective, stage,
}: Props) {
  const { particle, center } = TYPE_EFFECTS[attacker.type];
  const isMega = moveKind === 'mega';
  const intensity = effectIntensity(damage) * (isMega ? 1.3 : 1);
  const count = particleCount(intensity) * (isMega ? 2 : 1);

  const style = {
    ['--fx-from-x' as string]: `${path.fromX}px`,
    ['--fx-from-y' as string]: `${path.fromY}px`,
    ['--fx-to-x' as string]: `${path.toX}px`,
    ['--fx-to-y' as string]: `${path.toY}px`,
    ['--fx-intensity' as string]: intensity,
    ['--fx-color' as string]: TYPE_COLORS[attacker.type],
  };

  if (stage === 'cutIn') {
    return (
      <div className={`fx-layer cutin${isMega ? ' cutin--mega' : ''}`} style={style}>
        <div className="cutin__band" />
        <div className="cutin__band cutin__band--2" />
        <div className="cutin__figure">
          <Silhouette
            name={attacker.name}
            type={attacker.type}
            shape={attacker.shape}
            mega={attacker.megaEvolved}
            size={isMega ? 150 : 120}
          />
        </div>
        <div className="cutin__text">
          <div className="cutin__who">{attacker.name}の</div>
          <div className="cutin__move">{moveName}！</div>
        </div>
      </div>
    );
  }

  if (stage === 'damage') {
    return (
      <div className="fx-layer" style={style}>
        <div className="fx-damage">-{damage}</div>
      </div>
    );
  }

  return (
    <div className="fx-layer" style={style}>
      <div className={`fx-flash${isMega ? ' fx-flash--mega' : ''}`} />

      {/* こうげきする子から、ねらわれた子へ飛んでいく */}
      <div className="fx-shot">{center}</div>

      {/* 当たったところで はじける */}
      <div className="fx-impact">
        <div className="fx-impact__ring" />
        {isSuperEffective && <div className="fx-impact__ring fx-impact__ring--extra" />}
        {/* メガわざ は 輪を かさねて はでにする */}
        {isMega && (
          <>
            <div className="fx-impact__ring fx-impact__ring--mega1" />
            <div className="fx-impact__ring fx-impact__ring--mega2" />
            <div className="fx-impact__burst" />
          </>
        )}
        <div className="fx-impact__center">{center}</div>
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="fx-impact__particle"
            style={{
              ['--fx-angle' as string]: `${(360 / count) * index}deg`,
              ['--fx-delay' as string]: `${(index % 3) * 70}ms`,
            }}
          >
            {index % 3 === 0 && isMega ? '✨' : particle}
          </div>
        ))}
      </div>
    </div>
  );
}
